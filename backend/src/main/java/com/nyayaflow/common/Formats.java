package com.nyayaflow.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Human-readable date formats for notification and activity messages (e.g. "12 Oct 2026, 10:30"). */
public final class Formats {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.ENGLISH);

    private Formats() {
    }

    public static String date(LocalDate date) {
        return date.format(DATE);
    }

    public static String dateTime(LocalDateTime dateTime) {
        return dateTime.format(DATE_TIME);
    }
}
