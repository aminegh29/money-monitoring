package com.moneymonitor.service;

import com.moneymonitor.domain.Expense;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.ExpenseDto;
import com.moneymonitor.dto.FinanceDtos.ExpenseRequest;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CategoryService categoryService;
    private final BudgetService budgetService;
    private final RealtimeService realtime;
    private final InsightInvalidator insights;

    @Transactional(readOnly = true)
    public List<ExpenseDto> list(Long userId, YearMonth month, Long categoryId, String search) {
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return expenseRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, month.atDay(1), month.atEndOfMonth())
                .stream()
                .filter(e -> categoryId == null || e.getCategory().getId().equals(categoryId))
                .filter(e -> q.isEmpty() || e.getDescription().toLowerCase(Locale.ROOT).contains(q)
                        || e.getCategory().getName().toLowerCase(Locale.ROOT).contains(q))
                .map(ExpenseDto::from)
                .toList();
    }

    @Transactional
    public ExpenseDto create(Long userId, ExpenseRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Expense e = new Expense();
        e.setUser(user);
        apply(userId, e, req);
        expenseRepository.save(e);
        afterChange(user, e);
        return ExpenseDto.from(e);
    }

    @Transactional
    public ExpenseDto update(Long userId, Long id, ExpenseRequest req) {
        Expense e = expenseRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Expense"));
        invalidateAdvice(userId, e.getDate());
        apply(userId, e, req);
        afterChange(e.getUser(), e);
        return ExpenseDto.from(e);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Expense e = expenseRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Expense"));
        User user = e.getUser();
        invalidateAdvice(userId, e.getDate());
        expenseRepository.delete(e);
        realtime.toUser(user.getEmail(), RealtimeService.EventType.EXPENSES_CHANGED, null);
    }

    private void apply(Long userId, Expense e, ExpenseRequest req) {
        e.setAmount(req.amount());
        e.setDescription(req.description().trim());
        e.setDate(req.date());
        e.setPaymentMethod(req.paymentMethod());
        e.setCategory(categoryService.getUsable(userId, req.categoryId()));
    }

    /** Cached AI advice for that month/year no longer matches the data. */
    private void invalidateAdvice(Long userId, LocalDate date) {
        insights.moneyChanged(userId, date);
    }

    private void afterChange(User user, Expense e) {
        expenseRepository.flush();
        invalidateAdvice(user.getId(), e.getDate());
        budgetService.checkAlerts(user, YearMonth.from(e.getDate()), e.getCategory());
        realtime.toUser(user.getEmail(), RealtimeService.EventType.EXPENSES_CHANGED, ExpenseDto.from(e));
    }
}
