package com.nyayaflow.cases;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.nyayaflow.audit.AuditEventResponse;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.dto.AssignJudgeRequest;
import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.cases.dto.CaseSummaryResponse;
import com.nyayaflow.cases.dto.ChangeStatusRequest;
import com.nyayaflow.cases.dto.CreateCaseRequest;
import com.nyayaflow.cases.dto.LawyerAppearanceRequest;
import com.nyayaflow.cases.dto.UpdateCaseRequest;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    /** Public sort keys mapped to entity properties; anything else is rejected. */
    private static final Map<String, String> SORTABLE = Map.of(
            "filingDate", "filingDate",
            "nextHearing", "nextHearingAt",
            "updatedAt", "updatedAt",
            "title", "title");

    private final CaseService caseService;
    private final AuditService auditService;

    public CaseController(CaseService caseService, AuditService auditService) {
        this.caseService = caseService;
        this.auditService = auditService;
    }

    @GetMapping
    public PageResponse<CaseSummaryResponse> search(
            @AuthenticationPrincipal AuthenticatedUser me,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<CaseStatus> status,
            @RequestParam(required = false) List<CaseType> type,
            @RequestParam(required = false) List<CasePriority> priority,
            @RequestParam(required = false) Long judgeId,
            @RequestParam(required = false) Long lawyerId,
            @RequestParam(required = false) Long courtId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate filedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate filedTo,
            @RequestParam(required = false) Boolean hasHearing,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(defaultValue = "filingDate,desc") String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        CaseSearchCriteria criteria = new CaseSearchCriteria(q, status, type, priority, judgeId, lawyerId, courtId,
                filedFrom, filedTo, hasHearing, unassigned);
        return caseService.search(criteria, PageRequest.of(page, size, parseSort(sort)), me);
    }

    @GetMapping("/{id}")
    public CaseDetailResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.get(id, me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public CaseDetailResponse create(@Valid @RequestBody CreateCaseRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.create(request, me);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public CaseDetailResponse update(@PathVariable Long id, @Valid @RequestBody UpdateCaseRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.update(id, request, me);
    }

    @PutMapping("/{id}/judge")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public CaseDetailResponse assignJudge(@PathVariable Long id, @Valid @RequestBody AssignJudgeRequest request,
                                          @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.assignJudge(id, request, me);
    }

    @PostMapping("/{id}/lawyers")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public CaseDetailResponse addLawyer(@PathVariable Long id, @Valid @RequestBody LawyerAppearanceRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.addLawyer(id, request, me);
    }

    @DeleteMapping("/{id}/lawyers/{lawyerId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public CaseDetailResponse removeLawyer(@PathVariable Long id, @PathVariable Long lawyerId,
                                           @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.removeLawyer(id, lawyerId, me);
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public CaseDetailResponse changeStatus(@PathVariable Long id, @Valid @RequestBody ChangeStatusRequest request,
                                           @AuthenticationPrincipal AuthenticatedUser me) {
        return caseService.changeStatus(id, request, me);
    }

    /** Raw activity log of a case, newest first. */
    @GetMapping("/{id}/activity")
    public PageResponse<AuditEventResponse> activity(@PathVariable Long id,
                                                     @AuthenticationPrincipal AuthenticatedUser me,
                                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                                     @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size) {
        caseService.requireVisible(id, me);
        return auditService.forCase(id, page, size);
    }

    private static Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String property = SORTABLE.get(parts[0].trim());
        if (property == null) {
            throw ApiException.badRequest("INVALID_SORT", "Cases cannot be sorted by '" + parts[0] + "'.");
        }
        boolean descending = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
        Sort primary = descending ? Sort.by(property).descending() : Sort.by(property).ascending();
        return primary.and(Sort.by("id").descending());
    }
}
