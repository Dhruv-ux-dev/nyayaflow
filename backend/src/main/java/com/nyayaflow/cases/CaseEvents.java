package com.nyayaflow.cases;

import com.nyayaflow.security.AuthenticatedUser;

/**
 * Domain events published synchronously inside the transaction that caused them. They let other
 * modules (hearings) react to case changes without the case module depending on them.
 */
public final class CaseEvents {

    private CaseEvents() {
    }

    public record StatusChanged(CourtCase courtCase, CaseStatus from, CaseStatus to, AuthenticatedUser actor) {
    }

    /** Published before a case is closed; a listener that finds work still open refuses by throwing. */
    public record Closing(CourtCase courtCase) {
    }

    public record JudgeChanged(CourtCase courtCase, Long previousJudgeId, AuthenticatedUser actor) {
    }
}
