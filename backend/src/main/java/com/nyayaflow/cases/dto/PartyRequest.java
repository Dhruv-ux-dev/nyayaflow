package com.nyayaflow.cases.dto;

import com.nyayaflow.cases.PartySide;
import com.nyayaflow.cases.PartyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PartyRequest(
        @NotNull PartySide side,
        @NotNull PartyType partyType,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 300) String address) {
}
