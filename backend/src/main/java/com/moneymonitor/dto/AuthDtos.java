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
            @Pattern(regexp = Lang.PATTERN, message = "Unsupported language") String language) {}

    public record LanguageRequest(@NotBlank @Pattern(regexp = Lang.PATTERN, message = "Unsupported language") String language) {}

    public record UserDto(Long id, String fullName, String email, Role role, boolean enabled, String currency,
                          BigDecimal monthlyIncome, BigDecimal savingsGoal, String language, Instant createdAt, Instant lastLoginAt) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isEnabled(), u.getCurrency(),
                    u.getMonthlyIncome(), u.getSavingsGoal(), Lang.of(u.getLanguage()).code(), u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    public record AuthResponse(String token, UserDto user) {}

    public record MessageResponse(String message) {}
}
