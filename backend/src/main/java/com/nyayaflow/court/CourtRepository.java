package com.nyayaflow.court;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourtRepository extends JpaRepository<Court, Long> {

    @EntityGraph(attributePaths = "courtrooms")
    List<Court> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);
}
