package com.nyayaflow.common;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Error body returned by every failing API call. {@code code} is a stable machine-readable
 * identifier the frontend can branch on; {@code message} is safe to show to the user.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldViolation> fieldErrors,
        Object details) {

    public record FieldViolation(String field, String message) {
    }
}
