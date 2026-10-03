package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Cached AI text, per user, kind, period and language. Replaces the older ai_advice table (kept untouched),
 * whose 7-character key couldn't hold a language or a goal id.
 */
@Entity
@Table(name = "ai_insights",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "kind", "period_key", "lang"}),
        indexes = @Index(name = "idx_insight_user_kind", columnList = "user_id,kind"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiInsight {

    public static final String MONTHLY = "MONTHLY";
    public static final String YEARLY = "YEARLY";
    public static final String SAVINGS = "SAVINGS";
    public static final String GOAL = "GOAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 16)
    private String kind;

    /** "2026-10" for a month, "2026" for a year, the goal id for a goal plan. */
    @Column(name = "period_key", nullable = false, length = 40)
    private String periodKey;

    @Column(nullable = false, length = 5)
    private String lang;

    @Lob
    @Column(nullable = false)
    private String content;

    /** Which engine produced it, e.g. "groq:llama-3.3-70b-versatile" or "rules". */
    private String source;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
