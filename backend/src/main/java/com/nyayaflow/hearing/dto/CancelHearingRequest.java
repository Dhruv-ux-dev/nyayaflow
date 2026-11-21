package com.nyayaflow.hearing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelHearingRequest(@NotBlank @Size(max = 1000) String reason) {
}
