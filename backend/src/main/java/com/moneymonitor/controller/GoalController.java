package com.moneymonitor.controller;

import com.moneymonitor.dto.GoalDtos.*;
import com.moneymonitor.security.UserPrincipal;
import com.moneymonitor.service.GoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Savings goals of the signed-in user and the deposits made towards them. */
@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    public List<GoalDto> list(@AuthenticationPrincipal UserPrincipal me) {
        return goalService.list(me.id());
    }

    @GetMapping("/{id}")
    public GoalDto get(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return goalService.get(me.id(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GoalDto create(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody GoalRequest req) {
        return goalService.create(me.id(), req);
    }

    @PutMapping("/{id}")
    public GoalDto update(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody GoalRequest req) {
        return goalService.update(me.id(), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        goalService.delete(me.id(), id);
    }

    @GetMapping("/{id}/deposits")
    public List<DepositDto> deposits(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        return goalService.deposits(me.id(), id);
    }

    @PostMapping("/{id}/deposits")
    @ResponseStatus(HttpStatus.CREATED)
    public GoalDto addDeposit(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody DepositRequest req) {
        return goalService.addDeposit(me.id(), id, req);
    }

    @DeleteMapping("/{id}/deposits/{depositId}")
    public GoalDto deleteDeposit(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @PathVariable Long depositId) {
        return goalService.deleteDeposit(me.id(), id, depositId);
    }
}
