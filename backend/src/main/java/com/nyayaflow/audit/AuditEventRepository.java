package com.nyayaflow.audit;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long>, JpaSpecificationExecutor<AuditEvent> {

    Page<AuditEvent> findByCaseIdOrderByOccurredAtDesc(Long caseId, Pageable pageable);

    List<AuditEvent> findByCaseIdAndActionInOrderByOccurredAtAsc(Long caseId, Collection<AuditAction> actions);

    List<AuditEvent> findTop12ByOrderByOccurredAtDesc();

    List<AuditEvent> findTop12ByCaseIdIsNotNullOrderByOccurredAtDesc();

    List<AuditEvent> findTop12ByCaseIdInOrderByOccurredAtDesc(Collection<Long> caseIds);
}
