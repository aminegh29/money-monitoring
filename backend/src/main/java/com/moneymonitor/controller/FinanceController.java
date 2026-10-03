package com.moneymonitor.controller;

import com.moneymonitor.dto.FinanceDtos.*;
import com.moneymonitor.security.UserPrincipal;
import com.moneymonitor.service.*;
import com.moneymonitor.service.FinanceSummaryService.MonthSummary;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/** Expenses, incomes, categories, budgets, dashboard and notifications of the signed-in user. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FinanceController {

    private final ExpenseService expenseService;
    private final IncomeService incomeService;
    private final CategoryService categoryService;
    private final BudgetService budgetService;
    private final FinanceSummaryService summaryService;
    private final NotificationService notificationService;

    // ---------- Dashboard ----------

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@AuthenticationPrincipal UserPrincipal me, @RequestParam(required = false) String month) {
        YearMonth m = Periods.month(month);
        MonthSummary s = summaryService.month(me.id(), m);
        return new DashboardDto(m.toString(), s.currency(), s.totalExpenses(), s.totalIncome(), s.balance(), s.savingsRate(),
                s.previousExpenses(), s.changePercent(), s.dailyAverage(), s.projectedMonthEnd(), s.savingsGoal(),
                s.byCategory(), s.daily(), summaryService.trend(me.id(), m, 6), s.budgets(),
                s.expenses().stream().limit(6).toList());
    }

    // ---------- Expenses ----------

    @GetMapping("/expenses")
    public List<ExpenseDto> expenses(@AuthenticationPrincipal UserPrincipal me,
                                     @RequestParam(required = false) String month,
                                     @RequestParam(required = false) Long categoryId,
                                     @RequestParam(required = false) String search) {
        return expenseService.list(me.id(), Periods.month(month), categoryId, search);
    }

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseDto createExpense(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody ExpenseRequest req) {
        return expenseService.create(me.id(), req);
    }

    @PutMapping("/expenses/{id}")
    public ExpenseDto updateExpense(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody ExpenseRequest req) {
        return expenseService.update(me.id(), id, req);
    }

    @DeleteMapping("/expenses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        expenseService.delete(me.id(), id);
    }

    // ---------- Incomes ----------

    @GetMapping("/incomes")
    public List<IncomeDto> incomes(@AuthenticationPrincipal UserPrincipal me, @RequestParam(required = false) String month) {
        return incomeService.list(me.id(), Periods.month(month));
    }

    @PostMapping("/incomes")
    @ResponseStatus(HttpStatus.CREATED)
    public IncomeDto createIncome(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody IncomeRequest req) {
        return incomeService.create(me.id(), req);
    }

    @PutMapping("/incomes/{id}")
    public IncomeDto updateIncome(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody IncomeRequest req) {
        return incomeService.update(me.id(), id, req);
    }

    @DeleteMapping("/incomes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIncome(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        incomeService.delete(me.id(), id);
    }

    // ---------- Categories ----------

    @GetMapping("/categories")
    public List<CategoryDto> categories(@AuthenticationPrincipal UserPrincipal me) {
        return categoryService.list(me.id());
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody CategoryRequest req) {
        return categoryService.create(me.id(), req);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody CategoryRequest req) {
        return categoryService.update(me.id(), id, req);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        categoryService.delete(me.id(), id);
    }

    // ---------- Budgets ----------

    @GetMapping("/budgets")
    public List<BudgetDto> budgets(@AuthenticationPrincipal UserPrincipal me, @RequestParam(required = false) String month) {
        return budgetService.list(me.id(), Periods.month(month));
    }

    @PostMapping("/budgets")
    public BudgetDto saveBudget(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody BudgetRequest req) {
        return budgetService.upsert(me.id(), req);
    }

    @PostMapping("/budgets/copy-previous")
    public List<BudgetDto> copyBudgets(@AuthenticationPrincipal UserPrincipal me, @RequestParam String month) {
        return budgetService.copyFromPrevious(me.id(), Periods.month(month));
    }

    @DeleteMapping("/budgets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        budgetService.delete(me.id(), id);
    }

    // ---------- Notifications ----------

    @GetMapping("/notifications")
    public List<NotificationDto> notifications(@AuthenticationPrincipal UserPrincipal me) {
        return notificationService.list(me.id());
    }

    @GetMapping("/notifications/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal UserPrincipal me) {
        return Map.of("count", notificationService.unreadCount(me.id()));
    }

    @PostMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        notificationService.markRead(me.id(), id);
    }

    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal UserPrincipal me) {
        notificationService.markAllRead(me.id());
    }

    @DeleteMapping("/notifications/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNotification(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        notificationService.delete(me.id(), id);
    }
}
