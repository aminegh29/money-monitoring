package com.moneymonitor.security;

import com.moneymonitor.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Small in-memory sliding-window limiter for the public auth endpoints (sign-up, sign-in, codes, password reset).
 * Enough for a single server; it slows down password guessing and mass account creation.
 */
@Component
public class RateLimiter {

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    /** Throws 429 when `key` was used more than `max` times within `window`. */
    public void check(String key, int max, Duration window) {
        long now = System.currentTimeMillis();
        long from = now - window.toMillis();
        Deque<Long> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < from) times.pollFirst();
            if (times.size() >= max) throw ApiException.tooManyRequests();
            times.addLast(now);
        }
    }

    /** Client IP, behind a proxy such as Render's load balancer too. */
    public static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    /** Forgets keys with no recent activity so the map doesn't grow forever. */
    @Scheduled(fixedDelay = 15 * 60 * 1000)
    void cleanup() {
        long from = System.currentTimeMillis() - Duration.ofHours(2).toMillis();
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast() < from;
            }
        });
    }
}
