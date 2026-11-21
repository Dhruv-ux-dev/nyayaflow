package com.nyayaflow.user;

import com.nyayaflow.common.PageResponse;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.dto.CreateUserRequest;
import com.nyayaflow.user.dto.ResetPasswordRequest;
import com.nyayaflow.user.dto.UpdateUserRequest;
import com.nyayaflow.user.dto.UserResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Account administration. Administrator-only, enforced both by URL rule and method security. */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<UserResponse> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Role role,
                                             @RequestParam(required = false) Boolean active,
                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                             @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return userService.search(q, role, active, page, size);
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request,
                               @AuthenticationPrincipal AuthenticatedUser me) {
        return userService.create(request, me);
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                               @AuthenticationPrincipal AuthenticatedUser me) {
        return userService.update(id, request, me);
    }

    @PostMapping("/{id}/deactivate")
    public UserResponse deactivate(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return userService.deactivate(id, me);
    }

    @PostMapping("/{id}/activate")
    public UserResponse activate(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser me) {
        return userService.activate(id, me);
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser me) {
        userService.resetPassword(id, request, me);
        return ResponseEntity.noContent().build();
    }
}
