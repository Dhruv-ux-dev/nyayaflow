package com.nyayaflow.cases;

/** Case categories with the registry prefix used in case numbers, e.g. {@code CS/142/2026}. */
public enum CaseType {
    CIVIL_SUIT("CS", "Civil suit"),
    COMMERCIAL_SUIT("COMS", "Commercial suit"),
    CRIMINAL_CASE("CRL", "Criminal case"),
    BAIL_APPLICATION("BAIL", "Bail application"),
    WRIT_PETITION("WP", "Writ petition"),
    CIVIL_APPEAL("CA", "Civil appeal"),
    CRIMINAL_APPEAL("CRA", "Criminal appeal"),
    FAMILY_MATTER("MAT", "Family / Matrimonial"),
    ARBITRATION("ARB", "Arbitration petition");

    private final String code;
    private final String label;

    CaseType(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }
}
