package com.nyayaflow.cases.dto;

import com.nyayaflow.cases.Party;
import com.nyayaflow.cases.PartySide;
import com.nyayaflow.cases.PartyType;

public record PartyResponse(Long id, PartySide side, PartyType partyType, String name, String address) {

    public static PartyResponse from(Party party) {
        return new PartyResponse(party.getId(), party.getSide(), party.getPartyType(), party.getName(),
                party.getAddress());
    }
}
