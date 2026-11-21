package com.nyayaflow.cases;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Issues registry-style case numbers ({@code TYPE/SEQ/YEAR}) with a per-type, per-year sequence.
 * A single upsert statement makes allocation atomic under concurrent registrations.
 */
@Component
public class CaseNumberGenerator {

    private final JdbcClient jdbc;

    public CaseNumberGenerator(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String next(CaseType type, int year) {
        Integer sequence = jdbc.sql("""
                        INSERT INTO case_number_counters (case_type, year, last_value) VALUES (:type, :year, 1)
                        ON CONFLICT (case_type, year)
                        DO UPDATE SET last_value = case_number_counters.last_value + 1
                        RETURNING last_value""")
                .param("type", type.name())
                .param("year", year)
                .query(Integer.class)
                .single();
        return "%s/%d/%d".formatted(type.code(), sequence, year);
    }
}
