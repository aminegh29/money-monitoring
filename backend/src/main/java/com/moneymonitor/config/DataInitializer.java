package com.moneymonitor.config;

import com.moneymonitor.domain.*;
import com.moneymonitor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Seeds default categories and the admin account. A demo user with sample data is only created when SEED_DEMO=true
 * (off by default: there are no demo accounts on the real site).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;
    private final BudgetRepository budgetRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;

    @Value("${app.seed-demo:false}")
    private boolean seedDemo;

    private record Default(String name, String icon, String color, boolean essential) {}

    private static final List<Default> DEFAULT_CATEGORIES = List.of(
            new Default("Housing", "🏠", "#6366f1", true),
            new Default("Groceries", "🛒", "#10b981", true),
            new Default("Transport", "🚗", "#f59e0b", true),
            new Default("Bills & Utilities", "💡", "#0ea5e9", true),
            new Default("Health", "💊", "#ef4444", true),
            new Default("Education", "📚", "#8b5cf6", true),
            new Default("Restaurants & Cafés", "🍔", "#f97316", false),
            new Default("Shopping", "🛍️", "#ec4899", false),
            new Default("Entertainment", "🎬", "#a855f7", false),
            new Default("Subscriptions", "📱", "#14b8a6", false),
            new Default("Travel", "✈️", "#06b6d4", false),
            new Default("Gifts & Donations", "🎁", "#e11d48", false),
            new Default("Personal Care", "💇", "#d946ef", false),
            new Default("Other", "📦", "#64748b", false));

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (categoryRepository.countByOwnerIsNull() == 0) {
            DEFAULT_CATEGORIES.forEach(d -> categoryRepository.save(Category.builder()
                    .name(d.name()).icon(d.icon()).color(d.color()).essential(d.essential()).build()));
            log.info("Seeded {} default categories", DEFAULT_CATEGORIES.size());
        }

        String adminEmail = props.admin().email().toLowerCase();
        if (!userRepository.existsByEmailIgnoreCase(adminEmail)) {
            userRepository.save(User.builder()
                    .fullName("Administrator")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(props.admin().password()))
                    .role(Role.ADMIN)
                    .emailVerified(true)
                    .build());
            log.info("Created admin account: {}", adminEmail); // never log the password
        }

        if (seedDemo && !userRepository.existsByEmailIgnoreCase("demo@moneymonitor.local")) {
            seedDemoUser();
        }
    }

    private void seedDemoUser() {
        User demo = userRepository.save(User.builder()
                .fullName("Demo User")
                .email("demo@moneymonitor.local")
                .password(passwordEncoder.encode("Demo@123"))
                .role(Role.USER)
                .currency("MAD")
                .monthlyIncome(new BigDecimal("14500"))
                .savingsGoal(new BigDecimal("2500"))
                .emailVerified(true)
                .build());

        Map<String, Category> cats = categoryRepository.findByOwnerIsNull().stream()
                .collect(Collectors.toMap(Category::getName, c -> c));
        Random rnd = new Random(42);
        YearMonth now = YearMonth.now();
        LocalDate today = LocalDate.now();

        // Seed from January of the current year (at least 6 months) so yearly reports have content.
        YearMonth start = YearMonth.of(now.getYear(), 1);
        if (start.isAfter(now.minusMonths(5))) start = now.minusMonths(5);

        for (YearMonth m = start; !m.isAfter(now); m = m.plusMonths(1)) {
            int lastDay = m.equals(now) ? today.getDayOfMonth() : m.lengthOfMonth();
            incomeRepository.save(Income.builder().user(demo).source("Salary").amount(new BigDecimal("14500"))
                    .date(m.atDay(1)).build());
            if (rnd.nextInt(3) == 0) {
                incomeRepository.save(Income.builder().user(demo).source("Freelance project")
                        .amount(BigDecimal.valueOf(800 + rnd.nextInt(1500))).date(m.atDay(Math.min(15, lastDay))).build());
            }

            add(demo, cats.get("Housing"), "Rent", 4000, m.atDay(1), PaymentMethod.BANK_TRANSFER);
            if (lastDay >= 5) add(demo, cats.get("Bills & Utilities"), "Electricity & water", 350 + rnd.nextInt(150), m.atDay(5), PaymentMethod.BANK_TRANSFER);
            if (lastDay >= 6) add(demo, cats.get("Bills & Utilities"), "Internet & phone", 249, m.atDay(6), PaymentMethod.CARD);
            if (lastDay >= 3) add(demo, cats.get("Subscriptions"), "Netflix", 65, m.atDay(3), PaymentMethod.CARD);
            if (lastDay >= 3) add(demo, cats.get("Subscriptions"), "Spotify", 50, m.atDay(3), PaymentMethod.CARD);
            if (lastDay >= 10) add(demo, cats.get("Subscriptions"), "Gym membership", 300, m.atDay(10), PaymentMethod.CARD);

            String[] groceries = {"Supermarket", "Local market", "Bakery", "Butcher"};
            String[] food = {"Lunch with colleagues", "Coffee", "Pizza night", "Burger", "Sushi dinner", "Café"};
            String[] transport = {"Fuel", "Taxi", "Tram card", "Parking"};
            String[] fun = {"Cinema", "Concert tickets", "Bowling", "Video game"};
            String[] shop = {"Clothes", "Shoes", "Electronics accessory", "Home decor"};

            for (int d = 1; d <= lastDay; d++) {
                LocalDate date = m.atDay(d);
                if (rnd.nextInt(100) < 28) add(demo, cats.get("Groceries"), pick(rnd, groceries), 80 + rnd.nextInt(320), date, PaymentMethod.CARD);
                if (rnd.nextInt(100) < 30) add(demo, cats.get("Restaurants & Cafés"), pick(rnd, food), 25 + rnd.nextInt(180), date, rnd.nextBoolean() ? PaymentMethod.CASH : PaymentMethod.CARD);
                if (rnd.nextInt(100) < 30) add(demo, cats.get("Transport"), pick(rnd, transport), 20 + rnd.nextInt(280), date, PaymentMethod.CASH);
                if (rnd.nextInt(100) < 8) add(demo, cats.get("Entertainment"), pick(rnd, fun), 60 + rnd.nextInt(300), date, PaymentMethod.CARD);
                if (rnd.nextInt(100) < 7) add(demo, cats.get("Shopping"), pick(rnd, shop), 150 + rnd.nextInt(700), date, PaymentMethod.CARD);
                if (rnd.nextInt(100) < 3) add(demo, cats.get("Health"), "Pharmacy", 50 + rnd.nextInt(250), date, PaymentMethod.CASH);
                if (rnd.nextInt(100) < 2) add(demo, cats.get("Personal Care"), "Hairdresser", 80 + rnd.nextInt(80), date, PaymentMethod.CASH);
            }
            if (m.getMonthValue() == 7 || m.getMonthValue() == 8) {
                add(demo, cats.get("Travel"), "Summer holiday", 2500 + rnd.nextInt(1500), m.atDay(Math.min(20, lastDay)), PaymentMethod.CARD);
            }

            budget(demo, null, m, 11500);
            budget(demo, cats.get("Groceries"), m, 1800);
            budget(demo, cats.get("Restaurants & Cafés"), m, 1000);
            budget(demo, cats.get("Shopping"), m, 800);
            budget(demo, cats.get("Transport"), m, 900);
        }
        log.info("Created demo account: demo@moneymonitor.local / Demo@123 (with sample data)");
    }

    private void add(User user, Category c, String desc, int amount, LocalDate date, PaymentMethod method) {
        expenseRepository.save(Expense.builder().user(user).category(c).description(desc)
                .amount(BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP)).date(date).paymentMethod(method).build());
    }

    private void budget(User user, Category c, YearMonth m, int limit) {
        budgetRepository.save(Budget.builder().user(user).category(c).period(m.toString())
                .limitAmount(BigDecimal.valueOf(limit)).build());
    }

    private static String pick(Random rnd, String[] values) {
        return values[rnd.nextInt(values.length)];
    }
}
