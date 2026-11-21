package com.nyayaflow.hearing.dto;

import com.nyayaflow.hearing.HearingStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Everything that typically happens when a matter is called: the result, an optional proceedings
 * entry and an optional next date. Applied atomically.
 */
public record ConcludeHearingRequest(
        @NotNull HearingStatus result,
        @NotBlank @Size(max = 5000) String outcome,
        @Valid ProceedingDraft proceeding,
        @Valid ScheduleHearingRequest nextHearing) {

    public record ProceedingDraft(@NotBlank @Size(max = 10000) String summary, @Size(max = 5000) String remarks) {
    }
}
