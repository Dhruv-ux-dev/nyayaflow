package com.nyayaflow.cases;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.nyayaflow.common.AuditableEntity;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.Courtroom;
import com.nyayaflow.user.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

/**
 * Aggregate root for a court matter. Parties and lawyer appearances are owned by the case; hearings,
 * documents, orders and other records reference it and live in their own modules.
 */
@Getter
@Setter
@Entity
@Table(name = "cases")
public class CourtCase extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", nullable = false, unique = true, updatable = false)
    private String caseNumber;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "case_type", nullable = false)
    private CaseType caseType;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CaseStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CasePriority priority;

    @Column(name = "filing_date", nullable = false)
    private LocalDate filingDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id", nullable = false)
    private Court court;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "courtroom_id")
    private Courtroom courtroom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_id")
    private User judge;

    /**
     * Earliest hearing still marked as scheduled. Denormalised so the case list can sort and filter
     * by next hearing cheaply; maintained by the hearing service whenever hearings change.
     */
    @Column(name = "next_hearing_at")
    private LocalDateTime nextHearingAt;

    @Column(name = "disposed_on")
    private LocalDate disposedOn;

    @Column(name = "closed_on")
    private LocalDate closedOn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "courtCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("side asc, position asc")
    private List<Party> parties = new ArrayList<>();

    @OneToMany(mappedBy = "courtCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("side asc, leadCounsel desc")
    private List<CaseLawyer> lawyers = new ArrayList<>();

    @Version
    private long version;

    public void addParty(Party party) {
        party.setCourtCase(this);
        parties.add(party);
    }

    public void addLawyer(CaseLawyer appearance) {
        appearance.setCourtCase(this);
        lawyers.add(appearance);
    }

    public Optional<CaseLawyer> findLawyer(Long lawyerId) {
        return lawyers.stream().filter(cl -> cl.getLawyer().getId().equals(lawyerId)).findFirst();
    }

    public boolean hasLawyer(Long lawyerId) {
        return findLawyer(lawyerId).isPresent();
    }

    public boolean isAssignedTo(Long judgeId) {
        return judge != null && judge.getId().equals(judgeId);
    }

    public boolean isClosed() {
        return status == CaseStatus.CLOSED;
    }

    /** Short "A vs B" label used in notifications and lists. */
    public String partiesLabel() {
        String petitioner = firstPartyName(PartySide.PETITIONER);
        String respondent = firstPartyName(PartySide.RESPONDENT);
        if (petitioner == null && respondent == null) {
            return title;
        }
        return (petitioner == null ? "—" : petitioner) + " vs " + (respondent == null ? "—" : respondent);
    }

    private String firstPartyName(PartySide side) {
        return parties.stream().filter(p -> p.getSide() == side).map(Party::getName).findFirst().orElse(null);
    }
}
