package com.nyayaflow.hearing.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.hearing.Proceeding;
import com.nyayaflow.user.dto.UserRef;

public record ProceedingResponse(
        Long id,
        Long caseId,
        HearingBrief hearing,
        LocalDate proceedingDate,
        String summary,
        String remarks,
        UserRef recordedBy,
        Instant createdAt,
        Instant updatedAt,
        boolean editable) {

    public record HearingBrief(Long id, LocalDateTime scheduledAt, HearingType hearingType) {
    }

    public static ProceedingResponse from(Proceeding p, boolean editable) {
        HearingBrief hearing = p.getHearing() == null ? null
                : new HearingBrief(p.getHearing().getId(), p.getHearing().getScheduledAt(),
                p.getHearing().getHearingType());
        return new ProceedingResponse(p.getId(), p.getCourtCase().getId(), hearing, p.getProceedingDate(),
                p.getSummary(), p.getRemarks(), UserRef.from(p.getRecordedBy()), p.getCreatedAt(), p.getUpdatedAt(),
                editable);
    }
}
