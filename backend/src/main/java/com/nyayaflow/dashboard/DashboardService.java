package com.nyayaflow.dashboard;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.nyayaflow.audit.AuditService;
import com.nyayaflow.cases.CaseRepository;
import com.nyayaflow.cases.CaseSearchCriteria;
import com.nyayaflow.cases.CaseService;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.CaseType;
import com.nyayaflow.cases.dto.CaseSummaryResponse;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.dashboard.DashboardResponse.CaseList;
import com.nyayaflow.dashboard.DashboardResponse.Charts;
import com.nyayaflow.dashboard.DashboardResponse.DailyCount;
import com.nyayaflow.dashboard.DashboardResponse.MonthlyFlow;
import com.nyayaflow.dashboard.DashboardResponse.NamedCount;
import com.nyayaflow.dashboard.DashboardResponse.Stat;
import com.nyayaflow.deadline.DeadlineDtos.DeadlineResponse;
import com.nyayaflow.deadline.DeadlineDtos.View;
import com.nyayaflow.deadline.DeadlineService;
import com.nyayaflow.hearing.HearingService;
import com.nyayaflow.hearing.HearingSpecifications;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.dto.HearingResponse;
import com.nyayaflow.order.OrderService;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Composes each role's dashboard from the same role-scoped queries the rest of the API uses. */
@Service
public class DashboardService {

    private static final List<HearingStatus> HELD_OR_PLANNED =
            List.of(HearingStatus.SCHEDULED, HearingStatus.COMPLETED, HearingStatus.ADJOURNED);

    private final CaseRepository caseRepository;
    private final CaseService caseService;
    private final HearingService hearingService;
    private final DeadlineService deadlineService;
    private final OrderService orderService;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final Clock clock;

