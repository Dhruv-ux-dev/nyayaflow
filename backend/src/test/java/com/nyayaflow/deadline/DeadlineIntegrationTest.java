package com.nyayaflow.deadline;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import com.nyayaflow.cases.CasePriority;
import com.nyayaflow.cases.CaseRepository;
import com.nyayaflow.cases.CaseStatus;
import com.nyayaflow.cases.dto.CaseDetailResponse;
import com.nyayaflow.court.Court;
import com.nyayaflow.notification.NotificationRepository;
import com.nyayaflow.notification.NotificationType;
import com.nyayaflow.support.IntegrationTest;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class DeadlineIntegrationTest extends IntegrationTest {

    @Autowired
    private DeadlineRepository deadlines;

    @Autowired
    private DeadlineService deadlineService;

    @Autowired
    private CaseRepository cases;

    @Autowired
    private NotificationRepository notifications;

    private User staff;
    private User lawyer;
    private User outsider;
    private CaseDetailResponse courtCase;

    @BeforeEach
    void setUp() {
        Court court = data.court();
        staff = data.user(Role.STAFF, court);
        User judge = data.user(Role.JUDGE, court);
        lawyer = data.user(Role.LAWYER, court);
        outsider = data.user(Role.LAWYER, court);
        courtCase = data.registerCase(staff, court, judge, lawyer);
    }

    private Deadline pending(LocalDate due, User assignee) {
        Deadline deadline = new Deadline();
        deadline.setCourtCase(cases.getReferenceById(courtCase.id()));
        deadline.setTitle("File written statement");
        deadline.setDueDate(due);
        deadline.setPriority(CasePriority.HIGH);
        deadline.setStatus(DeadlineStatus.PENDING);
        deadline.setAssignedTo(assignee);
        deadline.setCreatedBy(staff);
        return deadlines.saveAndFlush(deadline);
    }

    @Test
    void overdueIsDerivedFromTheDueDateRatherThanStored() throws Exception {
        Deadline late = pending(LocalDate.now().minusDays(2), lawyer);
        pending(LocalDate.now().plusDays(10), lawyer);

        mvc.perform(get("/api/deadlines?view=OVERDUE").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(late.getId()))
                .andExpect(jsonPath("$.content[0].status").value("OVERDUE"))
                .andExpect(jsonPath("$.content[0].daysUntilDue").value(-2));
        assertThat(deadlines.findById(late.getId()).orElseThrow().getStatus()).isEqualTo(DeadlineStatus.PENDING);
    }

    @Test
    void assigneesMustBeInvolvedInTheCase() throws Exception {
        String body = """
                {"title": "Serve notice", "dueDate": "%s", "priority": "NORMAL", "assignedToId": %d}"""
                .formatted(LocalDate.now().plusDays(5), outsider.getId());
        mvc.perform(post("/api/cases/" + courtCase.id() + "/deadlines").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ASSIGNEE_NOT_ON_CASE"));
    }

    @Test
    void assignedCounselCanCompleteButNotEditTheirDeadline() throws Exception {
        Deadline deadline = pending(LocalDate.now().plusDays(3), lawyer);

        mvc.perform(put("/api/deadlines/" + deadline.getId()).header(HttpHeaders.AUTHORIZATION, bearer(lawyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"x\", \"dueDate\": \"2030-01-01\", \"priority\": \"LOW\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/deadlines/" + deadline.getId() + "/complete").header(HttpHeaders.AUTHORIZATION, bearer(lawyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completedBy.id").value(lawyer.getId()));
    }

    @Test
    void remindersGoOutOnceForDeadlinesDueSoon() {
        pending(LocalDate.now().plusDays(1), lawyer);
        pending(LocalDate.now().plusDays(30), lawyer);

        assertThat(deadlineService.sendReminders()).isEqualTo(1);
        assertThat(deadlineService.sendReminders()).isZero();
        assertThat(notifications.findByRecipientIdOrderByCreatedAtDesc(lawyer.getId(), PageRequest.of(0, 20)).getContent())
                .filteredOn(n -> n.getType() == NotificationType.DEADLINE_APPROACHING)
                .hasSize(1);
    }

    @Test
    void aCaseIsClosedOnlyOnceItsDeadlinesAreDone() throws Exception {
        Deadline open = pending(LocalDate.now().plusDays(5), lawyer);
        cases.findById(courtCase.id()).orElseThrow().setStatus(CaseStatus.DISPOSED);
        String close = """
                {"status": "CLOSED", "note": "Record consigned"}""";

        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(close))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OPEN_DEADLINES"));

        mvc.perform(post("/api/deadlines/" + open.getId() + "/complete").header(HttpHeaders.AUTHORIZATION, bearer(staff)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/cases/" + courtCase.id() + "/status").header(HttpHeaders.AUTHORIZATION, bearer(staff))
                        .contentType(MediaType.APPLICATION_JSON).content(close))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }
}
