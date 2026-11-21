package com.nyayaflow.hearing;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.nyayaflow.cases.CaseScope;
import com.nyayaflow.cases.CourtCase;
import com.nyayaflow.common.Texts;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

public final class HearingSpecifications {

    private HearingSpecifications() {
    }

    public record Criteria(LocalDate from, LocalDate to, List<HearingStatus> statuses, List<HearingType> types,
                    Long judgeId, Long courtroomId, Long courtId, Long caseId, String q) {
    }

    static Specification<Hearing> matching(Criteria criteria, AuthenticatedUser user) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<Hearing, CourtCase> courtCase = root.join("courtCase");
            Predicate scope = CaseScope.predicate(courtCase, query, cb, user);
            if (scope != null) {
                predicates.add(scope);
            }
            if (criteria.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("scheduledAt"), criteria.from().atStartOfDay()));
            }
            if (criteria.to() != null) {
                predicates.add(cb.lessThan(root.get("scheduledAt"), criteria.to().plusDays(1).atStartOfDay()));
            }
            if (criteria.statuses() != null && !criteria.statuses().isEmpty()) {
                predicates.add(root.get("status").in(criteria.statuses()));
            }
            if (criteria.types() != null && !criteria.types().isEmpty()) {
                predicates.add(root.get("hearingType").in(criteria.types()));
            }
            if (criteria.judgeId() != null) {
                predicates.add(cb.equal(root.get("judge").get("id"), criteria.judgeId()));
            }
            if (criteria.courtroomId() != null) {
                predicates.add(cb.equal(root.get("courtroom").get("id"), criteria.courtroomId()));
            }
            if (criteria.courtId() != null) {
                predicates.add(cb.equal(courtCase.get("court").get("id"), criteria.courtId()));
            }
            if (criteria.caseId() != null) {
                predicates.add(cb.equal(courtCase.get("id"), criteria.caseId()));
            }
            String term = Texts.clean(criteria.q());
            if (term != null) {
                String pattern = Texts.likePattern(term);
                predicates.add(cb.or(
                        cb.like(cb.lower(courtCase.get("caseNumber")), pattern, '\\'),
                        cb.like(cb.lower(courtCase.get("title")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
