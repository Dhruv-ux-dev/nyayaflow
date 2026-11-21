package com.nyayaflow.court;

public record CourtRef(Long id, String code, String name) {

    public static CourtRef from(Court court) {
        return court == null ? null : new CourtRef(court.getId(), court.getCode(), court.getName());
    }
}
