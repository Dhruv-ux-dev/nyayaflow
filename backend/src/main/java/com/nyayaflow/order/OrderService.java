package com.nyayaflow.order;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseScope;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.hearing.Hearing;
import com.nyayaflow.hearing.HearingRepository;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.order.OrderDtos.IssueOrderRequest;
import com.nyayaflow.order.OrderDtos.OrderResponse;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final CourtOrderRepository orders;
    private final HearingRepository hearings;
    private final CaseAccess access;
    private final CaseService caseService;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public OrderService(CourtOrderRepository orders, HearingRepository hearings, CaseAccess access,
                        CaseService caseService, UserRepository users, AuditService audit,
                        NotificationService notifications, Clock clock) {
        this.orders = orders;
        this.hearings = hearings;
        this.access = access;
        this.caseService = caseService;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listForCase(Long caseId, AuthenticatedUser user) {
        access.requireVisible(caseId, user);
        return orders.findByCourtCaseIdOrderByOrderDateAscIdAsc(caseId).stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> search(String q, List<OrderType> types, Long caseId, int page, int size,
                                              AuthenticatedUser user) {
        Specification<CourtOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<CourtOrder, CourtCase> courtCase = root.join("courtCase");
            Predicate scope = CaseScope.predicate(courtCase, query, cb, user);
            if (scope != null) {
                predicates.add(scope);
            }
            if (types != null && !types.isEmpty()) {
                predicates.add(root.get("orderType").in(types));
            }
            if (caseId != null) {
                predicates.add(cb.equal(courtCase.get("id"), caseId));
            }
            String term = Texts.clean(q);
            if (term != null) {
                String pattern = Texts.likePattern(term);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("caseNumber")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("title")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        PageRequest pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("orderDate"), Sort.Order.desc("id")));
        return PageResponse.of(orders.findAll(spec, pageable), OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long orderId, AuthenticatedUser user) {
        CourtOrder order = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order", orderId));
        access.requireVisible(order.getCourtCase().getId(), user);
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse issue(Long caseId, IssueOrderRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canIssueOrder(),
                courtCase.isClosed() ? "Orders cannot be issued in a closed case."
                        : "Only the presiding judge can issue orders in this case.");
        LocalDate today = LocalDate.now(clock);
        if (request.orderDate().isAfter(today) || request.orderDate().isBefore(courtCase.getFilingDate())) {
            throw ApiException.badRequest("INVALID_ORDER_DATE",
                    "The order date must be between the filing date and today.");
        }
        if (request.orderType().isFinal() && !courtCase.getStatus().isPending()) {
            throw ApiException.conflict("ALREADY_DECIDED", "A final decision has already been recorded in this case.");
        }
        Hearing hearing = null;
        if (request.hearingId() != null) {
            hearing = hearings.findById(request.hearingId())
                    .orElseThrow(() -> ApiException.notFound("Hearing", request.hearingId()));
            if (!hearing.getCourtCase().getId().equals(caseId)) {
                throw ApiException.badRequest("HEARING_MISMATCH", "The selected hearing belongs to another case.");
            }
        }

        CourtOrder order = new CourtOrder();
        order.setCourtCase(courtCase);
        order.setHearing(hearing);
        order.setOrderType(request.orderType());
        order.setTitle(request.title().trim());
        order.setContent(request.content().trim());
        order.setRemarks(Texts.clean(request.remarks()));
        order.setOrderDate(request.orderDate());
        order.setIssuedBy(users.getReferenceById(actor.id()));
        order.setCreatedAt(clock.instant());
        orders.save(order);

        audit.record(actor, AuditAction.ORDER_ISSUED, "ORDER", order.getId(), courtCase.getId(),
                request.orderType().label() + " issued in " + courtCase.getCaseNumber() + ": " + order.getTitle());
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.ORDER_ISSUED,
                request.orderType().label() + " issued",
                courtCase.getCaseNumber() + ": " + order.getTitle(), courtCase.getId());

        if (request.orderType().isFinal()) {
            caseService.applySystemTransition(courtCase, CaseStatus.DISPOSED,
                    "Disposed by " + request.orderType().label().toLowerCase() + ": " + order.getTitle(), actor);
        }
        return OrderResponse.from(order);
    }
}
