package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Money the user set aside for a goal. When a goal has deposits, they replace the automatic estimate. */
@Entity
@Table(name = "goal_deposits", indexes = @Index(name = "idx_deposit_goal", columnList = "goal_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoalDeposit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id")
    private Goal goal;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(length = 120)
    private String note;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
