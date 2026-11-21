package com.nyayaflow.timeline;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditEventRepository;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseStatusChange;
import com.nyayaflow.cases.CaseStatusChangeRepository;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.Texts;
import com.nyayaflow.document.CaseDocument;
import com.nyayaflow.document.DocumentRepository;
import com.nyayaflow.hearing.Hearing;
import com.nyayaflow.hearing.HearingRepository;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.Proceeding;
import com.nyayaflow.hearing.ProceedingRepository;
import com.nyayaflow.order.CourtOrder;
import com.nyayaflow.order.CourtOrderRepository;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.timeline.TimelineEntry.Kind;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assembles the chronological story of a case from the records themselves (hearings on their dates,
 * orders on their order dates) rather than from when they were typed in, so the timeline reflects
 * the life of the case.
 */
@Service
public class TimelineService {

    private final CaseAccess access;
    private final CaseStatusChangeRepository statusChanges;
    private final AuditEventRepository auditEvents;
    private final HearingRepository hearings;
    private final ProceedingRepository proceedings;
    private final DocumentRepository documents;
    private final CourtOrderRepository orders;
    private final Clock clock;

    public TimelineService(CaseAccess access, CaseStatusChangeRepository statusChanges,
                           AuditEventRepository auditEvents, HearingRepository hearings,
                           ProceedingRepository proceedings, DocumentRepository documents, CourtOrderRepository orders,
                           Clock clock) {
        this.access = access;
        this.statusChanges = statusChanges;
        this.auditEvents = auditEvents;
        this.hearings = hearings;
        this.proceedings = proceedings;
        this.documents = documents;
        this.orders = orders;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TimelineEntry> timeline(Long caseId, AuthenticatedUser user) {
        CourtCase courtCase = access.requireVisible(caseId, user);
        LocalDateTime now = LocalDateTime.now(clock);
        List<TimelineEntry> entries = new ArrayList<>();

        entries.add(new TimelineEntry("filed-" + caseId, Kind.FILED, courtCase.getFilingDate().atTime(LocalTime.of(9, 0)),
                "Case filed", "Registered as " + courtCase.getCaseNumber() + " — " + courtCase.partiesLabel(),
                courtCase.getCreatedBy() == null ? null : courtCase.getCreatedBy().getFullName(), null, true, false,
                caseId));

        for (CaseStatusChange change : statusChanges.findByCourtCaseIdOrderByChangedAtAsc(caseId)) {
            if (change.getFromStatus() == null) {
                continue;
            }
            entries.add(new TimelineEntry("status-" + change.getId(), Kind.STATUS, local(change.getChangedAt()),
                    "Status: " + change.getToStatus().label(), change.getNote(),
                    change.getChangedBy() == null ? null : change.getChangedBy().getFullName(),
                    change.getToStatus().name(), true, false, change.getId()));
        }

        auditEvents.findByCaseIdAndActionInOrderByOccurredAtAsc(caseId, List.of(AuditAction.JUDGE_ASSIGNED))
                .forEach(event -> entries.add(new TimelineEntry("assign-" + event.getId(), Kind.ASSIGNMENT,
                        local(event.getOccurredAt()), "Judge assigned", event.getSummary(), event.getActorName(),
                        null, true, false, event.getId())));

        for (Hearing hearing : hearings.findByCourtCaseIdOrderByScheduledAtAsc(caseId)) {
            boolean upcoming = hearing.isScheduled() && hearing.getScheduledAt().isAfter(now);
            String description = switch (hearing.getStatus()) {
                case SCHEDULED -> hearing.getPurpose();
                case CANCELLED -> hearing.getStatusReason();
                default -> hearing.getOutcome();
            };
            String where = hearing.getCourtroom() == null ? "" : " in " + hearing.getCourtroom().getName();
            entries.add(new TimelineEntry("hearing-" + hearing.getId(), Kind.HEARING, hearing.getScheduledAt(),
                    hearing.getHearingType().label() + where, description,
                    hearing.getJudge() == null ? null : hearing.getJudge().getFullName(), hearing.getStatus().name(),
                    false, upcoming, hearing.getId()));
        }

        for (Proceeding proceeding : proceedings.findByCourtCaseIdOrderByProceedingDateAscIdAsc(caseId)) {
            LocalDateTime at = proceeding.getHearing() != null
                    && proceeding.getHearing().getStatus() != HearingStatus.SCHEDULED
                    ? proceeding.getHearing().endsAt()
                    : proceeding.getProceedingDate().atTime(LocalTime.of(17, 0));
            entries.add(new TimelineEntry("proceeding-" + proceeding.getId(), Kind.PROCEEDING, at,
                    "Proceedings recorded", Texts.truncate(proceeding.getSummary(), 280),
                    proceeding.getRecordedBy().getFullName(), null, false, false, proceeding.getId()));
        }

        for (CaseDocument document : documents.findByCourtCaseIdAndDeletedAtIsNullOrderByCreatedAtDesc(caseId)) {
            entries.add(new TimelineEntry("document-" + document.getId(), Kind.DOCUMENT, local(document.getCreatedAt()),
                    humanize(document.getDocumentType().name()) + " filed", document.getTitle(),
                    document.getUploadedBy().getFullName(), document.getDocumentType().name(), false, false,
                    document.getId()));
        }

        for (CourtOrder order : orders.findByCourtCaseIdOrderByOrderDateAscIdAsc(caseId)) {
            LocalDateTime at = order.getHearing() != null
                    ? order.getHearing().endsAt().plusMinutes(1)
                    : order.getOrderDate().atTime(local(order.getCreatedAt()).toLocalTime());
            entries.add(new TimelineEntry("order-" + order.getId(), Kind.ORDER, at,
                    order.getTitle(), Texts.truncate(order.getContent(), 280),
                    order.getIssuedBy().getFullName(), order.getOrderType().name(), order.getOrderType().isFinal(),
                    false, order.getId()));
        }

        entries.sort(Comparator.comparing(TimelineEntry::occurredAt).thenComparing(e -> e.kind().ordinal()));
        return entries;
    }

    private LocalDateTime local(Instant instant) {
        return LocalDateTime.ofInstant(instant, clock.getZone());
    }

    private static String humanize(String enumName) {
        String words = enumName.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }
}
