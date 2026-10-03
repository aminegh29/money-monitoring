package com.moneymonitor.i18n;

import java.util.Locale;

/** Languages the app is translated into. The code is what clients send and what is stored on the user. */
public enum Lang {
    EN("en", "English", Locale.ENGLISH),
    FR("fr", "French", Locale.FRENCH),
    AR("ar", "Arabic", Locale.forLanguageTag("ar")),
    ES("es", "Spanish", Locale.forLanguageTag("es")),
    IT("it", "Italian", Locale.ITALIAN);

    /** Regex for request validation. */
    public static final String PATTERN = "en|fr|ar|es|it";

    private final String code;
    private final String englishName;
    private final Locale locale;

    Lang(String code, String englishName, Locale locale) {
        this.code = code;
        this.englishName = englishName;
        this.locale = locale;
    }

    public String code() {
        return code;
    }

    /** Name used in AI prompts ("Write your answer in French"). */
    public String englishName() {
        return englishName;
    }

    public Locale locale() {
        return locale;
    }

    /** Unknown or missing codes fall back to English. */
    public static Lang of(String code) {
        if (code != null) {
            for (Lang l : values()) {
                if (l.code.equalsIgnoreCase(code.trim())) return l;
            }
        }
        return EN;
    }
}
