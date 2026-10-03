package com.moneymonitor.service;

import com.moneymonitor.domain.Budget;
import com.moneymonitor.domain.Category;
import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.BudgetDto;
import com.moneymonitor.dto.FinanceDtos.BudgetRequest;
import com.moneymonitor.dto.FinanceDtos.CategoryDto;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.repository.BudgetRepository;
import com.moneymonitor.repository.CategoryRepository;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.repository.UserRepository;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RealtimeService realtime;
    private final Texts texts;

    @Transactional(readOnly = true)
    public List<BudgetDto> list(Long userId, YearMonth month) {
        List<Budget> budgets = budgetRepository.findByUserIdAndPeriod(userId, month.toString());
        if (budgets.isEmpty()) return List.of();
        // One grouped query for every category instead of one sum query per budget.
        Map<Long, BigDecimal> byCategory = new HashMap<>();
        for (Object[] row : expenseRepository.categoryTotals(userId, month.atDay(1), month.atEndOfMonth())) {
            byCategory.put((Long) row[0], (BigDecimal) row[1]);
        }
        BigDecimal total = byCategory.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return budgets.stream()
                .map(b -> toDto(b, b.getCategory() == null ? total : byCategory.getOrDefault(b.getCategory().getId(), BigDecimal.ZERO)))
                // Overall budget first, then the most consumed categories.
                .sorted(Comparator.comparing((BudgetDto b) -> b.category() != null).thenComparing(b -> -b.percent()))
                .toList();
    }

    /** Creates or updates the budget for (category, month). */
    @Transactional
    public BudgetDto upsert(Long userId, BudgetRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        YearMonth month = YearMonth.parse(req.period());
        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepository.findById(req.categoryId())
                    .filter(c -> c.getOwner() == null || c.getOwner().getId().equals(userId))
                    .orElseThrow(() -> ApiException.notFound("Category"));
        }
        Budget budget = (category == null
                ? budgetRepository.findByUserIdAndPeriodAndCategoryIsNull(userId, req.period())
                : budgetRepository.findByUserIdAndPeriodAndCategoryId(userId, req.period(), category.getId()))
                .orElseGet(Budget::new);
        budget.setUser(user);
        budget.setCategory(category);
        budget.setPeriod(req.period());
        budget.setLimitAmount(req.limitAmount());
        budgetRepository.save(budget);
        realtime.toUser(user.getEmail(), RealtimeService.EventType.BUDGETS_CHANGED, null);
        return toDto(userId, budget, month);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Budget b = budgetRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Budget"));
        String email = b.getUser().getEmail();
        budgetRepository.delete(b);
        realtime.toUser(email, RealtimeService.EventType.BUDGETS_CHANGED, null);
    }

    /** Copies last month's budgets into the target month (existing ones are kept). */
    @Transactional
    public List<BudgetDto> copyFromPrevious(Long userId, YearMonth target) {
        String previous = target.minusMonths(1).toString();
        for (Budget old : budgetRepository.findByUserIdAndPeriod(userId, previous)) {
            Long catId = old.getCategory() == null ? null : old.getCategory().getId();
            boolean exists = (catId == null
                    ? budgetRepository.findByUserIdAndPeriodAndCategoryIsNull(userId, target.toString())
                    : budgetRepository.findByUserIdAndPeriodAndCategoryId(userId, target.toString(), catId)).isPresent();
            if (!exists) {
                budgetRepository.save(Budget.builder().user(old.getUser()).category(old.getCategory())
                        .period(target.toString()).limitAmount(old.getLimitAmount()).build());
            }
        }
        userRepository.findById(userId).ifPresent(u ->
                realtime.toUser(u.getEmail(), RealtimeService.EventType.BUDGETS_CHANGED, null));
        return list(userId, target);
    }

    /**
     * Called after an expense is saved: warns the user (in real time) when a budget reaches 80% or 100%.
     * Each threshold only fires once per budget and month.
     */
    @Transactional
    public void checkAlerts(User user, YearMonth month, Category category) {
        String period = month.toString();
        budgetRepository.findByUserIdAndPeriodAndCategoryId(user.getId(), period, category.getId())
                .ifPresent(b -> alertIfNeeded(user, b, month));
        budgetRepository.findByUserIdAndPeriodAndCategoryIsNull(user.getId(), period)
                .ifPresent(b -> alertIfNeeded(user, b, month));
    }

    private void alertIfNeeded(User user, Budget b, YearMonth month) {
        BudgetDto dto = toDto(user.getId(), b, month);
        Lang lang = Lang.of(user.getLanguage());
        String name = b.getCategory() == null ? texts.t(lang, "n.budget.overall") : texts.t(lang, "n.budget.cat", b.getCategory().getName());
        String cur = user.getCurrency();
        if (dto.percent() >= 100) {
            notificationService.notifyOnce(user, Notification.Type.WARNING,
                    texts.t(lang, "n.budget.exceeded.title", name, month),
                    texts.t(lang, "n.budget.exceeded.msg", Money.format(dto.spent(), cur), Money.format(dto.limitAmount(), cur)),
                    "/app/budgets");
        } else if (dto.percent() >= 80) {
            notificationService.notifyOnce(user, Notification.Type.WARNING,
                    texts.t(lang, "n.budget.80.title", name, month),
                    texts.t(lang, "n.budget.80.msg", Money.format(dto.remaining(), cur), Money.format(dto.limitAmount(), cur)),
                    "/app/budgets");
        }
    }

    private BudgetDto toDto(Long userId, Budget b, YearMonth month) {
        BigDecimal spent = b.getCategory() == null
                ? expenseRepository.sumForUser(userId, month.atDay(1), month.atEndOfMonth())
                : expenseRepository.sumForUserAndCategory(userId, b.getCategory().getId(), month.atDay(1), month.atEndOfMonth());
        return toDto(b, spent);
    }

    private static BudgetDto toDto(Budget b, BigDecimal spent) {
        BigDecimal remaining = b.getLimitAmount().subtract(spent);
        double percent = Money.percent(spent, b.getLimitAmount());
        return new BudgetDto(b.getId(), b.getCategory() == null ? null : CategoryDto.from(b.getCategory()),
                b.getPeriod(), b.getLimitAmount(), spent, remaining, percent);
    }
}