    public DashboardService(CaseRepository caseRepository, CaseService caseService, HearingService hearingService,
                            DeadlineService deadlineService, OrderService orderService, AuditService auditService,
                            UserRepository userRepository, Clock clock) {
        this.caseRepository = caseRepository;
        this.caseService = caseService;
        this.hearingService = hearingService;
        this.deadlineService = deadlineService;
        this.orderService = orderService;
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse build(AuthenticatedUser user) {
        return switch (user.role()) {
            case ADMIN -> admin(user);
            case STAFF -> staff(user);
            case JUDGE -> judge(user);
            case LAWYER -> lawyer(user);
        };
    }

    // ------------------------------------------------------------------ per role

    private DashboardResponse admin(AuthenticatedUser user) {
        Map<CaseStatus, Long> byStatus = toStatusMap(caseRepository.countByStatus());
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long pending = pendingCount(byStatus);
        long decided = byStatus.get(CaseStatus.DISPOSED) + byStatus.get(CaseStatus.CLOSED);
        long recentFilings = caseRepository.countByFilingDateGreaterThanEqual(today().minusDays(30));
        Map<Role, Long> usersByRole = new EnumMap<>(Role.class);
        for (Object[] row : userRepository.countActiveByRole()) {
            usersByRole.put((Role) row[0], (Long) row[1]);
        }
        long activeUsers = usersByRole.values().stream().mapToLong(Long::longValue).sum();

        List<Stat> stats = List.of(
                new Stat("total", "Total cases", total, pending + " pending", "neutral", "/cases"),
                new Stat("pending", "Pending cases", pending, "Filed, under review, active or reserved", "info",
                        "/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION"),
                new Stat("decided", "Disposed or closed", decided, percent(decided, total) + " of all cases",
                        "success", "/cases?status=DISPOSED,CLOSED"),
                new Stat("filings", "Filed in last 30 days", recentFilings, "New institutions", "neutral", "/cases"),
                new Stat("users", "Active users", activeUsers, usersByRole.getOrDefault(Role.JUDGE, 0L) + " judges, "
                        + usersByRole.getOrDefault(Role.LAWYER, 0L) + " lawyers, "
                        + usersByRole.getOrDefault(Role.STAFF, 0L) + " staff", "neutral", "/admin/users"));

        Charts charts = new Charts(statusChart(byStatus), typeChart(), institutionVsDisposal(), judgeWorkload(), null);
        return new DashboardResponse(Role.ADMIN, stats, todaysHearings(user), null, null, null,
                unallocatedCases(user), null, auditService.recent(), charts);
    }

    private DashboardResponse staff(AuthenticatedUser user) {
        List<HearingResponse> today = todaysHearings(user);
        long upcoming = hearings(user, today().plusDays(1), today().plusDays(7), List.of(HearingStatus.SCHEDULED), 1)
                .totalElements();
        List<HearingResponse> outcomes = pendingOutcomes(user);
        long overdue = deadlineService.search(View.OVERDUE, false, null, null, 0, 1, user).totalElements();
        long unallocated = caseRepository.countByStatusAndJudgeIsNull(CaseStatus.FILED);

        List<Stat> stats = List.of(
                new Stat("unallocated", "Awaiting allocation", unallocated, "Filed cases without a judge",
                        unallocated > 0 ? "warning" : "neutral", "/cases?unassigned=true"),
                new Stat("today", "Hearings today", today.size(), "Across all courtrooms", "info", "/hearings"),
                new Stat("week", "Next 7 days", upcoming, "Scheduled hearings", "neutral", "/hearings?range=week"),
                new Stat("outcomes", "Outcomes pending", outcomes.size(), "Held hearings without a result",
                        outcomes.isEmpty() ? "neutral" : "danger", "/hearings?range=past"),
                new Stat("overdue", "Overdue deadlines", overdue, "Across all cases",
                        overdue > 0 ? "danger" : "neutral", "/deadlines?view=OVERDUE"));

        Charts charts = new Charts(statusChart(toStatusMap(caseRepository.countByStatus())), null, null, null,
                hearingLoad(user));
        return new DashboardResponse(Role.STAFF, stats, today, upcomingHearings(user), outcomes, openDeadlines(user),
                unallocatedCases(user), null, auditService.recentCaseActivity(), charts);
    }

    private DashboardResponse judge(AuthenticatedUser user) {
        Map<CaseStatus, Long> byStatus = toStatusMap(caseRepository.countByStatusForJudge(user.id()));
        List<HearingResponse> today = todaysHearings(user);
        List<HearingResponse> outcomes = pendingOutcomes(user);
        long overdue = deadlineService.search(View.OVERDUE, false, null, null, 0, 1, user).totalElements();
        long reserved = byStatus.get(CaseStatus.AWAITING_DECISION);

        List<Stat> stats = List.of(
                new Stat("pending", "Pending before you", pendingCount(byStatus), "Assigned and undecided", "info",
                        "/cases?status=UNDER_REVIEW,ACTIVE,AWAITING_DECISION"),
                new Stat("today", "Hearings today", today.size(), "On your board", "neutral", "/hearings"),
                new Stat("reserved", "Awaiting decision", reserved, "Judgment reserved",
                        reserved > 0 ? "warning" : "neutral", "/cases?status=AWAITING_DECISION"),
                new Stat("outcomes", "Outcomes pending", outcomes.size(), "Held hearings without a result",
                        outcomes.isEmpty() ? "neutral" : "danger", "/hearings?range=past"),
                new Stat("overdue", "Overdue deadlines", overdue, "In your cases",
                        overdue > 0 ? "danger" : "neutral", "/deadlines?view=OVERDUE"));

        CaseList attention = new CaseList("Awaiting your decision",
                "Arguments are concluded and judgment is reserved.",
                cases(user, new CaseSearchCriteria(null, List.of(CaseStatus.AWAITING_DECISION), null, null, null, null,
                        null, null, null, null, null), Sort.by("updatedAt").ascending(), 6),
                "/cases?status=AWAITING_DECISION");
        Charts charts = new Charts(statusChart(byStatus), null, null, null, hearingLoad(user));
        return new DashboardResponse(Role.JUDGE, stats, today, upcomingHearings(user), outcomes, openDeadlines(user),
                attention, orderService.search(null, null, null, 0, 5, user).content(),
                auditService.recentForCases(caseRepository.findIdsByJudgeId(user.id())), charts);
    }

    private DashboardResponse lawyer(AuthenticatedUser user) {
        Map<CaseStatus, Long> byStatus = toStatusMap(caseRepository.countByStatusForLawyer(user.id()));
        long weekHearings = hearings(user, today(), today().plusDays(6), List.of(HearingStatus.SCHEDULED), 1)
                .totalElements();
        long dueSoon = deadlineService.search(View.DUE_SOON, false, null, null, 0, 1, user).totalElements();
        long overdue = deadlineService.search(View.OVERDUE, false, null, null, 0, 1, user).totalElements();

        List<Stat> stats = List.of(
                new Stat("active", "Active matters", pendingCount(byStatus), "Cases you appear in", "info",
                        "/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION"),
                new Stat("week", "Hearings this week", weekHearings, "Next 7 days", "neutral", "/hearings?range=week"),
                new Stat("dueSoon", "Deadlines due soon", dueSoon, "Within 7 days",
                        dueSoon > 0 ? "warning" : "neutral", "/deadlines?view=DUE_SOON"),
                new Stat("overdue", "Overdue deadlines", overdue, "Need immediate attention",
                        overdue > 0 ? "danger" : "neutral", "/deadlines?view=OVERDUE"),
                new Stat("decided", "Decided matters", byStatus.get(CaseStatus.DISPOSED) + byStatus.get(CaseStatus.CLOSED),
                        "Disposed or closed", "success", "/cases?status=DISPOSED,CLOSED"));

        List<HearingResponse> upcoming = hearings(user, today(), today().plusDays(14), List.of(HearingStatus.SCHEDULED), 10)
                .content();
        CaseList attention = new CaseList("Recently updated", "Your cases with the latest activity.",
                cases(user, new CaseSearchCriteria(null, null, null, null, null, null, null, null, null, null, null),
                        Sort.by("updatedAt").descending(), 6), "/cases?sort=updatedAt,desc");
        return new DashboardResponse(Role.LAWYER, stats, null, upcoming, null, openDeadlines(user), attention,
                orderService.search(null, null, null, 0, 5, user).content(),
                auditService.recentForCases(caseRepository.findIdsByLawyerId(user.id())), null);
    }

    // ------------------------------------------------------------------ building blocks

    private List<HearingResponse> todaysHearings(AuthenticatedUser user) {
        return hearings(user, today(), today(), HELD_OR_PLANNED, 60).content();
    }

    private List<HearingResponse> upcomingHearings(AuthenticatedUser user) {
        return hearings(user, today().plusDays(1), today().plusDays(7), List.of(HearingStatus.SCHEDULED), 8)
                .content();
    }

    /** Scheduled hearings whose time has passed: someone needs to record what happened. */
    private List<HearingResponse> pendingOutcomes(AuthenticatedUser user) {
        var criteria = new HearingSpecifications.Criteria(null, today(), List.of(HearingStatus.SCHEDULED), null, null,
                null, null, null, null);
        LocalDateTime now = LocalDateTime.now(clock);
        return hearingService.search(criteria, PageRequest.of(0, 20, Sort.by("scheduledAt").descending()), user)
                .content().stream()
                .filter(h -> h.scheduledAt().isBefore(now))
                .toList();
    }

    private PageResponse<HearingResponse> hearings(AuthenticatedUser user, LocalDate from,
                                                                        LocalDate to, List<HearingStatus> statuses,
                                                                        int size) {
        var criteria = new HearingSpecifications.Criteria(from, to, statuses, null, null, null, null, null, null);
        return hearingService.search(criteria, PageRequest.of(0, size, Sort.by("scheduledAt").ascending()), user);
    }

    private List<DeadlineResponse> openDeadlines(AuthenticatedUser user) {
        List<DeadlineResponse> result = new ArrayList<>(
                deadlineService.search(View.OVERDUE, false, null, null, 0, 6, user).content());
        result.addAll(deadlineService.search(View.DUE_SOON, false, null, null, 0, 6, user).content());
        return result;
    }

    private CaseList unallocatedCases(AuthenticatedUser user) {
        return new CaseList("Awaiting allocation", "Registered cases that still need a judge.",
                cases(user, new CaseSearchCriteria(null, List.of(CaseStatus.FILED), null, null, null, null, null, null,
                        null, null, true), Sort.by("filingDate").ascending(), 6),
                "/cases?unassigned=true");
    }

    private List<CaseSummaryResponse> cases(AuthenticatedUser user, CaseSearchCriteria criteria, Sort sort, int size) {
        return caseService.search(criteria, PageRequest.of(0, size, sort), user).content();
    }

    private List<DailyCount> hearingLoad(AuthenticatedUser user) {
        LocalDate start = today();
        LocalDate end = start.plusDays(13);
        Map<LocalDate, Long> counts = hearingService.calendar(start, end, null, null, null, user).stream()
                .filter(h -> h.status() == HearingStatus.SCHEDULED)
                .collect(Collectors.groupingBy(h -> h.scheduledAt().toLocalDate(), Collectors.counting()));
        List<DailyCount> load = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            if (day.getDayOfWeek() != java.time.DayOfWeek.SUNDAY) {
                load.add(new DailyCount(day, counts.getOrDefault(day, 0L)));
            }
        }
        return load;
    }

