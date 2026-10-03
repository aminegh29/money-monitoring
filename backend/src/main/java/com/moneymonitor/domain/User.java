package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Builder.Default
    private boolean enabled = true;

    @Builder.Default
    @Column(nullable = false)
    private String currency = "MAD";

    /** Expected monthly income, used by the advisor when no incomes are recorded. */
    @Builder.Default
    private BigDecimal monthlyIncome = BigDecimal.ZERO;

    /** Target amount the user wants to save each month. */
    @Builder.Default
    private BigDecimal savingsGoal = BigDecimal.ZERO;

    /** UI and AI language code (en, fr, ar, es, it). Null for accounts created before languages existed, read as English. */
    @Builder.Default
    @Column(length = 5)
    private String language = "en";

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant lastLoginAt;
}
