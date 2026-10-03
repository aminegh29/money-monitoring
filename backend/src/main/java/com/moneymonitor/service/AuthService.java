package com.moneymonitor.service;

import com.moneymonitor.config.AppProperties;
import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.PasswordResetToken;
import com.moneymonitor.domain.Role;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.AuthDtos.*;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.i18n.Texts;
import com.moneymonitor.repository.PasswordResetTokenRepository;
import com.moneymonitor.repository.UserRepository;
import com.moneymonitor.security.JwtService;
import com.moneymonitor.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration RESET_TOKEN_VALIDITY = Duration.ofMinutes(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final MailService mailService;
    private final NotificationService notificationService;
    private final RealtimeService realtime;
    private final AppProperties props;
    private final Texts texts;
    private final InsightInvalidator insights;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = userRepository.save(User.builder()
                .fullName(req.fullName().trim())
                .email(email)
                .password(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .currency(req.currency() == null || req.currency().isBlank() ? "MAD" : req.currency().toUpperCase())
                .language(Lang.of(req.language()).code())
                .lastLoginAt(Instant.now())
                .build());

        Lang lang = Lang.of(user.getLanguage());
        notificationService.notify(user, Notification.Type.SUCCESS, texts.t(lang, "n.welcome.title"), texts.t(lang, "n.welcome.msg"),
                "/app/profile");
        realtime.toAdmins("New user registered: " + user.getFullName());
        return new AuthResponse(jwtService.generateToken(UserPrincipal.from(user)), UserDto.from(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = userRepository.findById(principal.id()).orElseThrow();
        user.setLastLoginAt(Instant.now());
        return new AuthResponse(jwtService.generateToken(principal), UserDto.from(user));
    }

    /** Always answers the same way so the endpoint can't be used to discover registered emails. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        userRepository.findByEmailIgnoreCase(req.email().trim()).filter(User::isEnabled).ifPresent(user -> {
            tokenRepository.deleteByUserId(user.getId());
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            tokenRepository.save(PasswordResetToken.builder()
                    .token(token).user(user).expiresAt(Instant.now().plus(RESET_TOKEN_VALIDITY)).build());

            String link = props.frontendUrl() + "/reset-password?token=" + token;
            mailService.send(user.getEmail(), "Reset your Money Monitor password", """
                    Hi %s,

                    We received a request to reset your password. Click the link below to choose a new one:

                    %s

                    This link expires in 30 minutes. If you didn't ask for this, you can ignore this email.

                    — Money Monitor
                    """.formatted(user.getFullName(), link));
        });
    }

    @Transactional(readOnly = true)
    public boolean isResetTokenValid(String token) {
        return tokenRepository.findByToken(token)
                .filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                .isPresent();
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken token = tokenRepository.findByToken(req.token())
                .filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has expired"));
        token.setUsed(true);
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(req.password()));
        Lang lang = Lang.of(user.getLanguage());
        notificationService.notify(user, Notification.Type.INFO, texts.t(lang, "n.pwd.title"), texts.t(lang, "n.pwd.msg"), null);
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return UserDto.from(getUser(userId));
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest req) {
        User user = getUser(userId);
        user.setFullName(req.fullName().trim());
        user.setCurrency(req.currency().trim().toUpperCase());
        user.setMonthlyIncome(req.monthlyIncome());
        user.setSavingsGoal(req.savingsGoal());
        if (req.language() != null) user.setLanguage(req.language());
        insights.profileChanged(userId);
        UserDto dto = UserDto.from(user);
        realtime.toUser(user.getEmail(), RealtimeService.EventType.PROFILE_CHANGED, dto);
        return dto;
    }

    @Transactional
    public UserDto setLanguage(Long userId, String language) {
        User user = getUser(userId);
        user.setLanguage(Lang.of(language).code());
        UserDto dto = UserDto.from(user);
        realtime.toUser(user.getEmail(), RealtimeService.EventType.PROFILE_CHANGED, dto);
        return dto;
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }
}
