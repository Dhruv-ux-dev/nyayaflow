package com.nyayaflow.security;

import java.util.List;

import com.nyayaflow.config.NyayaFlowProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Stateless bearer-token security. URL rules give a coarse first line of defence; controllers add
 * role checks with {@code @PreAuthorize}, and services enforce per-case access.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            UserJwtAuthenticationConverter jwtConverter,
                                            RestSecurityHandlers handlers) throws Exception {
        http
                // Tokens travel in the Authorization header, never in cookies, so CSRF does not apply.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        // Administration
                        .requestMatchers("/api/users/**", "/api/audit/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/courts/**").authenticated()
                        .requestMatchers("/api/courts/**", "/api/courtrooms/**").hasRole("ADMIN")
                        .requestMatchers("/api/directory/**").hasAnyRole("ADMIN", "STAFF", "JUDGE")
                        // Role-restricted writes are rejected here, before request bodies are even validated
                        .requestMatchers(HttpMethod.POST, "/api/cases").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/cases/*", "/api/cases/*/judge").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers("/api/cases/*/lawyers/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers(HttpMethod.POST, "/api/cases/*/status", "/api/cases/*/hearings",
                                "/api/cases/*/deadlines", "/api/hearings/**").hasAnyRole("ADMIN", "STAFF", "JUDGE")
                        .requestMatchers(HttpMethod.GET, "/api/hearings/conflicts").hasAnyRole("ADMIN", "STAFF", "JUDGE")
                        .requestMatchers(HttpMethod.POST, "/api/cases/*/orders").hasRole("JUDGE")
                        .requestMatchers(HttpMethod.POST, "/api/cases/*/proceedings").hasAnyRole("STAFF", "JUDGE")
                        .requestMatchers(HttpMethod.PUT, "/api/proceedings/**").hasAnyRole("STAFF", "JUDGE")
                        .requestMatchers(HttpMethod.PUT, "/api/deadlines/*").hasAnyRole("ADMIN", "STAFF", "JUDGE")
                        .requestMatchers(HttpMethod.DELETE, "/api/deadlines/*").hasAnyRole("ADMIN", "STAFF", "JUDGE")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter))
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        // BCrypt by default, with an id prefix so the algorithm can be upgraded later.
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(NyayaFlowProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.security().cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE));
        config.setExposedHeaders(List.of(HttpHeaders.CONTENT_DISPOSITION));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
