package com.nyayaflow.cases;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.dto.AssignJudgeRequest;
import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.cases.dto.CaseLawyerResponse;
import com.nyayaflow.cases.dto.CaseSummaryResponse;
import com.nyayaflow.cases.dto.ChangeStatusRequest;
import com.nyayaflow.cases.dto.CreateCaseRequest;
import com.nyayaflow.cases.dto.LawyerAppearanceRequest;
import com.nyayaflow.cases.dto.PartyRequest;
import com.nyayaflow.cases.dto.PartyResponse;
import com.nyayaflow.cases.dto.StatusChangeResponse;
import com.nyayaflow.cases.dto.UpdateCaseRequest;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.CourtRef;
import com.nyayaflow.court.CourtRepository;
import com.nyayaflow.court.Courtroom;
import com.nyayaflow.court.CourtroomRef;
import com.nyayaflow.court.CourtroomRepository;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import com.nyayaflow.user.dto.UserRef;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Case registration, metadata, assignment and lifecycle transitions. */
@Service
public class CaseService {

    private final CaseRepository cases;
    private final CaseStatusChangeRepository statusChanges;
    private final CourtRepository courts;
    private final CourtroomRepository courtrooms;
    private final UserRepository users;
    private final CaseNumberGenerator caseNumbers;
    private final CaseAccess access;
    private final AuditService audit;
    private final NotificationService notifications;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public CaseService(CaseRepository cases, CaseStatusChangeRepository statusChanges, CourtRepository courts,
                       CourtroomRepository courtrooms, UserRepository users, CaseNumberGenerator caseNumbers,
                       CaseAccess access, AuditService audit, NotificationService notifications,
                       ApplicationEventPublisher events, Clock clock) {
        this.cases = cases;
        this.statusChanges = statusChanges;
        this.courts = courts;
        this.courtrooms = courtrooms;
        this.users = users;
        this.caseNumbers = caseNumbers;
        this.access = access;
        this.audit = audit;
        this.notifications = notifications;
        this.events = events;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<CaseSummaryResponse> search(CaseSearchCriteria criteria, Pageable pageable,
                                                    AuthenticatedUser user) {
        Specification<CourtCase> spec = CaseScope.visibleTo(user).and(CaseSpecifications.matching(criteria));
        return PageResponse.of(cases.findAll(spec, pageable), CaseSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public CaseDetailResponse get(Long caseId, AuthenticatedUser user) {
        return toDetail(access.requireVisible(caseId, user), user);
    }

    // ------------------------------------------------------------------ registration & metadata

    @Transactional
    public CaseDetailResponse create(CreateCaseRequest request, AuthenticatedUser actor) {
        Court court = courts.findById(request.courtId())
                .orElseThrow(() -> ApiException.notFound("Court", request.courtId()));
        if (!court.isActive()) {
            throw ApiException.badRequest("COURT_INACTIVE", court.getName() + " is not accepting new cases.");
        }
        validateParties(request.parties());

        CourtCase courtCase = new CourtCase();
        courtCase.setTitle(request.title().trim());
        courtCase.setCaseType(request.caseType());
        courtCase.setDescription(Texts.clean(request.description()));
        courtCase.setPriority(request.priority());
        courtCase.setFilingDate(request.filingDate());
        courtCase.setCourt(court);
        courtCase.setCourtroom(resolveCourtroom(court, request.courtroomId()));
        courtCase.setStatus(CaseStatus.FILED);
        courtCase.setCreatedBy(users.getReferenceById(actor.id()));
        courtCase.setCaseNumber(caseNumbers.next(request.caseType(), request.filingDate().getYear()));
        request.parties().forEach(p -> courtCase.addParty(toParty(p, courtCase.getParties().size())));

        Instant now = clock.instant();
        List<User> addedLawyers = new ArrayList<>();
        if (request.lawyers() != null) {
            Set<Long> seen = new HashSet<>();
            for (LawyerAppearanceRequest appearance : request.lawyers()) {
                if (!seen.add(appearance.lawyerId())) {
                    throw ApiException.badRequest("DUPLICATE_LAWYER", "The same lawyer is listed more than once.");
                }
                User lawyer = requireActiveUser(appearance.lawyerId(), Role.LAWYER);
                courtCase.addLawyer(newAppearance(lawyer, appearance.side(), appearance.leadCounsel(), now));
                addedLawyers.add(lawyer);
            }
        }
        cases.save(courtCase);

        recordStatusChange(courtCase, null, CaseStatus.FILED, "Case registered", actor, now);
        audit.record(actor, AuditAction.CASE_CREATED, "CASE", courtCase.getId(), courtCase.getId(),
                "Registered " + courtCase.getCaseNumber() + " — " + courtCase.partiesLabel());
        for (CaseLawyer appearance : courtCase.getLawyers()) {
            announceLawyerAdded(courtCase, appearance, actor);
        }
        if (request.judgeId() != null) {
            assignJudgeInternal(courtCase, requireActiveUser(request.judgeId(), Role.JUDGE), null, actor);
        }
        cases.flush();
        return toDetail(courtCase, actor);
    }

    @Transactional
    public CaseDetailResponse update(Long caseId, UpdateCaseRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canEdit(),
                courtCase.isClosed() ? "Closed cases cannot be edited." : "Only court staff can edit case details.");
        if (!Objects.equals(courtCase.getVersion(), request.version())) {
            throw ApiException.conflict("CONCURRENT_MODIFICATION",
                    "This case was updated by someone else. Reload to see the latest details.");
        }
        if (request.filingDate().getYear() != courtCase.getFilingDate().getYear()) {
            throw ApiException.badRequest("FILING_YEAR_FIXED", "The filing date must stay within "
                    + courtCase.getFilingDate().getYear() + ", the registration year in the case number.");
        }
        validateParties(request.parties());

        List<String> changed = new ArrayList<>();
        String title = request.title().trim();
        if (!title.equals(courtCase.getTitle())) {
            courtCase.setTitle(title);
            changed.add("title");
        }
        String description = Texts.clean(request.description());
        if (!Objects.equals(description, courtCase.getDescription())) {
            courtCase.setDescription(description);
            changed.add("description");
        }
        if (request.priority() != courtCase.getPriority()) {
            changed.add("priority (" + courtCase.getPriority() + " → " + request.priority() + ")");
            courtCase.setPriority(request.priority());
        }
        if (!request.filingDate().equals(courtCase.getFilingDate())) {
            courtCase.setFilingDate(request.filingDate());
            changed.add("filing date");
        }
        Courtroom courtroom = resolveCourtroom(courtCase.getCourt(), request.courtroomId());
        if (!Objects.equals(idOf(courtroom), idOf(courtCase.getCourtroom()))) {
            courtCase.setCourtroom(courtroom);
            changed.add("courtroom");
        }
        if (partiesChanged(courtCase.getParties(), request.parties())) {
            courtCase.getParties().clear();
            request.parties().forEach(p -> courtCase.addParty(toParty(p, courtCase.getParties().size())));
            changed.add("parties");
        }
        if (!changed.isEmpty()) {
            audit.record(actor, AuditAction.CASE_UPDATED, "CASE", courtCase.getId(), courtCase.getId(),
                    "Updated " + String.join(", ", changed) + " of " + courtCase.getCaseNumber());
        }
        cases.flush();
        return toDetail(courtCase, actor);
    }

    // ------------------------------------------------------------------ assignment

    @Transactional
    public CaseDetailResponse assignJudge(Long caseId, AssignJudgeRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canAssignJudge(),
                courtCase.getStatus().isPending()
                        ? "Only court staff can assign judges."
                        : "Judges cannot be reassigned after a case is decided.");
        User judge = requireActiveUser(request.judgeId(), Role.JUDGE);
        if (!courtCase.isAssignedTo(judge.getId())) {
            assignJudgeInternal(courtCase, judge, Texts.clean(request.note()), actor);
        }
        cases.flush();
        return toDetail(courtCase, actor);
    }

    @Transactional
    public CaseDetailResponse addLawyer(Long caseId, LawyerAppearanceRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canManageLawyers(),
                "Only court staff can change counsel on a case.");
        User lawyer = requireActiveUser(request.lawyerId(), Role.LAWYER);
        if (courtCase.hasLawyer(lawyer.getId())) {
            throw ApiException.conflict("LAWYER_ALREADY_ON_CASE", lawyer.getFullName() + " already appears in this case.");
        }
        if (request.leadCounsel()) {
            courtCase.getLawyers().stream()
                    .filter(cl -> cl.getSide() == request.side())
                    .forEach(cl -> cl.setLeadCounsel(false));
        }
        CaseLawyer appearance = newAppearance(lawyer, request.side(), request.leadCounsel(), clock.instant());
        courtCase.addLawyer(appearance);
        announceLawyerAdded(courtCase, appearance, actor);
        cases.flush();
        return toDetail(courtCase, actor);
    }

