package com.moneymonitor.i18n;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.time.format.TextStyle;
import java.util.EnumMap;
import java.util.Map;
import java.util.Properties;

/**
 * Server-side translations (offline advisor, notifications), read from i18n/messages_xx.properties.
 * Patterns use String.format placeholders; numbers are passed already formatted so every language
 * shows amounts the same way as the apps ("1,234.50 MAD").
 */
@Component
public class Texts {

    private final Map<Lang, Properties> bundles = new EnumMap<>(Lang.class);

    public Texts() {
        for (Lang lang : Lang.values()) {
            bundles.put(lang, load(lang));
        }
    }

    public String t(Lang lang, String key, Object... args) {
        String pattern = bundles.get(lang).getProperty(key);
        if (pattern == null) pattern = bundles.get(Lang.EN).getProperty(key, key);
        return String.format(lang.locale(), pattern, args);
    }

    public String monthName(Lang lang, YearMonth month) {
        return month.getMonth().getDisplayName(TextStyle.FULL_STANDALONE, lang.locale());
    }

    public String monthYear(Lang lang, YearMonth month) {
        return monthName(lang, month) + " " + month.getYear();
    }

    public String date(Lang lang, LocalDate date) {
        return date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(lang.locale()));
    }

    private static Properties load(Lang lang) {
        Properties p = new Properties();
        try (InputStream in = Texts.class.getResourceAsStream("/i18n/messages_" + lang.code() + ".properties")) {
            if (in != null) p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return p;
    }
}
