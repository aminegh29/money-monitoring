package com.moneymonitor.dto;

import com.moneymonitor.domain.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class FinanceDtos {

    private FinanceDtos() {}

    // ---------- Categories ----------

    public record CategoryDto(Long id, String name, String icon, String color, boolean essential, boolean custom) {
        public static CategoryDto from(Category c) {
            return new CategoryDto(c.getId(), c.getName(), c.getIcon(), c.getColor(), c.isEssential(), c.getOwner() != null);
        }
    }

    public record CategoryRequest(
            @NotBlank @Size(max = 50) String name,
            @Size(max = 8) String icon,
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color must be a hex value like #4f46e5") String color,
            boolean essential) {}

    // ---------- Expenses ----------

    public record ExpenseDto(Long id, BigDecimal amount, String description, LocalDate date,
                             PaymentMethod paymentMethod, CategoryDto category, Instant createdAt) {
        public static ExpenseDto from(Expense e) {
            return new ExpenseDto(e.getId(), e.getAmount(), e.getDescription(), e.getDate(), e.getPaymentMethod(),
                    CategoryDto.from(e.getCategory()), e.getCreatedAt());
        }
    }

    public record ExpenseRequest(
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotBlank @Size(max = 200) String description,
            @NotNull LocalDate date,
            @NotNull PaymentMethod paymentMethod,
            @NotNull Long categoryId) {}

    // ---------- Incomes ----------

    public record IncomeDto(Long id, BigDecimal amount, String source, LocalDate date) {
        public static IncomeDto from(Income i) {
            return new IncomeDto(i.getId(), i.getAmount(), i.getSource(), i.getDate());
        }
    }

    public record IncomeRequest(
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotBlank @Size(max = 100) String source,
            @NotNull LocalDate date) {}

    // ---------- Budgets ----------

    /** categoryId null means "overall monthly budget". */
    public record BudgetDto(Long id, CategoryDto category, String period, BigDecimal limitAmount,
                            BigDecimal spent, BigDecimal remaining, double percent) {}

    public record BudgetRequest(
            Long categoryId,
            @NotBlank @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "Period must look like 2026-09") String period,
            @NotNull @Positive @Digits(integer = 12, fraction = 2) BigDecimal limitAmount) {}

    // ---------- Dashboard ----------

    public record CategorySpend(Long categoryId, String name, String icon, String color, boolean essential,
                                BigDecimal amount, double percent) {}

    public record DailyPoint(LocalDate date, BigDecimal amount) {}

    public record MonthPoint(String period, BigDecimal expenses, BigDecimal income) {}

    public record DashboardDto(
            String period,
            String currency,
            BigDecimal totalExpenses,
            BigDecimal totalIncome,
            BigDecimal balance,
            double savingsRate,
            BigDecimal previousMonthExpenses,
            double changePercent,
            BigDecimal dailyAverage,
            BigDecimal projectedMonthEnd,
            BigDecimal savingsGoal,
            List<CategorySpend> byCategory,
            List<DailyPoint> daily,
            List<MonthPoint> trend,
            List<BudgetDto> budgets,
            List<ExpenseDto> recent) {}

    // ---------- Notifications ----------

    public record NotificationDto(Long id, Notification.Type type, String title, String message, String link,
                                  boolean read, Instant createdAt) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getLink(),
                    n.isRead(), n.getCreatedAt());
        }
    }

    // ---------- AI ----------

    public record AdviceDto(String period, String content, String source, Instant createdAt) {}

    public record ChatMessage(@NotBlank String role, @NotBlank @Size(max = 4000) String content) {}

    public record ChatRequest(@NotBlank @Size(max = 2000) String message, @Size(max = 20) List<ChatMessage> history) {}

    public record ChatResponse(String reply, String source) {}

    public record AiStatusDto(String provider, String model, boolean configured) {}
}
