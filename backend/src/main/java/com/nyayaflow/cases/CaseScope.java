package com.nyayaflow.cases;

import com.nyayaflow.security.AuthenticatedUser;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

/**
 * Query-side counterpart of {@link CaseAccess#canView}: restricts any query that touches cases to the
 * ones the user may see. Used by case, hearing, document, order and deadline searches.
 */
public final class CaseScope {

    private CaseScope() {
    }

    public static Specification<CourtCase> visibleTo(AuthenticatedUser user) {
        return (root, query, cb) -> predicate(root, query, cb, user);
    }

    /**
     * @param casePath path to the case from the queried entity (the root itself for case queries)
     * @return a restricting predicate, or {@code null} when the user can see every case
     */
    public static Predicate predicate(Path<CourtCase> casePath, CriteriaQuery<?> query, CriteriaBuilder cb,
                                      AuthenticatedUser user) {
        return switch (user.role()) {
            case ADMIN, STAFF -> null;
            case JUDGE -> cb.equal(casePath.get("judge").get("id"), user.id());
            case LAWYER -> {
                Subquery<Long> appearance = query.subquery(Long.class);
                Root<CaseLawyer> cl = appearance.from(CaseLawyer.class);
                appearance.select(cl.get("id"))
                        .where(cb.equal(cl.get("courtCase"), casePath), cb.equal(cl.get("lawyer").get("id"), user.id()));
                yield cb.exists(appearance);
            }
        };
    }
}
