package com.nyayaflow.hearing.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RescheduleHearingRequest(
        @NotNull LocalDateTime scheduledAt,
        @Min(10) @Max(240) Integer durationMinutes,
        Long courtroomId,
        @NotBlank @Size(max = 1000) String reason,
        boolean overrideConflicts) {
}
