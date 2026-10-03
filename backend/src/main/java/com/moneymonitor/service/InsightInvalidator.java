package com.moneymonitor.service;

import com.moneymonitor.domain.AiInsight;
import com.moneymonitor.repository.AiInsightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/** Drops cached AI texts that no longer match the user's data, in every language. */
@Component
@RequiredArgsConstructor
public class InsightInvalidator {

    private final AiInsightRepository repository;

    /** An expense or income dated `date` changed: that month, that year, and every savings/goal plan are stale. */
    public void moneyChanged(Long userId, LocalDate date) {
        repository.deleteFor(userId, AiInsight.MONTHLY, List.of(YearMonth.from(date).toString()));
        repository.deleteFor(userId, AiInsight.YEARLY, List.of(String.valueOf(date.getYear())));
        repository.deleteKinds(userId, List.of(AiInsight.SAVINGS, AiInsight.GOAL));
    }

    /** A goal or its deposits changed. */
    public void goalChanged(Long userId, Long goalId) {
        repository.deleteFor(userId, AiInsight.GOAL, List.of(String.valueOf(goalId)));
    }

    /** Profile income or savings goal changed. */
    public void profileChanged(Long userId) {
        repository.deleteKinds(userId, List.of(AiInsight.SAVINGS, AiInsight.GOAL));
    }
}
