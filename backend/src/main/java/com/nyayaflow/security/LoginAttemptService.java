package com.nyayaflow.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.nyayaflow.common.ApiException;
import com.nyayaflow.config.NyayaFlowProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Temporarily locks an email address after repeated failed sign-ins to slow down password guessing.
 * State is in memory, which is adequate for a single application instance.
 */
@Service
public class LoginAttemptService {

    private final Map<String, Attempts> attemptsByEmail = new ConcurrentHashMap<>();
    private final int maxFailedAttempts;
    private final Duration lockoutDuration;
    private final Clock clock;

    public LoginAttemptService(NyayaFlowProperties properties, Clock clock) {
        this.maxFailedAttempts = properties.security().login().maxFailedAttempts();
        this.lockoutDuration = properties.security().login().lockoutDuration();
        this.clock = clock;
    }

    public void ensureNotLocked(String email) {
        Attempts attempts = attemptsByEmail.get(email);
        if (attempts != null && attempts.lockedUntil() != null && clock.instant().isBefore(attempts.lockedUntil())) {
            long minutes = Math.max(1, Duration.between(clock.instant(), attempts.lockedUntil()).toMinutes() + 1);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Too many failed sign-in attempts. Try again in " + minutes + " minute(s).");
        }
    }

    public void recordFailure(String email) {
        attemptsByEmail.compute(email, (key, current) -> {
            Instant now = clock.instant();
            int failures = (current == null || isExpired(current, now)) ? 1 : current.failures() + 1;
            Instant lockedUntil = failures >= maxFailedAttempts ? now.plus(lockoutDuration) : null;
            return new Attempts(failures, lockedUntil);
        });
    }

    public void recordSuccess(String email) {
        attemptsByEmail.remove(email);
    }

    private static boolean isExpired(Attempts attempts, Instant now) {
        return attempts.lockedUntil() != null && !now.isBefore(attempts.lockedUntil());
    }

    private record Attempts(int failures, Instant lockedUntil) {
    }
}
