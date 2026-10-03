package com.moneymonitor.service;

import com.moneymonitor.domain.Goal;
import com.moneymonitor.domain.GoalDeposit;
import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.GoalDtos.*;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.repository.GoalDepositRepository;
import com.moneymonitor.repository.GoalRepository;
import com.moneymonitor.repository.UserRepository;
import com.moneymonitor.service.FinanceSummaryService.MonthLine;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Savings goals ("5,000 in 10 months"). Progress comes from the deposits the user records; while a goal has
 * no deposits it is estimated from income minus expenses since the goal started.
 */
@Service
@RequiredArgsConstructor
public class GoalService {

    public static final String MANUAL = "MANUAL";
    public static final String AUTO = "AUTO";

    private static final int MAX_GOALS = 30;

    private final GoalRepository goalRepository;
    private final GoalDepositRepository depositRepository;
    private final UserRepository userRepository;
    private final FinanceSummaryService summaryService;
    private final NotificationService notificationService;
    private final RealtimeService realtime;
    private final InsightInvalidator insights;
    private final Texts texts;

    /** Numbers shared by all of a user's goals, loaded once per request. */
    private record Context(User user, Map<Long, BigDecimal> depositSums, Map<Long, Long> depositCounts,
                           List<MonthLine> balances, BigDecimal averageMonthlySavings) {}

    @Transactional
    public List<GoalDto> list(Long userId) {
        List<Goal> goals = goalRepository.findByUserIdOrderByDeadlineAscIdAsc(userId);
        if (goals.isEmpty()) return List.of();
        Context ctx = context(userId, goals);
        return goals.stream().map(g -> toDto(g, ctx)).toList();
    }

    @Transactional
    public GoalDto get(Long userId, Long id) {
        Goal g = find(userId, id);
        return toDto(g, context(userId, List.of(g)));
    }

