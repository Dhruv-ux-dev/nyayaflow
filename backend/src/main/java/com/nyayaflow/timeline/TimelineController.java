package com.nyayaflow.timeline;

import java.util.List;

import com.nyayaflow.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TimelineController {

    private final TimelineService timelineService;

    public TimelineController(TimelineService timelineService) {
        this.timelineService = timelineService;
    }

    @GetMapping("/api/cases/{caseId}/timeline")
    public List<TimelineEntry> timeline(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return timelineService.timeline(caseId, me);
    }
}
