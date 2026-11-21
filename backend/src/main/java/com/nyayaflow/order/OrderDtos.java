package com.nyayaflow.order;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.nyayaflow.cases.dto.CaseRef;
import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.user.dto.UserRef;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record IssueOrderRequest(
            @NotNull OrderType orderType,
            @NotBlank @Size(max = 300) String title,
            @NotBlank @Size(max = 50000) String content,
            @Size(max = 5000) String remarks,
            @NotNull LocalDate orderDate,
            Long hearingId) {
    }

    public record OrderResponse(
            Long id,
            CaseRef courtCase,
            HearingBrief hearing,
            OrderType orderType,
            String title,
            String content,
            String remarks,
            LocalDate orderDate,
            UserRef issuedBy,
            Instant createdAt) {

        static OrderResponse from(CourtOrder order) {
            HearingBrief hearing = order.getHearing() == null ? null
                    : new HearingBrief(order.getHearing().getId(), order.getHearing().getScheduledAt(),
                    order.getHearing().getHearingType());
            return new OrderResponse(order.getId(), CaseRef.from(order.getCourtCase()), hearing, order.getOrderType(),
                    order.getTitle(), order.getContent(), order.getRemarks(), order.getOrderDate(),
                    UserRef.from(order.getIssuedBy()), order.getCreatedAt());
        }
    }

    public record HearingBrief(Long id, LocalDateTime scheduledAt, HearingType hearingType) {
    }
}
