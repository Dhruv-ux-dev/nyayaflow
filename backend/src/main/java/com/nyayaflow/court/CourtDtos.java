package com.nyayaflow.court;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CourtDtos {

    private CourtDtos() {
    }

    public record CourtResponse(Long id, String code, String name, String city, String address, boolean active,
                                List<CourtroomResponse> courtrooms) {

        static CourtResponse from(Court court) {
            return new CourtResponse(court.getId(), court.getCode(), court.getName(), court.getCity(),
                    court.getAddress(), court.isActive(),
                    court.getCourtrooms().stream().map(CourtroomResponse::from).toList());
        }
    }

    public record CourtroomResponse(Long id, String name, String floor, boolean active) {

        static CourtroomResponse from(Courtroom room) {
            return new CourtroomResponse(room.getId(), room.getName(), room.getFloor(), room.isActive());
        }
    }

    public record CourtRequest(
            @NotBlank @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9-]+$", message = "may only contain letters, digits and -")
            String code,
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 100) String city,
            @Size(max = 300) String address,
            boolean active) {
    }

    public record CourtroomRequest(@NotBlank @Size(max = 100) String name, @Size(max = 50) String floor,
                                   boolean active) {
    }
}
