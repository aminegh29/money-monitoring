package com.moneymonitor.service;

import com.moneymonitor.domain.User;
import com.moneymonitor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Permanently removes an account and everything that belongs to it (used by admins and by users themselves). */
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

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
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailVerificationRepository verificationRepository;
    private final RealtimeService realtime;

    @Transactional
    public void delete(User user) {
        Long id = user.getId();
        String email = user.getEmail();
        notificationRepository.deleteByUserId(id);
        adviceRepository.deleteByUserId(id);
        insightRepository.deleteByUserId(id);
        depositRepository.deleteByUserId(id);
        goalRepository.deleteByUserId(id);
        tokenRepository.deleteByUserId(id);
        verificationRepository.deleteByUserId(id);
        budgetRepository.deleteByUserId(id);
        expenseRepository.deleteByUserId(id);
        incomeRepository.deleteByUserId(id);
        categoryRepository.deleteByOwnerId(id);
        userRepository.delete(user);
        // Signs the account out of every open app.
        realtime.toUser(email, RealtimeService.EventType.ACCOUNT_DISABLED, null);
        realtime.toAdmins("User " + email + " deleted");
    }
}
