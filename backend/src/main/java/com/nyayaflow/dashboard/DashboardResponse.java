package com.nyayaflow.dashboard;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nyayaflow.audit.AuditEventResponse;
import com.nyayaflow.cases.dto.CaseSummaryResponse;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineResponse;
import com.nyayaflow.hearing.dto.HearingResponse;
import com.nyayaflow.order.OrderDtos.OrderResponse;
import com.nyayaflow.user.Role;

/** Role-specific overview. Sections that do not apply to a role are omitted. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardResponse(
        Role role,
        List<Stat> stats,
        List<HearingResponse> todaysHearings,
        List<HearingResponse> upcomingHearings,
        List<HearingResponse> pendingOutcomes,
        List<DeadlineResponse> deadlines,
        CaseList attention,
        List<OrderResponse> recentOrders,
        List<AuditEventResponse> recentActivity,
        Charts charts) {

    /** @param tone visual emphasis: neutral, info, success, warning or danger */
    public record Stat(String key, String label, long value, String hint, String tone, String link) {
    }

    public record CaseList(String title, String description, List<CaseSummaryResponse> cases, String link) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Charts(
            List<NamedCount> casesByStatus,
            List<NamedCount> casesByType,
            List<MonthlyFlow> institutionVsDisposal,
            List<NamedCount> pendingByJudge,
            List<DailyCount> hearingLoad) {
    }

    public record NamedCount(String key, String label, long count) {
    }

    /** Cases instituted (filed) and disposed in a month: the standard measure of court pendency. */
    public record MonthlyFlow(String month, long instituted, long disposed) {
    }

    public record DailyCount(LocalDate date, long count) {
    }
}
