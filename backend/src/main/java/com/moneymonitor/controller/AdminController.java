package com.moneymonitor.controller;

import com.moneymonitor.dto.AdminDtos.*;
import com.moneymonitor.security.UserPrincipal;
import com.moneymonitor.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<AdminUserDto> users() {
        return adminService.users();
    }

    @PatchMapping("/users/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setStatus(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @RequestBody StatusRequest req) {
        adminService.setEnabled(me.id(), id, req.enabled());
    }

    @PatchMapping("/users/{id}/role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setRole(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id, @Valid @RequestBody RoleRequest req) {
        adminService.setRole(me.id(), id, req.role());
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal me, @PathVariable Long id) {
        adminService.delete(me.id(), id);
    }
}
