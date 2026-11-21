package com.nyayaflow.hearing;

import java.util.List;

import com.nyayaflow.hearing.dto.ProceedingResponse;
import com.nyayaflow.hearing.dto.RecordProceedingRequest;
import com.nyayaflow.hearing.dto.UpdateProceedingRequest;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProceedingController {

    private final ProceedingService proceedingService;

    public ProceedingController(ProceedingService proceedingService) {
        this.proceedingService = proceedingService;
    }

    @GetMapping("/api/cases/{caseId}/proceedings")
    public List<ProceedingResponse> list(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return proceedingService.listForCase(caseId, me);
    }

    @PostMapping("/api/cases/{caseId}/proceedings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'JUDGE')")
    public ProceedingResponse record(@PathVariable Long caseId, @Valid @RequestBody RecordProceedingRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser me) {
        return proceedingService.record(caseId, request, me);
    }

    @PutMapping("/api/proceedings/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'JUDGE')")
    public ProceedingResponse update(@PathVariable Long id, @Valid @RequestBody UpdateProceedingRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser me) {
        return proceedingService.update(id, request, me);
    }
}
