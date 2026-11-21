package com.nyayaflow.cases.dto;

import com.nyayaflow.cases.CaseStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeStatusRequest(@NotNull CaseStatus status, @Size(max = 1000) String note) {
}
