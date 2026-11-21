package com.nyayaflow.auth.dto;

import java.time.Instant;

import com.nyayaflow.user.dto.UserResponse;

public record LoginResponse(String token, Instant expiresAt, UserResponse user) {
}
