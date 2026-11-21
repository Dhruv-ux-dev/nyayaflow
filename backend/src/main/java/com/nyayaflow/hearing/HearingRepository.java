package com.nyayaflow.hearing;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HearingRepository extends JpaRepository<Hearing, Long>, JpaSpecificationExecutor<Hearing> {

    List<Hearing> findByCourtCaseIdOrderByScheduledAtAsc(Long caseId);

    List<Hearing> findByCourtCaseIdAndStatus(Long caseId, HearingStatus status);

    Optional<Hearing> findFirstByCourtCaseIdAndStatusOrderByScheduledAtAsc(Long caseId, HearingStatus status);

    long countByCourtCaseIdAndStatus(Long caseId, HearingStatus status);

    /** Same-day scheduled hearings of a judge or in a courtroom; overlap is checked in Java. */
    @Query("""
            select h from Hearing h
            where h.status = com.nyayaflow.hearing.HearingStatus.SCHEDULED
              and h.scheduledAt >= :from and h.scheduledAt < :to
              and (h.judge.id = :judgeId or h.courtroom.id = :courtroomId)""")
    List<Hearing> findScheduledForJudgeOrCourtroom(@Param("judgeId") Long judgeId,
                                                   @Param("courtroomId") Long courtroomId,
                                                   @Param("from") LocalDateTime from,
                                                   @Param("to") LocalDateTime to);
}
