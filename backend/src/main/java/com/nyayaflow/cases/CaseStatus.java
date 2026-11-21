package com.nyayaflow.cases;

import java.util.EnumSet;
import java.util.Set;

/**
 * Lifecycle stage of a case. Whether a hearing is scheduled is deliberately not a status: it is
 * derived from the hearing records, so it can never drift out of sync with the actual schedule.
 */
public enum CaseStatus {
    FILED("Filed"),
    UNDER_REVIEW("Under review"),
    ACTIVE("Active"),
    AWAITING_DECISION("Awaiting decision"),
    DISPOSED("Disposed"),
    CLOSED("Closed");

    private final String label;

    CaseStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Pending cases still need court time; disposed and closed cases are decided. */
    public boolean isPending() {
        return this != DISPOSED && this != CLOSED;
    }

    public Set<CaseStatus> nextStatuses() {
        return switch (this) {
            case FILED -> EnumSet.of(UNDER_REVIEW, CLOSED);
            case UNDER_REVIEW -> EnumSet.of(ACTIVE, DISPOSED);
            case ACTIVE -> EnumSet.of(AWAITING_DECISION, DISPOSED);
            case AWAITING_DECISION -> EnumSet.of(ACTIVE, DISPOSED);
            case DISPOSED -> EnumSet.of(CLOSED);
            case CLOSED -> EnumSet.noneOf(CaseStatus.class);
        };
    }

    public boolean canTransitionTo(CaseStatus target) {
        return nextStatuses().contains(target);
    }

    public static Set<CaseStatus> pendingStatuses() {
        return EnumSet.of(FILED, UNDER_REVIEW, ACTIVE, AWAITING_DECISION);
    }
}
