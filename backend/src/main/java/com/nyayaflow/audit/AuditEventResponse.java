package com.nyayaflow.audit;

import java.time.Instant;

public record AuditEventResponse(
        Long id,
        Instant occurredAt,
        Long actorId,
        String actorName,
        AuditAction action,
        AuditAction.Category category,
        String entityType,
        Long entityId,
        Long caseId,
        String summary) {

    public static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(event.getId(), event.getOccurredAt(), event.getActorId(), event.getActorName(),
                event.getAction(), event.getAction().category(), event.getEntityType(), event.getEntityId(),
                event.getCaseId(), event.getSummary());
    }
}
