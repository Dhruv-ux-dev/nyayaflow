package com.nyayaflow.court;

public record CourtroomRef(Long id, String name, String floor) {

    public static CourtroomRef from(Courtroom room) {
        return room == null ? null : new CourtroomRef(room.getId(), room.getName(), room.getFloor());
    }
}
