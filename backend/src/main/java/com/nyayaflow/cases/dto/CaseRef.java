package com.nyayaflow.cases.dto;

import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CourtCase;

/** Compact case reference embedded in hearings, documents, orders, deadlines. */
public record CaseRef(Long id, String caseNumber, String title, String parties, CaseStatus status) {

    public static CaseRef from(CourtCase c) {
        return new CaseRef(c.getId(), c.getCaseNumber(), c.getTitle(), c.partiesLabel(), c.getStatus());
    }
}
