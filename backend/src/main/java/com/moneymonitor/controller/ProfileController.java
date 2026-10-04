package com.moneymonitor.controller;

import com.moneymonitor.dto.AuthDtos.*;
import com.moneymonitor.security.UserPrincipal;
import com.moneymonitor.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final AuthService authService;

    @GetMapping
    public UserDto get(@AuthenticationPrincipal UserPrincipal me) {
        return authService.me(me.id());
    }

    @PutMapping
    public UserDto update(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody UpdateProfileRequest req) {
        return authService.updateProfile(me.id(), req);
    }

    /** Switches the UI/AI language without re-sending the whole profile. */
    @PutMapping("/language")
    public UserDto language(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody LanguageRequest req) {
        return authService.setLanguage(me.id(), req.language());
    }

    /** Deletes the signed-in user's account and all their data (password required). */
    @PostMapping("/delete")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody DeleteAccountRequest req) {
        authService.deleteOwnAccount(me.id(), req);
    }

    @PostMapping("/password")
    public MessageResponse changePassword(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(me.id(), req);
        return new MessageResponse("Password updated");
    }
}
