package com.nyayaflow.config;

import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Strongly typed application settings bound from the {@code nyayaflow.*} namespace.
 */
@ConfigurationProperties(prefix = "nyayaflow")
public record NyayaFlowProperties(
        ZoneId timezone,
        Security security,
        Storage storage,
        Scheduling scheduling,
        Deadlines deadlines,
        Seed seed) {

    public record Security(Jwt jwt, Login login, Cors cors) {
    }

    public record Jwt(String secret, Duration ttl) {
    }

    public record Login(int maxFailedAttempts, Duration lockoutDuration) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Storage(Path location, List<String> allowedExtensions) {
    }

    public record Scheduling(LocalTime courtDayStart, LocalTime courtDayEnd, int defaultHearingMinutes) {
    }

    public record Deadlines(int reminderDaysAhead) {
    }

    public record Seed(boolean enabled) {
    }
}
