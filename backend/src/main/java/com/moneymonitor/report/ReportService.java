package com.moneymonitor.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.moneymonitor.ai.AiAdvisorService;
import com.moneymonitor.dto.FinanceDtos.*;
import com.moneymonitor.repository.ExpenseRepository;
import com.moneymonitor.service.FinanceSummaryService;
import com.moneymonitor.service.FinanceSummaryService.MonthLine;
import com.moneymonitor.service.FinanceSummaryService.MonthSummary;
import com.moneymonitor.service.FinanceSummaryService.YearSummary;
import com.moneymonitor.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.moneymonitor.report.PdfStyles.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH);

    private final FinanceSummaryService summaryService;
    private final AiAdvisorService advisorService;
    private final ExpenseRepository expenseRepository;

    public byte[] monthly(Long userId, YearMonth month) {
        MonthSummary s = summaryService.month(userId, month);
        String advice = advisorService.monthlyForReport(userId, month);
        String cur = s.currency();
        String monthName = monthName(month) + " " + month.getYear();

        return render("Money Monitor - Monthly report " + month, doc -> {
            doc.add(header("Monthly Expense Report", monthName, s.userName() + "\nGenerated " + LocalDateTime.now().format(STAMP)));

            doc.add(kpis(List.of(
                    new Kpi("Income" + (s.incomeEstimated() ? " (estimated)" : ""), Money.format(s.totalIncome(), cur), SUCCESS),
                    new Kpi("Expenses", Money.format(s.totalExpenses(), cur), DANGER),
                    new Kpi("Balance", Money.format(s.balance(), cur), s.balance().signum() >= 0 ? PRIMARY : DANGER),
                    new Kpi("Savings rate", "%.1f%%".formatted(s.savingsRate()), s.savingsRate() >= 20 ? SUCCESS : WARNING))));

            doc.add(kpis(List.of(
                    new Kpi("Transactions", String.valueOf(s.expenses().size()), PRIMARY),
                    new Kpi("Daily average", Money.format(s.dailyAverage(), cur), PRIMARY),
                    new Kpi("vs last month", s.previousExpenses().signum() == 0 ? "n/a" : "%+.1f%%".formatted(s.changePercent()),
                            s.changePercent() > 0 ? DANGER : SUCCESS),
                    new Kpi("Essential / Other", "%.0f%% / %.0f%%".formatted(Money.percent(s.essentialTotal(), s.totalExpenses()),
                            Money.percent(s.nonEssentialTotal(), s.totalExpenses())), PRIMARY))));

            // Daily chart
            doc.add(section("Daily spending"));
            List<String> labels = new ArrayList<>();
            double[] values = new double[s.daily().size()];
            for (int i = 0; i < s.daily().size(); i++) {
                labels.add(String.valueOf(s.daily().get(i).date().getDayOfMonth()));
                values[i] = s.daily().get(i).amount().doubleValue();
            }
            doc.add(barChart(labels, List.of(values), List.of(PRIMARY), 150, v -> compact(v)));

            // Categories
            doc.add(section("Spending by category"));
            if (s.byCategory().isEmpty()) {
                doc.add(new Paragraph("No expenses recorded this month.", BODY));
            } else {
                PdfPTable t = table(new float[]{3, 1.6f, 0.9f, 3}, "Category", "Amount", "Share", "");
                boolean zebra = false;
                for (CategorySpend c : s.byCategory()) {
                    Color bg = zebra ? ZEBRA : null;
                    t.addCell(cell(c.name() + (c.essential() ? "  (essential)" : ""), BODY, Element.ALIGN_LEFT, bg));
                    t.addCell(cell(Money.format(c.amount(), cur), BODY_BOLD, Element.ALIGN_RIGHT, bg));
                    t.addCell(cell("%.1f%%".formatted(c.percent()), BODY, Element.ALIGN_RIGHT, bg));
                    t.addCell(barCell(c.percent(), parseColor(c.color()), bg));
                    zebra = !zebra;
                }
                doc.add(t);
            }

            // Budgets
            if (!s.budgets().isEmpty()) {
                doc.add(section("Budgets"));
                PdfPTable t = table(new float[]{2.4f, 1.5f, 1.5f, 1.5f, 2.2f}, "Budget", "Limit", "Spent", "Remaining", "Used");
                for (BudgetDto b : s.budgets()) {
                    Color color = b.percent() >= 100 ? DANGER : b.percent() >= 80 ? WARNING : SUCCESS;
                    t.addCell(cell(b.category() == null ? "Overall" : b.category().name(), BODY_BOLD, Element.ALIGN_LEFT, null));
                    t.addCell(cell(Money.format(b.limitAmount(), cur), BODY, Element.ALIGN_RIGHT, null));
                    t.addCell(cell(Money.format(b.spent(), cur), BODY, Element.ALIGN_RIGHT, null));
                    Font remFont = new Font(BODY);
                    remFont.setColor(b.remaining().signum() < 0 ? DANGER : TEXT);
                    t.addCell(cell(Money.format(b.remaining(), cur), remFont, Element.ALIGN_RIGHT, null));
                    t.addCell(barCell(b.percent(), color, null));
                }
                doc.add(t);
            }

            // AI advice
            doc.add(section("AI advisor: insights & suggestions"));
            adviceBox(doc, advice);

            // Full list
            doc.newPage();
            doc.add(section("All expenses (" + s.expenses().size() + ")"));
            if (s.expenses().isEmpty()) {
                doc.add(new Paragraph("No expenses recorded this month.", BODY));
            } else {
                PdfPTable t = table(new float[]{1.3f, 3.4f, 1.8f, 1.4f, 1.6f}, "Date", "Description", "Category", "Method", "Amount");
                boolean zebra = false;
                List<ExpenseDto> sorted = s.expenses().stream()
                        .sorted((a, b) -> a.date().equals(b.date()) ? a.id().compareTo(b.id()) : a.date().compareTo(b.date())).toList();
                for (ExpenseDto e : sorted) {
                    Color bg = zebra ? ZEBRA : null;
                    t.addCell(cell(e.date().format(DATE), BODY, Element.ALIGN_LEFT, bg));
                    t.addCell(cell(e.description(), BODY, Element.ALIGN_LEFT, bg));
                    t.addCell(cell(e.category().name(), BODY, Element.ALIGN_LEFT, bg));
                    t.addCell(cell(pretty(e.paymentMethod().name()), BODY, Element.ALIGN_LEFT, bg));
                    t.addCell(cell(Money.format(e.amount(), cur), BODY, Element.ALIGN_RIGHT, bg));
                    zebra = !zebra;
                }
                var total = cell("TOTAL", BODY_BOLD, Element.ALIGN_LEFT, PRIMARY_LIGHT);
                total.setColspan(4);
                t.addCell(total);
                t.addCell(cell(Money.format(s.totalExpenses(), cur), BODY_BOLD, Element.ALIGN_RIGHT, PRIMARY_LIGHT));
                doc.add(t);
            }

            if (!s.incomes().isEmpty()) {
                doc.add(section("Income"));
                PdfPTable t = table(new float[]{1.3f, 4, 1.6f}, "Date", "Source", "Amount");
                for (IncomeDto i : s.incomes()) {
                    t.addCell(cell(i.date().format(DATE), BODY, Element.ALIGN_LEFT, null));
                    t.addCell(cell(i.source(), BODY, Element.ALIGN_LEFT, null));
                    t.addCell(cell(Money.format(i.amount(), cur), BODY, Element.ALIGN_RIGHT, null));
                }
                doc.add(t);
            }
        });
    }

    public byte[] yearly(Long userId, int year) {
        YearSummary y = summaryService.year(userId, year);
        String advice = advisorService.yearlyForReport(userId, year);
        String cur = y.currency();

        return render("Money Monitor - Annual report " + year, doc -> {
            doc.add(header("Annual Financial Report", String.valueOf(year),
                    y.userName() + "\nGenerated " + LocalDateTime.now().format(STAMP)));

            doc.add(kpis(List.of(
                    new Kpi("Total income", Money.format(y.totalIncome(), cur), SUCCESS),
                    new Kpi("Total expenses", Money.format(y.totalExpenses(), cur), DANGER),
                    new Kpi("Total saved", Money.format(y.balance(), cur), y.balance().signum() >= 0 ? PRIMARY : DANGER),
                    new Kpi("Savings rate", "%.1f%%".formatted(y.savingsRate()), y.savingsRate() >= 20 ? SUCCESS : WARNING))));
            doc.add(kpis(List.of(
                    new Kpi("Avg. monthly spending", Money.format(y.averageMonthlyExpenses(), cur), PRIMARY),
                    new Kpi("Highest month", y.highestSpendingMonth() == null ? "n/a"
                            : monthName(y.highestSpendingMonth().month()) + " (" + compact(y.highestSpendingMonth().expenses().doubleValue()) + ")", DANGER),
                    new Kpi("Lowest month", y.lowestSpendingMonth() == null ? "n/a"
                            : monthName(y.lowestSpendingMonth().month()) + " (" + compact(y.lowestSpendingMonth().expenses().doubleValue()) + ")", SUCCESS))));

            doc.add(section("Income vs expenses by month"));
            List<String> labels = y.months().stream().map(m -> monthName(m.month()).substring(0, 3)).toList();
            double[] exp = y.months().stream().mapToDouble(m -> m.expenses().doubleValue()).toArray();
            double[] inc = y.months().stream().mapToDouble(m -> m.income().doubleValue()).toArray();
            doc.add(barChart(labels, List.of(inc, exp), List.of(SUCCESS, DANGER), 170, v -> compact(v)));
            Paragraph legend = new Paragraph();
            legend.add(new Chunk("Income", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, SUCCESS)));
            legend.add(new Chunk("   vs   ", SMALL));
            legend.add(new Chunk("Expenses", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, DANGER)));
            legend.setSpacingAfter(10);
            doc.add(legend);

            doc.add(section("Month by month"));
            PdfPTable t = table(new float[]{1.6f, 1.8f, 1.8f, 1.8f, 1.2f}, "Month", "Income", "Expenses", "Balance", "Saved");
            boolean zebra = false;
            for (MonthLine m : y.months()) {
                Color bg = zebra ? ZEBRA : null;
                t.addCell(cell(monthName(m.month()), BODY_BOLD, Element.ALIGN_LEFT, bg));
                t.addCell(cell(Money.format(m.income(), cur), BODY, Element.ALIGN_RIGHT, bg));
                t.addCell(cell(Money.format(m.expenses(), cur), BODY, Element.ALIGN_RIGHT, bg));
                Font balFont = new Font(BODY_BOLD);
                balFont.setColor(m.balance().signum() < 0 ? DANGER : SUCCESS);
                t.addCell(cell(Money.format(m.balance(), cur), balFont, Element.ALIGN_RIGHT, bg));
                t.addCell(cell(m.income().signum() == 0 ? "-" : "%.0f%%".formatted(m.savingsRate()), BODY, Element.ALIGN_RIGHT, bg));
                zebra = !zebra;
            }
            var totalLabel = cell("TOTAL", BODY_BOLD, Element.ALIGN_LEFT, PRIMARY_LIGHT);
            t.addCell(totalLabel);
            t.addCell(cell(Money.format(y.totalIncome(), cur), BODY_BOLD, Element.ALIGN_RIGHT, PRIMARY_LIGHT));
            t.addCell(cell(Money.format(y.totalExpenses(), cur), BODY_BOLD, Element.ALIGN_RIGHT, PRIMARY_LIGHT));
            t.addCell(cell(Money.format(y.balance(), cur), BODY_BOLD, Element.ALIGN_RIGHT, PRIMARY_LIGHT));
            t.addCell(cell("%.0f%%".formatted(y.savingsRate()), BODY_BOLD, Element.ALIGN_RIGHT, PRIMARY_LIGHT));
            doc.add(t);

            doc.newPage();
            doc.add(section("Spending by category (whole year)"));
            if (y.byCategory().isEmpty()) {
                doc.add(new Paragraph("No expenses recorded this year.", BODY));
            } else {
                PdfPTable c = table(new float[]{3, 1.8f, 0.9f, 3}, "Category", "Amount", "Share", "");
                boolean z = false;
                for (CategorySpend cs : y.byCategory()) {
                    Color bg = z ? ZEBRA : null;
                    c.addCell(cell(cs.name() + (cs.essential() ? "  (essential)" : ""), BODY, Element.ALIGN_LEFT, bg));
                    c.addCell(cell(Money.format(cs.amount(), cur), BODY_BOLD, Element.ALIGN_RIGHT, bg));
                    c.addCell(cell("%.1f%%".formatted(cs.percent()), BODY, Element.ALIGN_RIGHT, bg));
                    c.addCell(barCell(cs.percent(), parseColor(cs.color()), bg));
                    z = !z;
                }
                doc.add(c);
            }

            doc.add(section("AI advisor: your year in review & suggestions"));
            adviceBox(doc, advice);

            // Per-month details
            List<MonthLine> active = y.months().stream().filter(m -> m.expenses().signum() > 0).toList();
            if (!active.isEmpty()) {
                doc.newPage();
                doc.add(section("Monthly details"));
                for (MonthLine m : active) {
                    MonthSummary ms = summaryService.month(userId, m.month());
                    Paragraph title = new Paragraph(monthName(m.month()) + "  ·  spent " + Money.format(m.expenses(), cur)
                            + "  ·  " + ms.expenses().size() + " transactions", H3);
                    title.setSpacingBefore(6);
                    title.setSpacingAfter(4);
                    doc.add(title);
                    PdfPTable d = table(new float[]{3, 1.8f, 0.9f, 3}, "Category", "Amount", "Share", "");
                    for (CategorySpend cs : ms.byCategory()) {
                        d.addCell(cell(cs.name(), BODY, Element.ALIGN_LEFT, null));
                        d.addCell(cell(Money.format(cs.amount(), cur), BODY, Element.ALIGN_RIGHT, null));
                        d.addCell(cell("%.1f%%".formatted(cs.percent()), BODY, Element.ALIGN_RIGHT, null));
                        d.addCell(barCell(cs.percent(), parseColor(cs.color()), null));
                    }
                    d.setKeepTogether(true);
                    doc.add(d);
                }
            }
        });
    }

    public boolean hasExpenses(Long userId, LocalDate from, LocalDate to) {
        return expenseRepository.sumForUser(userId, from, to).compareTo(BigDecimal.ZERO) > 0;
    }

    // ------------------------------------------------------------------

    @FunctionalInterface
    private interface DocWriter {
        void write(Document doc) throws DocumentException;
    }

    private byte[] render(String title, DocWriter writer) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 36, 36, 36, 50);
        PdfWriter pdf = PdfWriter.getInstance(doc, out);
        pdf.setPageEvent(new Footer("Money Monitor · " + title.replace("Money Monitor - ", "")));
        doc.addTitle(title);
        doc.addCreator("Money Monitor");
        doc.open();
        try {
            writer.write(doc);
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not build PDF", e);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }

    private static void adviceBox(Document doc, String advice) throws DocumentException {
        PdfPTable box = new PdfPTable(1);
        box.setWidthPercentage(100);
        var c = new com.lowagie.text.pdf.PdfPCell();
        c.setBackgroundColor(PRIMARY_LIGHT);
        c.setBorderColor(PRIMARY_LIGHT);
        c.setBorderWidthLeft(3);
        c.setBorderColorLeft(PRIMARY);
        c.setPadding(12);
        for (Element e : markdown(advice)) {
            c.addElement(e);
        }
        Paragraph disclaimer = new Paragraph("These suggestions are generated automatically from your data and are not professional financial advice.", SMALL);
        disclaimer.setSpacingBefore(6);
        c.addElement(disclaimer);
        box.addCell(c);
        box.setSpacingAfter(12);
        doc.add(box);
    }

    private static String monthName(YearMonth m) {
        return m.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
    }

    private static String pretty(String enumName) {
        String s = enumName.replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String compact(double v) {
        if (v >= 1_000_000) return "%.1fM".formatted(v / 1_000_000);
        if (v >= 1_000) return "%.1fk".formatted(v / 1_000);
        return "%.0f".formatted(v);
    }

    private static Color parseColor(String hex) {
        try {
            return Color.decode(hex);
        } catch (Exception e) {
            return PRIMARY;
        }
    }
}
