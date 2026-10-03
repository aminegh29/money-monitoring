package com.moneymonitor.service;

import com.moneymonitor.domain.Category;
import com.moneymonitor.domain.Expense;
import com.moneymonitor.domain.Income;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.*;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.repository.IncomeRepository;
import com.moneymonitor.repository.UserRepository;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Computes the numbers shared by the dashboard, the AI advisor and the PDF reports,
 * so all three always agree with each other.
 */
@Service
@RequiredArgsConstructor
public class FinanceSummaryService {

    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;
    private final UserRepository userRepository;
    private final BudgetService budgetService;

    public record MonthSummary(
            YearMonth month, String currency, String userName,
            BigDecimal totalExpenses, BigDecimal totalIncome, boolean incomeEstimated,
            BigDecimal balance, double savingsRate, BigDecimal savingsGoal,
            BigDecimal previousExpenses, double changePercent,
            BigDecimal dailyAverage, BigDecimal projectedMonthEnd,
            BigDecimal essentialTotal, BigDecimal nonEssentialTotal,
            List<CategorySpend> byCategory, List<DailyPoint> daily,
            List<ExpenseDto> expenses, List<IncomeDto> incomes, List<BudgetDto> budgets,
            Map<String, BigDecimal> byPaymentMethod) {

        public List<ExpenseDto> topExpenses(int n) {
            return expenses.stream().sorted(Comparator.comparing(ExpenseDto::amount).reversed()).limit(n).toList();
        }
    }

    public record MonthLine(YearMonth month, BigDecimal expenses, BigDecimal income, BigDecimal balance, double savingsRate) {}

    public record YearSummary(
            int year, String currency, String userName,
            BigDecimal totalExpenses, BigDecimal totalIncome, BigDecimal balance, double savingsRate,
            BigDecimal averageMonthlyExpenses, BigDecimal savingsGoal,
            List<MonthLine> months, List<CategorySpend> byCategory,
            MonthLine highestSpendingMonth, MonthLine lowestSpendingMonth,
            BigDecimal essentialTotal, BigDecimal nonEssentialTotal) {}

