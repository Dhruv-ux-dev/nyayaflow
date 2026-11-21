package com.nyayaflow.seed;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseLawyer;
import com.nyayaflow.cases.CaseNumberGenerator;
import com.nyayaflow.cases.CaseRepository;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseStatusChange;
import com.nyayaflow.cases.CaseStatusChangeRepository;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.cases.Party;
import com.nyayaflow.cases.PartySide;
import com.nyayaflow.common.Formats;
import com.nyayaflow.common.Texts;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.Courtroom;
import com.nyayaflow.deadline.Deadline;
import com.nyayaflow.deadline.DeadlineRepository;
import com.nyayaflow.deadline.DeadlineStatus;
import com.nyayaflow.document.CaseDocument;
import com.nyayaflow.document.DocumentRepository;
import com.nyayaflow.document.DocumentVersion;
import com.nyayaflow.document.FileStorageService;
import com.nyayaflow.hearing.Hearing;
import com.nyayaflow.hearing.HearingRepository;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.Proceeding;
import com.nyayaflow.hearing.ProceedingRepository;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.order.CourtOrder;
import com.nyayaflow.order.CourtOrderRepository;
import com.nyayaflow.seed.CaseScript.Assign;
import com.nyayaflow.seed.CaseScript.DeadlineEvent;
import com.nyayaflow.seed.CaseScript.Doc;
import com.nyayaflow.seed.CaseScript.HearingEvent;
import com.nyayaflow.seed.CaseScript.OrderEvent;
import com.nyayaflow.seed.CaseScript.StatusEvent;
import com.nyayaflow.user.User;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Replays a {@link CaseScript} into real records — case, hearings, proceedings, documents (with
 * generated PDFs), orders, deadlines, status history, audit trail and notifications — with timestamps
 * in the past, applying the same lifecycle rules as the live services.
 */
@Component
class DemoCaseWriter {

    private static final Duration NOTIFY_WINDOW = Duration.ofDays(14);
    private static final Duration UNREAD_WINDOW = Duration.ofDays(2);
    private static final LocalTime DAY_END = LocalTime.of(17, 30);

    private final CaseRepository cases;
    private final CaseStatusChangeRepository statusChanges;
    private final HearingRepository hearings;
    private final ProceedingRepository proceedings;
    private final CourtOrderRepository orders;
    private final DocumentRepository documents;
    private final DeadlineRepository deadlines;
    private final CaseNumberGenerator caseNumbers;
    private final FileStorageService storage;
    private final AuditService audit;
    private final NotificationService notifications;
    private final JdbcClient jdbc;
    private final Clock clock;

