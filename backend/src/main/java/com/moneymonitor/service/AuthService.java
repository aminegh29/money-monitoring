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
import org.springframework.beans.factory.annotation.Value;
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
    private final EmailVerificationService verifications;
    private final EmailTemplates templates;
    private final AccountDeletionService accountDeletion;

    /** Require new accounts to confirm their email (EMAIL_VERIFICATION=false turns it off, e.g. for local tests). */
    @Value("${app.email-verification:true}")
    private boolean emailVerification;

    /**
     * Creates the account. With email verification on (the default), the account stays locked until the 6-digit code
     * sent by email is confirmed: no token is returned yet.
     */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null && user.isEmailVerified()) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        if (user == null) {
            user = User.builder().email(email).role(Role.USER).build();
        }
        // An unconfirmed account can be registered again (typo in the name, lost code…): it still needs the emailed code.
        user.setFullName(req.fullName().trim());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setCurrency(req.currency() == null || req.currency().isBlank() ? "MAD" : req.currency().toUpperCase());
        user.setLanguage(Lang.of(req.language()).code());
        user.setEmailVerified(!emailVerification);
        user = userRepository.save(user);

        if (emailVerification) {
            verifications.sendCode(user);
            return new AuthResponse(null, UserDto.from(user), true);
        }
        return welcome(user);
    }

    @Transactional(noRollbackFor = ApiException.class) // keep the new code when sign-in is refused for an unconfirmed email
    public AuthResponse login(LoginRequest req) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = userRepository.findById(principal.id()).orElseThrow();
        if (!user.isEmailVerified()) {
            // Right password but email not confirmed yet: send a fresh code (at most once a minute) and tell the app.
            verifications.resendIfAllowed(user);
            throw new ApiException(HttpStatus.FORBIDDEN, "Please confirm your email first. We sent you a 6-digit code.", "EMAIL_NOT_VERIFIED");
        }
        user.setLastLoginAt(Instant.now());
        return new AuthResponse(jwtService.generateToken(principal), UserDto.from(user));
    }

    /** Confirms the email code and signs the user in. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse verifyEmail(VerifyEmailRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> !u.isEmailVerified())
                .orElseThrow(EmailVerificationService::invalidCode);
        verifications.verify(user, req.code());
        return welcome(user);
    }

    /** Always answers the same way so the endpoint can't be used to discover registered emails. */
    @Transactional
    public void resendVerification(ResendCodeRequest req) {
        userRepository.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> !u.isEmailVerified())
                .ifPresent(verifications::resendIfAllowed);
    }

    /** First sign-in of a confirmed account: welcome notification (also emailed) and a session token. */
    private AuthResponse welcome(User user) {
        user.setLastLoginAt(Instant.now());
        Lang lang = Lang.of(user.getLanguage());
        notificationService.notify(user, Notification.Type.SUCCESS, texts.t(lang, "n.welcome.title"), texts.t(lang, "n.welcome.msg"),
                "/app/profile");
        realtime.toAdmins("New user registered: " + user.getFullName());
        return new AuthResponse(jwtService.generateToken(UserPrincipal.from(user)), UserDto.from(user));
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

            String link = props.frontendUrl().replaceAll("/+$", "") + "/reset-password?token=" + token;
            var mail = templates.passwordReset(Lang.of(user.getLanguage()), user.getFullName(), link, token);
            mailService.send(user.getEmail(), mail.subject(), mail.text(), mail.html());
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
        if (req.emailNotifications() != null) user.setEmailNotifications(req.emailNotifications());
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

    /** A user deletes their own account and all its data. The password is asked again to confirm. */
    @Transactional
    public void deleteOwnAccount(Long userId, DeleteAccountRequest req) {
        User user = getUser(userId);
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("Administrator accounts can't be deleted from here");
        }
        accountDeletion.delete(user);
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
