package com.nyayaflow.hearing;

import java.time.LocalDate;

import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.AuditableEntity;
import com.nyayaflow.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** The record of what transpired on a date in a case (the "order sheet" entry), usually tied to a hearing. */
@Getter
@Setter
@Entity
@Table(name = "proceedings")
public class Proceeding extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hearing_id")
    private Hearing hearing;

    @Column(name = "proceeding_date", nullable = false)
    private LocalDate proceedingDate;

    @Column(nullable = false, columnDefinition = "text")
    private String summary;

    @Column(columnDefinition = "text")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;
}
