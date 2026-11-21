package com.nyayaflow.cases.dto;

import java.time.LocalDate;
import java.util.List;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

public record CreateCaseRequest(
        @NotBlank @Size(max = 300) String title,
        @NotNull CaseType caseType,
        @Size(max = 5000) String description,
        @NotNull CasePriority priority,
        @NotNull @PastOrPresent LocalDate filingDate,
        @NotNull Long courtId,
        Long courtroomId,
        Long judgeId,
        @NotEmpty @Size(max = 20) List<@Valid PartyRequest> parties,
        @Size(max = 20) List<@Valid LawyerAppearanceRequest> lawyers) {
}
