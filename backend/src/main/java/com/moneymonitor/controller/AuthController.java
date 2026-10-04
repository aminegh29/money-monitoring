package com.moneymonitor.controller;

import com.moneymonitor.dto.AuthDtos.*;
import com.moneymonitor.security.RateLimiter;
import com.moneymonitor.security.UserPrincipal;
import com.moneymonitor.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;

/** Public auth endpoints. Each one is rate-limited per IP (and per email where it matters) against abuse. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiter limiter;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        limiter.check("register:" + RateLimiter.clientIp(http), 5, Duration.ofHours(1));
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        limiter.check("login-ip:" + RateLimiter.clientIp(http), 30, Duration.ofMinutes(5));
        limiter.check("login:" + normalize(req.email()), 10, Duration.ofMinutes(5));
        return authService.login(req);
    }

    @PostMapping("/verify-email")
    public AuthResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest req, HttpServletRequest http) {
        limiter.check("verify-ip:" + RateLimiter.clientIp(http), 20, Duration.ofMinutes(10));
        return authService.verifyEmail(req);
    }

    @PostMapping("/resend-verification")
    public MessageResponse resendVerification(@Valid @RequestBody ResendCodeRequest req, HttpServletRequest http) {
        limiter.check("resend-ip:" + RateLimiter.clientIp(http), 10, Duration.ofHours(1));
        authService.resendVerification(req);
        return new MessageResponse("If this account is waiting for confirmation, a new code has been sent.");
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        limiter.check("forgot-ip:" + RateLimiter.clientIp(http), 5, Duration.ofHours(1));
        limiter.check("forgot:" + normalize(req.email()), 3, Duration.ofHours(1));
        authService.forgotPassword(req);
        return new MessageResponse("If an account exists for this email, a reset link has been sent.");
    }

    @GetMapping("/reset-password/validate")
    public Map<String, Boolean> validateResetToken(@RequestParam String token) {
        return Map.of("valid", authService.isResetTokenValid(token));
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest req, HttpServletRequest http) {
        limiter.check("reset-ip:" + RateLimiter.clientIp(http), 10, Duration.ofHours(1));
        authService.resetPassword(req);
        return new MessageResponse("Your password has been reset. You can now sign in.");
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal me) {
        return authService.me(me.id());
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
