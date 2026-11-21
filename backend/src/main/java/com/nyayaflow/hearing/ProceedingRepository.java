package com.nyayaflow.hearing;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProceedingRepository extends JpaRepository<Proceeding, Long> {

    List<Proceeding> findByCourtCaseIdOrderByProceedingDateAscIdAsc(Long caseId);

    long countByCourtCaseId(Long caseId);
}
