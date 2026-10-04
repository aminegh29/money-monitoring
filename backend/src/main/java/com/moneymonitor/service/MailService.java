package com.moneymonitor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Sends emails, in order of preference:
 * 1. Brevo's HTTP API (BREVO_API_KEY): works on hosts that block SMTP ports, such as Render's free plan.
 * 2. SMTP (MAIL_HOST…).
 * 3. Nothing configured: the email is printed to the console, handy for local development (codes, reset links).
 */
@Slf4j
@Service
public class MailService {

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final ObjectProvider<JavaMailSender> mailSender;
    private final ObjectMapper mapper;
    private final RestClient http = RestClient.create();
    private final String smtpHost;
    private final String brevoApiKey;
    private final String from;
    private final String fromName;

    public MailService(ObjectProvider<JavaMailSender> mailSender, ObjectMapper mapper,
                       @Value("${spring.mail.host:}") String smtpHost,
                       @Value("${spring.mail.username:}") String smtpUser,
                       @Value("${app.mail.brevo-api-key:}") String brevoApiKey,
                       @Value("${app.mail.from:}") String from,
                       @Value("${app.mail.from-name:Money Monitor}") String fromName) {
        this.mailSender = mailSender;
        this.mapper = mapper;
        this.smtpHost = smtpHost;
        this.brevoApiKey = brevoApiKey;
        this.from = from == null || from.isBlank() ? smtpUser : from;
        this.fromName = fromName;
        if (notBlank(brevoApiKey)) log.info("Emails are sent with Brevo from {}", this.from);
        else if (notBlank(smtpHost)) log.info("Emails are sent with SMTP ({})", smtpHost);
        else log.info("No email provider configured: emails are printed to the console");
    }

    /** True when emails really leave the server (not just printed). */
    public boolean isConfigured() {
        return notBlank(brevoApiKey) || notBlank(smtpHost);
    }

    /** Sends a message with an HTML version and a plain-text fallback. Never throws: failures are logged. */
    @Async
    public void send(String to, String subject, String text, String html) {
        if (to == null || to.endsWith(".local")) {
            // Placeholder addresses (the default admin account) can't receive mail; sending would only hurt deliverability.
            log.info("Email to {} skipped (not a real mailbox): {}", to, subject);
            return;
        }
        try {
            if (notBlank(brevoApiKey)) {
                sendWithBrevo(to, subject, text, html);
            } else if (notBlank(smtpHost) && mailSender.getIfAvailable() != null) {
                sendWithSmtp(to, subject, text, html);
            } else {
                log.info("""

                        ================= EMAIL (no email provider configured, printed instead) =================
                        To:      {}
                        Subject: {}

                        {}
                        =========================================================================================
                        """, to, subject, text);
            }
        } catch (Exception e) {
            log.error("Could not send email to {}: {}", to, e.getMessage());
        }
    }

    private void sendWithBrevo(String to, String subject, String text, String html) throws Exception {
        Map<String, Object> body = Map.of(
                "sender", Map.of("name", fromName, "email", from),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html,
                "textContent", text);
        http.post().uri(BREVO_URL)
                .header("api-key", brevoApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(mapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8))
                .retrieve()
                .toBodilessEntity();
        log.info("Email sent to {}: {}", to, subject);
    }

    private void sendWithSmtp(String to, String subject, String text, String html) throws Exception {
        JavaMailSender sender = mailSender.getObject();
        var message = sender.createMimeMessage();
        var helper = new MimeMessageHelper(message, true, "UTF-8");
        if (notBlank(from)) helper.setFrom(from, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(text, html);
        sender.send(message);
        log.info("Email sent to {}: {}", to, subject);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
