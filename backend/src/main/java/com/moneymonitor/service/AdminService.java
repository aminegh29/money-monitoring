package com.moneymonitor.service;

import com.moneymonitor.ai.AiClient;
import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.Role;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.AdminDtos.*;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;
    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final NotificationRepository notificationRepository;
    private final AiAdviceRepository adviceRepository;
    private final AiInsightRepository insightRepository;
    private final GoalRepository goalRepository;
    private final GoalDepositRepository depositRepository;
    private final Texts texts;
    private final PasswordResetTokenRepository tokenRepository;
    private final NotificationService notificationService;
    private final RealtimeService realtime;
    private final AiClient aiClient;

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        YearMonth now = YearMonth.now();
        ZoneId zone = ZoneId.systemDefault();
        List<User> users = userRepository.findAll();
        List<MonthCount> registrations = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth m = now.minusMonths(i);
            long count = users.stream().filter(u -> YearMonth.from(u.getCreatedAt().atZone(zone)).equals(m)).count();
            registrations.add(new MonthCount(m.toString(), count));
        }
        return new AdminStatsDto(
                users.size(),
                users.stream().filter(User::isEnabled).count(),
                users.stream().filter(u -> u.getRole() == Role.ADMIN).count(),
                registrations.get(registrations.size() - 1).count(),
                expenseRepository.countAll(now.atDay(1), now.atEndOfMonth()),
                expenseRepository.sumAll(now.atDay(1), now.atEndOfMonth()),
                registrations,
                aiClient.provider(),
                aiClient.isConfigured());
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> users() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : expenseRepository.countsByUser()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return userRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(u -> new AdminUserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isEnabled(),
                        u.getCurrency(), u.getCreatedAt(), u.getLastLoginAt(), counts.getOrDefault(u.getId(), 0L)))
                .toList();
    }

    @Transactional
    public void setEnabled(Long adminId, Long userId, boolean enabled) {
        if (adminId.equals(userId)) {
            throw ApiException.badRequest("You can't disable your own account");
        }
        User user = get(userId);
        user.setEnabled(enabled);
        if (!enabled) {
            realtime.toUser(user.getEmail(), RealtimeService.EventType.ACCOUNT_DISABLED, null);
        } else {
            Lang lang = Lang.of(user.getLanguage());
            notificationService.notify(user, Notification.Type.INFO, texts.t(lang, "n.active.title"), texts.t(lang, "n.active.msg"), null);
        }
        realtime.toAdmins("User " + user.getEmail() + (enabled ? " enabled" : " disabled"));
    }

    @Transactional
    public void setRole(Long adminId, Long userId, Role role) {
        if (adminId.equals(userId)) {
            throw ApiException.badRequest("You can't change your own role");
        }
        User user = get(userId);
        user.setRole(role);
        Lang lang = Lang.of(user.getLanguage());
        notificationService.notify(user, Notification.Type.INFO, texts.t(lang, "n.role.title"), texts.t(lang, "n.role.msg", role.name()), null);
        realtime.toAdmins("User " + user.getEmail() + " is now " + role);
    }

    @Transactional
    public void delete(Long adminId, Long userId) {
        if (adminId.equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can't delete your own account");
        }
        User user = get(userId);
        String email = user.getEmail();
        notificationRepository.deleteByUserId(userId);
        adviceRepository.deleteByUserId(userId);
        insightRepository.deleteByUserId(userId);
        depositRepository.deleteByUserId(userId);
        goalRepository.deleteByUserId(userId);
        tokenRepository.deleteByUserId(userId);
        budgetRepository.deleteByUserId(userId);
        expenseRepository.deleteByUserId(userId);
        incomeRepository.deleteByUserId(userId);
        categoryRepository.deleteByOwnerId(userId);
        userRepository.delete(user);
        realtime.toUser(email, RealtimeService.EventType.ACCOUNT_DISABLED, null);
        realtime.toAdmins("User " + email + " deleted");
    }

    private User get(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }
}