    DemoCaseWriter(CaseRepository cases, CaseStatusChangeRepository statusChanges, HearingRepository hearings,
                   ProceedingRepository proceedings, CourtOrderRepository orders, DocumentRepository documents,
                   DeadlineRepository deadlines, CaseNumberGenerator caseNumbers, FileStorageService storage,
                   AuditService audit, NotificationService notifications, JdbcClient jdbc, Clock clock) {
        this.cases = cases;
        this.statusChanges = statusChanges;
        this.hearings = hearings;
        this.proceedings = proceedings;
        this.orders = orders;
        this.documents = documents;
        this.deadlines = deadlines;
        this.caseNumbers = caseNumbers;
        this.storage = storage;
        this.audit = audit;
        this.notifications = notifications;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    void writeAll(List<CaseScript> scripts, Map<String, User> people, Map<String, Court> courts) {
        Board board = new Board();
        Map<Long, Instant> lastActivity = new HashMap<>();
        scripts.stream()
                .sorted(Comparator.comparingInt(s -> s.filedDay))
                .forEach(script -> {
                    CaseRun run = new CaseRun(script, people, courts, board);
                    run.write();
                    lastActivity.put(run.courtCase.getId(), run.lastEvent);
                });
        cases.flush();
        // Entity callbacks stamp "now" on update; restore each case's real last-activity time.
        lastActivity.forEach((id, at) -> jdbc.sql("UPDATE cases SET updated_at = :at WHERE id = :id")
                .param("at", java.sql.Timestamp.from(at))
                .param("id", id)
                .update());
    }

    /** Tracks occupied judge and courtroom slots so seeded hearings never clash. */
    private static final class Board {
        private final Map<String, List<LocalDateTime[]>> busy = new HashMap<>();

        LocalDateTime allocate(LocalDate date, LocalTime preferred, User judge, Courtroom room, int minutes) {
            for (LocalTime time = preferred; !time.plusMinutes(minutes).isAfter(DAY_END); time = time.plusMinutes(30)) {
                LocalDateTime start = date.atTime(time);
                LocalDateTime end = start.plusMinutes(minutes);
                String judgeKey = "J" + judge.getId() + date;
                String roomKey = room == null ? null : "R" + room.getId() + date;
                if (free(judgeKey, start, end) && (roomKey == null || free(roomKey, start, end))) {
                    occupy(judgeKey, start, end);
                    if (roomKey != null) {
                        occupy(roomKey, start, end);
                    }
                    return start;
                }
            }
            return date.atTime(preferred);
        }

        private boolean free(String key, LocalDateTime start, LocalDateTime end) {
            return busy.getOrDefault(key, List.of()).stream().noneMatch(s -> s[0].isBefore(end) && s[1].isAfter(start));
        }

        private void occupy(String key, LocalDateTime start, LocalDateTime end) {
            busy.computeIfAbsent(key, k -> new ArrayList<>()).add(new LocalDateTime[] {start, end});
        }
    }

    /** State while replaying one case. */
    private final class CaseRun {
        private final CaseScript script;
        private final Map<String, User> people;
        private final Board board;
        private final Court court;
        private final User registrar;
        private final LocalDate today = LocalDate.now(clock);
        private final LocalDateTime now = LocalDateTime.now(clock);
        private final Map<Integer, Hearing> hearingsByDay = new HashMap<>();
        private final List<Hearing> caseHearings = new ArrayList<>();
        private CourtCase courtCase;
        private Hearing lastHearing;
        private Instant lastEvent;
        private Instant assignedAt;

        CaseRun(CaseScript script, Map<String, User> people, Map<String, Court> courts, Board board) {
            this.script = script;
            this.people = people;
            this.board = board;
            this.court = courts.get(script.courtCode);
            this.registrar = people.get(script.registeredBy);
        }

        void write() {
            LocalDate filed = today.plusDays(script.filedDay);
            Instant created = instant(past(filed.atTime(11, 0)));
            courtCase = new CourtCase();
            courtCase.setCaseNumber(caseNumbers.next(script.type, filed.getYear()));
            courtCase.setTitle(script.title);
            courtCase.setCaseType(script.type);
            courtCase.setDescription(script.description);
            courtCase.setPriority(script.priority);
            courtCase.setFilingDate(filed);
            courtCase.setCourt(court);
            courtCase.setCourtroom(script.roomName == null ? null : room(script.roomName));
            courtCase.setStatus(CaseStatus.FILED);
            courtCase.setCreatedBy(registrar);
            courtCase.setCreatedAt(created);
            courtCase.setUpdatedAt(created);
            for (CaseScript.PartySeed seed : script.parties) {
                Party party = new Party();
                party.setSide(seed.side());
                party.setPartyType(seed.type());
                party.setName(seed.name());
                party.setAddress(seed.address());
                party.setPosition(courtCase.getParties().size());
                courtCase.addParty(party);
            }
            for (CaseScript.CounselSeed seed : script.counsel) {
                CaseLawyer appearance = new CaseLawyer();
                appearance.setLawyer(person(seed.lawyer()));
                appearance.setSide(seed.side());
                appearance.setLeadCounsel(seed.lead());
                appearance.setAddedAt(created);
                courtCase.addLawyer(appearance);
            }
            cases.save(courtCase);
            lastEvent = created;

            recordStatus(null, CaseStatus.FILED, "Case registered", registrar, created);
            log(created, registrar, AuditAction.CASE_CREATED, "CASE", courtCase.getId(),
                    "Registered " + courtCase.getCaseNumber() + " — " + courtCase.partiesLabel());
            for (CaseLawyer appearance : courtCase.getLawyers()) {
                String side = appearance.getSide() == PartySide.PETITIONER ? "petitioner" : "respondent";
                log(created, registrar, AuditAction.LAWYER_ADDED, "CASE", courtCase.getId(),
                        "Added " + appearance.getLawyer().getFullName() + " as counsel for the " + side + " in "
                                + courtCase.getCaseNumber());
                notifyRecent(List.of(appearance.getLawyer().getId()), registrar, NotificationType.LAWYER_ADDED,
                        "Added to a case", "You have been added as counsel for the " + side + " in "
                                + courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ").", created);
            }

            for (CaseScript.Event event : script.timeline()) {
                switch (event) {
                    case Assign assign -> assign(assign);
                    case Doc doc -> document(doc);
                    case HearingEvent hearing -> hearing(hearing);
                    case OrderEvent order -> order(order);
                    case StatusEvent status -> status(status);
                    case DeadlineEvent deadline -> deadline(deadline);
                }
            }
            courtCase.setNextHearingAt(caseHearings.stream()
                    .filter(Hearing::isScheduled)
                    .map(Hearing::getScheduledAt)
                    .min(Comparator.naturalOrder())
                    .orElse(null));
        }

        private void assign(Assign event) {
            User judge = person(event.judge());
            User by = person(event.by());
            Instant at = after(instant(past(today.plusDays(event.day()).atTime(12, 0))));
            courtCase.setJudge(judge);
            assignedAt = at;
            log(at, by, AuditAction.JUDGE_ASSIGNED, "CASE", courtCase.getId(),
                    "Assigned " + courtCase.getCaseNumber() + " to " + judge.getFullName());
            notifyRecent(List.of(judge.getId()), by, NotificationType.CASE_ASSIGNED, "New case assigned",
                    courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ") has been assigned to you.", at);
            notifyRecent(CaseService.lawyerIds(courtCase), by, NotificationType.CASE_ASSIGNED, "Bench assigned",
                    courtCase.getCaseNumber() + " will be heard by " + judge.getFullName() + ".", at);
            transition(CaseStatus.UNDER_REVIEW, "Allocated to " + judge.getFullName(), by, at.plusSeconds(1));
        }

        private void document(Doc event) {
            User uploader = person(event.uploader());
            Instant at = after(instant(past(today.plusDays(event.day()).atTime(15, 30))));
            LocalDate date = LocalDateTime.ofInstant(at, clock.getZone()).toLocalDate();
            byte[] pdf = DemoPdf.render(court.getName(), courtCase.getCaseNumber() + "   |   " + courtCase.getTitle(),
                    event.title(), List.of(event.description(),
                            "Filed by " + uploader.getFullName() + " on " + Formats.date(date) + ".",
                            courtCase.getDescription()));
            FileStorageService.StoredFile stored = storage.store(pdf, slug(event.title()) + ".pdf");

            CaseDocument doc = new CaseDocument();
            doc.setCourtCase(courtCase);
            doc.setTitle(event.title());
            doc.setDocumentType(event.type());
            doc.setDescription(event.description());
            doc.setUploadedBy(uploader);
            doc.setCreatedAt(at);
            doc.setUpdatedAt(at);
            DocumentVersion version = new DocumentVersion();
            version.setVersionNumber(1);
            version.setOriginalFilename(stored.originalFilename());
            version.setContentType(stored.contentType());
            version.setSizeBytes(stored.sizeBytes());
            version.setSha256(stored.sha256());
            version.setStorageKey(stored.storageKey());
            version.setUploadedBy(uploader);
            version.setUploadedAt(at);
            doc.addVersion(version);
            documents.save(doc);

            lastEvent = latest(lastEvent, at);
            String typeLabel = humanize(event.type().name());
            log(at, uploader, AuditAction.DOCUMENT_UPLOADED, "DOCUMENT", doc.getId(),
                    uploader.getFullName() + " filed “" + doc.getTitle() + "” in " + courtCase.getCaseNumber());
            notifyRecent(CaseService.participantIds(courtCase), uploader, NotificationType.DOCUMENT_UPLOADED,
                    "New document filed", courtCase.getCaseNumber() + ": " + doc.getTitle() + " (" + typeLabel
                            + ") was uploaded by " + uploader.getFullName() + ".", at);
        }

        private void hearing(HearingEvent event) {
            User judge = courtCase.getJudge();
            Courtroom room = courtCase.getCourtroom() != null ? courtCase.getCourtroom() : court.getCourtrooms().getFirst();
            int minutes = event.type() == com.nyayaflow.hearing.HearingType.FINAL_ARGUMENTS ? 60 : 30;
            LocalDateTime start = board.allocate(hearingDate(event.day()), event.time(), judge, room, minutes);

            Instant scheduledOn = lastHearing != null
                    ? instant(lastHearing.endsAt())
                    : (assignedAt != null ? assignedAt.plus(Duration.ofHours(2)) : lastEvent);
            scheduledOn = earliest(scheduledOn, instant(start.minusHours(1)), instant(now.minusMinutes(30)));
            User scheduler = lastHearing != null ? judge : registrar;

            Hearing hearing = new Hearing();
            hearing.setCourtCase(courtCase);
            hearing.setJudge(judge);
            hearing.setCourtroom(room);
            hearing.setScheduledAt(start);
            hearing.setDurationMinutes(minutes);
            hearing.setHearingType(event.type());
            hearing.setStatus(event.status());
            hearing.setPurpose(event.purpose());
            hearing.setOutcome(event.outcome());
            hearing.setCreatedBy(scheduler);
            hearing.setCreatedAt(scheduledOn);
            hearing.setUpdatedAt(event.status() == HearingStatus.SCHEDULED ? scheduledOn : instant(hearing.endsAt()));
            hearings.save(hearing);
            caseHearings.add(hearing);
            hearingsByDay.put(event.day(), hearing);

            String what = event.type().label() + " for " + courtCase.getCaseNumber() + " on " + Formats.dateTime(start) + " in "
                    + room.getName();
            log(scheduledOn, scheduler, AuditAction.HEARING_SCHEDULED, "HEARING", hearing.getId(),
                    "Scheduled " + Texts.lowerFirst(what));
            notifyRecent(CaseService.participantIds(courtCase), scheduler, NotificationType.HEARING_SCHEDULED,
                    "Hearing scheduled", what + ".", scheduledOn);
            lastEvent = latest(lastEvent, scheduledOn);

            if (event.status() != HearingStatus.SCHEDULED) {
                Instant concluded = instant(hearing.endsAt());
                boolean completed = event.status() == HearingStatus.COMPLETED;
                log(concluded, judge, completed ? AuditAction.HEARING_COMPLETED : AuditAction.HEARING_ADJOURNED,
                        "HEARING", hearing.getId(), event.type().label() + " in " + courtCase.getCaseNumber() + " on "
                                + Formats.dateTime(start) + (completed ? " completed: " : " adjourned: ") + event.outcome());
                notifyRecent(CaseService.participantIds(courtCase), judge, NotificationType.HEARING_CONCLUDED,
                        completed ? "Hearing completed" : "Hearing adjourned",
                        courtCase.getCaseNumber() + " (" + Formats.dateTime(start) + "): " + event.outcome(), concluded);
                lastEvent = latest(lastEvent, concluded);
                if (event.proceedings() != null) {
                    User recorder = event.day() % 2 == 0 ? judge : courtMaster();
                    Proceeding proceeding = new Proceeding();
                    proceeding.setCourtCase(courtCase);
                    proceeding.setHearing(hearing);
                    proceeding.setProceedingDate(start.toLocalDate());
                    proceeding.setSummary(event.proceedings());
                    proceeding.setRemarks(event.outcome());
                    proceeding.setRecordedBy(recorder);
                    Instant recorded = concluded.plus(Duration.ofMinutes(15));
                    proceeding.setCreatedAt(recorded);
                    proceeding.setUpdatedAt(recorded);
                    proceedings.save(proceeding);
                    log(recorded, recorder, AuditAction.PROCEEDING_RECORDED, "PROCEEDING", proceeding.getId(),
                            "Recorded proceedings of " + Formats.date(start.toLocalDate()) + " in " + courtCase.getCaseNumber());
                    lastEvent = latest(lastEvent, recorded);
                }
                if (completed && courtCase.getStatus() == CaseStatus.UNDER_REVIEW) {
                    transition(CaseStatus.ACTIVE, "Taken up for hearing on " + Formats.date(start.toLocalDate()), judge,
                            concluded.plusSeconds(30));
                }
            }
            lastHearing = hearing;
        }

        private void order(OrderEvent event) {
            User judge = courtCase.getJudge();
            Hearing linked = hearingsByDay.get(event.day());
            Instant at = linked != null
                    ? instant(linked.endsAt().plusMinutes(5))
                    : after(instant(past(today.plusDays(event.day()).atTime(16, 0))));
            CourtOrder order = new CourtOrder();
            order.setCourtCase(courtCase);
            order.setHearing(linked);
            order.setOrderType(event.type());
            order.setTitle(event.title());
            order.setContent(event.content());
            order.setOrderDate(LocalDateTime.ofInstant(at, clock.getZone()).toLocalDate());
            order.setIssuedBy(judge);
            order.setCreatedAt(at);
            orders.save(order);
            log(at, judge, AuditAction.ORDER_ISSUED, "ORDER", order.getId(),
                    event.type().label() + " issued in " + courtCase.getCaseNumber() + ": " + event.title());
            notifyRecent(CaseService.participantIds(courtCase), judge, NotificationType.ORDER_ISSUED,
                    event.type().label() + " issued", courtCase.getCaseNumber() + ": " + event.title(), at);
            lastEvent = latest(lastEvent, at);
            if (event.type().isFinal()) {
                transition(CaseStatus.DISPOSED, "Disposed by " + event.type().label().toLowerCase() + ": "
                        + event.title(), judge, at.plusSeconds(60));
            }
        }

        private void status(StatusEvent event) {
            Instant at = after(instant(past(today.plusDays(event.day()).atTime(16, 30))));
            transition(event.to(), event.note(), person(event.actor()), at);
        }

        private void deadline(DeadlineEvent event) {
            User creator = person(event.creator());
            User assignee = event.assignee() == null ? null : person(event.assignee());
            Instant created = after(instant(past(today.plusDays(event.createdDay()).atTime(10, 0))));
            Deadline deadline = new Deadline();
            deadline.setCourtCase(courtCase);
            deadline.setTitle(event.title());
            deadline.setDescription(event.description());
            deadline.setDueDate(today.plusDays(event.day()));
            deadline.setPriority(event.priority());
            deadline.setAssignedTo(assignee);
            deadline.setCreatedBy(creator);
            deadline.setCreatedAt(created);
            deadline.setStatus(event.completed() ? DeadlineStatus.COMPLETED : DeadlineStatus.PENDING);
            Instant completed = null;
            if (event.completed()) {
                completed = latest(created.plus(Duration.ofHours(4)),
                        earliest(instant(today.plusDays(event.day()).atTime(12, 0)), instant(now.minusHours(1))));
                deadline.setCompletedAt(completed);
                deadline.setCompletedBy(assignee == null ? creator : assignee);
                deadline.setUpdatedAt(completed);
            } else {
                deadline.setUpdatedAt(created);
            }
            deadlines.save(deadline);
            log(created, creator, AuditAction.DEADLINE_CREATED, "DEADLINE", deadline.getId(),
                    "Set deadline “" + event.title() + "” in " + courtCase.getCaseNumber() + " due "
                            + Formats.date(deadline.getDueDate()));
            if (assignee != null) {
                notifyRecent(List.of(assignee.getId()), creator, NotificationType.DEADLINE_ASSIGNED,
                        "Deadline assigned to you", "“" + event.title() + "” in " + courtCase.getCaseNumber()
                                + ", due " + Formats.date(deadline.getDueDate()) + ".", created);
            }
            lastEvent = latest(lastEvent, created);
            if (completed != null) {
                log(completed, deadline.getCompletedBy(), AuditAction.DEADLINE_COMPLETED, "DEADLINE", deadline.getId(),
                        "Completed “" + event.title() + "” in " + courtCase.getCaseNumber());
                lastEvent = latest(lastEvent, completed);
            }
        }

        private void transition(CaseStatus to, String note, User actor, Instant at) {
            CaseStatus from = courtCase.getStatus();
            if (!from.canTransitionTo(to)) {
                throw new IllegalStateException("Demo script for " + script.title + " moves " + from + " to " + to);
            }
            courtCase.setStatus(to);
            LocalDate date = LocalDateTime.ofInstant(at, clock.getZone()).toLocalDate();
            if (to == CaseStatus.DISPOSED) {
                courtCase.setDisposedOn(date);
            } else if (to == CaseStatus.CLOSED) {
                courtCase.setClosedOn(date);
            }
            recordStatus(from, to, note, actor, at);
            log(at, actor, AuditAction.CASE_STATUS_CHANGED, "CASE", courtCase.getId(),
                    courtCase.getCaseNumber() + " moved from " + from.label() + " to " + to.label() + " — " + note);
            notifyRecent(CaseService.participantIds(courtCase), actor, NotificationType.CASE_STATUS_CHANGED,
                    "Case status updated", courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ") is now "
                            + to.label() + ".", at);
            lastEvent = latest(lastEvent, at);
        }

        private void recordStatus(CaseStatus from, CaseStatus to, String note, User actor, Instant at) {
            CaseStatusChange change = new CaseStatusChange();
            change.setCourtCase(courtCase);
            change.setFromStatus(from);
            change.setToStatus(to);
            change.setNote(note);
            change.setChangedBy(actor);
            change.setChangedAt(at);
            statusChanges.save(change);
        }

        private void log(Instant at, User actor, AuditAction action, String entityType, Long entityId, String summary) {
            audit.recordAt(at, actor.getId(), actor.getFullName(), action, entityType, entityId, courtCase.getId(),
                    summary);
        }

        /** Notifications only for the last two weeks, as a real inbox would show; older ones are read. */
        private void notifyRecent(Collection<Long> recipients, User actor, NotificationType type, String title,
                                  String message, Instant at) {
            Instant cutoff = clock.instant().minus(NOTIFY_WINDOW);
            if (at.isBefore(cutoff)) {
                return;
            }
            boolean read = at.isBefore(clock.instant().minus(UNREAD_WINDOW));
            recipients.stream()
                    .distinct()
                    .filter(id -> !id.equals(actor.getId()))
                    .forEach(id -> notifications.createAt(id, type, title, message, courtCase.getId(), at, read));
        }

        private User courtMaster() {
            return court.getCode().equals("ICC") ? person("suresh") : person("lakshmi");
        }

        private Courtroom room(String name) {
            return court.getCourtrooms().stream().filter(r -> r.getName().equals(name)).findFirst()
                    .orElseThrow(() -> new IllegalStateException("Unknown courtroom " + name));
        }

        private User person(String key) {
            User user = people.get(key);
            if (user == null) {
                throw new IllegalStateException("Unknown demo person " + key);
            }
            return user;
        }

        /** Courts do not sit on Sundays: move to the nearest working day in the same direction. */
        private LocalDate hearingDate(int day) {
            LocalDate date = today.plusDays(day);
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                return day >= 0 ? date.plusDays(1) : date.minusDays(1);
            }
            return date;
        }

        /** Completed events cannot be in the future. */
        private LocalDateTime past(LocalDateTime time) {
            LocalDateTime limit = now.minusMinutes(10);
            return time.isAfter(limit) ? limit : time;
        }

        /** Keeps events in script order when the clock was clamped. */
        private Instant after(Instant at) {
            return at.isAfter(lastEvent) ? at : lastEvent.plusSeconds(60);
        }

        private Instant instant(LocalDateTime time) {
            return time.atZone(clock.getZone()).toInstant();
        }
    }

    private static Instant latest(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }

    private static Instant earliest(Instant first, Instant... others) {
        Instant result = first;
        for (Instant other : others) {
            if (other.isBefore(result)) {
                result = other;
            }
        }
        return result;
    }

    private static String humanize(String enumName) {
        String words = enumName.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }

    private static String slug(String title) {
        String slug = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.length() > 60 ? slug.substring(0, 60) : slug;
    }
}
