package com.nyayaflow.cases;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CaseStatusTest {

    @ParameterizedTest
    @CsvSource({
            "FILED, UNDER_REVIEW, true",
            "FILED, ACTIVE, false",
            "UNDER_REVIEW, ACTIVE, true",
            "ACTIVE, AWAITING_DECISION, true",
            "AWAITING_DECISION, ACTIVE, true",
            "AWAITING_DECISION, DISPOSED, true",
            "ACTIVE, CLOSED, false",
            "DISPOSED, CLOSED, true",
            "DISPOSED, ACTIVE, false",
            "CLOSED, ACTIVE, false"
    })
    void allowsOnlyForwardLifecycleSteps(CaseStatus from, CaseStatus to, boolean allowed) {
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
    }

    @Test
    void closedIsTerminalAndDecidedCasesAreNotPending() {
        assertThat(CaseStatus.CLOSED.nextStatuses()).isEmpty();
        assertThat(CaseStatus.DISPOSED.isPending()).isFalse();
        assertThat(CaseStatus.AWAITING_DECISION.isPending()).isTrue();
    }
}
