package com.nyayaflow.deadline;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.dto.CaseRef;
import com.nyayaflow.user.dto.UserRef;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class DeadlineDtos {

    private DeadlineDtos() {
    }

    /** What the user sees: pending deadlines past their due date are reported as OVERDUE. */
    public enum EffectiveStatus {
        PENDING, OVERDUE, COMPLETED
    }

    public enum View {
        ALL, OPEN, OVERDUE, DUE_SOON, COMPLETED
    }

    public record DeadlineRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 5000) String description,
            @NotNull LocalDate dueDate,
            @NotNull CasePriority priority,
            Long assignedToId) {
    }

    public record DeadlineResponse(
            Long id,
            CaseRef courtCase,
            String title,
            String description,
            LocalDate dueDate,
            long daysUntilDue,
            CasePriority priority,
            EffectiveStatus status,
            UserRef assignedTo,
            UserRef createdBy,
            Instant completedAt,
            UserRef completedBy,
            Instant createdAt,
            boolean canEdit,
            boolean canComplete) {

        static DeadlineResponse from(Deadline d, LocalDate today, boolean canEdit, boolean canComplete) {
            EffectiveStatus status = d.getStatus() == DeadlineStatus.COMPLETED ? EffectiveStatus.COMPLETED
                    : d.isOverdue(today) ? EffectiveStatus.OVERDUE : EffectiveStatus.PENDING;
            return new DeadlineResponse(d.getId(), CaseRef.from(d.getCourtCase()), d.getTitle(), d.getDescription(),
                    d.getDueDate(), ChronoUnit.DAYS.between(today, d.getDueDate()), d.getPriority(), status,
                    UserRef.from(d.getAssignedTo()), UserRef.from(d.getCreatedBy()), d.getCompletedAt(),
                    UserRef.from(d.getCompletedBy()), d.getCreatedAt(), canEdit, canComplete);
        }
    }
}
