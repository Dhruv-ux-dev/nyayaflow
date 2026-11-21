package com.nyayaflow.cases.dto;

import com.nyayaflow.cases.PartySide;
import jakarta.validation.constraints.NotNull;

public record LawyerAppearanceRequest(@NotNull Long lawyerId, @NotNull PartySide side, boolean leadCounsel) {
}
