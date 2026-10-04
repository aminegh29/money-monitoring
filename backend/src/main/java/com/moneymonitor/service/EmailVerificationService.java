package com.moneymonitor.service;

import com.moneymonitor.domain.EmailVerification;
import com.moneymonitor.domain.User;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.i18n.Lang;
import com.moneymonitor.repository.EmailVerificationRepository;
import com.moneymonitor.repository.PasswordResetTokenRepository;
import com.moneymonitor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/** 6-digit email codes that new accounts must confirm before they can sign in. */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration VALIDITY = Duration.ofMinutes(15);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    /** Accounts that never confirm their email are removed after this long (frees the address, limits spam). */
    private static final Duration UNVERIFIED_LIFETIME = Duration.ofDays(3);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationRepository repository;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final MailService mail;
    private final EmailTemplates templates;

    /** Creates a new code (replacing any previous one) and emails it. */
    @Transactional
    public void sendCode(User user) {
        String code = "%06d".formatted(RANDOM.nextInt(1_000_000));
        EmailVerification v = repository.findByUserId(user.getId()).orElseGet(EmailVerification::new);
        v.setUser(user);
        v.setCodeHash(hash(user.getId(), code));
        v.setExpiresAt(Instant.now().plus(VALIDITY));
        v.setAttempts(0);
        v.setSentAt(Instant.now());
        repository.save(v);
        var email = templates.verificationCode(Lang.of(user.getLanguage()), user.getFullName(), code);
        mail.send(user.getEmail(), email.subject(), email.text(), email.html());
    }

    /** Sends a new code unless one was sent less than a minute ago. Returns true if an email went out. */
    @Transactional
    public boolean resendIfAllowed(User user) {
        boolean recent = repository.findByUserId(user.getId())
                .map(v -> v.getSentAt().isAfter(Instant.now().minus(RESEND_COOLDOWN)))
                .orElse(false);
        if (recent) return false;
        sendCode(user);
        return true;
    }

    /** Checks the code; on success the account is verified and the code deleted. */
    @Transactional(noRollbackFor = ApiException.class) // keep the failed-attempt count
    public void verify(User user, String code) {
        EmailVerification v = repository.findByUserId(user.getId()).orElseThrow(EmailVerificationService::invalidCode);
        if (v.getAttempts() >= MAX_ATTEMPTS || v.getExpiresAt().isBefore(Instant.now())) throw invalidCode();
        byte[] expected = v.getCodeHash().getBytes(StandardCharsets.UTF_8);
        byte[] actual = hash(user.getId(), code.trim()).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            v.setAttempts(v.getAttempts() + 1);
            throw invalidCode();
        }
        repository.delete(v);
        user.setEmailVerified(true);
    }

    public static ApiException invalidCode() {
        return new ApiException(HttpStatus.BAD_REQUEST, "This code is invalid or has expired. Request a new one.", "INVALID_CODE");
    }

    private static String hash(Long userId, String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((userId + ":" + code).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    public void removeAbandonedAccounts() {
        for (User u : userRepository.findByEmailVerifiedFalseAndCreatedAtBefore(Instant.now().minus(UNVERIFIED_LIFETIME))) {
            repository.deleteByUserId(u.getId());
            tokenRepository.deleteByUserId(u.getId());
            userRepository.delete(u);
            log.info("Removed unverified account {}", u.getEmail());
        }
    }
}
