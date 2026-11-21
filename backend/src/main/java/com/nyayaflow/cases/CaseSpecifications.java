package com.nyayaflow.cases;

import java.util.ArrayList;
import java.util.List;

import com.nyayaflow.common.Texts;
import com.nyayaflow.user.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

final class CaseSpecifications {

    private CaseSpecifications() {
    }

    /**
     * Free-text search across case number, title, party names, counsel and judge, combined with the
     * structured filters of the case list.
     */
    static Specification<CourtCase> matching(CaseSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            String term = Texts.clean(criteria.q());
            if (term != null) {
                String pattern = Texts.likePattern(term);

                Subquery<Long> partyMatch = query.subquery(Long.class);
                Root<Party> party = partyMatch.from(Party.class);
                partyMatch.select(party.get("id")).where(
                        cb.equal(party.get("courtCase"), root),
                        cb.like(cb.lower(party.get("name")), pattern, '\\'));

                Subquery<Long> lawyerMatch = query.subquery(Long.class);
                Root<CaseLawyer> appearance = lawyerMatch.from(CaseLawyer.class);
                Join<CaseLawyer, User> lawyer = appearance.join("lawyer");
                lawyerMatch.select(appearance.get("id")).where(
                        cb.equal(appearance.get("courtCase"), root),
                        cb.like(cb.lower(lawyer.get("fullName")), pattern, '\\'));

                Join<CourtCase, User> judge = root.join("judge", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("caseNumber")), pattern, '\\'),
                        cb.like(cb.lower(root.get("title")), pattern, '\\'),
                        cb.like(cb.lower(judge.get("fullName")), pattern, '\\'),
                        cb.exists(partyMatch),
                        cb.exists(lawyerMatch)));
            }
            if (criteria.statuses() != null && !criteria.statuses().isEmpty()) {
                predicates.add(root.get("status").in(criteria.statuses()));
            }
            if (criteria.types() != null && !criteria.types().isEmpty()) {
                predicates.add(root.get("caseType").in(criteria.types()));
            }
            if (criteria.priorities() != null && !criteria.priorities().isEmpty()) {
                predicates.add(root.get("priority").in(criteria.priorities()));
            }
            if (criteria.judgeId() != null) {
                predicates.add(cb.equal(root.get("judge").get("id"), criteria.judgeId()));
            }
            if (Boolean.TRUE.equals(criteria.unassigned())) {
                predicates.add(cb.isNull(root.get("judge")));
            }
            if (criteria.courtId() != null) {
                predicates.add(cb.equal(root.get("court").get("id"), criteria.courtId()));
            }
            if (criteria.lawyerId() != null) {
                Subquery<Long> byLawyer = query.subquery(Long.class);
                Root<CaseLawyer> appearance = byLawyer.from(CaseLawyer.class);
                byLawyer.select(appearance.get("id")).where(
                        cb.equal(appearance.get("courtCase"), root),
                        cb.equal(appearance.get("lawyer").get("id"), criteria.lawyerId()));
                predicates.add(cb.exists(byLawyer));
            }
            if (criteria.filedFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("filingDate"), criteria.filedFrom()));
            }
            if (criteria.filedTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("filingDate"), criteria.filedTo()));
            }
            if (criteria.hasHearing() != null) {
                predicates.add(criteria.hasHearing()
                        ? cb.isNotNull(root.get("nextHearingAt"))
                        : cb.isNull(root.get("nextHearingAt")));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
