package com.moneymonitor.service;

import com.moneymonitor.domain.Income;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.IncomeDto;
import com.moneymonitor.dto.FinanceDtos.IncomeRequest;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.repository.IncomeRepository;
import com.moneymonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeRepository incomeRepository;
    private final UserRepository userRepository;
    private final RealtimeService realtime;
    private final InsightInvalidator insights;

    @Transactional(readOnly = true)
    public List<IncomeDto> list(Long userId, YearMonth month) {
        return incomeRepository.findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, month.atDay(1), month.atEndOfMonth())
                .stream().map(IncomeDto::from).toList();
    }

    @Transactional
    public IncomeDto create(Long userId, IncomeRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        Income i = Income.builder().user(user).amount(req.amount()).source(req.source().trim()).date(req.date()).build();
        incomeRepository.save(i);
        invalidateAdvice(userId, i.getDate());
        realtime.toUser(user.getEmail(), RealtimeService.EventType.INCOMES_CHANGED, null);
        return IncomeDto.from(i);
    }

    @Transactional
    public IncomeDto update(Long userId, Long id, IncomeRequest req) {
        Income i = incomeRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Income"));
        invalidateAdvice(userId, i.getDate());
        invalidateAdvice(userId, req.date());
        i.setAmount(req.amount());
        i.setSource(req.source().trim());
        i.setDate(req.date());
        realtime.toUser(i.getUser().getEmail(), RealtimeService.EventType.INCOMES_CHANGED, null);
        return IncomeDto.from(i);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Income i = incomeRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Income"));
        String email = i.getUser().getEmail();
        invalidateAdvice(userId, i.getDate());
        incomeRepository.delete(i);
        realtime.toUser(email, RealtimeService.EventType.INCOMES_CHANGED, null);
    }

    private void invalidateAdvice(Long userId, LocalDate date) {
        insights.moneyChanged(userId, date);
    }
}
