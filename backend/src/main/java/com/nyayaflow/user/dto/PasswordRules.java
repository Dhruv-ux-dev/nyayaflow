package com.nyayaflow.user.dto;

public final class PasswordRules {

    public static final String PATTERN = "^(?=.*[A-Za-z])(?=.*\\d).{8,100}$";
    public static final String MESSAGE = "must be 8-100 characters and include at least one letter and one number";

    private PasswordRules() {
    }
}
