package com.nyayaflow.hearing;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.Formats;
import com.nyayaflow.common.Texts;
import com.nyayaflow.hearing.dto.ProceedingResponse;
import com.nyayaflow.hearing.dto.RecordProceedingRequest;
import com.nyayaflow.hearing.dto.UpdateProceedingRequest;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProceedingService {

    private final ProceedingRepository proceedings;
    private final HearingRepository hearings;
    private final CaseAccess access;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public ProceedingService(ProceedingRepository proceedings, HearingRepository hearings, CaseAccess access,
                             UserRepository users, AuditService audit, NotificationService notifications,
                             Clock clock) {
        this.proceedings = proceedings;
        this.hearings = hearings;
        this.access = access;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProceedingResponse> listForCase(Long caseId, AuthenticatedUser user) {
        CourtCase courtCase = access.requireVisible(caseId, user);
        return proceedings.findByCourtCaseIdOrderByProceedingDateAscIdAsc(caseId).stream()
                .map(p -> ProceedingResponse.from(p, isEditable(p, courtCase, user)))
                .toList();
    }

    @Transactional
    public ProceedingResponse record(Long caseId, RecordProceedingRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canRecordProceeding(),
                courtCase.isClosed() ? "Proceedings cannot be added to a closed case."
                        : "Only court staff or the presiding judge can record proceedings.");
        if (request.proceedingDate().isAfter(LocalDate.now(clock))) {
            throw ApiException.badRequest("DATE_IN_FUTURE", "Proceedings can only be recorded for past or current dates.");
        }
        Hearing hearing = null;
        if (request.hearingId() != null) {
            hearing = hearings.findById(request.hearingId())
                    .orElseThrow(() -> ApiException.notFound("Hearing", request.hearingId()));
            if (!hearing.getCourtCase().getId().equals(caseId)) {
                throw ApiException.badRequest("HEARING_MISMATCH", "The selected hearing belongs to another case.");
            }
            if (hearing.getStatus() == HearingStatus.CANCELLED) {
                throw ApiException.badRequest("HEARING_CANCELLED", "Proceedings cannot be recorded for a cancelled hearing.");
            }
        }

        Proceeding proceeding = new Proceeding();
        proceeding.setCourtCase(courtCase);
        proceeding.setHearing(hearing);
        proceeding.setProceedingDate(request.proceedingDate());
        proceeding.setSummary(request.summary().trim());
        proceeding.setRemarks(Texts.clean(request.remarks()));
        proceeding.setRecordedBy(users.getReferenceById(actor.id()));
        proceedings.save(proceeding);

        audit.record(actor, AuditAction.PROCEEDING_RECORDED, "PROCEEDING", proceeding.getId(), courtCase.getId(),
                "Recorded proceedings of " + Formats.date(request.proceedingDate()) + " in " + courtCase.getCaseNumber());
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.PROCEEDING_RECORDED,
                "Proceedings recorded", courtCase.getCaseNumber() + ": proceedings of " + Formats.date(request.proceedingDate())
                        + " are now on record.", courtCase.getId());
        return ProceedingResponse.from(proceeding, true);
    }

    /** Only the person who recorded a proceeding may correct it, and only while the case is open. */
    @Transactional
    public ProceedingResponse update(Long proceedingId, UpdateProceedingRequest request, AuthenticatedUser actor) {
        Proceeding proceeding = proceedings.findById(proceedingId)
                .orElseThrow(() -> ApiException.notFound("Proceeding", proceedingId));
        CourtCase courtCase = access.requireVisible(proceeding.getCourtCase().getId(), actor);
        access.require(isEditable(proceeding, courtCase, actor),
                "Only the person who recorded these proceedings can edit them while the case is open.");
        proceeding.setSummary(request.summary().trim());
        proceeding.setRemarks(Texts.clean(request.remarks()));
        audit.record(actor, AuditAction.PROCEEDING_UPDATED, "PROCEEDING", proceeding.getId(), courtCase.getId(),
                "Corrected proceedings of " + Formats.date(proceeding.getProceedingDate()) + " in " + courtCase.getCaseNumber());
        return ProceedingResponse.from(proceeding, true);
    }

    private static boolean isEditable(Proceeding proceeding, CourtCase courtCase, AuthenticatedUser user) {
        return !courtCase.isClosed() && proceeding.getRecordedBy().getId().equals(user.id());
    }
}
