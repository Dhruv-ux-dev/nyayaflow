package com.nyayaflow.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nyayaflow.config.NyayaFlowProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.util.StringUtils;

/**
 * HMAC-SHA256 signing key for access tokens. The backend is the only issuer and verifier, so a
 * symmetric key is sufficient; an asymmetric key pair would only matter with separate verifiers.
 */
@Configuration
public class JwtKeyConfig {

    static final String ISSUER = "nyayaflow";
    private static final Logger log = LoggerFactory.getLogger(JwtKeyConfig.class);
    private static final int MIN_KEY_BYTES = 32;

    @Bean
    SecretKey jwtSigningKey(NyayaFlowProperties properties) {
        String configured = properties.security().jwt().secret();
        byte[] keyBytes;
        if (!StringUtils.hasText(configured)) {
            keyBytes = new byte[MIN_KEY_BYTES];
            new SecureRandom().nextBytes(keyBytes);
            log.warn("NYAYAFLOW_JWT_SECRET is not set: using a random signing key. "
                    + "Sessions will not survive a restart. Set the variable outside local development.");
        } else {
            keyBytes = decode(configured.trim());
            if (keyBytes.length < MIN_KEY_BYTES) {
                throw new IllegalStateException("NYAYAFLOW_JWT_SECRET must be at least 32 bytes long");
            }
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSigningKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        return decoder;
    }

    private static byte[] decode(String secret) {
        try {
            byte[] decoded = Base64.getDecoder().decode(secret);
            if (decoded.length >= MIN_KEY_BYTES) {
                return decoded;
            }
        } catch (IllegalArgumentException notBase64) {
            // fall through and use the raw text
        }
        return secret.getBytes(StandardCharsets.UTF_8);
    }
}
