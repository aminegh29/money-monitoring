package com.moneymonitor.dto;

import com.moneymonitor.domain.Role;
import com.moneymonitor.domain.User;
import com.moneymonitor.i18n.Lang;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password,
            @Size(max = 5) String currency,
            @Pattern(regexp = Lang.PATTERN, message = "Unsupported language") String language) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record ForgotPasswordRequest(@NotBlank @Email String email) {}

    public record VerifyEmailRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "^\\s*\\d{6}\\s*$", message = "Enter the 6-digit code") String code) {}

    public record ResendCodeRequest(@NotBlank @Email String email) {}

    public record DeleteAccountRequest(@NotBlank String password) {}

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String newPassword) {}

    /** language is optional so older clients that don't send it keep working. */
    public record UpdateProfileRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Size(max = 5) String currency,
            @NotNull @PositiveOrZero BigDecimal monthlyIncome,
            @NotNull @PositiveOrZero BigDecimal savingsGoal,
            @Pattern(regexp = Lang.PATTERN, message = "Unsupported language") String language,
            Boolean emailNotifications) {}

    public record LanguageRequest(@NotBlank @Pattern(regexp = Lang.PATTERN, message = "Unsupported language") String language) {}

    public record UserDto(Long id, String fullName, String email, Role role, boolean enabled, String currency,
                          BigDecimal monthlyIncome, BigDecimal savingsGoal, String language, boolean emailNotifications,
                          Instant createdAt, Instant lastLoginAt) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isEnabled(), u.getCurrency(),
                    u.getMonthlyIncome(), u.getSavingsGoal(), Lang.of(u.getLanguage()).code(), u.wantsEmailNotifications(),
                    u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    /** After sign-up with email verification on, token is null and verificationRequired is true: the code must be confirmed first. */
    public record AuthResponse(String token, UserDto user, boolean verificationRequired) {
        public AuthResponse(String token, UserDto user) {
            this(token, user, false);
        }
    }

    public record MessageResponse(String message) {}
}
