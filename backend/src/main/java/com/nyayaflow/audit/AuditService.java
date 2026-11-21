package com.nyayaflow.audit;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditEventRepository repository;
    private final Clock clock;

    public AuditService(AuditEventRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Records an action in the caller's transaction, so it is only kept if the action succeeds. */
    @Transactional
    public void record(AuthenticatedUser actor, AuditAction action, String entityType, Long entityId, Long caseId,
                       String summary) {
        save(clock.instant(), actor == null ? null : actor.id(), actor == null ? "System" : actor.fullName(),
                action, entityType, entityId, caseId, summary);
    }

    /** Records a failed sign-in independently of the (rolled back) login attempt. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedLogin(String attemptedEmail, String reason) {
        save(clock.instant(), null, Texts.truncate(attemptedEmail, 150), AuditAction.USER_LOGIN_FAILED, "USER", null,
                null, "Failed sign-in for " + Texts.truncate(attemptedEmail, 120) + " (" + reason + ")");
    }

    /** Used by the demo seeder to write historical events. */
    @Transactional
    public void recordAt(Instant occurredAt, Long actorId, String actorName, AuditAction action, String entityType,
                         Long entityId, Long caseId, String summary) {
        save(occurredAt, actorId, actorName, action, entityType, entityId, caseId, summary);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditEventResponse> forCase(Long caseId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponse.of(repository.findByCaseIdOrderByOccurredAtDesc(caseId, pageable),
                AuditEventResponse::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditEventResponse> search(AuditQuery query, int page, int size) {
        Specification<AuditEvent> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query.actorId() != null) {
                predicates.add(cb.equal(root.get("actorId"), query.actorId()));
            }
            if (query.caseId() != null) {
                predicates.add(cb.equal(root.get("caseId"), query.caseId()));
            }
            if (query.category() != null) {
                List<AuditAction> actions = Arrays.stream(AuditAction.values())
                        .filter(a -> a.category() == query.category()).toList();
                predicates.add(root.get("action").in(actions));
            }
            if (query.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"),
                        query.from().atStartOfDay(clock.getZone()).toInstant()));
            }
            if (query.to() != null) {
                predicates.add(cb.lessThan(root.get("occurredAt"),
                        query.to().plusDays(1).atStartOfDay(clock.getZone()).toInstant()));
            }
            String q = Texts.clean(query.q());
            if (q != null) {
                String pattern = Texts.likePattern(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("summary")), pattern, '\\'),
                        cb.like(cb.lower(root.get("actorName")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt", "id"));
        return PageResponse.of(repository.findAll(spec, pageable), AuditEventResponse::from);
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> recent() {
        return repository.findTop12ByOrderByOccurredAtDesc().stream().map(AuditEventResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> recentCaseActivity() {
        return repository.findTop12ByCaseIdIsNotNullOrderByOccurredAtDesc().stream()
                .map(AuditEventResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> recentForCases(List<Long> caseIds) {
        if (caseIds.isEmpty()) {
            return List.of();
        }
        return repository.findTop12ByCaseIdInOrderByOccurredAtDesc(caseIds).stream()
                .map(AuditEventResponse::from).toList();
    }

    private void save(Instant occurredAt, Long actorId, String actorName, AuditAction action, String entityType,
                      Long entityId, Long caseId, String summary) {
        AuditEvent event = new AuditEvent();
        event.setOccurredAt(occurredAt);
        event.setActorId(actorId);
        event.setActorName(actorName);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setCaseId(caseId);
        event.setSummary(Texts.truncate(summary, 1000));
        repository.save(event);
    }

    public record AuditQuery(Long actorId, Long caseId, AuditAction.Category category, LocalDate from, LocalDate to,
                             String q) {
    }
}
