package com.nyayaflow.cases.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AssignJudgeRequest(@NotNull Long judgeId, @Size(max = 500) String note) {
}
