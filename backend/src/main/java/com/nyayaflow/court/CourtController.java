package com.nyayaflow.court;

import java.util.List;

import com.nyayaflow.court.CourtDtos.CourtRequest;
import com.nyayaflow.court.CourtDtos.CourtResponse;
import com.nyayaflow.court.CourtDtos.CourtroomRequest;
import com.nyayaflow.court.CourtDtos.CourtroomResponse;
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

/** Court and courtroom configuration. Everyone can read it; only administrators can change it. */
@RestController
public class CourtController {

    private final CourtService courtService;

    public CourtController(CourtService courtService) {
        this.courtService = courtService;
    }

    @GetMapping("/api/courts")
    public List<CourtResponse> list() {
        return courtService.list();
    }

    @PostMapping("/api/courts")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CourtResponse create(@Valid @RequestBody CourtRequest request, @AuthenticationPrincipal AuthenticatedUser me) {
        return courtService.create(request, me);
    }

    @PutMapping("/api/courts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CourtResponse update(@PathVariable Long id, @Valid @RequestBody CourtRequest request,
                                @AuthenticationPrincipal AuthenticatedUser me) {
        return courtService.update(id, request, me);
    }

    @PostMapping("/api/courts/{id}/courtrooms")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CourtroomResponse addCourtroom(@PathVariable Long id, @Valid @RequestBody CourtroomRequest request,
                                          @AuthenticationPrincipal AuthenticatedUser me) {
        return courtService.addCourtroom(id, request, me);
    }

    @PutMapping("/api/courtrooms/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CourtroomResponse updateCourtroom(@PathVariable Long id, @Valid @RequestBody CourtroomRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser me) {
        return courtService.updateCourtroom(id, request, me);
    }
}
