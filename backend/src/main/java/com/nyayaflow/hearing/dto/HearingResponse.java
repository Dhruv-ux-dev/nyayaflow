package com.nyayaflow.hearing.dto;

import java.time.Instant;
import java.time.LocalDateTime;

import com.nyayaflow.cases.dto.CaseRef;
import com.nyayaflow.court.CourtroomRef;
import com.nyayaflow.hearing.Hearing;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.user.dto.UserRef;

/**
 * @param outcomePending the hearing time has passed but no outcome was recorded yet
 */
public record HearingResponse(
        Long id,
        CaseRef courtCase,
        UserRef judge,
        CourtroomRef courtroom,
        LocalDateTime scheduledAt,
        LocalDateTime endsAt,
        int durationMinutes,
        HearingType hearingType,
        HearingStatus status,
        String purpose,
        String outcome,
        int rescheduleCount,
        String statusReason,
        boolean outcomePending,
        UserRef createdBy,
        Instant createdAt,
        Instant updatedAt) {

    public static HearingResponse from(Hearing h, LocalDateTime now) {
        return new HearingResponse(h.getId(), CaseRef.from(h.getCourtCase()), UserRef.from(h.getJudge()),
                CourtroomRef.from(h.getCourtroom()), h.getScheduledAt(), h.endsAt(), h.getDurationMinutes(),
                h.getHearingType(), h.getStatus(), h.getPurpose(), h.getOutcome(), h.getRescheduleCount(),
                h.getStatusReason(), h.isScheduled() && h.getScheduledAt().isBefore(now),
                UserRef.from(h.getCreatedBy()), h.getCreatedAt(), h.getUpdatedAt());
    }
}
