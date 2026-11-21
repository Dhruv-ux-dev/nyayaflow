package com.nyayaflow.auth;

import java.time.Clock;
import java.util.Locale;

import com.nyayaflow.audit.AuditAction;
import com.nyayaflow.audit.AuditService;
import com.nyayaflow.auth.dto.ChangePasswordRequest;
import com.nyayaflow.auth.dto.LoginRequest;
import com.nyayaflow.auth.dto.LoginResponse;
import com.nyayaflow.auth.dto.UpdateProfileRequest;
import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.Texts;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.security.JwtService;
import com.nyayaflow.security.LoginAttemptService;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import com.nyayaflow.user.dto.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttempts;
    private final AuditService audit;
    private final Clock clock;
    /** Compared against when the email is unknown, so response time does not reveal which emails exist. */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       LoginAttemptService loginAttempts, AuditService audit, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttempts = loginAttempts;
        this.audit = audit;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("not-a-real-password-1");
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        loginAttempts.ensureNotLocked(email);

        User user = users.findByEmailIgnoreCase(email).orElse(null);
        boolean passwordMatches = passwordEncoder.matches(request.password(),
                user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !passwordMatches) {
            loginAttempts.recordFailure(email);
            audit.recordFailedLogin(email, "invalid credentials");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password.");
        }
        if (!user.isActive()) {
            audit.recordFailedLogin(email, "account deactivated");
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED",
                    "This account has been deactivated. Please contact the administrator.");
        }

        loginAttempts.recordSuccess(email);
        user.setLastLoginAt(clock.instant());
        audit.record(AuthenticatedUser.from(user), AuditAction.USER_LOGIN, "USER", user.getId(), null,
                user.getFullName() + " signed in");
        return tokenFor(user);
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(AuthenticatedUser me) {
        return UserResponse.from(find(me.id()));
    }

    @Transactional
    public UserResponse updateProfile(AuthenticatedUser me, UpdateProfileRequest request) {
        User user = find(me.id());
        user.setFullName(request.fullName().trim());
        user.setPhone(Texts.clean(request.phone()));
        audit.record(me, AuditAction.PROFILE_UPDATED, "USER", user.getId(), null,
                user.getFullName() + " updated their profile");
        return UserResponse.from(user);
    }

    /** Changing the password revokes existing sessions, so a fresh token is returned for this one. */
    @Transactional
    public LoginResponse changePassword(AuthenticatedUser me, ChangePasswordRequest request) {
        User user = find(me.id());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "The current password is incorrect.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw ApiException.badRequest("PASSWORD_UNCHANGED", "Choose a password different from the current one.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setCredentialsChangedAt(clock.instant());
        audit.record(me, AuditAction.PASSWORD_CHANGED, "USER", user.getId(), null,
                user.getFullName() + " changed their password");
        return tokenFor(user);
    }

    private LoginResponse tokenFor(User user) {
        JwtService.IssuedToken token = jwtService.issue(user);
        return new LoginResponse(token.value(), token.expiresAt(), UserResponse.from(user));
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
    }
}
