package com.nyayaflow.order;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CourtOrderRepository extends JpaRepository<CourtOrder, Long>, JpaSpecificationExecutor<CourtOrder> {

    List<CourtOrder> findByCourtCaseIdOrderByOrderDateAscIdAsc(Long caseId);

    boolean existsByCourtCaseIdAndOrderTypeIn(Long caseId, List<OrderType> types);
}
