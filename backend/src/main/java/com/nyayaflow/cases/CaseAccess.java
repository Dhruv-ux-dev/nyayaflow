package com.nyayaflow.cases;

import java.util.List;

import com.nyayaflow.cases.dto.CasePermissions;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.Role;
import org.springframework.stereotype.Component;

/**
 * Single home for "who may see and do what with a case". Registry staff and administrators see all
 * cases; judges see cases assigned to them; lawyers see cases in which they appear. Every case-scoped
 * service checks access here before reading or writing.
 */
@Component
public class CaseAccess {

    private final CaseRepository cases;

    public CaseAccess(CaseRepository cases) {
        this.cases = cases;
    }

    /** Loads a case the user is allowed to see, or fails with 404/403. */
    public CourtCase requireVisible(Long caseId, AuthenticatedUser user) {
        CourtCase courtCase = cases.findById(caseId).orElseThrow(() -> ApiException.notFound("Case", caseId));
        if (!canView(user, courtCase)) {
            throw ApiException.forbidden("You do not have access to case " + courtCase.getCaseNumber() + ".");
        }
        return courtCase;
    }

    public boolean canView(AuthenticatedUser user, CourtCase c) {
        return switch (user.role()) {
            case ADMIN, STAFF -> true;
            case JUDGE -> c.isAssignedTo(user.id());
            case LAWYER -> c.hasLawyer(user.id());
        };
    }

    public CasePermissions permissions(AuthenticatedUser user, CourtCase c) {
        boolean registry = user.isRegistry();
        boolean presiding = user.is(Role.JUDGE) && c.isAssignedTo(user.id());
        boolean counsel = user.is(Role.LAWYER) && c.hasLawyer(user.id());
        boolean closed = c.isClosed();
        boolean decided = !c.getStatus().isPending();

        return new CasePermissions(
                registry && !closed,
                registry && !decided,
                registry && !closed,
                allowedStatusChanges(user, c),
                (registry || presiding) && !decided && c.getJudge() != null,
                (registry || presiding) && !closed,
                (user.is(Role.STAFF) || presiding) && !closed,
                presiding && !closed,
                (user.is(Role.STAFF) || presiding || counsel) && !closed,
                (registry || presiding) && !closed);
    }

    /**
     * Valid next statuses this user may apply. Judicial steps (reserving and pronouncing judgment) belong
     * to the presiding judge; registry steps (admission to review, consigning to records) to staff.
     */
    public List<CaseStatus> allowedStatusChanges(AuthenticatedUser user, CourtCase c) {
        boolean registry = user.isRegistry();
        boolean presiding = user.is(Role.JUDGE) && c.isAssignedTo(user.id());
        return c.getStatus().nextStatuses().stream()
                .filter(target -> switch (target) {
                    case UNDER_REVIEW -> registry && c.getJudge() != null;
                    case ACTIVE -> registry || presiding;
                    case AWAITING_DECISION, DISPOSED -> presiding;
                    case CLOSED -> registry;
                    case FILED -> false;
                })
                .sorted()
                .toList();
    }

    public void require(boolean allowed, String message) {
        if (!allowed) {
            throw ApiException.forbidden(message);
        }
    }
}
