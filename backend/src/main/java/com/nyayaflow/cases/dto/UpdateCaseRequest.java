package com.nyayaflow.cases.dto;

import java.time.LocalDate;
import java.util.List;

import com.nyayaflow.cases.CasePriority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/**
 * Editable case metadata. Case type and court are fixed at registration because the case number
 * is derived from them; transfers between courts are out of scope.
 */
public record UpdateCaseRequest(
        @NotBlank @Size(max = 300) String title,
        @Size(max = 5000) String description,
        @NotNull CasePriority priority,
        @NotNull @PastOrPresent LocalDate filingDate,
        Long courtroomId,
        @NotEmpty @Size(max = 20) List<@Valid PartyRequest> parties,
        @NotNull Long version) {
}
