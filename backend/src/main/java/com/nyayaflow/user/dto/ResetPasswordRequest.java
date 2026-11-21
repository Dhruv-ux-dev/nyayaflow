package com.nyayaflow.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.MESSAGE) String newPassword) {
}
