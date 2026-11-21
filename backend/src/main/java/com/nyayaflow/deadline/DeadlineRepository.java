package com.nyayaflow.deadline;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DeadlineRepository extends JpaRepository<Deadline, Long>, JpaSpecificationExecutor<Deadline> {

    List<Deadline> findByCourtCaseIdOrderByDueDateAscIdAsc(Long caseId);

    long countByCourtCaseIdAndStatus(Long caseId, DeadlineStatus status);

    List<Deadline> findByStatusAndDueDateBetweenAndReminderSentAtIsNull(DeadlineStatus status, LocalDate from,
                                                                       LocalDate to);
}
