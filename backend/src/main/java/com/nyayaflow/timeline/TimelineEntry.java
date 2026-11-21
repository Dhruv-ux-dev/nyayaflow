package com.nyayaflow.timeline;

import java.time.LocalDateTime;

/**
 * One event in a case's life, in court-local time.
 *
 * @param milestone a lifecycle landmark (filing, assignment, status change, final decision)
 * @param upcoming  a future event, such as a scheduled hearing
 */
public record TimelineEntry(
        String id,
        Kind kind,
        LocalDateTime occurredAt,
        String title,
        String description,
        String actor,
        String tag,
        boolean milestone,
        boolean upcoming,
        Long refId) {

    public enum Kind {
        FILED, ASSIGNMENT, STATUS, HEARING, PROCEEDING, DOCUMENT, ORDER
    }
}
