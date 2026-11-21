package com.nyayaflow.court;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CourtroomRepository extends JpaRepository<Courtroom, Long> {

    boolean existsByCourtIdAndNameIgnoreCase(Long courtId, String name);
}
