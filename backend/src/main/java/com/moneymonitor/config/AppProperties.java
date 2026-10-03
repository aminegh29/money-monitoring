package com.moneymonitor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendUrl, List<String> allowedOrigins, Jwt jwt, Admin admin, Ai ai) {

    public record Jwt(String secret, long expirationMs) {}

    public record Admin(String email, String password) {}

    public record Ai(String provider, String apiKey, String baseUrl, String model, int timeoutSeconds) {}

    /** Web frontend + mobile app WebViews (Capacitor) + LAN addresses for testing on a phone. */
    public List<String> corsOriginPatterns() {
        List<String> patterns = new ArrayList<>();
        patterns.add(frontendUrl);
        if (allowedOrigins != null) {
            patterns.addAll(allowedOrigins);
        }
        return patterns;
    }
}
