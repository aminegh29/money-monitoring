package com.moneymonitor.dto;

import com.moneymonitor.domain.GoalDeposit;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class GoalDtos {

    private GoalDtos() {}

    public record GoalRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 8) String icon,
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal targetAmount,
            @PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal initialAmount,
            @NotNull LocalDate deadline) {}

    /**
     * A goal with its computed progress.
     * trackingMode is MANUAL when deposits exist (they are the progress), AUTO otherwise (income minus expenses
     * of each complete month since startDate). status is one of COMPLETED, ON_TRACK, AT_RISK, OFF_TRACK, OVERDUE.
     */
    public record GoalDto(
            Long id, String name, String icon,
            BigDecimal targetAmount, BigDecimal initialAmount, LocalDate startDate, LocalDate deadline,
            BigDecimal depositsTotal, long depositsCount, BigDecimal autoSaved, String trackingMode,
            BigDecimal savedAmount, double percent, BigDecimal remaining,
            int monthsLeft, BigDecimal requiredPerMonth, BigDecimal averageMonthlySavings, BigDecimal projectedAmount,
            String status, Instant createdAt, Instant completedAt) {}

    public record DepositRequest(
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotNull @PastOrPresent LocalDate date,
            @Size(max = 120) String note) {}

    public record DepositDto(Long id, BigDecimal amount, LocalDate date, String note, Instant createdAt) {
        public static DepositDto from(GoalDeposit d) {
            return new DepositDto(d.getId(), d.getAmount(), d.getDate(), d.getNote(), d.getCreatedAt());
        }
    }
}
