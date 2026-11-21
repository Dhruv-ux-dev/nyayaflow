package com.nyayaflow.user.dto;

import com.nyayaflow.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotNull Role role,
        @Size(max = 120) String designation,
        @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "may only contain digits, spaces and + ( ) -")
        String phone,
        @Size(max = 50) String barRegistrationNumber,
        Long courtId) {
}
