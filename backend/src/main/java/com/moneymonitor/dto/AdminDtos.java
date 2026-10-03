package com.moneymonitor.dto;

import com.moneymonitor.domain.Role;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {

    private AdminDtos() {}

    public record AdminUserDto(Long id, String fullName, String email, Role role, boolean enabled, String currency,
                               Instant createdAt, Instant lastLoginAt, long expenseCount) {}

    public record MonthCount(String period, long count) {}

    public record AdminStatsDto(long totalUsers, long activeUsers, long admins, long newUsersThisMonth,
                                long expensesThisMonth, BigDecimal expensesAmountThisMonth,
                                List<MonthCount> registrations, String aiProvider, boolean aiConfigured) {}

    public record RoleRequest(@NotNull Role role) {}

    public record StatusRequest(boolean enabled) {}
}
