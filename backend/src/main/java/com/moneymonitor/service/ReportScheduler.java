package com.moneymonitor.service;

import com.moneymonitor.ai.AiAdvisorService;
import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.User;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.YearMonth;

/**
 * End-of-period jobs: on the 1st of each month every user gets a notification that last month's
 * PDF report is ready (the AI advice is pre-generated so the download is instant), and on January 1st
 * the same for the annual report.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportScheduler {

    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationService notificationService;
    private final AiAdvisorService advisorService;
    private final Texts texts;

    @Scheduled(cron = "0 5 0 1 * *")
    public void monthStart() {
        publishReports();
    }

    /** Catch-up in case the app was not running at midnight on the 1st (typical for a local app). */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        publishReports();
    }

    void publishReports() {
        YearMonth last = YearMonth.now().minusMonths(1);
        for (User user : userRepository.findByEnabledTrue()) {
            try {
                Lang lang = Lang.of(user.getLanguage());
                if (expenseRepository.sumForUser(user.getId(), last.atDay(1), last.atEndOfMonth()).signum() > 0) {
                    notificationService.notifyOnce(user, Notification.Type.REPORT,
                            texts.t(lang, "n.report.month.title", texts.monthYear(lang, last)),
                            texts.t(lang, "n.report.month.msg"),
                            "/app/reports?month=" + last);
                }
                if (YearMonth.now().getMonthValue() == 1) {
                    int year = last.getYear();
                    notificationService.notifyOnce(user, Notification.Type.REPORT,
                            texts.t(lang, "n.report.year.title", String.valueOf(year)),
                            texts.t(lang, "n.report.year.msg", String.valueOf(year + 1)),
                            "/app/reports?year=" + year);
                }
            } catch (Exception e) {
                log.warn("Could not publish report notification for {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    /** Pre-generates last month's advice at night so the PDF download doesn't wait on the AI. */
    @Scheduled(cron = "0 30 1 1 * *")
    public void pregenerateAdvice() {
        YearMonth last = YearMonth.now().minusMonths(1);
        for (User user : userRepository.findByEnabledTrue()) {
            try {
                advisorService.monthly(user.getId(), last, false);
                if (YearMonth.now().getMonthValue() == 1) {
                    advisorService.yearly(user.getId(), last.getYear(), true);
                }
            } catch (Exception e) {
                log.warn("Advice pre-generation failed for {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }
}
