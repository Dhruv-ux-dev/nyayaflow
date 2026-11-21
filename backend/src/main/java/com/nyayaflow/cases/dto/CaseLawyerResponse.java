package com.nyayaflow.cases.dto;

import java.time.Instant;

import com.nyayaflow.cases.CaseLawyer;
import com.nyayaflow.cases.PartySide;

public record CaseLawyerResponse(Long lawyerId, String fullName, String barRegistrationNumber, String email,
                                 String phone, PartySide side, boolean leadCounsel, Instant addedAt) {

    public static CaseLawyerResponse from(CaseLawyer appearance) {
        var lawyer = appearance.getLawyer();
        return new CaseLawyerResponse(lawyer.getId(), lawyer.getFullName(), lawyer.getBarRegistrationNumber(),
                lawyer.getEmail(), lawyer.getPhone(), appearance.getSide(), appearance.isLeadCounsel(),
                appearance.getAddedAt());
    }
}
