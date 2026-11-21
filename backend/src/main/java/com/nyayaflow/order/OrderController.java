package com.nyayaflow.order;

import java.util.List;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.order.OrderDtos.IssueOrderRequest;
import com.nyayaflow.order.OrderDtos.OrderResponse;
import com.nyayaflow.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/api/cases/{caseId}/orders")
    public List<OrderResponse> listForCase(@PathVariable Long caseId, @AuthenticationPrincipal AuthenticatedUser me) {
        return orderService.listForCase(caseId, me);
    }

    @PostMapping("/api/cases/{caseId}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('JUDGE')")
    public OrderResponse issue(@PathVariable Long caseId, @Valid @RequestBody IssueOrderRequest request,
                               @AuthenticationPrincipal AuthenticatedUser me) {
        return orderService.issue(caseId, request, me);
    }

    @GetMapping("/api/orders")
    public PageResponse<OrderResponse> search(@AuthenticationPrincipal AuthenticatedUser me,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(required = false) List<OrderType> type,
                                              @RequestParam(required = false) Long caseId,
                                              @RequestParam(defaultValue = "0") @Min(0) int page,
                                              @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return orderService.search(q, type, caseId, page, size, me);
    }

    @GetMapping("/api/orders/{id}")
    public OrderResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return orderService.get(id, me);
    }
}
