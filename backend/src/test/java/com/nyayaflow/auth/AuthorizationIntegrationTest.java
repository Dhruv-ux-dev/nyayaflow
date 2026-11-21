package com.nyayaflow.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.court.Court;
import com.nyayaflow.support.IntegrationTest;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** The backend enforces every rule the UI hides: calling an endpoint directly does not bypass it. */
class AuthorizationIntegrationTest extends IntegrationTest {

    private User staff;
    private User judge;
    private User otherJudge;
    private User lawyer;
    private User otherLawyer;
    private CaseDetailResponse lawyersCase;
    private CaseDetailResponse unrelatedCase;

    @BeforeEach
    void setUp() {
        Court court = data.court();
        staff = data.user(Role.STAFF, court);
        judge = data.user(Role.JUDGE, court);
        otherJudge = data.user(Role.JUDGE, court);
        lawyer = data.user(Role.LAWYER, court);
        otherLawyer = data.user(Role.LAWYER, court);
        lawyersCase = data.registerCase(staff, court, judge, lawyer);
        unrelatedCase = data.registerCase(staff, court, otherJudge, otherLawyer);
    }

    @Test
    void lawyersCannotUseAdministratorEndpoints() throws Exception {
        mvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, bearer(lawyer))).andExpect(status().isForbidden());
        mvc.perform(get("/api/audit").header(HttpHeaders.AUTHORIZATION, bearer(lawyer))).andExpect(status().isForbidden());
        mvc.perform(get("/api/directory/users?role=JUDGE").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void roleChecksRunBeforeTheRequestBodyIsValidated() throws Exception {
        mvc.perform(post("/api/cases").header(HttpHeaders.AUTHORIZATION, bearer(lawyer))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/hearings/conflicts").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void lawyersOnlySeeCasesTheyAppearIn() throws Exception {
        mvc.perform(get("/api/cases").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(lawyersCase.id()));

        mvc.perform(get("/api/cases/" + unrelatedCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/cases/" + unrelatedCase.id() + "/documents").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void judgesOnlySeeCasesAllocatedToThem() throws Exception {
        mvc.perform(get("/api/cases").header(HttpHeaders.AUTHORIZATION, bearer(judge)))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(lawyersCase.id()));
        mvc.perform(get("/api/cases/" + unrelatedCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(judge)))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyThePresidingJudgeCanIssueOrders() throws Exception {
        String order = """
                {"orderType": "INTERIM_ORDER", "title": "Stay", "content": "Status quo.", "orderDate": "%s"}"""
                .formatted(LocalDate.now());

        mvc.perform(post("/api/cases/" + lawyersCase.id() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer(otherJudge))
                        .contentType(MediaType.APPLICATION_JSON).content(order))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/cases/" + lawyersCase.id() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(order))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/cases/" + lawyersCase.id() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer(judge))
                        .contentType(MediaType.APPLICATION_JSON).content(order))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.issuedBy.id").value(judge.getId()));
    }

    @Test
    void caseDetailsReportWhatTheCurrentUserMayDo() throws Exception {
        mvc.perform(get("/api/cases/" + lawyersCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(jsonPath("$.permissions.canUploadDocument").value(true))
                .andExpect(jsonPath("$.permissions.canIssueOrder").value(false))
                .andExpect(jsonPath("$.permissions.canEdit").value(false))
                .andExpect(jsonPath("$.permissions.allowedStatusChanges").isEmpty());
        mvc.perform(get("/api/cases/" + lawyersCase.id()).header(HttpHeaders.AUTHORIZATION, bearer(judge)))
                .andExpect(jsonPath("$.permissions.canIssueOrder").value(true))
                .andExpect(jsonPath("$.permissions.allowedStatusChanges[0]").value("ACTIVE"));
    }
}
