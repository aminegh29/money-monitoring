package com.moneymonitor.controller;

import com.moneymonitor.report.ReportService;
import com.moneymonitor.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/monthly")
    public ResponseEntity<byte[]> monthly(@AuthenticationPrincipal UserPrincipal me, @RequestParam(required = false) String month) {
        YearMonth m = Periods.month(month);
        return pdf(reportService.monthly(me.id(), m), "money-monitor-" + m + ".pdf");
    }

    @GetMapping("/yearly")
    public ResponseEntity<byte[]> yearly(@AuthenticationPrincipal UserPrincipal me, @RequestParam(required = false) Integer year) {
        int y = Periods.year(year);
        return pdf(reportService.yearly(me.id(), y), "money-monitor-" + y + "-annual.pdf");
    }

    private static ResponseEntity<byte[]> pdf(byte[] bytes, String filename) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(bytes);
    }
}