    private List<MonthlyFlow> institutionVsDisposal() {
        YearMonth current = YearMonth.from(today());
        YearMonth first = current.minusMonths(11);
        LocalDate from = first.atDay(1);
        Map<YearMonth, Long> instituted = countByMonth(caseRepository.findFilingDatesSince(from));
        Map<YearMonth, Long> disposed = countByMonth(caseRepository.findDisposalDatesSince(from));
        List<MonthlyFlow> flow = new ArrayList<>();
        for (YearMonth month = first; !month.isAfter(current); month = month.plusMonths(1)) {
            flow.add(new MonthlyFlow(month.toString(), instituted.getOrDefault(month, 0L),
                    disposed.getOrDefault(month, 0L)));
        }
        return flow;
    }

    private List<NamedCount> judgeWorkload() {
        return caseRepository.countPendingByJudge(CaseStatus.pendingStatuses()).stream()
                .map(row -> new NamedCount(String.valueOf(row[0]), (String) row[1], (Long) row[2]))
                .toList();
    }

    private List<NamedCount> typeChart() {
        Map<CaseType, Long> counts = new EnumMap<>(CaseType.class);
        for (Object[] row : caseRepository.countByTypeAndStatusIn(CaseStatus.pendingStatuses())) {
            counts.put((CaseType) row[0], (Long) row[1]);
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<CaseType, Long>comparingByValue().reversed())
                .map(e -> new NamedCount(e.getKey().name(), e.getKey().label(), e.getValue()))
                .toList();
    }

    private static List<NamedCount> statusChart(Map<CaseStatus, Long> byStatus) {
        return byStatus.entrySet().stream()
                .map(e -> new NamedCount(e.getKey().name(), e.getKey().label(), e.getValue()))
                .toList();
    }

    private static Map<CaseStatus, Long> toStatusMap(List<Object[]> rows) {
        Map<CaseStatus, Long> map = new LinkedHashMap<>();
        Arrays.stream(CaseStatus.values()).forEach(s -> map.put(s, 0L));
        for (Object[] row : rows) {
            map.put((CaseStatus) row[0], (Long) row[1]);
        }
        return map;
    }

    private static long pendingCount(Map<CaseStatus, Long> byStatus) {
        return CaseStatus.pendingStatuses().stream().mapToLong(byStatus::get).sum();
    }

    private static Map<YearMonth, Long> countByMonth(List<LocalDate> dates) {
        return dates.stream().collect(Collectors.groupingBy(YearMonth::from, Collectors.counting()));
    }

    private static String percent(long part, long total) {
        return total == 0 ? "0%" : Math.round(part * 100.0 / total) + "%";
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }
}
