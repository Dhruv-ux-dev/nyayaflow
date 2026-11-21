package com.nyayaflow.user.dto;

import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;

/** Compact reference to a person, embedded in other resources. */
public record UserRef(Long id, String fullName, Role role, String designation) {

    public static UserRef from(User user) {
        return user == null ? null
                : new UserRef(user.getId(), user.getFullName(), user.getRole(), user.getDesignation());
    }
}
