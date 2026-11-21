package com.nyayaflow.deadline;

import java.util.List;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineRequest;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineResponse;
import com.nyayaflow.deadline.DeadlineDtos.View;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DeadlineController {

    private final DeadlineService deadlineService;

    public DeadlineController(DeadlineService deadlineService) {
        this.deadlineService = deadlineService;
    }

    @GetMapping("/api/cases/{caseId}/deadlines")
    public List<DeadlineResponse> listForCase(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return deadlineService.listForCase(caseId, me);
    }

    @PostMapping("/api/cases/{caseId}/deadlines")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public DeadlineResponse create(@PathVariable Long caseId, @Valid @RequestBody DeadlineRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser me) {
        return deadlineService.create(caseId, request, me);
    }

    @GetMapping("/api/deadlines")
    public PageResponse<DeadlineResponse> search(@AuthenticationPrincipal AuthenticatedUser me,
                                                 @RequestParam(defaultValue = "OPEN") View view,
                                                 @RequestParam(defaultValue = "false") boolean mine,
                                                 @RequestParam(required = false) Long caseId,
                                                 @RequestParam(required = false) String q,
                                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                                 @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return deadlineService.search(view, mine, caseId, q, page, size, me);
    }

    @PutMapping("/api/deadlines/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public DeadlineResponse update(@PathVariable Long id, @Valid @RequestBody DeadlineRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser me) {
        return deadlineService.update(id, request, me);
    }

    @PostMapping("/api/deadlines/{id}/complete")
    public DeadlineResponse complete(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return deadlineService.complete(id, me);
    }

    @PostMapping("/api/deadlines/{id}/reopen")
    public DeadlineResponse reopen(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return deadlineService.reopen(id, me);
    }

    @DeleteMapping("/api/deadlines/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        deadlineService.delete(id, me);
        return ResponseEntity.noContent().build();
    }
}
