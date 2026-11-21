package com.nyayaflow.security;

import java.util.List;

import com.nyayaflow.user.User;
import com.nyayaflow.user.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

/**
 * Turns a verified token into an authenticated principal. The user is re-loaded on every request so
 * that deactivation, role changes and password resets take effect immediately rather than when the
 * token expires.
 */
@Component
public class UserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public UserJwtAuthenticationConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long userId = parseUserId(jwt.getSubject());
        User user = users.findById(userId)
                .orElseThrow(() -> new InvalidBearerTokenException("Unknown user"));
        if (!user.isActive()) {
            throw new InvalidBearerTokenException("Account is deactivated");
        }
        // Compared exactly rather than by issue time, which has only one-second precision: a token
        // issued a moment before a password reset in the same second must still be refused.
        if (!(jwt.getClaim(JwtService.CREDENTIALS_STAMP_CLAIM) instanceof Number stamp)
                || stamp.longValue() != user.credentialsStamp()) {
            throw new InvalidBearerTokenException("Token was issued before the latest credential change");
        }
        AuthenticatedUser principal = AuthenticatedUser.from(user);
        return UsernamePasswordAuthenticationToken.authenticated(principal, jwt,
                List.of(new SimpleGrantedAuthority(user.getRole().authority())));
    }

    private static Long parseUserId(String subject) {
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException | NullPointerException e) {
            throw new InvalidBearerTokenException("Malformed subject");
        }
    }
}
