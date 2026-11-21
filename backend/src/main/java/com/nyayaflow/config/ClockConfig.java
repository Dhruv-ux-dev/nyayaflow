package com.nyayaflow.config;

import java.time.Clock;

import org.springframework.boot.validation.autoconfigure.ValidationConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /**
     * Single source of "now" for the application, in the courts' time zone. Injecting the clock
     * keeps date-sensitive rules (overdue deadlines, upcoming hearings) testable.
     */
    @Bean
    public Clock clock(NyayaFlowProperties properties) {
        return Clock.system(properties.timezone());
    }

    /**
     * Makes {@code @PastOrPresent} and similar constraints judge "today" by the court clock rather than
     * the server's time zone, which in a container is usually UTC.
     */
    @Bean
    public ValidationConfigurationCustomizer courtClockForValidation(Clock clock) {
        return configuration -> configuration.clockProvider(() -> clock);
    }
}
