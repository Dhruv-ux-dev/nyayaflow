package com.nyayaflow.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByBarRegistrationNumberIgnoreCase(String barRegistrationNumber);

    boolean existsByBarRegistrationNumberIgnoreCaseAndIdNot(String barRegistrationNumber, Long id);

    List<User> findByRoleAndActiveTrueOrderByFullNameAsc(Role role);

    long countByRoleAndActiveTrue(Role role);

    long countByActiveTrue();

    @Query("select u.role, count(u) from User u where u.active = true group by u.role")
    List<Object[]> countActiveByRole();

    @Query("""
            select count(c) from CourtCase c where c.judge.id = :userId
            and c.status not in (com.nyayaflow.cases.CaseStatus.DISPOSED, com.nyayaflow.cases.CaseStatus.CLOSED)""")
    long countPendingCasesAssignedTo(@Param("userId") Long userId);

    @Query("select count(cl) from CaseLawyer cl where cl.lawyer.id = :userId")
    long countCaseAppearances(@Param("userId") Long userId);
}
