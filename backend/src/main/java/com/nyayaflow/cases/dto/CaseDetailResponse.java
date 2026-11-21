package com.nyayaflow.cases.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseType;
import com.nyayaflow.court.CourtRef;
import com.nyayaflow.court.CourtroomRef;
import com.nyayaflow.user.dto.UserRef;

public record CaseDetailResponse(
        Long id,
        String caseNumber,
        String title,
        CaseType caseType,
        String description,
        CaseStatus status,
        CasePriority priority,
        LocalDate filingDate,
        CourtRef court,
        CourtroomRef courtroom,
        UserRef judge,
        List<PartyResponse> parties,
        List<CaseLawyerResponse> lawyers,
        LocalDateTime nextHearingAt,
        LocalDate disposedOn,
        LocalDate closedOn,
        UserRef createdBy,
        Instant createdAt,
        Instant updatedAt,
        long version,
        List<StatusChangeResponse> statusHistory,
        CasePermissions permissions) {
}
