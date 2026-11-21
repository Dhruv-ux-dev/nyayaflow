package com.nyayaflow.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import com.nyayaflow.court.Court;
import com.nyayaflow.support.IntegrationTest;
import com.nyayaflow.support.TestData;
import com.nyayaflow.user.Role;
import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class AuthIntegrationTest extends IntegrationTest {

    @Autowired
    private UserRepository users;

    private User staff;

    @BeforeEach
    void setUp() {
        Court court = data.court();
        staff = data.user(Role.STAFF, court);
    }

    private String loginBody(String email, String password) {
        return """
                {"email": "%s", "password": "%s"}""".formatted(email, password);
    }

    @Test
    void signInReturnsATokenAndTheUserWithoutSecrets() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(staff.getEmail().toUpperCase(), TestData.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(staff.getEmail()))
                .andExpect(jsonPath("$.user.role").value("STAFF"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameGenericAnswer() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(staff.getEmail(), "wrong-password1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("nobody@example.test", "wrong-password1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void deactivatedAccountsCannotSignIn() throws Exception {
        staff.setActive(false);
        users.saveAndFlush(staff);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(staff.getEmail(), TestData.PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
    }

    @Test
    void protectedEndpointsRequireAToken() throws Exception {
        mvc.perform(get("/api/cases"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void forgedTokensAreRejected() throws Exception {
        String token = bearer(staff);
        String tampered = token.substring(0, token.length() - 4) + "AAAA";
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
    }

    @Test
    void aPasswordResetRevokesSessionsIssuedMomentsEarlier() throws Exception {
        String admin = bearer(data.user(Role.ADMIN, null));
        String token = bearer(staff);
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isOk());

        // Usually within the same second as the token was issued, which issue times alone cannot resolve.
        mvc.perform(post("/api/users/{id}/reset-password", staff.getId()).header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"newPassword": "Changed123"}"""))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_EXPIRED"));
    }

    @Test
    void deactivationTakesEffectOnTheNextRequest() throws Exception {
        String token = bearer(staff);
        staff.setActive(false);
        users.saveAndFlush(staff);

        mvc.perform(get("/api/cases").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isUnauthorized());
    }
}
