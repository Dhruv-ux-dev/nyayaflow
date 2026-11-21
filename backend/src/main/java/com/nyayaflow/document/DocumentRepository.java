package com.nyayaflow.document;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DocumentRepository extends JpaRepository<CaseDocument, Long>, JpaSpecificationExecutor<CaseDocument> {

    List<CaseDocument> findByCourtCaseIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long caseId);
}