    @Transactional
    public GoalDto create(Long userId, GoalRequest req) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (goalRepository.findByUserIdOrderByDeadlineAscIdAsc(userId).size() >= MAX_GOALS) {
            throw ApiException.badRequest("You can have up to " + MAX_GOALS + " goals");
        }
        LocalDate today = LocalDate.now();
        if (!req.deadline().isAfter(today)) {
            throw ApiException.badRequest("The deadline must be in the future");
        }
        Goal g = Goal.builder().user(user).startDate(today).build();
        apply(g, req);
        goalRepository.save(g);
        realtime.toUser(user.getEmail(), RealtimeService.EventType.GOALS_CHANGED, null);
        return get(userId, g.getId());
    }

    @Transactional
    public GoalDto update(Long userId, Long id, GoalRequest req) {
        Goal g = find(userId, id);
        if (req.deadline().isBefore(g.getStartDate())) {
            throw ApiException.badRequest("The deadline can't be before the goal started");
        }
        apply(g, req);
        g.setCompletedAt(null); // re-evaluated below, e.g. when the target was raised
        insights.goalChanged(userId, id);
        realtime.toUser(g.getUser().getEmail(), RealtimeService.EventType.GOALS_CHANGED, null);
        return get(userId, id);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Goal g = find(userId, id);
        String email = g.getUser().getEmail();
        depositRepository.deleteByGoalId(id);
        insights.goalChanged(userId, id);
        goalRepository.delete(g);
        realtime.toUser(email, RealtimeService.EventType.GOALS_CHANGED, null);
    }

    @Transactional(readOnly = true)
    public List<DepositDto> deposits(Long userId, Long goalId) {
        find(userId, goalId);
        return depositRepository.findByGoalIdOrderByDateDescIdDesc(goalId).stream().map(DepositDto::from).toList();
    }

    @Transactional
    public GoalDto addDeposit(Long userId, Long goalId, DepositRequest req) {
        Goal g = find(userId, goalId);
        depositRepository.save(GoalDeposit.builder().goal(g).amount(req.amount()).date(req.date())
                .note(req.note() == null || req.note().isBlank() ? null : req.note().trim()).build());
        depositRepository.flush();
        insights.goalChanged(userId, goalId);
        realtime.toUser(g.getUser().getEmail(), RealtimeService.EventType.GOALS_CHANGED, null);
        return get(userId, goalId);
    }

    @Transactional
    public GoalDto deleteDeposit(Long userId, Long goalId, Long depositId) {
        Goal g = find(userId, goalId);
        depositRepository.delete(depositRepository.findByIdAndGoalId(depositId, goalId)
                .orElseThrow(() -> ApiException.notFound("Deposit")));
        depositRepository.flush();
        insights.goalChanged(userId, goalId);
        realtime.toUser(g.getUser().getEmail(), RealtimeService.EventType.GOALS_CHANGED, null);
        return get(userId, goalId);
    }

    private Goal find(Long userId, Long id) {
        return goalRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Goal"));
    }

    private static void apply(Goal g, GoalRequest req) {
        g.setName(req.name().trim());
        g.setIcon(req.icon() == null || req.icon().isBlank() ? "🎯" : req.icon());
        g.setTargetAmount(req.targetAmount());
        g.setInitialAmount(req.initialAmount() == null ? BigDecimal.ZERO : req.initialAmount());
        g.setDeadline(req.deadline());
    }

    private Context context(Long userId, List<Goal> goals) {
        User user = goals.get(0).getUser();
        Map<Long, BigDecimal> sums = new HashMap<>();
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : depositRepository.totalsByGoal(userId)) {
            sums.put((Long) row[0], (BigDecimal) row[1]);
            counts.put((Long) row[0], (Long) row[2]);
        }
        // Only complete months count: the running month has the full income but only part of the spending,
        // which would make every goal look reached on day one.
        YearMonth lastComplete = YearMonth.now().minusMonths(1);
        YearMonth earliest = goals.stream().map(g -> YearMonth.from(g.getStartDate())).min(Comparator.naturalOrder()).orElse(YearMonth.now());
        List<MonthLine> balances = summaryService.monthlyBalances(userId, earliest, lastComplete);
        return new Context(user, sums, counts, balances, averageMonthlySavings(userId));
    }

    /** Average income minus expenses over the last 3 complete months that had any spending. */
    public BigDecimal averageMonthlySavings(Long userId) {
        YearMonth now = YearMonth.now();
        List<MonthLine> recent = summaryService.monthlyBalances(userId, now.minusMonths(3), now.minusMonths(1)).stream()
                .filter(m -> m.expenses().signum() > 0).toList();
        if (recent.isEmpty()) return BigDecimal.ZERO;
        BigDecimal total = recent.stream().map(MonthLine::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(recent.size()), 2, RoundingMode.HALF_UP);
    }

    private GoalDto toDto(Goal g, Context ctx) {
        BigDecimal depositsTotal = ctx.depositSums().getOrDefault(g.getId(), BigDecimal.ZERO);
        long depositsCount = ctx.depositCounts().getOrDefault(g.getId(), 0L);
        YearMonth start = YearMonth.from(g.getStartDate());
        BigDecimal autoSaved = ctx.balances().stream().filter(m -> !m.month().isBefore(start))
                .map(MonthLine::balance).reduce(BigDecimal.ZERO, BigDecimal::add).max(BigDecimal.ZERO);
        boolean manual = depositsCount > 0;
        BigDecimal saved = g.getInitialAmount().add(manual ? depositsTotal : autoSaved);
        BigDecimal target = g.getTargetAmount();
        BigDecimal remaining = target.subtract(saved).max(BigDecimal.ZERO);

        LocalDate today = LocalDate.now();
        boolean overdue = g.getDeadline().isBefore(today);
        int monthsLeft = overdue ? 0
                : (int) Math.max(1, ChronoUnit.MONTHS.between(YearMonth.from(today), YearMonth.from(g.getDeadline())));
        BigDecimal required = monthsLeft == 0 ? remaining
                : remaining.divide(BigDecimal.valueOf(monthsLeft), 2, RoundingMode.HALF_UP);
        BigDecimal avg = ctx.averageMonthlySavings();
        BigDecimal projected = saved.add(avg.max(BigDecimal.ZERO).multiply(BigDecimal.valueOf(monthsLeft)));

        String status;
        if (saved.compareTo(target) >= 0) status = "COMPLETED";
        else if (overdue) status = "OVERDUE";
        else if (projected.compareTo(target) >= 0) status = "ON_TRACK";
        else if (projected.compareTo(target.multiply(BigDecimal.valueOf(0.8))) >= 0) status = "AT_RISK";
        else status = "OFF_TRACK";

        if ("COMPLETED".equals(status) && g.getCompletedAt() == null) {
            g.setCompletedAt(Instant.now());
            User user = ctx.user();
            Lang lang = Lang.of(user.getLanguage());
            notificationService.notifyOnce(user, Notification.Type.SUCCESS,
                    texts.t(lang, "n.goal.title", g.getName()),
                    texts.t(lang, "n.goal.msg", Money.format(target, user.getCurrency()), g.getName()),
                    "/app/goals");
        }

        return new GoalDto(g.getId(), g.getName(), g.getIcon(), target, g.getInitialAmount(), g.getStartDate(), g.getDeadline(),
                depositsTotal, depositsCount, autoSaved, manual ? MANUAL : AUTO,
                saved, Math.min(100, Money.percent(saved, target)), remaining,
                monthsLeft, required, avg, projected, status, g.getCreatedAt(), g.getCompletedAt());
    }
}
