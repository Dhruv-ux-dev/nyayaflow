package com.nyayaflow.user.dto;

import java.time.Instant;

import com.nyayaflow.court.CourtRef;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        String designation,
        String phone,
        String barRegistrationNumber,
        CourtRef court,
        boolean active,
        Instant lastLoginAt,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                user.getDesignation(), user.getPhone(), user.getBarRegistrationNumber(), CourtRef.from(user.getCourt()),
                user.isActive(), user.getLastLoginAt(), user.getCreatedAt());
    }
}
