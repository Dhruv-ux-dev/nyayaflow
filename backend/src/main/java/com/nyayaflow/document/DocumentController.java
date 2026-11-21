package com.nyayaflow.document;

import java.nio.charset.StandardCharsets;
import java.util.List;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.document.DocumentDtos.DocumentResponse;
import com.nyayaflow.document.DocumentDtos.UpdateDocumentRequest;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/api/cases/{caseId}/documents")
    public List<DocumentResponse> listForCase(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return documentService.listForCase(caseId, me);
    }

    @PostMapping(path = "/api/cases/{caseId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse upload(@PathVariable Long caseId,
                                   @RequestPart("file") MultipartFile file,
                                   @RequestParam(required = false) String title,
                                   @RequestParam DocumentType documentType,
                                   @RequestParam(required = false) String description,
                                   @AuthenticationPrincipal AuthenticatedUser me) {
        return documentService.upload(caseId, title, documentType, description, file, me);
    }

    @GetMapping("/api/documents")
    public PageResponse<DocumentResponse> search(@AuthenticationPrincipal AuthenticatedUser me,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(required = false) List<DocumentType> type,
                                                 @RequestParam(required = false) Long caseId,
                                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return documentService.search(q, type, caseId, page, size, me);
    }

    @GetMapping("/api/documents/{id}")
    public DocumentResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return documentService.get(id, me);
    }

    @PutMapping("/api/documents/{id}")
    public DocumentResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDocumentRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser me) {
        return documentService.update(id, request, me);
    }

    @PostMapping(path = "/api/documents/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentResponse addVersion(@PathVariable Long id,
                                       @RequestPart("file") MultipartFile file,
                                       @RequestParam(required = false) String changeNote,
                                       @AuthenticationPrincipal AuthenticatedUser me) {
        return documentService.addVersion(id, file, changeNote, me);
    }

    @DeleteMapping("/api/documents/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        documentService.delete(id, me);
        return ResponseEntity.noContent().build();
    }

    /**
     * Streams a stored file. PDFs and images may be shown inline; everything else is always sent as
     * an attachment so the browser never renders untrusted markup.
     */
    @GetMapping("/api/documents/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id,
                                             @RequestParam(required = false) Integer version,
                                             @RequestParam(defaultValue = "false") boolean inline,
                                             @AuthenticationPrincipal AuthenticatedUser me) {
        DocumentService.DownloadableFile file = documentService.download(id, version, me);
        boolean showInline = inline && FileStorageService.isInlineViewable(file.contentType());
        ContentDisposition disposition = (showInline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(file.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file.resource());
    }
}
