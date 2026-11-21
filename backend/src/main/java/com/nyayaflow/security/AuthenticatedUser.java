package com.nyayaflow.security;

import java.util.Arrays;

import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;

/** The authenticated principal available to controllers via {@code @AuthenticationPrincipal}. */
public record AuthenticatedUser(Long id, String email, String fullName, Role role) {

    public static AuthenticatedUser from(User user) {
        return new AuthenticatedUser(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    public boolean is(Role candidate) {
        return role == candidate;
    }

    public boolean isAny(Role... candidates) {
        return Arrays.asList(candidates).contains(role);
    }

    /** Registry roles see every case and handle case administration. */
    public boolean isRegistry() {
        return role == Role.ADMIN || role == Role.STAFF;
    }
}