    @Transactional
    public CaseDetailResponse removeLawyer(Long caseId, Long lawyerId, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canManageLawyers(),
                "Only court staff can change counsel on a case.");
        CaseLawyer appearance = courtCase.findLawyer(lawyerId)
                .orElseThrow(() -> ApiException.notFound("Lawyer appearance", lawyerId));
        String lawyerName = appearance.getLawyer().getFullName();
        courtCase.getLawyers().remove(appearance);
        audit.record(actor, AuditAction.LAWYER_REMOVED, "CASE", courtCase.getId(), courtCase.getId(),
                "Removed " + lawyerName + " from " + courtCase.getCaseNumber());
        notifications.notify(List.of(lawyerId), actor.id(), NotificationType.LAWYER_REMOVED,
                "Removed from a case",
                "You are no longer listed as counsel in " + courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ").",
                courtCase.getId());
        cases.flush();
        return toDetail(courtCase, actor);
    }

    // ------------------------------------------------------------------ lifecycle

    @Transactional
    public CaseDetailResponse changeStatus(Long caseId, ChangeStatusRequest request, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        CaseStatus current = courtCase.getStatus();
        CaseStatus target = request.status();
        if (current == target) {
            throw ApiException.conflict("STATUS_UNCHANGED", "The case is already " + target.label() + ".");
        }
        ensureTransitionAllowed(current, target);
        if (target == CaseStatus.UNDER_REVIEW && courtCase.getJudge() == null) {
            throw ApiException.conflict("JUDGE_REQUIRED", "Assign a judge before moving the case to review.");
        }
        if (!access.allowedStatusChanges(actor, courtCase).contains(target)) {
            throw ApiException.forbidden(switch (target) {
                case AWAITING_DECISION, DISPOSED -> "Only the presiding judge can mark a case as " + target.label() + ".";
                case UNDER_REVIEW, CLOSED -> "Only court staff can mark a case as " + target.label() + ".";
                default -> "You cannot change the status of this case.";
            });
        }
        String note = Texts.clean(request.note());
        if ((target == CaseStatus.DISPOSED || target == CaseStatus.CLOSED) && note == null) {
            throw ApiException.badRequest("NOTE_REQUIRED",
                    "Add a short note recording why the case is being " + target.label().toLowerCase() + ".");
        }
        if (target == CaseStatus.CLOSED) {
            events.publishEvent(new CaseEvents.Closing(courtCase));
        }
        transition(courtCase, target, note, actor);
        cases.flush();
        return toDetail(courtCase, actor);
    }

    /**
     * Status change triggered by another workflow step (first hearing concluded, final judgment issued).
     * The triggering step has already been authorized; invalid transitions are silently skipped.
     */
    @Transactional
    public boolean applySystemTransition(CourtCase courtCase, CaseStatus target, String note, AuthenticatedUser actor) {
        if (!courtCase.getStatus().canTransitionTo(target)) {
            return false;
        }
        transition(courtCase, target, note, actor);
        return true;
    }

    @Transactional(readOnly = true)
    public CourtCase requireVisible(Long caseId, AuthenticatedUser user) {
        return access.requireVisible(caseId, user);
    }

    // ------------------------------------------------------------------ internals

    private void transition(CourtCase courtCase, CaseStatus target, String note, AuthenticatedUser actor) {
        CaseStatus from = courtCase.getStatus();
        ensureTransitionAllowed(from, target);
        courtCase.setStatus(target);
        LocalDate today = LocalDate.now(clock);
        if (target == CaseStatus.DISPOSED) {
            courtCase.setDisposedOn(today);
        } else if (target == CaseStatus.CLOSED) {
            courtCase.setClosedOn(today);
        }
        recordStatusChange(courtCase, from, target, note, actor, clock.instant());
        audit.record(actor, AuditAction.CASE_STATUS_CHANGED, "CASE", courtCase.getId(), courtCase.getId(),
                courtCase.getCaseNumber() + " moved from " + from.label() + " to " + target.label()
                        + (note == null ? "" : " — " + note));
        notifications.notify(participantIds(courtCase), actor == null ? null : actor.id(),
                NotificationType.CASE_STATUS_CHANGED, "Case status updated",
                courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ") is now " + target.label() + ".",
                courtCase.getId());
        events.publishEvent(new CaseEvents.StatusChanged(courtCase, from, target, actor));
    }

    private static void ensureTransitionAllowed(CaseStatus from, CaseStatus to) {
        if (!from.canTransitionTo(to)) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION",
                    "A case that is " + from.label() + " cannot be moved to " + to.label() + ".");
        }
    }

    private void assignJudgeInternal(CourtCase courtCase, User judge, String note, AuthenticatedUser actor) {
        if (judge.getCourt() != null && !judge.getCourt().getId().equals(courtCase.getCourt().getId())) {
            throw ApiException.badRequest("JUDGE_COURT_MISMATCH",
                    judge.getFullName() + " does not sit at " + courtCase.getCourt().getName() + ".");
        }
        User previous = courtCase.getJudge();
        courtCase.setJudge(judge);

        String summary = previous == null
                ? "Assigned " + courtCase.getCaseNumber() + " to " + judge.getFullName()
                : "Reassigned " + courtCase.getCaseNumber() + " from " + previous.getFullName() + " to "
                + judge.getFullName();
        audit.record(actor, AuditAction.JUDGE_ASSIGNED, "CASE", courtCase.getId(), courtCase.getId(),
                summary + (note == null ? "" : " — " + note));

        notifications.notify(List.of(judge.getId()), actor.id(), NotificationType.CASE_ASSIGNED, "New case assigned",
                courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ") has been assigned to you.",
                courtCase.getId());
        if (previous != null) {
            notifications.notify(List.of(previous.getId()), actor.id(), NotificationType.CASE_UNASSIGNED,
                    "Case reassigned",
                    courtCase.getCaseNumber() + " has been reassigned to " + judge.getFullName() + ".",
                    courtCase.getId());
        }
        notifications.notify(lawyerIds(courtCase), actor.id(), NotificationType.CASE_ASSIGNED, "Bench assigned",
                courtCase.getCaseNumber() + " will be heard by " + judge.getFullName() + ".", courtCase.getId());

        events.publishEvent(new CaseEvents.JudgeChanged(courtCase, previous == null ? null : previous.getId(), actor));
        if (courtCase.getStatus() == CaseStatus.FILED) {
            transition(courtCase, CaseStatus.UNDER_REVIEW, "Allocated to " + judge.getFullName(), actor);
        }
    }

    private void announceLawyerAdded(CourtCase courtCase, CaseLawyer appearance, AuthenticatedUser actor) {
        String side = appearance.getSide() == PartySide.PETITIONER ? "petitioner" : "respondent";
        audit.record(actor, AuditAction.LAWYER_ADDED, "CASE", courtCase.getId(), courtCase.getId(),
                "Added " + appearance.getLawyer().getFullName() + " as counsel for the " + side + " in "
                        + courtCase.getCaseNumber());
        notifications.notify(List.of(appearance.getLawyer().getId()), actor.id(), NotificationType.LAWYER_ADDED,
                "Added to a case", "You have been added as counsel for the " + side + " in "
                        + courtCase.getCaseNumber() + " (" + courtCase.partiesLabel() + ").",
                courtCase.getId());
    }

    private void recordStatusChange(CourtCase courtCase, CaseStatus from, CaseStatus to, String note,
                                    AuthenticatedUser actor, Instant at) {
        CaseStatusChange change = new CaseStatusChange();
        change.setCourtCase(courtCase);
        change.setFromStatus(from);
        change.setToStatus(to);
        change.setNote(Texts.truncate(note, 1000));
        change.setChangedBy(actor == null ? null : users.getReferenceById(actor.id()));
        change.setChangedAt(at);
        statusChanges.save(change);
    }

    private CaseDetailResponse toDetail(CourtCase c, AuthenticatedUser user) {
        List<StatusChangeResponse> history = statusChanges.findByCourtCaseIdOrderByChangedAtAsc(c.getId()).stream()
                .map(StatusChangeResponse::from)
                .toList();
        return new CaseDetailResponse(c.getId(), c.getCaseNumber(), c.getTitle(), c.getCaseType(),
                c.getDescription(), c.getStatus(), c.getPriority(), c.getFilingDate(), CourtRef.from(c.getCourt()),
                CourtroomRef.from(c.getCourtroom()), UserRef.from(c.getJudge()),
                c.getParties().stream().map(PartyResponse::from).toList(),
                c.getLawyers().stream().map(CaseLawyerResponse::from).toList(),
                c.getNextHearingAt(), c.getDisposedOn(), c.getClosedOn(), UserRef.from(c.getCreatedBy()),
                c.getCreatedAt(), c.getUpdatedAt(), c.getVersion(), history, access.permissions(user, c));
    }

    private Courtroom resolveCourtroom(Court court, Long courtroomId) {
        if (courtroomId == null) {
            return null;
        }
        Courtroom room = courtrooms.findById(courtroomId)
                .orElseThrow(() -> ApiException.notFound("Courtroom", courtroomId));
        if (!room.getCourt().getId().equals(court.getId())) {
            throw ApiException.badRequest("COURTROOM_MISMATCH", room.getName() + " is not part of " + court.getName() + ".");
        }
        if (!room.isActive()) {
            throw ApiException.badRequest("COURTROOM_INACTIVE", room.getName() + " is not in use.");
        }
        return room;
    }

    private User requireActiveUser(Long userId, Role role) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User", userId));
        if (!user.hasRole(role)) {
            throw ApiException.badRequest("INVALID_ROLE", user.getFullName() + " is not a " + role.name().toLowerCase() + ".");
        }
        if (!user.isActive()) {
            throw ApiException.badRequest("USER_INACTIVE", user.getFullName() + "'s account is deactivated.");
        }
        return user;
    }

    private static void validateParties(List<PartyRequest> parties) {
        boolean hasPetitioner = parties.stream().anyMatch(p -> p.side() == PartySide.PETITIONER);
        boolean hasRespondent = parties.stream().anyMatch(p -> p.side() == PartySide.RESPONDENT);
        if (!hasPetitioner || !hasRespondent) {
            throw ApiException.badRequest("PARTIES_REQUIRED",
                    "A case needs at least one petitioner-side and one respondent-side party.");
        }
    }

    private static boolean partiesChanged(List<Party> current, List<PartyRequest> requested) {
        if (current.size() != requested.size()) {
            return true;
        }
        List<Party> sorted = current.stream()
                .sorted((a, b) -> a.getSide() != b.getSide() ? a.getSide().compareTo(b.getSide())
                        : Integer.compare(a.getPosition(), b.getPosition()))
                .toList();
        List<PartyRequest> requestedSorted = requested.stream()
                .sorted((a, b) -> a.side().compareTo(b.side()))
                .toList();
        for (int i = 0; i < sorted.size(); i++) {
            Party party = sorted.get(i);
            PartyRequest req = requestedSorted.get(i);
            if (party.getSide() != req.side() || party.getPartyType() != req.partyType()
                    || !party.getName().equals(req.name().trim())
                    || !Objects.equals(party.getAddress(), Texts.clean(req.address()))) {
                return true;
            }
        }
        return false;
    }

    private static Party toParty(PartyRequest request, int position) {
        Party party = new Party();
        party.setSide(request.side());
        party.setPartyType(request.partyType());
        party.setName(request.name().trim());
        party.setAddress(Texts.clean(request.address()));
        party.setPosition(position);
        return party;
    }

    private static CaseLawyer newAppearance(User lawyer, PartySide side, boolean lead, Instant at) {
        CaseLawyer appearance = new CaseLawyer();
        appearance.setLawyer(lawyer);
        appearance.setSide(side);
        appearance.setLeadCounsel(lead);
        appearance.setAddedAt(at);
        return appearance;
    }

    private static Long idOf(Courtroom room) {
        return room == null ? null : room.getId();
    }

    /** Judge and counsel with active accounts: the people who follow a case. */
    public static List<Long> participantIds(CourtCase courtCase) {
        List<Long> ids = new ArrayList<>();
        if (courtCase.getJudge() != null && courtCase.getJudge().isActive()) {
            ids.add(courtCase.getJudge().getId());
        }
        ids.addAll(lawyerIds(courtCase));
        return ids;
    }

    public static List<Long> lawyerIds(CourtCase courtCase) {
        return courtCase.getLawyers().stream()
                .map(CaseLawyer::getLawyer)
                .filter(User::isActive)
                .map(User::getId)
                .toList();
    }
}
