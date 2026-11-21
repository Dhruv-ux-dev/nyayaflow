package com.nyayaflow.hearing;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseEvents;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.cases.dto.CasePermissions;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.Formats;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.court.Courtroom;
import com.nyayaflow.court.CourtroomRepository;
import com.nyayaflow.hearing.dto.CancelHearingRequest;
import com.nyayaflow.hearing.dto.ConcludeHearingRequest;
import com.nyayaflow.hearing.dto.HearingResponse;
import com.nyayaflow.hearing.dto.RescheduleHearingRequest;
import com.nyayaflow.hearing.dto.ScheduleHearingRequest;
import com.nyayaflow.hearing.dto.SchedulingConflict;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.UserRepository;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Scheduling, rescheduling, cancelling and concluding hearings. */
@Service
public class HearingService {

    private static final int MAX_CALENDAR_DAYS = 62;

    private final HearingRepository hearings;
    private final ProceedingRepository proceedings;
    private final CaseService caseService;
    private final CaseAccess access;
    private final CourtroomRepository courtrooms;
    private final UserRepository users;
    private final SchedulingRules rules;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public HearingService(HearingRepository hearings, ProceedingRepository proceedings, CaseService caseService,
                          CaseAccess access, CourtroomRepository courtrooms, UserRepository users,
                          SchedulingRules rules, AuditService audit, NotificationService notifications, Clock clock) {
        this.hearings = hearings;
        this.proceedings = proceedings;
        this.caseService = caseService;
        this.access = access;
        this.courtrooms = courtrooms;
        this.users = users;
        this.rules = rules;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public List<HearingResponse> listForCase(Long caseId, AuthenticatedUser user) {
        access.requireVisible(caseId, user);
        LocalDateTime now = now();
        return hearings.findByCourtCaseIdOrderByScheduledAtAsc(caseId).stream()
                .map(h -> HearingResponse.from(h, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<HearingResponse> search(HearingSpecifications.Criteria criteria, Pageable pageable,
                                                AuthenticatedUser user) {
        LocalDateTime now = now();
        return PageResponse.of(hearings.findAll(HearingSpecifications.matching(criteria, user), pageable),
                h -> HearingResponse.from(h, now));
    }

    @Transactional(readOnly = true)
    public List<HearingResponse> calendar(LocalDate from, LocalDate to, Long judgeId, Long courtroomId, Long courtId,
                                          AuthenticatedUser user) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > MAX_CALENDAR_DAYS) {
            throw ApiException.badRequest("INVALID_RANGE",
                    "Choose a date range of at most " + MAX_CALENDAR_DAYS + " days.");
        }
        var criteria = new HearingSpecifications.Criteria(from, to, null, null, judgeId, courtroomId, courtId, null,
                null);
        LocalDateTime now = now();
        return hearings.findAll(HearingSpecifications.matching(criteria, user), Sort.by("scheduledAt")).stream()
                .map(h -> HearingResponse.from(h, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public HearingResponse get(Long hearingId, AuthenticatedUser user) {
        return HearingResponse.from(requireHearing(hearingId, user), now());
    }

    /** Lets the scheduling form warn about clashes before the user submits. */
    @Transactional(readOnly = true)
    public List<SchedulingConflict> checkConflicts(Long caseId, LocalDateTime start, Integer durationMinutes,
                                                   Long courtroomId, Long excludeHearingId, AuthenticatedUser user) {
        CourtCase courtCase = access.requireVisible(caseId, user);
        if (courtCase.getJudge() == null) {
            return List.of();
        }
        return rules.findConflicts(courtCase.getJudge().getId(), courtroomId, start,
                rules.durationOrDefault(durationMinutes), excludeHearingId);
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public HearingResponse schedule(Long caseId, ScheduleHearingRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        ensureCanSchedule(courtCase, access.permissions(actor, courtCase));
        Hearing hearing = createHearing(courtCase, request, actor);
        return HearingResponse.from(hearing, now());
    }

    @Transactional
    public HearingResponse reschedule(Long hearingId, RescheduleHearingRequest request, AuthenticatedUser actor) {
        Hearing hearing = requireHearing(hearingId, actor);
        CourtCase courtCase = hearing.getCourtCase();
        access.require(access.permissions(actor, courtCase).canManageHearings(),
                "Only court staff or the presiding judge can reschedule hearings.");
        ensureScheduled(hearing, "rescheduled");

        int duration = request.durationMinutes() == null ? hearing.getDurationMinutes() : request.durationMinutes();
        Courtroom courtroom = request.courtroomId() == null
                ? hearing.getCourtroom()
                : resolveCourtroom(courtCase, request.courtroomId());
        rules.validateSlot(request.scheduledAt(), duration);
        Long judgeId = hearing.getJudge() != null ? hearing.getJudge().getId() : courtCase.getJudge().getId();
        rules.ensureNoConflicts(judgeId, courtroom == null ? null : courtroom.getId(), request.scheduledAt(), duration,
                hearing.getId(), request.overrideConflicts());

        LocalDateTime previous = hearing.getScheduledAt();
        String reason = request.reason().trim();
        hearing.setScheduledAt(request.scheduledAt());
        hearing.setDurationMinutes(duration);
        hearing.setCourtroom(courtroom);
        hearing.setRescheduleCount(hearing.getRescheduleCount() + 1);
        hearing.setStatusReason(reason);
        refreshNextHearing(courtCase);

        String change = hearing.getHearingType().label() + " in " + courtCase.getCaseNumber() + " moved from "
                + Formats.dateTime(previous) + " to " + Formats.dateTime(request.scheduledAt());
        audit.record(actor, AuditAction.HEARING_RESCHEDULED, "HEARING", hearing.getId(), courtCase.getId(),
                change + " — " + reason);
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.HEARING_RESCHEDULED,
                "Hearing rescheduled", change + ". Reason: " + reason, courtCase.getId());
        return HearingResponse.from(hearing, now());
    }

    @Transactional
    public HearingResponse cancel(Long hearingId, CancelHearingRequest request, AuthenticatedUser actor) {
        Hearing hearing = requireHearing(hearingId, actor);
        CourtCase courtCase = hearing.getCourtCase();
        access.require(access.permissions(actor, courtCase).canManageHearings(),
                "Only court staff or the presiding judge can cancel hearings.");
        ensureScheduled(hearing, "cancelled");

        String reason = request.reason().trim();
        hearing.setStatus(HearingStatus.CANCELLED);
        hearing.setStatusReason(reason);
        refreshNextHearing(courtCase);

        String what = hearing.getHearingType().label() + " in " + courtCase.getCaseNumber() + " on "
                + Formats.dateTime(hearing.getScheduledAt());
        audit.record(actor, AuditAction.HEARING_CANCELLED, "HEARING", hearing.getId(), courtCase.getId(),
                "Cancelled " + Texts.lowerFirst(what) + " — " + reason);
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.HEARING_CANCELLED,
                "Hearing cancelled", what + " has been cancelled. Reason: " + reason, courtCase.getId());
        return HearingResponse.from(hearing, now());
    }

    /**
     * Records the result of a hearing and, optionally, the proceedings and the next date. Any failure
     * (for example a clash for the next date) rolls the whole conclusion back.
     */
    @Transactional
    public HearingResponse conclude(Long hearingId, ConcludeHearingRequest request, AuthenticatedUser actor) {
        Hearing hearing = requireHearing(hearingId, actor);
        CourtCase courtCase = hearing.getCourtCase();
        CasePermissions permissions = access.permissions(actor, courtCase);
        access.require(permissions.canManageHearings(),
                "Only court staff or the presiding judge can record hearing outcomes.");
        ensureScheduled(hearing, "concluded");
        if (request.result() != HearingStatus.COMPLETED && request.result() != HearingStatus.ADJOURNED) {
            throw ApiException.badRequest("INVALID_RESULT", "A hearing is concluded as either completed or adjourned.");
        }
        if (hearing.getScheduledAt().toLocalDate().isAfter(LocalDate.now(clock))) {
            throw ApiException.conflict("HEARING_NOT_YET_HELD", "A hearing can only be concluded on or after its date.");
        }
        if (request.proceeding() != null && !permissions.canRecordProceeding()) {
            throw ApiException.forbidden("Only court staff or the presiding judge can record proceedings.");
        }

        String outcome = request.outcome().trim();
        hearing.setStatus(request.result());
        hearing.setOutcome(outcome);
        boolean completed = request.result() == HearingStatus.COMPLETED;
        String heldOn = Formats.dateTime(hearing.getScheduledAt());
        audit.record(actor, completed ? AuditAction.HEARING_COMPLETED : AuditAction.HEARING_ADJOURNED, "HEARING",
                hearing.getId(), courtCase.getId(), hearing.getHearingType().label() + " in "
                        + courtCase.getCaseNumber() + " on " + heldOn + (completed ? " completed: " : " adjourned: ")
                        + Texts.truncate(outcome, 300));

        if (request.proceeding() != null) {
            Proceeding proceeding = new Proceeding();
            proceeding.setCourtCase(courtCase);
            proceeding.setHearing(hearing);
            proceeding.setProceedingDate(hearing.getScheduledAt().toLocalDate());
            proceeding.setSummary(request.proceeding().summary().trim());
            proceeding.setRemarks(Texts.clean(request.proceeding().remarks()));
            proceeding.setRecordedBy(users.getReferenceById(actor.id()));
            proceedings.save(proceeding);
            audit.record(actor, AuditAction.PROCEEDING_RECORDED, "PROCEEDING", proceeding.getId(), courtCase.getId(),
                    "Recorded proceedings of " + Formats.date(hearing.getScheduledAt().toLocalDate()) + " in "
                            + courtCase.getCaseNumber());
        }

        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.HEARING_CONCLUDED,
                completed ? "Hearing completed" : "Hearing adjourned",
                courtCase.getCaseNumber() + " (" + heldOn + "): " + Texts.truncate(outcome, 400), courtCase.getId());

        if (completed && courtCase.getStatus() == CaseStatus.UNDER_REVIEW) {
            caseService.applySystemTransition(courtCase, CaseStatus.ACTIVE,
                    "Taken up for hearing on " + Formats.date(hearing.getScheduledAt().toLocalDate()), actor);
        }
        if (request.nextHearing() != null) {
            ensureCanSchedule(courtCase, access.permissions(actor, courtCase));
            createHearing(courtCase, request.nextHearing(), actor);
        }
        refreshNextHearing(courtCase);
        return HearingResponse.from(hearing, now());
    }

    // ------------------------------------------------------------------ reactions to case events

    /** A decided case no longer needs court time: vacate whatever is still on the board. */
    @EventListener
    public void onCaseStatusChanged(CaseEvents.StatusChanged event) {
        if (event.to().isPending()) {
            return;
        }
        CourtCase courtCase = event.courtCase();
        List<Hearing> scheduled = hearings.findByCourtCaseIdAndStatus(courtCase.getId(), HearingStatus.SCHEDULED);
        if (scheduled.isEmpty()) {
            return;
        }
        String reason = "Vacated: case " + event.to().label().toLowerCase();
        scheduled.forEach(h -> {
            h.setStatus(HearingStatus.CANCELLED);
            h.setStatusReason(reason);
        });
        refreshNextHearing(courtCase);
        audit.record(event.actor(), AuditAction.HEARING_CANCELLED, "CASE", courtCase.getId(), courtCase.getId(),
                "Vacated " + scheduled.size() + " scheduled hearing(s) of " + courtCase.getCaseNumber() + " after it was "
                        + event.to().label().toLowerCase());
    }

    /** Upcoming hearings follow the case to its new bench. */
    @EventListener
    public void onJudgeChanged(CaseEvents.JudgeChanged event) {
        CourtCase courtCase = event.courtCase();
        LocalDateTime now = now();
        hearings.findByCourtCaseIdAndStatus(courtCase.getId(), HearingStatus.SCHEDULED).stream()
                .filter(h -> h.getScheduledAt().isAfter(now))
                .forEach(h -> h.setJudge(courtCase.getJudge()));
    }

    // ------------------------------------------------------------------ internals

    private Hearing createHearing(CourtCase courtCase, ScheduleHearingRequest request, AuthenticatedUser actor) {
        int duration = rules.durationOrDefault(request.durationMinutes());
        rules.validateSlot(request.scheduledAt(), duration);
        Courtroom courtroom = resolveCourtroom(courtCase, request.courtroomId());
        rules.ensureNoConflicts(courtCase.getJudge().getId(), courtroom.getId(), request.scheduledAt(), duration, null,
                request.overrideConflicts());

        Hearing hearing = new Hearing();
        hearing.setCourtCase(courtCase);
        hearing.setJudge(courtCase.getJudge());
        hearing.setCourtroom(courtroom);
        hearing.setScheduledAt(request.scheduledAt());
        hearing.setDurationMinutes(duration);
        hearing.setHearingType(request.hearingType());
        hearing.setStatus(HearingStatus.SCHEDULED);
        hearing.setPurpose(Texts.clean(request.purpose()));
        hearing.setCreatedBy(users.getReferenceById(actor.id()));
        hearings.save(hearing);
        refreshNextHearing(courtCase);

        String what = hearing.getHearingType().label() + " for " + courtCase.getCaseNumber() + " on "
                + Formats.dateTime(hearing.getScheduledAt()) + " in " + courtroom.getName();
        audit.record(actor, AuditAction.HEARING_SCHEDULED, "HEARING", hearing.getId(), courtCase.getId(),
                "Scheduled " + Texts.lowerFirst(what) + (request.overrideConflicts() ? " (scheduling clash acknowledged)" : ""));
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.HEARING_SCHEDULED,
                "Hearing scheduled", what + ".", courtCase.getId());
        return hearing;
    }

    private void ensureCanSchedule(CourtCase courtCase, CasePermissions permissions) {
        if (permissions.canScheduleHearing()) {
            return;
        }
        if (!courtCase.getStatus().isPending()) {
            throw ApiException.conflict("CASE_DECIDED",
                    "Hearings cannot be scheduled for a case that is " + courtCase.getStatus().label() + ".");
        }
        if (courtCase.getJudge() == null) {
            throw ApiException.conflict("JUDGE_REQUIRED", "Assign a judge before scheduling hearings.");
        }
        throw ApiException.forbidden("Only court staff or the presiding judge can schedule hearings.");
    }

    private static void ensureScheduled(Hearing hearing, String action) {
        if (!hearing.isScheduled()) {
            throw ApiException.conflict("HEARING_NOT_SCHEDULED", "This hearing is already "
                    + hearing.getStatus().name().toLowerCase() + " and cannot be " + action + ".");
        }
    }

    private Hearing requireHearing(Long hearingId, AuthenticatedUser user) {
        Hearing hearing = hearings.findById(hearingId).orElseThrow(() -> ApiException.notFound("Hearing", hearingId));
        access.requireVisible(hearing.getCourtCase().getId(), user);
        return hearing;
    }

    private Courtroom resolveCourtroom(CourtCase courtCase, Long courtroomId) {
        Courtroom room = courtrooms.findById(courtroomId)
                .orElseThrow(() -> ApiException.notFound("Courtroom", courtroomId));
        if (!room.getCourt().getId().equals(courtCase.getCourt().getId())) {
            throw ApiException.badRequest("COURTROOM_MISMATCH",
                    room.getName() + " is not part of " + courtCase.getCourt().getName() + ".");
        }
        if (!room.isActive()) {
            throw ApiException.badRequest("COURTROOM_INACTIVE", room.getName() + " is not in use.");
        }
        return room;
    }

    void refreshNextHearing(CourtCase courtCase) {
        courtCase.setNextHearingAt(hearings
                .findFirstByCourtCaseIdAndStatusOrderByScheduledAtAsc(courtCase.getId(), HearingStatus.SCHEDULED)
                .map(Hearing::getScheduledAt)
                .orElse(null));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
