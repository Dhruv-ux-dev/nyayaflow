package com.nyayaflow.cases.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseType;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.cases.Party;
import com.nyayaflow.cases.PartySide;
import com.nyayaflow.court.CourtRef;
import com.nyayaflow.user.dto.UserRef;

/** Row in the case list: enough to triage a case without opening it. */
public record CaseSummaryResponse(
        Long id,
        String caseNumber,
        String title,
        CaseType caseType,
        CaseStatus status,
        CasePriority priority,
        LocalDate filingDate,
        CourtRef court,
        UserRef judge,
        String petitioner,
        String respondent,
        List<String> lawyers,
        LocalDateTime nextHearingAt,
        Instant updatedAt) {

    public static CaseSummaryResponse from(CourtCase c) {
        return new CaseSummaryResponse(c.getId(), c.getCaseNumber(), c.getTitle(), c.getCaseType(), c.getStatus(),
                c.getPriority(), c.getFilingDate(), CourtRef.from(c.getCourt()), UserRef.from(c.getJudge()),
                sideLabel(c, PartySide.PETITIONER), sideLabel(c, PartySide.RESPONDENT),
                c.getLawyers().stream().map(cl -> cl.getLawyer().getFullName()).toList(),
                c.getNextHearingAt(), c.getUpdatedAt());
    }

    private static String sideLabel(CourtCase c, PartySide side) {
        List<String> names = c.getParties().stream().filter(p -> p.getSide() == side).map(Party::getName).toList();
        if (names.isEmpty()) {
            return null;
        }
        return names.size() == 1 ? names.getFirst() : names.getFirst() + " & " + (names.size() - 1) + " other(s)";
    }
}
