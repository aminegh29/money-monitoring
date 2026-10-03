package com.moneymonitor.controller;

import com.moneymonitor.exception.ApiException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;

final class Periods {

    private Periods() {}

    /** Parses "2026-09"; defaults to the current month. */
    static YearMonth month(String value) {
        if (value == null || value.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Month must look like 2026-09");
        }
    }

    static int year(Integer value) {
        int year = value == null ? YearMonth.now().getYear() : value;
        if (year < 2000 || year > 2100) {
            throw ApiException.badRequest("Invalid year");
        }
        return year;
    }
}
