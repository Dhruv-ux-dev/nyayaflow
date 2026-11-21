package com.nyayaflow.cases;

import java.time.LocalDate;
import java.util.List;

public record CaseSearchCriteria(
        String q,
        List<CaseStatus> statuses,
        List<CaseType> types,
        List<CasePriority> priorities,
        Long judgeId,
        Long lawyerId,
        Long courtId,
        LocalDate filedFrom,
        LocalDate filedTo,
        Boolean hasHearing,
        Boolean unassigned) {
}
