package com.nyayaflow.hearing.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RecordProceedingRequest(
        Long hearingId,
        @NotNull LocalDate proceedingDate,
        @NotBlank @Size(max = 10000) String summary,
        @Size(max = 5000) String remarks) {
}
