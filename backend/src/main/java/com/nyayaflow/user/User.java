package com.nyayaflow.user;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import com.nyayaflow.common.AuditableEntity;
import com.nyayaflow.court.Court;
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

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Stored lower-case; used as the login identifier. */
    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String designation;

    private String phone;

    /** Advocate enrolment number; only meaningful for lawyers. */
    @Column(name = "bar_registration_number")
    private String barRegistrationNumber;

    /** Home court for judges and staff. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "court_id")
    private Court court;

    @Column(nullable = false)
    private boolean active = true;

    /**
     * Moved on every password change, deactivation and role change. Each token carries the value it was
     * issued under, so moving it ends every earlier session at once.
     */
    @Column(name = "credentials_changed_at", nullable = false)
    private Instant credentialsChangedAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    public boolean hasRole(Role candidate) {
        return role == candidate;
    }

    /** Kept at millisecond precision so the stamp in a token and the stored value compare exactly. */
    public void setCredentialsChangedAt(Instant changedAt) {
        this.credentialsChangedAt = changedAt.truncatedTo(ChronoUnit.MILLIS);
    }

    public long credentialsStamp() {
        return credentialsChangedAt.toEpochMilli();
    }
}
