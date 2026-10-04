package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** The pending 6-digit code of an account that hasn't confirmed its email yet (one per user). */
@Entity
@Table(name = "email_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    /** SHA-256 of the code: the code itself is never stored. */
    @Column(nullable = false, length = 64)
    private String codeHash;

    @Column(nullable = false)
    private Instant expiresAt;

    /** Wrong guesses for the current code; the code stops working after a few. */
    private int attempts;

    @Column(nullable = false)
    private Instant sentAt;
}
