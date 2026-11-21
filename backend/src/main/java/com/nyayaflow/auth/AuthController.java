package com.nyayaflow.auth;

import com.nyayaflow.auth.dto.ChangePasswordRequest;
import com.nyayaflow.auth.dto.LoginRequest;
import com.nyayaflow.auth.dto.LoginResponse;
import com.nyayaflow.auth.dto.UpdateProfileRequest;
import com.nyayaflow.security.AuthenticatedUser;
import com.nyayaflow.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser me) {
        return authService.currentUser(me);
    }

    @PutMapping("/me")
    public UserResponse updateProfile(@AuthenticationPrincipal AuthenticatedUser me,
                                      @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(me, request);
    }

    @PutMapping("/me/password")
    public LoginResponse changePassword(@AuthenticationPrincipal AuthenticatedUser me,
                                        @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(me, request);
    }
}
