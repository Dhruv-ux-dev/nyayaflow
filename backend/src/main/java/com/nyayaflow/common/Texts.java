package com.nyayaflow.common;

/** Small string helpers shared by services. */
public final class Texts {

    private Texts() {
    }

    /** Trims the value and converts blank strings to {@code null}. */
    public static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Escapes a user-provided search term for use inside a SQL LIKE pattern. */
    public static String likePattern(String term) {
        String escaped = term.trim().toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    /** "First hearing" -> "first hearing", for labels used mid-sentence. */
    public static String lowerFirst(String value) {
        return value == null || value.isEmpty() ? value : Character.toLowerCase(value.charAt(0)) + value.substring(1);
    }

    public static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 1) + "…";
    }
}
