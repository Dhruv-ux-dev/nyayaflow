package com.nyayaflow.document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.AuditableEntity;
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
import lombok.Getter;
import lombok.Setter;

/**
 * A document on the case file. Each replacement upload becomes a new {@link DocumentVersion}; earlier
 * versions are kept. Deletion is soft so the record of what was filed survives.
 */
@Getter
@Setter
@Entity
@Table(name = "documents")
public class CaseDocument extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private CourtCase courtCase;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "current_version", nullable = false)
    private int currentVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL)
    @OrderBy("versionNumber desc")
    private List<DocumentVersion> versions = new ArrayList<>();

    public DocumentVersion latestVersion() {
        return versions.stream().filter(v -> v.getVersionNumber() == currentVersion).findFirst()
                .orElseThrow(() -> new IllegalStateException("Document " + id + " has no current version"));
    }

    public void addVersion(DocumentVersion version) {
        version.setDocument(this);
        versions.add(0, version);
        currentVersion = version.getVersionNumber();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
