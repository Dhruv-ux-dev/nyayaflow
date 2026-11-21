package com.nyayaflow.cases;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.court.Court;
import com.nyayaflow.hearing.Hearing;
import com.nyayaflow.hearing.HearingRepository;
import com.nyayaflow.hearing.HearingStatus;
import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.notification.NotificationRepository;
import com.nyayaflow.support.IntegrationTest;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.ResultActions;

/** Walks a case through its lifecycle via the HTTP API, checking the rules that keep it consistent. */
class CaseLifecycleIntegrationTest extends IntegrationTest {

    @Autowired
    private HearingRepository hearings;

    @Autowired
    private NotificationRepository notifications;

    @Autowired
    private CaseRepository cases;

    @Autowired
    private JdbcClient jdbc;

    private Court court;
    private User staff;
    private User judge;
    private User lawyer;

    @BeforeEach
    void setUp() {
        court = data.court();
        staff = data.user(Role.STAFF, court);
        judge = data.user(Role.JUDGE, court);
        lawyer = data.user(Role.LAWYER, court);
    }

    private ResultActions schedule(User actor, long caseId, LocalDateTime at, boolean override) throws Exception {
        String body = """
                {"scheduledAt": "%s", "durationMinutes": 30, "hearingType": "FIRST_HEARING",
                 "courtroomId": %d, "overrideConflicts": %s}"""
                .formatted(at, court.getCourtrooms().getFirst().getId(), override);
        return mvc.perform(post("/api/cases/" + caseId + "/hearings").header(HttpHeaders.AUTHORIZATION, bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void registrationIssuesACaseNumberAndAllocationMovesTheCaseToReview() throws Exception {
        String body = """
                {"title": "Meena Iyer v. Sunrise Builders", "caseType": "CIVIL_SUIT", "priority": "HIGH",
                 "filingDate": "%s", "courtId": %d,
                 "parties": [{"side": "PETITIONER", "partyType": "INDIVIDUAL", "name": "Meena Iyer"},
                             {"side": "RESPONDENT", "partyType": "ORGANIZATION", "name": "Sunrise Builders"}],
                 "lawyers": [{"lawyerId": %d, "side": "PETITIONER", "leadCounsel": true}]}"""
                .formatted(LocalDate.now(), court.getId(), lawyer.getId());

        String created = mvc.perform(post("/api/cases").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caseNumber").value(matchesPattern("CS/\\d+/\\d{4}")))
                .andExpect(jsonPath("$.status").value("FILED"))
                .andReturn().getResponse().getContentAsString();
        long caseId = Long.parseLong(created.replaceAll("(?s).*?\"id\":(\\d+).*", "$1"));

        mvc.perform(put("/api/cases/" + caseId + "/judge").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"judgeId\": " + judge.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"))
                .andExpect(jsonPath("$.statusHistory.length()").value(2));

        assertThat(notifications.findByRecipientIdOrderByCreatedAtDesc(judge.getId(), PageRequest.of(0, 5)).getContent())
                .anySatisfy(n -> assertThat(n.getTitle()).isEqualTo("New case assigned"));
        assertThat(notifications.countByRecipientIdAndReadAtIsNull(lawyer.getId())).isPositive();
    }

    @Test
    void partiesOnBothSidesAreRequired() throws Exception {
        String body = """
                {"title": "One-sided", "caseType": "CIVIL_SUIT", "priority": "NORMAL", "filingDate": "%s", "courtId": %d,
                 "parties": [{"side": "PETITIONER", "partyType": "INDIVIDUAL", "name": "Only Petitioner"}]}"""
                .formatted(LocalDate.now(), court.getId());
        mvc.perform(post("/api/cases").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PARTIES_REQUIRED"));
    }

    @Test
    void clashingHearingsAreRejectedUnlessTheClashIsAcknowledged() throws Exception {
        CaseDetailResponse first = data.registerCase(staff, court, judge);
        CaseDetailResponse second = data.registerCase(staff, court, judge);
        LocalDateTime slot = data.nextCourtDayAt(11, 0);

        schedule(staff, first.id(), slot, false).andExpect(status().isCreated());

        schedule(staff, second.id(), slot.plusMinutes(15), false)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SCHEDULING_CONFLICT"))
                .andExpect(jsonPath("$.details[0].caseNumber").value(first.caseNumber()))
                .andExpect(jsonPath("$.details[0].reasons[0]").value("JUDGE_BUSY"));

        schedule(staff, second.id(), slot.plusMinutes(15), true).andExpect(status().isCreated());
        schedule(staff, second.id(), slot.plusHours(2), false).andExpect(status().isCreated());
    }

    @Test
    void hearingsMustFallOnACourtDayWithinCourtHours() throws Exception {
        CaseDetailResponse courtCase = data.registerCase(staff, court, judge);
        schedule(staff, courtCase.id(), data.nextCourtDayAt(19, 0), false)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("OUTSIDE_COURT_HOURS"));
        schedule(staff, courtCase.id(), data.nextSunday().atTime(11, 0), false)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NON_WORKING_DAY"));
        schedule(staff, courtCase.id(), LocalDateTime.now().minusDays(2).withHour(11), false)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("HEARING_IN_PAST"));
    }

    @Test
    void hearingTimesAreStoredAsTheCourtWallClockTimeEntered() throws Exception {
        CaseDetailResponse courtCase = data.registerCase(staff, court, judge);
        LocalDateTime slot = data.nextCourtDayAt(11, 30);
        schedule(staff, courtCase.id(), slot, false).andExpect(status().isCreated());
        hearings.flush();

        LocalDateTime stored = jdbc.sql("SELECT scheduled_at FROM hearings WHERE case_id = :caseId")
                .param("caseId", courtCase.id())
                .query(LocalDateTime.class)
                .single();
        assertThat(stored).isEqualTo(slot);
    }

    @Test
    void hearingsCannotBeListedBeforeAJudgeIsAllocated() throws Exception {
        CaseDetailResponse unallocated = data.registerCase(staff, court, null);
        schedule(staff, unallocated.id(), data.nextCourtDayAt(11, 0), false)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("JUDGE_REQUIRED"));
    }

    @Test
    void concludingAHearingRecordsProceedingsAndListsTheNextDateTogether() throws Exception {
        CaseDetailResponse courtCase = data.registerCase(staff, court, judge, lawyer);
        Hearing held = new Hearing();
        held.setCourtCase(cases.getReferenceById(courtCase.id()));
        held.setJudge(judge);
        held.setCourtroom(court.getCourtrooms().getFirst());
        held.setScheduledAt(LocalDate.now().atTime(0, 5));
        held.setDurationMinutes(30);
        held.setHearingType(HearingType.FIRST_HEARING);
        held.setStatus(HearingStatus.SCHEDULED);
        hearings.saveAndFlush(held);
        LocalDateTime next = data.nextCourtDayAt(12, 0);

        String body = """
                {"result": "COMPLETED", "outcome": "Notice served; reply in two weeks.",
                 "proceeding": {"summary": "Respondent appeared through counsel."},
                 "nextHearing": {"scheduledAt": "%s", "durationMinutes": 30, "hearingType": "ARGUMENTS",
                                 "courtroomId": %d}}"""
                .formatted(next, court.getCourtrooms().getFirst().getId());
        mvc.perform(post("/api/hearings/" + held.getId() + "/conclude").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mvc.perform(get("/api/cases/" + courtCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.nextHearingAt").value(next.toString() + ":00"));
        mvc.perform(get("/api/cases/" + courtCase.id() + "/proceedings").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].hearing.id").value(held.getId()));
    }

    @Test
    void aJudgmentDisposesOfTheCaseAndVacatesListedHearings() throws Exception {
        CaseDetailResponse courtCase = data.registerCase(staff, court, judge, lawyer);
        schedule(staff, courtCase.id(), data.nextCourtDayAt(15, 0), false).andExpect(status().isCreated());

        String judgment = """
                {"orderType": "JUDGMENT", "title": "Suit decreed", "content": "The suit is decreed with costs.",
                 "orderDate": "%s"}""".formatted(LocalDate.now());
        mvc.perform(post("/api/cases/" + courtCase.id() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content(judgment))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/cases/" + courtCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(judge)))
                .andExpect(jsonPath("$.status").value("DISPOSED"))
                .andExpect(jsonPath("$.disposedOn").isNotEmpty())
                .andExpect(jsonPath("$.nextHearingAt").isEmpty())
                .andExpect(jsonPath("$.permissions.canScheduleHearing").value(false));
        assertThat(hearings.findByCourtCaseIdAndStatus(courtCase.id(), HearingStatus.CANCELLED))
                .singleElement()
                .satisfies(h -> assertThat(h.getStatusReason()).startsWith("Vacated"));

        mvc.perform(post("/api/cases/" + courtCase.id() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content(judgment))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_DECIDED"));
    }

    @Test
    void theLifecycleOnlyMovesAlongValidTransitionsForTheRightRole() throws Exception {
        CaseDetailResponse courtCase = data.registerCase(staff, court, judge);
        String toClosed = "{\"status\": \"CLOSED\", \"note\": \"Consigned\"}";

        // Under review cannot jump to closed, whoever asks.
        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(toClosed))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));

        // Disposal is a judicial act: staff may not record it.
        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"DISPOSED\", \"note\": \"x\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\": \"DISPOSED\", \"note\": \"Withdrawn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPOSED"));

        // Closing the record is a registry act.
        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content(toClosed))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(toClosed))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions.canEdit").value(false))
                .andExpect(jsonPath("$.permissions.canUploadDocument").value(false));
    }
}
