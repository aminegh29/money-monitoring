package com.moneymonitor.ai;

import com.moneymonitor.domain.AiInsight;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.*;
import com.moneymonitor.dto.GoalDtos.GoalDto;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.repository.AiInsightRepository;
import com.moneymonitor.repository.UserRepository;
import com.moneymonitor.service.FinanceSummaryService;
import com.moneymonitor.service.FinanceSummaryService.MonthLine;
import com.moneymonitor.service.FinanceSummaryService.MonthSummary;
import com.moneymonitor.service.FinanceSummaryService.YearSummary;
import com.moneymonitor.service.GoalService;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class AiAdvisorService {

    private static final String ADVISOR_PERSONA = """
            You are "Penny", a friendly, practical personal finance coach inside the Money Monitor app.
            Rules:
            - Base every statement on the data provided. Never invent numbers or transactions.
            - Always use the user's currency code when writing amounts.
            - Be specific: name categories and give concrete amounts to cut or save.
            - Be encouraging, never judgmental. Keep it simple and actionable.
            - Format with Markdown: short "### " headings, bullet lists and **bold** key numbers. No tables.
            - You are not a licensed financial advisor. For investments or debt restructuring suggest consulting a professional.
            """;

    private static final long HOUR = 3600;

    private final AiClient aiClient;
    private final RuleBasedAdvisor rules;
    private final FinanceSummaryService summaryService;
    private final GoalService goalService;
    private final AiInsightRepository insightRepository;
    private final UserRepository userRepository;

    private record Generated(String content, String source) {}

    public AiStatusDto status() {
        return new AiStatusDto(aiClient.provider(), aiClient.model(), aiClient.isConfigured());
    }

    /** Monthly review in the user's language, cached per month. `refresh` forces a new generation. */
    @Transactional
    public AdviceDto monthly(Long userId, YearMonth month, boolean refresh) {
        return monthly(userId, month, refresh, langOf(userId));
    }

    private AdviceDto monthly(Long userId, YearMonth month, boolean refresh, Lang lang) {
        // Advice for the running month goes stale quickly; regenerate if older than 6 hours.
        long maxAge = YearMonth.now().equals(month) ? 6 * HOUR : 0;
        return cached(userId, AiInsight.MONTHLY, month.toString(), lang, refresh, maxAge, () -> {
            MonthSummary s = summaryService.month(userId, month);
            List<MonthLine> history = new ArrayList<>();
            summaryService.trend(userId, month.minusMonths(1), 3).forEach(p -> history.add(
                    new MonthLine(YearMonth.parse(p.period()), p.expenses(), p.income(), p.income().subtract(p.expenses()), 0)));

            String prompt = """
                    Here is my financial data for %s. Analyse it and give me personalised advice.

                    %s

                    Previous months (expenses / recorded income):
                    %s

                    Structure your answer with these sections:
                    ### Summary (2-3 sentences with the key numbers)
                    ### What went well
                    ### Where you can cut (name categories and amounts)
                    ### Action plan for next month (3-5 concrete steps with target amounts)
                    Keep it under 350 words.
                    """.formatted(month, describe(s), describeHistory(history, s.currency()));
            return generate(lang, prompt, s.totalExpenses().signum() > 0, () -> rules.monthly(s, lang));
        });
    }

    /** Year-end review with suggestions for the next year. */
    @Transactional
    public AdviceDto yearly(Long userId, int year, boolean refresh) {
        return yearly(userId, year, refresh, langOf(userId));
    }

    private AdviceDto yearly(Long userId, int year, boolean refresh, Lang lang) {
        long maxAge = YearMonth.now().getYear() == year ? 24 * HOUR : 0;
        return cached(userId, AiInsight.YEARLY, String.valueOf(year), lang, refresh, maxAge, () -> {
            YearSummary y = summaryService.year(userId, year);
            StringBuilder months = new StringBuilder();
            y.months().forEach(m -> months.append("- %s: spent %s, income %s, saved %s\n".formatted(
                    m.month(), Money.format(m.expenses(), y.currency()), Money.format(m.income(), y.currency()),
                    Money.format(m.balance(), y.currency()))));
            StringBuilder cats = new StringBuilder();
            y.byCategory().forEach(c -> cats.append("- %s%s: %s (%.1f%%)\n".formatted(c.name(),
                    c.essential() ? " [essential]" : " [non-essential]", Money.format(c.amount(), y.currency()), c.percent())));

            String prompt = """
                    Here is my full financial year %d. Currency: %s.
                    Total spent: %s. Total income: %s. Saved: %s (savings rate %.1f%%). Average monthly spending: %s.
                    Monthly savings goal: %s.

                    Month by month:
                    %s
                    Spending by category for the year:
                    %s
                    Write my year-end review with these sections:
                    ### %d in review (3-4 sentences)
                    ### Key insights (patterns, seasonal spikes, best and worst months)
                    ### Suggestions for next year (5-7 concrete, numbered or bulleted steps with target amounts)
                    ### One habit to start in January
                    Keep it under 450 words.
                    """.formatted(year, y.currency(), Money.format(y.totalExpenses(), y.currency()),
                    Money.format(y.totalIncome(), y.currency()), Money.format(y.balance(), y.currency()), y.savingsRate(),
                    Money.format(y.averageMonthlyExpenses(), y.currency()), Money.format(y.savingsGoal(), y.currency()),
                    months, cats, year);
            return generate(lang, prompt, y.totalExpenses().signum() > 0, () -> rules.yearly(y, lang));
        });
    }

    /** How to reach the monthly savings goal set in the profile (or a suggested one). */
    @Transactional
    public AdviceDto savingsPlan(Long userId, boolean refresh) {
        Lang lang = langOf(userId);
        return cached(userId, AiInsight.SAVINGS, YearMonth.now().toString(), lang, refresh, 6 * HOUR, () -> {
            User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
            MonthSummary current = summaryService.month(userId, YearMonth.now());
            MonthSummary typical = typicalMonth(userId, current);
            Averages avg = averages(userId, current);
            List<GoalDto> goals = goalService.list(userId);

            String prompt = """
                    Build my plan to save money every month.
                    My monthly savings goal: %s%s.

                    This month so far:
                    %s
                    My typical month (last complete month):
                    %s
                    Average of the last 3 months: %s
                    My savings goals: %s

                    Structure your answer with these sections:
                    ### Where you stand (goal vs. what I actually save, with numbers)
                    ### How to reach your goal (concrete cuts per category with amounts that add up to the gap; "pay yourself first")
                    ### Your spending allowance (what is left each month and each week for non-essentials)
                    ### Habits that help (3-4 short bullets)
                    Keep it under 330 words.
                    """.formatted(Money.format(user.getSavingsGoal(), current.currency()),
                    user.getSavingsGoal().signum() == 0 ? " (not set yet: propose one with the 20% rule)" : "",
                    describe(current), describe(typical), avg.describe(current.currency()), describeGoals(goals, current.currency()));
            return generate(lang, prompt, avg.income().signum() > 0, () ->
                    rules.savingsPlan(lang, current, typical, avg.income(), avg.saved(), user.getSavingsGoal()));
        });
    }

    /** How to reach one savings goal by its deadline, based on the user's income and spending. */
    @Transactional
    public AdviceDto goalPlan(Long userId, Long goalId, boolean refresh) {
        Lang lang = langOf(userId);
        GoalDto goal = goalService.get(userId, goalId);
        return cached(userId, AiInsight.GOAL, String.valueOf(goalId), lang, refresh, 12 * HOUR, () -> {
            MonthSummary current = summaryService.month(userId, YearMonth.now());
            MonthSummary typical = typicalMonth(userId, current);
            Averages avg = averages(userId, current);
            String cur = current.currency();

            String prompt = """
                    Help me reach this savings goal.
                    Goal: %s %s
                    Target: %s by %s (%d months left). Already saved: %s (%.0f%%), remaining: %s.
                    Progress is tracked %s.
                    I need to save %s per month. My average monthly savings over the last 3 months: %s.
                    Status: %s.
                    Average of the last 3 months: %s

                    My typical month (last complete month):
                    %s

                    Structure your answer with these sections:
                    ### Goal status (is it realistic? with numbers)
                    ### Monthly plan (how much to set aside each month and each week, and when)
                    ### Where to find the money (specific categories and amounts)
                    ### If it's not realistic (new deadline or target, extra-income ideas)
                    Keep it under 330 words.
                    """.formatted(goal.icon() == null ? "" : goal.icon(), goal.name(),
                    Money.format(goal.targetAmount(), cur), goal.deadline(), goal.monthsLeft(),
                    Money.format(goal.savedAmount(), cur), goal.percent(), Money.format(goal.remaining(), cur),
                    GoalService.MANUAL.equals(goal.trackingMode()) ? "with " + goal.depositsCount() + " recorded deposits"
                            : "automatically from income minus expenses since " + goal.startDate(),
                    Money.format(goal.requiredPerMonth(), cur), Money.format(goal.averageMonthlySavings(), cur),
                    goal.status(), avg.describe(cur), describe(typical));
            return generate(lang, prompt, true, () -> rules.goalPlan(lang, goal, typical, avg.income(), cur));
        });
    }

    /** Free-form chat. The current month's data and the goals are attached so answers are personalised. */
    @Transactional
    public ChatResponse chat(Long userId, ChatRequest req) {
        Lang lang = langOf(userId);
        YearMonth now = YearMonth.now();
        MonthSummary s = summaryService.month(userId, now);
        List<MonthPoint> trend = summaryService.trend(userId, now.minusMonths(1), 3);

        String context = """
                Context about the user (do not repeat it verbatim unless asked):
                %s
                Previous 3 months (expenses / recorded income): %s
                Savings goals: %s
                Today is %s.
                """.formatted(describe(s), trend.stream()
                        .map(p -> p.period() + ": " + Money.format(p.expenses(), s.currency()) + " / " + Money.format(p.income(), s.currency()))
                        .toList(),
                describeGoals(goalService.list(userId), s.currency()), LocalDate.now());

        List<AiClient.Message> messages = new ArrayList<>();
        messages.add(new AiClient.Message("system", ADVISOR_PERSONA
                + "- Reply in the language the user writes in. If unsure, reply in " + lang.englishName() + ".\n"
                + context + "\nKeep chat answers concise (under 200 words) unless the user asks for detail."));
        if (req.history() != null) {
            req.history().stream()
                    .filter(m -> "user".equals(m.role()) || "assistant".equals(m.role()))
                    .skip(Math.max(0, req.history().size() - 10))
                    .forEach(m -> messages.add(new AiClient.Message(m.role(), m.content())));
        }
        messages.add(new AiClient.Message("user", req.message()));

        return aiClient.chat(messages, 0.6)
                .map(reply -> new ChatResponse(reply, aiClient.sourceLabel()))
                .orElseGet(() -> new ChatResponse(rules.chatFallback(s, lang), "rules"));
    }

    /** Cached advice for the PDF reports (which are in English), generated on demand if missing. */
    @Transactional
    public String monthlyForReport(Long userId, YearMonth month) {
        return monthly(userId, month, false, Lang.EN).content();
    }

    @Transactional
    public String yearlyForReport(Long userId, int year) {
        return yearly(userId, year, false, Lang.EN).content();
    }

    // ---------------------------------------------------------------- helpers

    private Lang langOf(Long userId) {
        return userRepository.findById(userId).map(u -> Lang.of(u.getLanguage())).orElse(Lang.EN);
    }

    /**
     * Returns the cached text for (kind, key, language) unless it is missing, older than maxAgeSeconds
     * (0 = never expires) or a refresh is asked; otherwise generates and stores a new one.
     */
    private AdviceDto cached(Long userId, String kind, String key, Lang lang, boolean refresh, long maxAgeSeconds,
                             Supplier<Generated> generator) {
        Optional<AiInsight> cached = insightRepository.findByUserIdAndKindAndPeriodKeyAndLang(userId, kind, key, lang.code());
        boolean stale = cached.isPresent() && maxAgeSeconds > 0
                && cached.get().getCreatedAt().isBefore(Instant.now().minusSeconds(maxAgeSeconds));
        if (cached.isPresent() && !refresh && !stale) {
            return toDto(cached.get());
        }
        Generated g = generator.get();
        AiInsight insight = cached.orElseGet(AiInsight::new);
        insight.setUser(userRepository.getReferenceById(userId));
        insight.setKind(kind);
        insight.setPeriodKey(key);
        insight.setLang(lang.code());
        insight.setContent(g.content());
        insight.setSource(g.source());
        insight.setCreatedAt(Instant.now());
        return toDto(insightRepository.save(insight));
    }

    /** Asks the LLM when there is something to analyse; falls back to the rule-based advisor. */
    private Generated generate(Lang lang, String prompt, boolean useAi, Supplier<String> fallback) {
        Optional<String> ai = useAi
                ? aiClient.chat(List.of(new AiClient.Message("system", ADVISOR_PERSONA
                        + "- Write your whole answer in " + lang.englishName() + ", including the section headings.\n"),
                new AiClient.Message("user", prompt)), 0.4)
                : Optional.empty();
        return ai.map(text -> new Generated(text, aiClient.sourceLabel()))
                .orElseGet(() -> new Generated(fallback.get(), "rules"));
    }

    /** Last complete month if it has spending (a fuller picture early in the month), else the current month. */
    private MonthSummary typicalMonth(Long userId, MonthSummary current) {
        MonthSummary previous = summaryService.month(userId, current.month().minusMonths(1));
        return previous.totalExpenses().signum() > 0 ? previous : current;
    }

    /** Typical income, spending and savings; saved is null when there is no history yet. */
    private record Averages(BigDecimal income, BigDecimal expenses, BigDecimal saved, int months) {
        String describe(String cur) {
            if (months == 0) return "no history yet";
            return "income %s, spent %s, saved %s per month (%d months)".formatted(
                    Money.format(income, cur), Money.format(expenses, cur), Money.format(saved, cur), months);
        }
    }

    private Averages averages(Long userId, MonthSummary current) {
        YearMonth now = current.month();
        List<MonthLine> recent = summaryService.monthlyBalances(userId, now.minusMonths(3), now.minusMonths(1)).stream()
                .filter(m -> m.expenses().signum() > 0).toList();
        if (recent.isEmpty()) {
            return new Averages(current.totalIncome(), current.totalExpenses(), null, 0);
        }
        BigDecimal n = BigDecimal.valueOf(recent.size());
        BigDecimal income = recent.stream().map(MonthLine::income).reduce(BigDecimal.ZERO, BigDecimal::add).divide(n, 2, RoundingMode.HALF_UP);
        BigDecimal expenses = recent.stream().map(MonthLine::expenses).reduce(BigDecimal.ZERO, BigDecimal::add).divide(n, 2, RoundingMode.HALF_UP);
        return new Averages(income, expenses, income.subtract(expenses), recent.size());
    }

    private static String describeGoals(List<GoalDto> goals, String cur) {
        if (goals.isEmpty()) return "none";
        StringBuilder sb = new StringBuilder();
        for (GoalDto g : goals) {
            sb.append("\n- ").append(g.name()).append(": ").append(Money.format(g.savedAmount(), cur)).append(" of ")
                    .append(Money.format(g.targetAmount(), cur)).append(" by ").append(g.deadline())
                    .append(", needs ").append(Money.format(g.requiredPerMonth(), cur)).append("/month, ").append(g.status());
        }
        return sb.toString();
    }

    private String describe(MonthSummary s) {
        String cur = s.currency();
        StringBuilder sb = new StringBuilder();
        sb.append("Currency: ").append(cur).append('\n');
        sb.append("Month: ").append(s.month()).append(YearMonth.now().equals(s.month())
                ? " (in progress, day " + LocalDate.now().getDayOfMonth() + " of " + s.month().lengthOfMonth() + ")" : "").append('\n');
        sb.append("Income: ").append(Money.format(s.totalIncome(), cur))
                .append(s.incomeEstimated() ? " (estimated from profile, no income recorded)" : "").append('\n');
        sb.append("Total spent: ").append(Money.format(s.totalExpenses(), cur)).append('\n');
        sb.append("Balance (income - spent): ").append(Money.format(s.balance(), cur))
                .append(" | savings rate: ").append("%.1f%%".formatted(s.savingsRate())).append('\n');
        sb.append("Monthly savings goal: ").append(Money.format(s.savingsGoal(), cur)).append('\n');
        sb.append("Previous month spent: ").append(Money.format(s.previousExpenses(), cur))
                .append(" (change ").append("%+.1f%%".formatted(s.changePercent())).append(")\n");
        if (YearMonth.now().equals(s.month())) {
            sb.append("Projected month-end spending at current pace: ").append(Money.format(s.projectedMonthEnd(), cur)).append('\n');
        }
        sb.append("Essential spending: ").append(Money.format(s.essentialTotal(), cur))
                .append(" | Non-essential: ").append(Money.format(s.nonEssentialTotal(), cur)).append('\n');
        sb.append("Spending by category:\n");
        for (CategorySpend c : s.byCategory()) {
            sb.append("- ").append(c.name()).append(c.essential() ? " [essential]" : " [non-essential]").append(": ")
                    .append(Money.format(c.amount(), cur)).append(" (").append("%.1f%%".formatted(c.percent())).append(")\n");
        }
        if (!s.budgets().isEmpty()) {
            sb.append("Budgets:\n");
            for (BudgetDto b : s.budgets()) {
                sb.append("- ").append(b.category() == null ? "Overall" : b.category().name()).append(": spent ")
                        .append(Money.format(b.spent(), cur)).append(" of ").append(Money.format(b.limitAmount(), cur))
                        .append(" (").append("%.0f%%".formatted(b.percent())).append(")\n");
            }
        }
        sb.append("Largest expenses:\n");
        for (ExpenseDto e : s.topExpenses(5)) {
            sb.append("- ").append(e.date()).append(' ').append(e.description()).append(" [").append(e.category().name())
                    .append("]: ").append(Money.format(e.amount(), cur)).append('\n');
        }
        sb.append("Number of transactions: ").append(s.expenses().size()).append('\n');
        return sb.toString();
    }

    private static String describeHistory(List<MonthLine> history, String cur) {
        StringBuilder sb = new StringBuilder();
        history.forEach(m -> sb.append("- ").append(m.month()).append(": ").append(Money.format(m.expenses(), cur))
                .append(" / ").append(Money.format(m.income(), cur)).append('\n'));
        return sb.toString();
    }

    private static AdviceDto toDto(AiInsight a) {
        return new AdviceDto(a.getPeriodKey(), a.getContent(), a.getSource(), a.getCreatedAt());
    }
}
