package com.nyayaflow.hearing.dto;

import java.time.LocalDateTime;

import com.nyayaflow.hearing.HearingType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param overrideConflicts schedule even if the judge or courtroom is already booked (the user has
 *                          seen the warning and confirmed)
 */
public record ScheduleHearingRequest(
        @NotNull LocalDateTime scheduledAt,
        @Min(10) @Max(240) Integer durationMinutes,
        @NotNull HearingType hearingType,
        @NotNull Long courtroomId,
        @Size(max = 1000) String purpose,
        boolean overrideConflicts) {
}
