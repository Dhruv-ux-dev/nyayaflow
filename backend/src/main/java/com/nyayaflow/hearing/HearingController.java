package com.nyayaflow.hearing;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.hearing.dto.CancelHearingRequest;
import com.nyayaflow.hearing.dto.ConcludeHearingRequest;
import com.nyayaflow.hearing.dto.HearingResponse;
import com.nyayaflow.hearing.dto.RescheduleHearingRequest;
import com.nyayaflow.hearing.dto.ScheduleHearingRequest;
import com.nyayaflow.hearing.dto.SchedulingConflict;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HearingController {

    private final HearingService hearingService;

    public HearingController(HearingService hearingService) {
        this.hearingService = hearingService;
    }

    @GetMapping("/api/cases/{caseId}/hearings")
    public List<HearingResponse> listForCase(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.listForCase(caseId, me);
    }

    @PostMapping("/api/cases/{caseId}/hearings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public HearingResponse schedule(@PathVariable Long caseId, @Valid @RequestBody ScheduleHearingRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.schedule(caseId, request, me);
    }

    @GetMapping("/api/hearings")
    public PageResponse<HearingResponse> search(
            @AuthenticationPrincipal AuthenticatedUser me,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) List<HearingStatus> status,
            @RequestParam(required = false) List<HearingType> type,
            @RequestParam(required = false) Long judgeId,
            @RequestParam(required = false) Long courtroomId,
            @RequestParam(required = false) Long courtId,
            @RequestParam(required = false) Long caseId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        Sort sort = "desc".equalsIgnoreCase(direction)
                ? Sort.by("scheduledAt").descending().and(Sort.by("id").descending())
                : Sort.by("scheduledAt").ascending().and(Sort.by("id").ascending());
        var criteria = new HearingSpecifications.Criteria(from, to, status, type, judgeId, courtroomId, courtId,
                caseId, q);
        return hearingService.search(criteria, PageRequest.of(page, size, sort), me);
    }

    @GetMapping("/api/hearings/calendar")
    public List<HearingResponse> calendar(
            @AuthenticationPrincipal AuthenticatedUser me,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long judgeId,
            @RequestParam(required = false) Long courtroomId,
            @RequestParam(required = false) Long courtId) {
        return hearingService.calendar(from, to, judgeId, courtroomId, courtId, me);
    }

    @GetMapping("/api/hearings/conflicts")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public List<SchedulingConflict> conflicts(
            @AuthenticationPrincipal AuthenticatedUser me,
            @RequestParam Long caseId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledAt,
            @RequestParam(required = false) Integer durationMinutes,
            @RequestParam(required = false) Long courtroomId,
            @RequestParam(required = false) Long excludeHearingId) {
        return hearingService.checkConflicts(caseId, scheduledAt, durationMinutes, courtroomId, excludeHearingId, me);
    }

    @GetMapping("/api/hearings/{id}")
    public HearingResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.get(id, me);
    }

    @PostMapping("/api/hearings/{id}/reschedule")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public HearingResponse reschedule(@PathVariable Long id, @Valid @RequestBody RescheduleHearingRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.reschedule(id, request, me);
    }

    @PostMapping("/api/hearings/{id}/cancel")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public HearingResponse cancel(@PathVariable Long id, @Valid @RequestBody CancelHearingRequest request,
                                  @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.cancel(id, request, me);
    }

    @PostMapping("/api/hearings/{id}/conclude")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'JUDGE')")
    public HearingResponse conclude(@PathVariable Long id, @Valid @RequestBody ConcludeHearingRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser me) {
        return hearingService.conclude(id, request, me);
    }
}