    @Transactional(readOnly = true)
    public MonthSummary month(Long userId, YearMonth month) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();

        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, from, to);
        List<Income> incomes = incomeRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, from, to);

        BigDecimal totalExpenses = sum(expenses.stream().map(Expense::getAmount));
        BigDecimal recordedIncome = sum(incomes.stream().map(Income::getAmount));
        boolean estimated = recordedIncome.signum() == 0 && user.getMonthlyIncome() != null && user.getMonthlyIncome().signum() > 0;
        BigDecimal totalIncome = estimated ? user.getMonthlyIncome() : recordedIncome;
        BigDecimal balance = totalIncome.subtract(totalExpenses);

        YearMonth prev = month.minusMonths(1);
        BigDecimal previous = expenseRepository.sumForUser(userId, prev.atDay(1), prev.atEndOfMonth());

        int elapsedDays = daysElapsed(month);
        BigDecimal dailyAverage = elapsedDays == 0 ? BigDecimal.ZERO
                : totalExpenses.divide(BigDecimal.valueOf(elapsedDays), 2, RoundingMode.HALF_UP);
        BigDecimal projected = totalExpenses;
        if (YearMonth.now().equals(month)) {
            BigDecimal linear = dailyAverage.multiply(BigDecimal.valueOf(month.lengthOfMonth())).setScale(2, RoundingMode.HALF_UP);
            // Early in the month a linear projection explodes (rent on day 1 x 31 days), so lean on last month instead.
            projected = elapsedDays < 7 && previous.signum() > 0 ? previous.max(totalExpenses) : linear;
        }

        BigDecimal essential = sum(expenses.stream().filter(e -> e.getCategory().isEssential()).map(Expense::getAmount));

        Map<String, BigDecimal> byMethod = expenses.stream().collect(Collectors.groupingBy(
                e -> e.getPaymentMethod().name(), TreeMap::new,
                Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)));

        return new MonthSummary(month, user.getCurrency(), user.getFullName(),
                totalExpenses, totalIncome, estimated, balance, savingsRate(balance, totalIncome), user.getSavingsGoal(),
                previous, changePercent(totalExpenses, previous),
                dailyAverage, projected,
                essential, totalExpenses.subtract(essential),
                byCategory(expenses, totalExpenses), daily(expenses, month),
                expenses.stream().map(ExpenseDto::from).toList(),
                incomes.stream().map(IncomeDto::from).toList(),
                budgetService.list(userId, month),
                byMethod);
    }

    @Transactional(readOnly = true)
    public YearSummary year(Long userId, int year) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, from, to);
        List<Income> incomes = incomeRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, from, to);

        List<MonthLine> months = new ArrayList<>();
        YearMonth last = YearMonth.now().getYear() == year ? YearMonth.now() : YearMonth.of(year, 12);
        for (YearMonth m = YearMonth.of(year, 1); !m.isAfter(last); m = m.plusMonths(1)) {
            YearMonth fm = m;
            BigDecimal exp = sum(expenses.stream().filter(e -> YearMonth.from(e.getDate()).equals(fm)).map(Expense::getAmount));
            BigDecimal inc = sum(incomes.stream().filter(i -> YearMonth.from(i.getDate()).equals(fm)).map(Income::getAmount));
            if (inc.signum() == 0 && user.getMonthlyIncome() != null && exp.signum() > 0) {
                inc = user.getMonthlyIncome();
            }
            BigDecimal bal = inc.subtract(exp);
            months.add(new MonthLine(m, exp, inc, bal, savingsRate(bal, inc)));
        }

        BigDecimal totalExpenses = sum(months.stream().map(MonthLine::expenses));
        BigDecimal totalIncome = sum(months.stream().map(MonthLine::income));
        BigDecimal balance = totalIncome.subtract(totalExpenses);
        List<MonthLine> active = months.stream().filter(m -> m.expenses().signum() > 0).toList();
        BigDecimal avg = active.isEmpty() ? BigDecimal.ZERO
                : totalExpenses.divide(BigDecimal.valueOf(active.size()), 2, RoundingMode.HALF_UP);
        BigDecimal essential = sum(expenses.stream().filter(e -> e.getCategory().isEssential()).map(Expense::getAmount));

        return new YearSummary(year, user.getCurrency(), user.getFullName(), totalExpenses, totalIncome, balance,
                savingsRate(balance, totalIncome), avg, user.getSavingsGoal(), months, byCategory(expenses, totalExpenses),
                active.stream().max(Comparator.comparing(MonthLine::expenses)).orElse(null),
                active.stream().min(Comparator.comparing(MonthLine::expenses)).orElse(null),
                essential, totalExpenses.subtract(essential));
    }

    /** Expense/income totals for the last `count` months ending at `end`, oldest first (recorded income only). */
    @Transactional(readOnly = true)
    public List<MonthPoint> trend(Long userId, YearMonth end, int count) {
        YearMonth start = end.minusMonths(count - 1L);
        Map<YearMonth, BigDecimal> exp = byMonth(expenseRepository.monthlyTotals(userId, start.atDay(1), end.atEndOfMonth()));
        Map<YearMonth, BigDecimal> inc = byMonth(incomeRepository.monthlyTotals(userId, start.atDay(1), end.atEndOfMonth()));
        List<MonthPoint> points = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) {
            points.add(new MonthPoint(m.toString(), exp.getOrDefault(m, BigDecimal.ZERO), inc.getOrDefault(m, BigDecimal.ZERO)));
        }
        return points;
    }

    /**
     * Income minus expenses for each month from `from` to `to`. A month with spending but no recorded income
     * uses the expected monthly income from the profile, like the yearly review does.
     */
    @Transactional(readOnly = true)
    public List<MonthLine> monthlyBalances(Long userId, YearMonth from, YearMonth to) {
        List<MonthLine> lines = new ArrayList<>();
        if (from.isAfter(to)) return lines;
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Map<YearMonth, BigDecimal> exp = byMonth(expenseRepository.monthlyTotals(userId, from.atDay(1), to.atEndOfMonth()));
        Map<YearMonth, BigDecimal> inc = byMonth(incomeRepository.monthlyTotals(userId, from.atDay(1), to.atEndOfMonth()));
        for (YearMonth m = from; !m.isAfter(to); m = m.plusMonths(1)) {
            BigDecimal e = exp.getOrDefault(m, BigDecimal.ZERO);
            BigDecimal i = inc.getOrDefault(m, BigDecimal.ZERO);
            if (i.signum() == 0 && e.signum() > 0 && user.getMonthlyIncome() != null) {
                i = user.getMonthlyIncome();
            }
            BigDecimal bal = i.subtract(e);
            lines.add(new MonthLine(m, e, i, bal, savingsRate(bal, i)));
        }
        return lines;
    }

    private static Map<YearMonth, BigDecimal> byMonth(List<Object[]> rows) {
        Map<YearMonth, BigDecimal> map = new HashMap<>();
        for (Object[] r : rows) {
            map.put(YearMonth.of(((Number) r[0]).intValue(), ((Number) r[1]).intValue()), (BigDecimal) r[2]);
        }
        return map;
    }

    private List<CategorySpend> byCategory(List<Expense> expenses, BigDecimal total) {
        Map<Category, BigDecimal> map = new LinkedHashMap<>();
        Map<Long, Category> byId = new HashMap<>();
        for (Expense e : expenses) {
            Category c = byId.computeIfAbsent(e.getCategory().getId(), k -> e.getCategory());
            map.merge(c, e.getAmount(), BigDecimal::add);
        }
        return map.entrySet().stream()
                .map(en -> new CategorySpend(en.getKey().getId(), en.getKey().getName(), en.getKey().getIcon(),
                        en.getKey().getColor(), en.getKey().isEssential(), en.getValue(), Money.percent(en.getValue(), total)))
                .sorted(Comparator.comparing(CategorySpend::amount).reversed())
                .toList();
    }

    private List<DailyPoint> daily(List<Expense> expenses, YearMonth month) {
        Map<LocalDate, BigDecimal> map = new TreeMap<>();
        for (int d = 1; d <= month.lengthOfMonth(); d++) {
            map.put(month.atDay(d), BigDecimal.ZERO);
        }
        expenses.forEach(e -> map.merge(e.getDate(), e.getAmount(), BigDecimal::add));
        return map.entrySet().stream().map(e -> new DailyPoint(e.getKey(), e.getValue())).toList();
    }

    private static int daysElapsed(YearMonth month) {
        YearMonth now = YearMonth.now();
        if (month.isBefore(now)) return month.lengthOfMonth();
        if (month.equals(now)) return LocalDate.now().getDayOfMonth();
        return 0;
    }

    private static BigDecimal sum(java.util.stream.Stream<BigDecimal> values) {
        return values.reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static double savingsRate(BigDecimal balance, BigDecimal income) {
        return Money.percent(balance, income);
    }

    private static double changePercent(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) return 0;
        return Money.percent(current.subtract(previous), previous);
    }
}
