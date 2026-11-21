package com.nyayaflow.deadline;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseEvents;
import com.nyayaflow.cases.CaseScope;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.Formats;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.config.NyayaFlowProperties;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineRequest;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineResponse;
import com.nyayaflow.deadline.DeadlineDtos.View;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeadlineService {

    private static final int DUE_SOON_DAYS = 7;

    private final DeadlineRepository deadlines;
    private final CaseAccess access;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final int reminderDaysAhead;
    private final Clock clock;

    public DeadlineService(DeadlineRepository deadlines, CaseAccess access, UserRepository users, AuditService audit,
                           NotificationService notifications, NyayaFlowProperties properties, Clock clock) {
        this.deadlines = deadlines;
        this.access = access;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.reminderDaysAhead = properties.deadlines().reminderDaysAhead();
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public List<DeadlineResponse> listForCase(Long caseId, AuthenticatedUser user) {
        access.requireVisible(caseId, user);
        LocalDate today = today();
        return deadlines.findByCourtCaseIdOrderByDueDateAscIdAsc(caseId).stream()
                .map(d -> toResponse(d, user, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<DeadlineResponse> search(View view, boolean mine, Long caseId, String q, int page, int size,
                                                 AuthenticatedUser user) {
        LocalDate today = today();
        Specification<Deadline> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<Deadline, CourtCase> courtCase = root.join("courtCase");
            Predicate scope = CaseScope.predicate(courtCase, query, cb, user);
            if (scope != null) {
                predicates.add(scope);
            }
            switch (view) {
                case OPEN -> predicates.add(cb.equal(root.get("status"), DeadlineStatus.PENDING));
                case OVERDUE -> {
                    predicates.add(cb.equal(root.get("status"), DeadlineStatus.PENDING));
                    predicates.add(cb.lessThan(root.get("dueDate"), today));
                }
                case DUE_SOON -> {
                    predicates.add(cb.equal(root.get("status"), DeadlineStatus.PENDING));
                    predicates.add(cb.between(root.get("dueDate"), today, today.plusDays(DUE_SOON_DAYS)));
                }
                case COMPLETED -> predicates.add(cb.equal(root.get("status"), DeadlineStatus.COMPLETED));
                case ALL -> { }
            }
            if (mine) {
                predicates.add(cb.equal(root.get("assignedTo").get("id"), user.id()));
            }
            if (caseId != null) {
                predicates.add(cb.equal(courtCase.get("id"), caseId));
            }
            String term = Texts.clean(q);
            if (term != null) {
                String pattern = Texts.likePattern(term);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("caseNumber")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Sort sort = view == View.COMPLETED
                ? Sort.by(Sort.Order.desc("completedAt"), Sort.Order.desc("id"))
                : Sort.by(Sort.Order.asc("dueDate"), Sort.Order.asc("id"));
        return PageResponse.of(deadlines.findAll(spec, PageRequest.of(page, size, sort)),
                d -> toResponse(d, user, today));
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public DeadlineResponse create(Long caseId, DeadlineRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canManageDeadlines(),
                courtCase.isClosed() ? "Deadlines cannot be added to a closed case."
                        : "Only court staff or the presiding judge can set deadlines.");
        if (request.dueDate().isBefore(today())) {
            throw ApiException.badRequest("DUE_DATE_IN_PAST", "The due date cannot be in the past.");
        }
        Deadline deadline = new Deadline();
        deadline.setCourtCase(courtCase);
        deadline.setStatus(DeadlineStatus.PENDING);
        deadline.setCreatedBy(users.getReferenceById(actor.id()));
        apply(deadline, request, courtCase);
        deadlines.save(deadline);

        audit.record(actor, AuditAction.DEADLINE_CREATED, "DEADLINE", deadline.getId(), courtCase.getId(),
                "Set deadline “" + deadline.getTitle() + "” in " + courtCase.getCaseNumber() + " due "
                        + Formats.date(deadline.getDueDate()) + assigneeSuffix(deadline));
        notifyAssignee(deadline, actor);
        return toResponse(deadline, actor, today());
    }

    @Transactional
    public DeadlineResponse update(Long deadlineId, DeadlineRequest request, AuthenticatedUser actor) {
        Deadline deadline = requireDeadline(deadlineId, actor);
        CourtCase courtCase = deadline.getCourtCase();
        access.require(canEdit(actor, courtCase), "Only court staff or the presiding judge can edit deadlines.");
        Long previousAssignee = deadline.getAssignedTo() == null ? null : deadline.getAssignedTo().getId();
        LocalDate previousDue = deadline.getDueDate();
        apply(deadline, request, courtCase);
        if (!previousDue.equals(deadline.getDueDate())) {
            deadline.setReminderSentAt(null);
        }
        audit.record(actor, AuditAction.DEADLINE_UPDATED, "DEADLINE", deadline.getId(), courtCase.getId(),
                "Updated deadline “" + deadline.getTitle() + "” in " + courtCase.getCaseNumber() + " (due "
                        + Formats.date(deadline.getDueDate()) + ")");
        Long newAssignee = deadline.getAssignedTo() == null ? null : deadline.getAssignedTo().getId();
        if (!Objects.equals(previousAssignee, newAssignee)) {
            notifyAssignee(deadline, actor);
        }
        return toResponse(deadline, actor, today());
    }

    @Transactional
    public DeadlineResponse complete(Long deadlineId, AuthenticatedUser actor) {
        Deadline deadline = requireDeadline(deadlineId, actor);
        access.require(canComplete(actor, deadline), "You cannot complete this deadline.");
        if (deadline.getStatus() == DeadlineStatus.COMPLETED) {
            throw ApiException.conflict("ALREADY_COMPLETED", "This deadline is already completed.");
        }
        deadline.setStatus(DeadlineStatus.COMPLETED);
        deadline.setCompletedAt(clock.instant());
        deadline.setCompletedBy(users.getReferenceById(actor.id()));
        audit.record(actor, AuditAction.DEADLINE_COMPLETED, "DEADLINE", deadline.getId(),
                deadline.getCourtCase().getId(), "Completed “" + deadline.getTitle() + "” in "
                        + deadline.getCourtCase().getCaseNumber());
        return toResponse(deadline, actor, today());
    }

    @Transactional
    public DeadlineResponse reopen(Long deadlineId, AuthenticatedUser actor) {
        Deadline deadline = requireDeadline(deadlineId, actor);
        access.require(canComplete(actor, deadline), "You cannot reopen this deadline.");
        if (deadline.getStatus() != DeadlineStatus.COMPLETED) {
            throw ApiException.conflict("NOT_COMPLETED", "Only completed deadlines can be reopened.");
        }
        deadline.setStatus(DeadlineStatus.PENDING);
        deadline.setCompletedAt(null);
        deadline.setCompletedBy(null);
        audit.record(actor, AuditAction.DEADLINE_REOPENED, "DEADLINE", deadline.getId(),
                deadline.getCourtCase().getId(), "Reopened “" + deadline.getTitle() + "” in "
                        + deadline.getCourtCase().getCaseNumber());
        return toResponse(deadline, actor, today());
    }

    @Transactional
    public void delete(Long deadlineId, AuthenticatedUser actor) {
        Deadline deadline = requireDeadline(deadlineId, actor);
        access.require(canEdit(actor, deadline.getCourtCase()),
                "Only court staff or the presiding judge can delete deadlines.");
        deadlines.delete(deadline);
        audit.record(actor, AuditAction.DEADLINE_DELETED, "DEADLINE", deadline.getId(),
                deadline.getCourtCase().getId(), "Deleted deadline “" + deadline.getTitle() + "” from "
                        + deadline.getCourtCase().getCaseNumber());
    }

    /** Notifies people about pending deadlines due within the reminder window, once per deadline. */
    @Transactional
    public int sendReminders() {
        LocalDate today = today();
        List<Deadline> due = deadlines.findByStatusAndDueDateBetweenAndReminderSentAtIsNull(DeadlineStatus.PENDING,
                today, today.plusDays(reminderDaysAhead));
        for (Deadline deadline : due) {
            CourtCase courtCase = deadline.getCourtCase();
            List<Long> recipients = deadline.getAssignedTo() != null
                    ? List.of(deadline.getAssignedTo().getId())
                    : CaseService.participantIds(courtCase);
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, deadline.getDueDate());
            String when = days == 0 ? "today" : days == 1 ? "tomorrow" : "in " + days + " days";
            notifications.notify(recipients, null, NotificationType.DEADLINE_APPROACHING, "Deadline approaching",
                    "“" + deadline.getTitle() + "” in " + courtCase.getCaseNumber() + " is due " + when + " ("
                            + Formats.date(deadline.getDueDate()) + ").", courtCase.getId());
            deadline.setReminderSentAt(clock.instant());
        }
        return due.size();
    }

    // ------------------------------------------------------------------ reactions to case events

    /** Closing consigns the record, after which its deadlines could no longer be completed or removed. */
    @EventListener
    public void onCaseClosing(CaseEvents.Closing event) {
        long open = deadlines.countByCourtCaseIdAndStatus(event.courtCase().getId(), DeadlineStatus.PENDING);
        if (open > 0) {
            throw ApiException.conflict("OPEN_DEADLINES", "Complete or delete the "
                    + (open == 1 ? "open deadline" : open + " open deadlines") + " in this case before closing it.");
        }
    }

    // ------------------------------------------------------------------ internals

    private void apply(Deadline deadline, DeadlineRequest request, CourtCase courtCase) {
        deadline.setTitle(request.title().trim());
        deadline.setDescription(Texts.clean(request.description()));
        deadline.setDueDate(request.dueDate());
        deadline.setPriority(request.priority());
        deadline.setAssignedTo(resolveAssignee(request.assignedToId(), courtCase));
    }

    /** Assignees must be involved in the case: its judge, its counsel, or registry staff. */
    private User resolveAssignee(Long userId, CourtCase courtCase) {
        if (userId == null) {
            return null;
        }
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User", userId));
        if (!user.isActive()) {
            throw ApiException.badRequest("USER_INACTIVE", user.getFullName() + "'s account is deactivated.");
        }
        boolean involved = switch (user.getRole()) {
            case STAFF, ADMIN -> true;
            case JUDGE -> courtCase.isAssignedTo(user.getId());
            case LAWYER -> courtCase.hasLawyer(user.getId());
        };
        if (!involved) {
            throw ApiException.badRequest("ASSIGNEE_NOT_ON_CASE", user.getFullName() + " is not involved in this case.");
        }
        return user;
    }

    private void notifyAssignee(Deadline deadline, AuthenticatedUser actor) {
        if (deadline.getAssignedTo() == null) {
            return;
        }
        notifications.notify(List.of(deadline.getAssignedTo().getId()), actor.id(), NotificationType.DEADLINE_ASSIGNED,
                "Deadline assigned to you", "“" + deadline.getTitle() + "” in "
                        + deadline.getCourtCase().getCaseNumber() + ", due " + Formats.date(deadline.getDueDate()) + ".",
                deadline.getCourtCase().getId());
    }

    private Deadline requireDeadline(Long deadlineId, AuthenticatedUser user) {
        Deadline deadline = deadlines.findById(deadlineId)
                .orElseThrow(() -> ApiException.notFound("Deadline", deadlineId));
        access.requireVisible(deadline.getCourtCase().getId(), user);
        return deadline;
    }

    private boolean canEdit(AuthenticatedUser user, CourtCase courtCase) {
        return access.permissions(user, courtCase).canManageDeadlines();
    }

    private boolean canComplete(AuthenticatedUser user, Deadline deadline) {
        CourtCase courtCase = deadline.getCourtCase();
        boolean assignee = deadline.getAssignedTo() != null && deadline.getAssignedTo().getId().equals(user.id());
        return canEdit(user, courtCase) || (assignee && !courtCase.isClosed());
    }

    private DeadlineResponse toResponse(Deadline deadline, AuthenticatedUser user, LocalDate today) {
        return DeadlineResponse.from(deadline, today, canEdit(user, deadline.getCourtCase()),
                canComplete(user, deadline));
    }

    private static String assigneeSuffix(Deadline deadline) {
        return deadline.getAssignedTo() == null ? "" : ", assigned to " + deadline.getAssignedTo().getFullName();
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }
}
