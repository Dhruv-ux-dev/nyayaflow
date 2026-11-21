package com.nyayaflow.cases.dto;

import java.util.List;

import com.nyayaflow.cases.CaseStatus;

/**
 * What the current user may do with a case, computed by the backend so the UI never has to
 * duplicate authorization rules. The same rules are enforced again on every write.
 */
public record CasePermissions(
        boolean canEdit,
        boolean canAssignJudge,
        boolean canManageLawyers,
        List<CaseStatus> allowedStatusChanges,
        boolean canScheduleHearing,
        boolean canManageHearings,
        boolean canRecordProceeding,
        boolean canIssueOrder,
        boolean canUploadDocument,
        boolean canManageDeadlines) {
}
