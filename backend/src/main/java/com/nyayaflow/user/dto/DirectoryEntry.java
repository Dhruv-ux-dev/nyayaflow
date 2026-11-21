package com.nyayaflow.user.dto;

import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;

/** Minimal public profile used by pickers (assign judge, add counsel, assign deadline). */
public record DirectoryEntry(Long id, String fullName, Role role, String designation, String barRegistrationNumber,
                             Long courtId) {

    public static DirectoryEntry from(User user) {
        return new DirectoryEntry(user.getId(), user.getFullName(), user.getRole(), user.getDesignation(),
                user.getBarRegistrationNumber(), user.getCourt() == null ? null : user.getCourt().getId());
    }
}
