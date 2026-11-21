package com.nyayaflow.cases;

import java.time.Instant;

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

/** A lawyer's appearance in a case, on behalf of one side. */
@Getter
@Setter
@Entity
@Table(name = "case_lawyers")
public class CaseLawyer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lawyer_id", nullable = false)
    private User lawyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PartySide side;

    @Column(name = "lead_counsel", nullable = false)
    private boolean leadCounsel;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt;
}
