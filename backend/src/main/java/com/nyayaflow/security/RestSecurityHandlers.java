package com.nyayaflow.security;

import java.io.IOException;
import java.time.Instant;

import com.nyayaflow.common.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** JSON responses for authentication (401) and authorization (403) failures raised by the filter chain. */
@Component
public class RestSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final JsonMapper jsonMapper;

    public RestSecurityHandlers(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        boolean tokenPresented = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
        String code = tokenPresented ? "SESSION_EXPIRED" : "UNAUTHORIZED";
        String message = tokenPresented
                ? "Your session has expired or is no longer valid. Please sign in again."
                : "Please sign in to continue.";
        write(response, HttpStatus.UNAUTHORIZED, code, message, request);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        write(response, HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to perform this action.",
                request);
    }

    private void write(HttpServletResponse response, HttpStatus status, String code, String message,
                       HttpServletRequest request) throws IOException {
        ApiError body = new ApiError(Instant.now(), status.value(), code, message, request.getRequestURI(), null,
                null);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        jsonMapper.writeValue(response.getOutputStream(), body);
    }
}
