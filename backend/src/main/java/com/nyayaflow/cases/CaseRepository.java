package com.nyayaflow.cases;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CaseRepository extends JpaRepository<CourtCase, Long>, JpaSpecificationExecutor<CourtCase> {

    @Query("select c.status, count(c) from CourtCase c group by c.status")
    List<Object[]> countByStatus();

    @Query("select c.status, count(c) from CourtCase c where c.judge.id = :judgeId group by c.status")
    List<Object[]> countByStatusForJudge(@Param("judgeId") Long judgeId);

    @Query("""
            select c.status, count(c) from CourtCase c
            where exists (select 1 from CaseLawyer cl where cl.courtCase = c and cl.lawyer.id = :lawyerId)
            group by c.status""")
    List<Object[]> countByStatusForLawyer(@Param("lawyerId") Long lawyerId);

    @Query("select c.caseType, count(c) from CourtCase c where c.status in :statuses group by c.caseType")
    List<Object[]> countByTypeAndStatusIn(@Param("statuses") Collection<CaseStatus> statuses);

    @Query("""
            select c.judge.id, c.judge.fullName, count(c) from CourtCase c
            where c.judge is not null and c.status in :statuses
            group by c.judge.id, c.judge.fullName
            order by count(c) desc""")
    List<Object[]> countPendingByJudge(@Param("statuses") Collection<CaseStatus> statuses);

    @Query("select c.filingDate from CourtCase c where c.filingDate >= :from")
    List<LocalDate> findFilingDatesSince(@Param("from") LocalDate from);

    @Query("select c.disposedOn from CourtCase c where c.disposedOn is not null and c.disposedOn >= :from")
    List<LocalDate> findDisposalDatesSince(@Param("from") LocalDate from);

    @Query("select c.id from CourtCase c where c.judge.id = :judgeId")
    List<Long> findIdsByJudgeId(@Param("judgeId") Long judgeId);

    @Query("select cl.courtCase.id from CaseLawyer cl where cl.lawyer.id = :lawyerId")
    List<Long> findIdsByLawyerId(@Param("lawyerId") Long lawyerId);

    long countByStatusIn(Collection<CaseStatus> statuses);

    long countByJudgeIdAndStatusIn(Long judgeId, Collection<CaseStatus> statuses);

    long countByFilingDateGreaterThanEqual(LocalDate from);

    long countByStatusAndJudgeIsNull(CaseStatus status);
}
