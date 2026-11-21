package com.nyayaflow.cases;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseStatusChangeRepository extends JpaRepository<CaseStatusChange, Long> {

    List<CaseStatusChange> findByCourtCaseIdOrderByChangedAtAsc(Long caseId);
}
