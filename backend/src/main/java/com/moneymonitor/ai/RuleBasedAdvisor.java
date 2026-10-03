package com.moneymonitor.ai;

import com.moneymonitor.dto.FinanceDtos.BudgetDto;
import com.moneymonitor.dto.FinanceDtos.CategorySpend;
import com.moneymonitor.dto.GoalDtos.GoalDto;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.service.FinanceSummaryService.MonthLine;
import com.moneymonitor.service.FinanceSummaryService.MonthSummary;
import com.moneymonitor.service.FinanceSummaryService.YearSummary;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Offline advisor based on classic personal-finance rules (50/30/20 rule, emergency fund, budget tracking).
 * Used when no LLM is configured or when the LLM call fails, so the app always gives useful advice.
 * All sentences come from i18n/messages_xx.properties, so it speaks the user's language.
 */
@Component
@RequiredArgsConstructor
public class RuleBasedAdvisor {

    /** Weeks per month, to turn a monthly amount into a weekly one. */
    private static final BigDecimal WEEKS = BigDecimal.valueOf(4.33);

    private final Texts texts;

    public String monthly(MonthSummary s, Lang l) {
        String cur = s.currency();
        String monthName = texts.monthYear(l, s.month());

        if (s.totalExpenses().signum() == 0) {
            StringBuilder sb = new StringBuilder();
            sb.append("### ").append(texts.t(l, "h.summary")).append('\n').append(texts.t(l, "m.noExpenses", monthName)).append("\n\n");
            section(sb, texts.t(l, "h.actionPlan"), List.of(texts.t(l, "m.tip.record"), texts.t(l, "m.tip.profile"), texts.t(l, "m.tip.budget")));
            return sb.toString().trim();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("### ").append(texts.t(l, "h.summary")).append('\n');
        sb.append(texts.t(l, "m.spent", monthName, Money.format(s.totalExpenses(), cur))).append(' ');
        if (s.totalIncome().signum() > 0) {
            sb.append(texts.t(l, "m.outOfIncome", Money.format(s.totalIncome(), cur), s.incomeEstimated() ? texts.t(l, "m.estimated") : "",
                    Money.format(s.balance(), cur), pct1(s.savingsRate())));
        } else {
            sb.append(texts.t(l, "m.addIncome"));
        }
        if (s.previousExpenses().signum() > 0) {
            sb.append(' ').append(texts.t(l, "m.vsLast", (s.changePercent() >= 0 ? "+" : "") + pct1(s.changePercent())));
        }
        sb.append("\n\n");

        List<String> good = new ArrayList<>();
        List<String> cut = new ArrayList<>();
        List<String> actions = new ArrayList<>();

        // ---- Savings rate
        if (s.totalIncome().signum() > 0) {
            if (s.savingsRate() >= 20) {
                good.add(texts.t(l, "m.savedAbove", pct1(s.savingsRate())));
            } else if (s.savingsRate() >= 0) {
                actions.add(texts.t(l, "m.aim20", Money.format(percentOf(s.totalIncome(), 0.20), cur)));
            } else {
                cut.add(texts.t(l, "m.overspent", Money.format(s.balance().negate(), cur)));
            }
        }

        // ---- 50/30/20 split
        if (s.totalIncome().signum() > 0) {
            double needs = Money.percent(s.essentialTotal(), s.totalIncome());
            double wants = Money.percent(s.nonEssentialTotal(), s.totalIncome());
            if (needs > 50) cut.add(texts.t(l, "m.needsHigh", pct0(needs)));
            else good.add(texts.t(l, "m.needsOk", pct0(needs)));
            if (wants > 30) cut.add(texts.t(l, "m.wantsHigh", pct0(wants)));
        }

        // ---- Biggest category
        if (!s.byCategory().isEmpty()) {
            CategorySpend top = s.byCategory().get(0);
            if (top.percent() > 35 && !top.essential()) {
                cut.add(texts.t(l, "m.topCut", top.name(), pct0(top.percent()), Money.format(percentOf(top.amount(), 0.15), cur)));
            } else {
                good.add(texts.t(l, top.essential() ? "m.topOkEssential" : "m.topOk", top.name(), pct0(top.percent())));
            }
        }

        // ---- Budgets
        List<BudgetDto> over = s.budgets().stream().filter(b -> b.percent() >= 100).toList();
        List<BudgetDto> ok = s.budgets().stream().filter(b -> b.percent() < 90).toList();
        for (BudgetDto b : over) {
            cut.add(texts.t(l, "m.budgetOver", b.category() == null ? texts.t(l, "m.overall") : b.category().name(),
                    Money.format(b.remaining().negate(), cur)));
        }
        if (!ok.isEmpty() && over.isEmpty()) good.add(texts.t(l, "m.budgetsOk"));
        if (s.budgets().isEmpty()) actions.add(texts.t(l, "m.createBudgets"));

        // ---- Trend
        if (s.previousExpenses().signum() > 0 && s.changePercent() > 15) {
            cut.add(texts.t(l, "m.trendUp", pct0(s.changePercent())));
        } else if (s.previousExpenses().signum() > 0 && s.changePercent() < -5) {
            good.add(texts.t(l, "m.trendDown", pct0(-s.changePercent())));
        }

        // ---- Savings goal
        if (s.savingsGoal() != null && s.savingsGoal().signum() > 0 && s.totalIncome().signum() > 0) {
            if (s.balance().compareTo(s.savingsGoal()) >= 0) {
                good.add(texts.t(l, "m.goalReached", Money.format(s.savingsGoal(), cur)));
            } else {
                actions.add(texts.t(l, "m.goalShort", Money.format(s.savingsGoal().subtract(s.balance().max(BigDecimal.ZERO)), cur)));
            }
        }

        actions.add(texts.t(l, "m.emergency", Money.format(s.totalExpenses().multiply(BigDecimal.valueOf(3)), cur)));
        actions.add(texts.t(l, "m.rule24", Money.format(s.dailyAverage().multiply(BigDecimal.valueOf(2)).max(BigDecimal.valueOf(100)), cur)));

        section(sb, texts.t(l, "h.wentWell"), good);
        section(sb, texts.t(l, "h.cut"), cut);
        section(sb, texts.t(l, "h.plan"), actions);
        return sb.toString().trim();
    }

    public String yearly(YearSummary y, Lang l) {
        String cur = y.currency();
        if (y.totalExpenses().signum() == 0) {
            return "### " + texts.t(l, "h.summary") + "\n" + texts.t(l, "y.empty", String.valueOf(y.year()));
        }
        StringBuilder sb = new StringBuilder();
        sb.append("### ").append(texts.t(l, "h.inReview", String.valueOf(y.year()))).append('\n');
        sb.append(texts.t(l, "y.spent", Money.format(y.totalExpenses(), cur), Money.format(y.averageMonthlyExpenses(), cur)));
        if (y.totalIncome().signum() > 0) {
            sb.append(' ').append(texts.t(l, "y.saved", Money.format(y.balance(), cur), pct1(y.savingsRate())));
        }
        sb.append("\n\n");

        List<String> insights = new ArrayList<>();
        if (y.highestSpendingMonth() != null) {
            insights.add(texts.t(l, "y.mostExpensive", monthName(y.highestSpendingMonth(), l), Money.format(y.highestSpendingMonth().expenses(), cur)));
        }
        if (y.lowestSpendingMonth() != null) {
            insights.add(texts.t(l, "y.mostFrugal", monthName(y.lowestSpendingMonth(), l), Money.format(y.lowestSpendingMonth().expenses(), cur)));
        }
        y.byCategory().stream().limit(3).forEach(c -> insights.add(texts.t(l, "y.catLine",
                c.icon() == null ? "" : c.icon(), c.name(), Money.format(c.amount(), cur), pct0(c.percent()))));
        section(sb, texts.t(l, "h.insights"), insights);

        List<String> plan = new ArrayList<>();
        if (y.savingsRate() < 20 && y.totalIncome().signum() > 0) {
            BigDecimal monthlyIncome = y.totalIncome().divide(BigDecimal.valueOf(Math.max(y.months().size(), 1)), 2, RoundingMode.HALF_UP);
            plan.add(texts.t(l, "y.raise", Money.format(percentOf(monthlyIncome, 0.2), cur)));
        } else if (y.totalIncome().signum() > 0) {
            plan.add(texts.t(l, "y.excellent"));
        }
        y.byCategory().stream().filter(c -> !c.essential()).findFirst().ifPresent(c ->
                plan.add(texts.t(l, "y.cap", c.name(), Money.format(percentOf(c.amount(), 0.1), cur))));
        plan.add(texts.t(l, "y.seasonal"));
        plan.add(texts.t(l, "y.subs"));
        plan.add(texts.t(l, "y.emergency", Money.format(y.averageMonthlyExpenses().multiply(BigDecimal.valueOf(3)), cur)));
        section(sb, texts.t(l, "h.suggestions"), plan);
        return sb.toString().trim();
    }

    public String chatFallback(MonthSummary s, Lang l) {
        return texts.t(l, "c.offline") + "\n\n" + monthly(s, l) + "\n\n" + texts.t(l, "c.tip");
    }

    /**
     * Plan to reach the monthly savings goal from the profile.
     *
     * @param current     this month so far
     * @param typical     the last complete month (or this one if there is no history), used for category cuts
     * @param income      typical monthly income
     * @param avgSaved    average monthly savings over the last 3 months, null when there is no history
     */
    public String savingsPlan(Lang l, MonthSummary current, MonthSummary typical, BigDecimal income, BigDecimal avgSaved,
                              BigDecimal savingsGoal) {
        String cur = current.currency();
        StringBuilder sb = new StringBuilder();
        if (income.signum() <= 0) {
            sb.append("### ").append(texts.t(l, "h.whereYouStand")).append('\n').append(texts.t(l, "s.noIncome")).append("\n\n");
            section(sb, texts.t(l, "h.habits"), habits(l));
            return sb.toString().trim();
        }

        List<String> stand = new ArrayList<>();
        BigDecimal goal = savingsGoal == null ? BigDecimal.ZERO : savingsGoal;
        if (goal.signum() <= 0) {
            goal = percentOf(income, 0.20);
            stand.add(texts.t(l, "s.noGoal", Money.format(goal, cur)));
        }
        BigDecimal onCourse = current.totalIncome().subtract(current.projectedMonthEnd());
        stand.add(texts.t(l, "s.status", Money.format(goal, cur), Money.format(current.totalIncome(), cur),
                Money.format(current.totalExpenses(), cur), Money.format(onCourse, cur)));
        if (avgSaved != null) stand.add(texts.t(l, "s.avg", Money.format(avgSaved, cur)));
        section(sb, texts.t(l, "h.whereYouStand"), stand);

        BigDecimal reference = avgSaved != null ? avgSaved : onCourse;
        BigDecimal gap = goal.subtract(reference);
        List<String> how = new ArrayList<>();
        if (gap.signum() <= 0) {
            how.add(texts.t(l, "s.onTrack"));
        } else {
            how.add(texts.t(l, "s.gap", Money.format(gap, cur)));
            BigDecimal left = cuts(typical, gap, (c, amount) -> texts.t(l, "s.cutCat", c.name(), Money.format(amount, cur),
                    Money.format(c.amount(), cur), Money.format(c.amount().subtract(amount), cur)), how);
            if (left.signum() > 0) {
                how.add(texts.t(l, "s.goalTooHigh", pct0(Money.percent(goal, income)), Money.format(goal.subtract(left), cur)));
            }
        }
        how.add(texts.t(l, "s.payFirst", Money.format(goal, cur)));
        section(sb, texts.t(l, "h.howToGetThere"), how);

        BigDecimal essentials = typical.essentialTotal();
        BigDecimal free = income.subtract(essentials).subtract(goal);
        String allowance = free.signum() <= 0 ? texts.t(l, "s.allowanceNegative")
                : texts.t(l, "s.allowance", Money.format(essentials, cur), Money.format(free, cur),
                Money.format(free.divide(WEEKS, 2, RoundingMode.HALF_UP), cur));
        section(sb, texts.t(l, "h.allowance"), List.of(allowance));
        section(sb, texts.t(l, "h.habits"), habits(l));
        return sb.toString().trim();
    }

    /** Plan to reach one savings goal by its deadline. */
    public String goalPlan(Lang l, GoalDto g, MonthSummary typical, BigDecimal income, String cur) {
        StringBuilder sb = new StringBuilder();
        List<String> status = new ArrayList<>();
        status.add(texts.t(l, "g.status", (g.icon() == null ? "" : g.icon() + " ") + g.name(), Money.format(g.targetAmount(), cur),
                texts.date(l, g.deadline()), Money.format(g.savedAmount(), cur), pct0(g.percent()),
                Money.format(g.remaining(), cur), String.valueOf(g.monthsLeft())));
        status.add("MANUAL".equals(g.trackingMode())
                ? texts.t(l, "g.trackingManual", String.valueOf(g.depositsCount()))
                : texts.t(l, "g.trackingAuto", texts.date(l, g.startDate())));
        BigDecimal avg = g.averageMonthlySavings();

        if ("COMPLETED".equals(g.status())) {
            status.add(texts.t(l, "g.done"));
            section(sb, texts.t(l, "h.goalStatus"), status);
            return sb.toString().trim();
        }
        if ("OVERDUE".equals(g.status())) {
            status.add(texts.t(l, "g.overdue", Money.format(g.remaining(), cur)));
            if (avg.signum() > 0) {
                status.add(texts.t(l, "g.overdueMonths", String.valueOf(monthsNeeded(g.remaining(), avg))));
            }
            section(sb, texts.t(l, "h.goalStatus"), status);
            return sb.toString().trim();
        }
        section(sb, texts.t(l, "h.goalStatus"), status);

        BigDecimal required = g.requiredPerMonth();
        List<String> plan = new ArrayList<>();
        if (income.signum() <= 0) {
            plan.add(texts.t(l, "g.noIncome"));
        } else {
            plan.add(texts.t(l, "g.required", Money.format(required, cur), pct0(Money.percent(required, income)), Money.format(income, cur)));
        }
        BigDecimal gap = required.subtract(avg.max(BigDecimal.ZERO));
        if (gap.signum() <= 0) {
            plan.add(texts.t(l, "g.avgOk", Money.format(avg, cur), Money.format(required, cur)));
        } else {
            plan.add(texts.t(l, "g.avgGap", Money.format(avg.max(BigDecimal.ZERO), cur), Money.format(gap, cur)));
        }
        plan.add(texts.t(l, "g.split", Money.format(required.divide(WEEKS, 2, RoundingMode.HALF_UP), cur)));
        plan.add(texts.t(l, "g.deposit"));
        section(sb, texts.t(l, "h.monthlyPlan"), plan);

        if (gap.signum() > 0) {
            List<String> find = new ArrayList<>();
            BigDecimal left = cuts(typical, gap, (c, amount) -> texts.t(l, "g.cut", c.name(), Money.format(amount, cur),
                    pct0(Money.percent(amount, c.amount()))), find);
            section(sb, texts.t(l, "h.whereToFind"), find);

            List<String> options = new ArrayList<>();
            if (avg.signum() > 0) {
                options.add(texts.t(l, "g.extend", String.valueOf(monthsNeeded(g.remaining(), avg))));
                options.add(texts.t(l, "g.lower", Money.format(g.projectedAmount(), cur)));
            }
            if (income.signum() > 0 && Money.percent(required, income) > 50) options.add(texts.t(l, "g.unrealistic"));
            if (left.signum() > 0) options.add(texts.t(l, "g.extraIncome", Money.format(left, cur)));
            section(sb, texts.t(l, "h.options"), options);
        }
        return sb.toString().trim();
    }

    private interface CutLine {
        String format(CategorySpend category, BigDecimal amount);
    }

    /**
     * Suggests cutting up to 30% of the biggest non-essential categories until `gap` is covered (3 at most).
     * Adds one line per category and returns what is still missing.
     */
    private static BigDecimal cuts(MonthSummary typical, BigDecimal gap, CutLine line, List<String> out) {
        BigDecimal left = gap;
        int count = 0;
        for (CategorySpend c : typical.byCategory()) {
            if (left.signum() <= 0 || count == 3) break;
            if (c.essential() || c.amount().signum() <= 0) continue;
            BigDecimal amount = percentOf(c.amount(), 0.30).min(left).setScale(0, RoundingMode.UP);
            if (amount.signum() <= 0) continue;
            out.add(line.format(c, amount));
            left = left.subtract(amount);
            count++;
        }
        return left.max(BigDecimal.ZERO);
    }

    private List<String> habits(Lang l) {
        return List.of(texts.t(l, "s.habit1"), texts.t(l, "s.habit2"), texts.t(l, "s.habit3"), texts.t(l, "s.habit4"));
    }

    private static long monthsNeeded(BigDecimal remaining, BigDecimal perMonth) {
        return remaining.divide(perMonth, 0, RoundingMode.CEILING).longValue();
    }

    private static BigDecimal percentOf(BigDecimal amount, double share) {
        return amount.multiply(BigDecimal.valueOf(share)).setScale(2, RoundingMode.HALF_UP);
    }

    private static String pct0(double v) {
        return String.format(Locale.ROOT, "%.0f", v);
    }

    private static String pct1(double v) {
        return String.format(Locale.ROOT, "%.1f", v);
    }

    private String monthName(MonthLine line, Lang l) {
        return texts.monthName(l, line.month());
    }

    private static void section(StringBuilder sb, String title, List<String> items) {
        if (items.isEmpty()) return;
        sb.append("### ").append(title).append('\n');
        items.forEach(i -> sb.append("- ").append(i).append('\n'));
        sb.append('\n');
    }
}
