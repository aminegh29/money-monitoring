package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** A savings objective, e.g. "save 5,000 by next August". */
@Entity
@Table(name = "goals", indexes = @Index(name = "idx_goal_user", columnList = "user_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 8)
    private String icon;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal targetAmount;

    /** Money already set aside for this goal when it was created. */
    @Builder.Default
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal initialAmount = BigDecimal.ZERO;

    /** Automatic progress counts savings from this date's month on. */
    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate deadline;

    @Builder.Default
    private Instant createdAt = Instant.now();

    /** Set the first time the goal is reached (a notification is sent then). */
    private Instant completedAt;
}
