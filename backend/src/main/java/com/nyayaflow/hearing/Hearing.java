package com.nyayaflow.hearing;

import java.time.LocalDateTime;

import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.AuditableEntity;
import com.nyayaflow.court.Courtroom;
import com.nyayaflow.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A listing of a case before a judge in a courtroom. Times are court-local wall-clock times. */
@Getter
@Setter
@Entity
@Table(name = "hearings")
public class Hearing extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_id")
    private User judge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "courtroom_id")
    private Courtroom courtroom;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "hearing_type", nullable = false)
    private HearingType hearingType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HearingStatus status;

    private String purpose;

    @Column(columnDefinition = "text")
    private String outcome;

    @Column(name = "reschedule_count", nullable = false)
    private int rescheduleCount;

    /** Why the hearing was last rescheduled or cancelled. */
    @Column(name = "status_reason")
    private String statusReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    public LocalDateTime endsAt() {
        return scheduledAt.plusMinutes(durationMinutes);
    }

    public boolean isScheduled() {
        return status == HearingStatus.SCHEDULED;
    }
}
