package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "incomes", indexes = @Index(name = "idx_income_user_date", columnList = "user_id,date"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Income {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    /** e.g. Salary, Freelance, Gift. */
    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private LocalDate date;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
