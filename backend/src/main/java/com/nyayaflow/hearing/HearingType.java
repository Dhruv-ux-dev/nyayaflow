package com.nyayaflow.hearing;

public enum HearingType {
    FIRST_HEARING("First hearing"),
    FRAMING_OF_ISSUES("Framing of issues"),
    EVIDENCE("Evidence"),
    INTERIM_APPLICATION("Interim application"),
    ARGUMENTS("Arguments"),
    FINAL_ARGUMENTS("Final arguments"),
    JUDGMENT_PRONOUNCEMENT("Pronouncement of judgment");

    private final String label;

    HearingType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
