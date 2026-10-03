package com.moneymonitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends emails when SMTP is configured (MAIL_HOST etc.). Otherwise the message is printed to the
 * console, which is handy for local development: copy the reset link from the backend logs.
 */
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String host;
    private final String from;

    public MailService(ObjectProvider<JavaMailSender> mailSender,
                       @Value("${spring.mail.host:}") String host,
                       @Value("${spring.mail.username:}") String from) {
        this.mailSender = mailSender;
        this.host = host;
        this.from = from;
    }

    @Async
    public void send(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || host == null || host.isBlank()) {
            log.info("""

                    ================= EMAIL (SMTP not configured, printed instead) =================
                    To:      {}
                    Subject: {}

                    {}
                    ================================================================================
                    """, to, subject, body);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (from != null && !from.isBlank()) {
                message.setFrom(from);
            }
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
        } catch (Exception e) {
            log.error("Could not send email to {}: {}", to, e.getMessage());
        }
    }
}
