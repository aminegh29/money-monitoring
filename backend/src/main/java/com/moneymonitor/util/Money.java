package com.moneymonitor.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

public final class Money {

    private Money() {}

    private static final DecimalFormat FORMAT = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.US));

    public static String format(BigDecimal amount, String currency) {
        synchronized (FORMAT) {
            return FORMAT.format(amount == null ? BigDecimal.ZERO : amount) + " " + currency;
        }
    }

    /** part / total * 100, rounded to one decimal; 0 when total is zero. */
    public static double percent(BigDecimal part, BigDecimal total) {
        if (total == null || total.signum() == 0 || part == null) {
            return 0;
        }
        return part.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP).doubleValue();
    }

    public static BigDecimal round(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
