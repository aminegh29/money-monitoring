package com.moneymonitor.controller;

import com.moneymonitor.ai.AiAdvisorService;
import com.moneymonitor.dto.FinanceDtos.*;
import com.moneymonitor.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiAdvisorService advisorService;

    @GetMapping("/status")
    public AiStatusDto status() {
        return advisorService.status();
    }

    @GetMapping("/advice/monthly")
    public AdviceDto monthly(@AuthenticationPrincipal UserPrincipal me,
                             @RequestParam(required = false) String month,
                             @RequestParam(defaultValue = "false") boolean refresh) {
        return advisorService.monthly(me.id(), Periods.month(month), refresh);
    }

    @GetMapping("/advice/yearly")
    public AdviceDto yearly(@AuthenticationPrincipal UserPrincipal me,
                            @RequestParam(required = false) Integer year,
                            @RequestParam(defaultValue = "false") boolean refresh) {
        return advisorService.yearly(me.id(), Periods.year(year), refresh);
    }

    /** Plan to reach the monthly savings goal from the profile. */
    @GetMapping("/advice/savings")
    public AdviceDto savings(@AuthenticationPrincipal UserPrincipal me, @RequestParam(defaultValue = "false") boolean refresh) {
        return advisorService.savingsPlan(me.id(), refresh);
    }

    /** Plan to reach one savings goal by its deadline. */
    @GetMapping("/goals/{id}/plan")
    public AdviceDto goalPlan(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id,
                              @RequestParam(defaultValue = "false") boolean refresh) {
        return advisorService.goalPlan(me.id(), id, refresh);
    }

    @PostMapping("/chat")
    public ChatResponse chat(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody ChatRequest req) {
        return advisorService.chat(me.id(), req);
    }
}
