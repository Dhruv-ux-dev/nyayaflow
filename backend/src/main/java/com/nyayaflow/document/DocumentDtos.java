package com.nyayaflow.document;

import java.time.Instant;
import java.util.List;

import com.nyayaflow.cases.dto.CaseRef;
import com.nyayaflow.user.dto.UserRef;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class DocumentDtos {

    private DocumentDtos() {
    }

    public record DocumentResponse(
            Long id,
            CaseRef courtCase,
            String title,
            DocumentType documentType,
            String description,
            int currentVersion,
            List<VersionResponse> versions,
            UserRef uploadedBy,
            Instant createdAt,
            Instant updatedAt,
            boolean canModify) {

        static DocumentResponse from(CaseDocument doc, boolean canModify) {
            return new DocumentResponse(doc.getId(), CaseRef.from(doc.getCourtCase()), doc.getTitle(),
                    doc.getDocumentType(), doc.getDescription(), doc.getCurrentVersion(),
                    doc.getVersions().stream().map(VersionResponse::from).toList(), UserRef.from(doc.getUploadedBy()),
                    doc.getCreatedAt(), doc.getUpdatedAt(), canModify);
        }
    }

    public record VersionResponse(Long id, int versionNumber, String originalFilename, String contentType,
                                  long sizeBytes, String sha256, String changeNote, UserRef uploadedBy,
                                  Instant uploadedAt) {

        static VersionResponse from(DocumentVersion v) {
            return new VersionResponse(v.getId(), v.getVersionNumber(), v.getOriginalFilename(), v.getContentType(),
                    v.getSizeBytes(), v.getSha256(), v.getChangeNote(), UserRef.from(v.getUploadedBy()),
                    v.getUploadedAt());
        }
    }

    public record UpdateDocumentRequest(
            @NotBlank @Size(max = 255) String title,
            @NotNull DocumentType documentType,
            @Size(max = 5000) String description) {
    }
}
