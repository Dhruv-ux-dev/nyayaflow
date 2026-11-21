package com.nyayaflow.document;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseAccess;
import com.nyayaflow.cases.CaseScope;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.document.DocumentDtos.DocumentResponse;
import com.nyayaflow.document.DocumentDtos.UpdateDocumentRequest;
import com.nyayaflow.document.FileStorageService.StoredFile;
import com.nyayaflow.notification.NotificationService;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentService {

    private final DocumentRepository documents;
    private final FileStorageService storage;
    private final CaseAccess access;
    private final UserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public DocumentService(DocumentRepository documents, FileStorageService storage, CaseAccess access,
                           UserRepository users, AuditService audit, NotificationService notifications, Clock clock) {
        this.documents = documents;
        this.storage = storage;
        this.access = access;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public List<DocumentResponse> listForCase(Long caseId, AuthenticatedUser user) {
        CourtCase courtCase = access.requireVisible(caseId, user);
        return documents.findByCourtCaseIdAndDeletedAtIsNullOrderByCreatedAtDesc(caseId).stream()
                .map(doc -> DocumentResponse.from(doc, canModify(user, doc, courtCase)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<DocumentResponse> search(String q, List<DocumentType> types, Long caseId, int page, int size,
                                                 AuthenticatedUser user) {
        Specification<CaseDocument> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            Join<CaseDocument, CourtCase> courtCase = root.join("courtCase");
            Predicate scope = CaseScope.predicate(courtCase, query, cb, user);
            if (scope != null) {
                predicates.add(scope);
            }
            if (types != null && !types.isEmpty()) {
                predicates.add(root.get("documentType").in(types));
            }
            if (caseId != null) {
                predicates.add(cb.equal(courtCase.get("id"), caseId));
            }
            String term = Texts.clean(q);
            if (term != null) {
                String pattern = Texts.likePattern(term);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("caseNumber")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("title")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));
        return PageResponse.of(documents.findAll(spec, pageable),
                doc -> DocumentResponse.from(doc, canModify(user, doc, doc.getCourtCase())));
    }

    @Transactional(readOnly = true)
    public DocumentResponse get(Long documentId, AuthenticatedUser user) {
        CaseDocument doc = requireDocument(documentId, user);
        return DocumentResponse.from(doc, canModify(user, doc, doc.getCourtCase()));
    }

    @Transactional(readOnly = true)
    public DownloadableFile download(Long documentId, Integer versionNumber, AuthenticatedUser user) {
        CaseDocument doc = requireDocument(documentId, user);
        int wanted = versionNumber == null ? doc.getCurrentVersion() : versionNumber;
        DocumentVersion version = doc.getVersions().stream()
                .filter(v -> v.getVersionNumber() == wanted)
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Version", wanted));
        return new DownloadableFile(storage.load(version.getStorageKey()), version.getOriginalFilename(),
                version.getContentType(), version.getSizeBytes());
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public DocumentResponse upload(Long caseId, String title, DocumentType type, String description,
                                   MultipartFile file, AuthenticatedUser actor) {
        CourtCase courtCase = access.requireVisible(caseId, actor);
        access.require(access.permissions(actor, courtCase).canUploadDocument(),
                courtCase.isClosed() ? "Documents cannot be added to a closed case."
                        : "You cannot upload documents to this case.");
        if (type == null) {
            throw ApiException.badRequest("TYPE_REQUIRED", "Choose a document type.");
        }
        String cleanDescription = Texts.clean(description);
        if (cleanDescription != null && cleanDescription.length() > 5000) {
            throw ApiException.badRequest("DESCRIPTION_TOO_LONG", "The description can be at most 5000 characters.");
        }

        StoredFile stored = storage.store(file);
        storage.deleteIfRolledBack(stored.storageKey());
        String cleanTitle = Texts.clean(title);
        if (cleanTitle == null) {
            cleanTitle = stripExtension(stored.originalFilename());
        }
        if (cleanTitle.length() > 255) {
            throw ApiException.badRequest("TITLE_TOO_LONG", "The title can be at most 255 characters.");
        }

        CaseDocument doc = new CaseDocument();
        doc.setCourtCase(courtCase);
        doc.setTitle(cleanTitle);
        doc.setDocumentType(type);
        doc.setDescription(cleanDescription);
        doc.setUploadedBy(users.getReferenceById(actor.id()));
        doc.addVersion(newVersion(stored, 1, null, actor));
        documents.save(doc);

        audit.record(actor, AuditAction.DOCUMENT_UPLOADED, "DOCUMENT", doc.getId(), courtCase.getId(),
                actor.fullName() + " filed “" + doc.getTitle() + "” in " + courtCase.getCaseNumber());
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.DOCUMENT_UPLOADED,
                "New document filed", courtCase.getCaseNumber() + ": " + doc.getTitle() + " (" + label(type)
                        + ") was uploaded by " + actor.fullName() + ".", courtCase.getId());
        return DocumentResponse.from(doc, true);
    }

    @Transactional
    public DocumentResponse addVersion(Long documentId, MultipartFile file, String changeNote, AuthenticatedUser actor) {
        CaseDocument doc = requireModifiable(documentId, actor);
        String note = Texts.clean(changeNote);
        if (note != null && note.length() > 500) {
            throw ApiException.badRequest("NOTE_TOO_LONG", "The change note can be at most 500 characters.");
        }
        StoredFile stored = storage.store(file);
        storage.deleteIfRolledBack(stored.storageKey());
        doc.addVersion(newVersion(stored, doc.getCurrentVersion() + 1, note, actor));
        doc.setUpdatedAt(clock.instant());

        CourtCase courtCase = doc.getCourtCase();
        audit.record(actor, AuditAction.DOCUMENT_VERSION_ADDED, "DOCUMENT", doc.getId(), courtCase.getId(),
                "Uploaded version " + doc.getCurrentVersion() + " of “" + doc.getTitle() + "” in "
                        + courtCase.getCaseNumber() + (note == null ? "" : " — " + note));
        notifications.notify(CaseService.participantIds(courtCase), actor.id(), NotificationType.DOCUMENT_UPLOADED,
                "Document updated", courtCase.getCaseNumber() + ": a new version of " + doc.getTitle()
                        + " was uploaded by " + actor.fullName() + ".", courtCase.getId());
        return DocumentResponse.from(doc, true);
    }

    @Transactional
    public DocumentResponse update(Long documentId, UpdateDocumentRequest request, AuthenticatedUser actor) {
        CaseDocument doc = requireModifiable(documentId, actor);
        doc.setTitle(request.title().trim());
        doc.setDocumentType(request.documentType());
        doc.setDescription(Texts.clean(request.description()));
        audit.record(actor, AuditAction.DOCUMENT_UPDATED, "DOCUMENT", doc.getId(), doc.getCourtCase().getId(),
                "Updated details of “" + doc.getTitle() + "” in " + doc.getCourtCase().getCaseNumber());
        return DocumentResponse.from(doc, true);
    }

    /** Soft delete: the file and its history are retained, but the document leaves the case file. */
    @Transactional
    public void delete(Long documentId, AuthenticatedUser actor) {
        CaseDocument doc = requireModifiable(documentId, actor);
        doc.setDeletedAt(clock.instant());
        doc.setDeletedBy(users.getReferenceById(actor.id()));
        audit.record(actor, AuditAction.DOCUMENT_DELETED, "DOCUMENT", doc.getId(), doc.getCourtCase().getId(),
                "Removed “" + doc.getTitle() + "” from " + doc.getCourtCase().getCaseNumber());
    }

    // ------------------------------------------------------------------ internals

    private CaseDocument requireDocument(Long documentId, AuthenticatedUser user) {
        CaseDocument doc = documents.findById(documentId)
                .filter(d -> !d.isDeleted())
                .orElseThrow(() -> ApiException.notFound("Document", documentId));
        access.requireVisible(doc.getCourtCase().getId(), user);
        return doc;
    }

    private CaseDocument requireModifiable(Long documentId, AuthenticatedUser user) {
        CaseDocument doc = requireDocument(documentId, user);
        access.require(canModify(user, doc, doc.getCourtCase()),
                doc.getCourtCase().isClosed() ? "Documents of a closed case cannot be changed."
                        : "Only the uploader or court staff can change this document.");
        return doc;
    }

    /** Registry staff can maintain any document; others only their own uploads. Closed cases are frozen. */
    private boolean canModify(AuthenticatedUser user, CaseDocument doc, CourtCase courtCase) {
        if (courtCase.isClosed() || !access.permissions(user, courtCase).canUploadDocument() && !user.isRegistry()) {
            return false;
        }
        return user.isRegistry() || doc.getUploadedBy().getId().equals(user.id());
    }

    private DocumentVersion newVersion(StoredFile stored, int number, String note, AuthenticatedUser actor) {
        DocumentVersion version = new DocumentVersion();
        version.setVersionNumber(number);
        version.setOriginalFilename(stored.originalFilename());
        version.setContentType(stored.contentType());
        version.setSizeBytes(stored.sizeBytes());
        version.setSha256(stored.sha256());
        version.setStorageKey(stored.storageKey());
        version.setChangeNote(note);
        version.setUploadedBy(users.getReferenceById(actor.id()));
        version.setUploadedAt(Instant.now(clock));
        return version;
    }

    static String label(DocumentType type) {
        String words = type.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }

    private static String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    public record DownloadableFile(Resource resource, String filename, String contentType, long size) {
    }
}
