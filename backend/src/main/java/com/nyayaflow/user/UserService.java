package com.nyayaflow.user;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import com.nyayaflow.court.Court;
import com.nyayaflow.court.CourtRepository;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.dto.CreateUserRequest;
import com.nyayaflow.user.dto.DirectoryEntry;
import com.nyayaflow.user.dto.ResetPasswordRequest;
import com.nyayaflow.user.dto.UpdateUserRequest;
import com.nyayaflow.user.dto.UserResponse;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final CourtRepository courts;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final Clock clock;

    public UserService(UserRepository users, CourtRepository courts, PasswordEncoder passwordEncoder,
                       AuditService audit, Clock clock) {
        this.users = users;
        this.courts = courts;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(String q, Role role, Boolean active, int page, int size) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            String term = Texts.clean(q);
            if (term != null) {
                String pattern = Texts.likePattern(term);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
                        cb.like(cb.lower(root.get("email")), pattern, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("barRegistrationNumber"), "")), pattern, '\\')));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by("fullName").ascending());
        return PageResponse.of(users.findAll(spec, pageable), UserResponse::from);
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return UserResponse.from(find(id));
    }

    @Transactional(readOnly = true)
    public List<DirectoryEntry> directory(Role role, Long courtId) {
        return users.findByRoleAndActiveTrueOrderByFullNameAsc(role).stream()
                .filter(u -> courtId == null || u.getCourt() == null || u.getCourt().getId().equals(courtId))
                .map(DirectoryEntry::from)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request, AuthenticatedUser actor) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("EMAIL_IN_USE", "A user with this email already exists.");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setCredentialsChangedAt(clock.instant());
        applyProfile(user, request.fullName(), request.role(), request.designation(), request.phone(),
                request.barRegistrationNumber(), request.courtId());
        users.save(user);
        audit.record(actor, AuditAction.USER_CREATED, "USER", user.getId(), null,
                "Created " + label(user.getRole()) + " account for " + user.getFullName());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request, AuthenticatedUser actor) {
        User user = find(id);
        String email = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw ApiException.conflict("EMAIL_IN_USE", "A user with this email already exists.");
        }
        Role previousRole = user.getRole();
        if (previousRole != request.role()) {
            guardRoleChange(user, request.role(), actor);
            // Force a fresh sign-in so the person's session reflects the new role.
            user.setCredentialsChangedAt(clock.instant());
        }
        user.setEmail(email);
        applyProfile(user, request.fullName(), request.role(), request.designation(), request.phone(),
                request.barRegistrationNumber(), request.courtId());
        String summary = previousRole != user.getRole()
                ? "Updated " + user.getFullName() + " and changed role from " + label(previousRole) + " to "
                + label(user.getRole())
                : "Updated account details for " + user.getFullName();
        audit.record(actor, AuditAction.USER_UPDATED, "USER", user.getId(), null, summary);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse deactivate(Long id, AuthenticatedUser actor) {
        User user = find(id);
        if (user.getId().equals(actor.id())) {
            throw ApiException.conflict("CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account.");
        }
        if (!user.isActive()) {
            return UserResponse.from(user);
        }
        if (user.hasRole(Role.ADMIN) && users.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "At least one active administrator is required.");
        }
        if (user.hasRole(Role.JUDGE)) {
            long pending = users.countPendingCasesAssignedTo(user.getId());
            if (pending > 0) {
                throw ApiException.conflict("JUDGE_HAS_PENDING_CASES",
                        "Reassign this judge's " + pending + " pending case(s) before deactivating the account.");
            }
        }
        user.setActive(false);
        user.setCredentialsChangedAt(clock.instant());
        audit.record(actor, AuditAction.USER_DEACTIVATED, "USER", user.getId(), null,
                "Deactivated the account of " + user.getFullName());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse activate(Long id, AuthenticatedUser actor) {
        User user = find(id);
        if (!user.isActive()) {
            user.setActive(true);
            audit.record(actor, AuditAction.USER_ACTIVATED, "USER", user.getId(), null,
                    "Reactivated the account of " + user.getFullName());
        }
        return UserResponse.from(user);
    }

    @Transactional
    public void resetPassword(Long id, ResetPasswordRequest request, AuthenticatedUser actor) {
        User user = find(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setCredentialsChangedAt(clock.instant());
        audit.record(actor, AuditAction.USER_PASSWORD_RESET, "USER", user.getId(), null,
                "Reset the password of " + user.getFullName());
    }

    User find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
    }

    private void guardRoleChange(User user, Role newRole, AuthenticatedUser actor) {
        if (user.getId().equals(actor.id())) {
            throw ApiException.conflict("CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role.");
        }
        if (user.hasRole(Role.ADMIN) && users.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw ApiException.conflict("LAST_ADMIN", "At least one active administrator is required.");
        }
        if (user.hasRole(Role.JUDGE) && users.countPendingCasesAssignedTo(user.getId()) > 0) {
            throw ApiException.conflict("JUDGE_HAS_PENDING_CASES",
                    "Reassign this judge's pending cases before changing the role.");
        }
        if (user.hasRole(Role.LAWYER) && users.countCaseAppearances(user.getId()) > 0 && newRole != Role.LAWYER) {
            throw ApiException.conflict("LAWYER_HAS_CASES",
                    "Remove this lawyer from their cases before changing the role.");
        }
    }

    private void applyProfile(User user, String fullName, Role role, String designation, String phone,
                              String barRegistrationNumber, Long courtId) {
        user.setFullName(fullName.trim());
        user.setRole(role);
        user.setDesignation(Texts.clean(designation));
        user.setPhone(Texts.clean(phone));

        String barNumber = Texts.clean(barRegistrationNumber);
        if (role == Role.LAWYER) {
            if (barNumber == null) {
                throw ApiException.badRequest("BAR_NUMBER_REQUIRED", "Lawyers need a bar registration number.");
            }
            boolean taken = user.getId() == null
                    ? users.existsByBarRegistrationNumberIgnoreCase(barNumber)
                    : users.existsByBarRegistrationNumberIgnoreCaseAndIdNot(barNumber, user.getId());
            if (taken) {
                throw ApiException.conflict("BAR_NUMBER_IN_USE", "This bar registration number is already in use.");
            }
            user.setBarRegistrationNumber(barNumber.toUpperCase(Locale.ROOT));
        } else {
            user.setBarRegistrationNumber(null);
        }

        if (role == Role.JUDGE || role == Role.STAFF) {
            if (courtId == null) {
                throw ApiException.badRequest("COURT_REQUIRED", "Judges and court staff must belong to a court.");
            }
            Court court = courts.findById(courtId).orElseThrow(() -> ApiException.notFound("Court", courtId));
            user.setCourt(court);
        } else {
            user.setCourt(null);
        }
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String label(Role role) {
        return switch (role) {
            case ADMIN -> "administrator";
            case JUDGE -> "judge";
            case LAWYER -> "lawyer";
            case STAFF -> "court staff";
        };
    }
}
