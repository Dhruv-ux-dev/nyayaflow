package com.nyayaflow.hearing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProceedingRequest(@NotBlank @Size(max = 10000) String summary, @Size(max = 5000) String remarks) {
}
