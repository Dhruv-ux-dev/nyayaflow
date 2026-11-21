package com.nyayaflow.order;

import java.time.Instant;
import java.time.LocalDate;

import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.hearing.Hearing;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * An order or judgment. Orders are part of the permanent judicial record, so they are append-only:
 * there is no update or delete; a correction is issued as a new order.
 */
@Getter
@Setter
@Entity
@Table(name = "court_orders")
public class CourtOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false, updatable = false)
    private CourtCase courtCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hearing_id", updatable = false)
    private Hearing hearing;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, updatable = false)
    private OrderType orderType;

    @Column(nullable = false, updatable = false)
    private String title;

    @Column(nullable = false, updatable = false, columnDefinition = "text")
    private String content;

    @Column(updatable = false, columnDefinition = "text")
    private String remarks;

    @Column(name = "order_date", nullable = false, updatable = false)
    private LocalDate orderDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issued_by", nullable = false, updatable = false)
    private User issuedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
