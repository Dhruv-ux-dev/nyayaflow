package com.nyayaflow.security;

import java.time.Clock;
import java.time.Instant;

import com.nyayaflow.config.NyayaFlowProperties;
import com.nyayaflow.user.User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    /** The user's credentials stamp at issue time; see {@link User#getCredentialsChangedAt()}. */
    public static final String CREDENTIALS_STAMP_CLAIM = "cst";

    private final JwtEncoder encoder;
    private final NyayaFlowProperties properties;
    private final Clock clock;

    public JwtService(JwtEncoder encoder, NyayaFlowProperties properties, Clock clock) {
        this.encoder = encoder;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(User user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(properties.security().jwt().ttl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(JwtKeyConfig.ISSUER)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("role", user.getRole().name())
                .claim(CREDENTIALS_STAMP_CLAIM, user.credentialsStamp())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
