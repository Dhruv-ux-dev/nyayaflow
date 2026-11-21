package com.nyayaflow.order;

public enum OrderType {
    INTERIM_ORDER("Interim order"),
    DIRECTION("Direction"),
    FINAL_ORDER("Final order"),
    JUDGMENT("Judgment");

    private final String label;

    OrderType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** A final order or judgment decides the case and disposes of it. */
    public boolean isFinal() {
        return this == FINAL_ORDER || this == JUDGMENT;
    }
}
