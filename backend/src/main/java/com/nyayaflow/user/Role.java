package com.nyayaflow.user;

/**
 * The four fixed roles. Stored as a single column on the user: each person has exactly one role and
 * the set of roles drives code paths, so a separate roles table would add joins without flexibility.
 */
public enum Role {
    ADMIN,
    JUDGE,
    LAWYER,
    STAFF;

    public String authority() {
        return "ROLE_" + name();
    }
}
