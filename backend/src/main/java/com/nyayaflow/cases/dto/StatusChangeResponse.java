package com.nyayaflow.cases.dto;

import java.time.Instant;

import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseStatusChange;
import com.nyayaflow.user.dto.UserRef;

public record StatusChangeResponse(Long id, CaseStatus fromStatus, CaseStatus toStatus, String note,
                                   UserRef changedBy, Instant changedAt) {

    public static StatusChangeResponse from(CaseStatusChange change) {
        return new StatusChangeResponse(change.getId(), change.getFromStatus(), change.getToStatus(),
                change.getNote(), UserRef.from(change.getChangedBy()), change.getChangedAt());
    }
}
