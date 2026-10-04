package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** Cached AI advice for a month ("2026-09") or a year ("2026"), reused by the PDF reports. */
@Entity
@Table(name = "ai_advice", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "period_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAdvice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "period_key", nullable = false, length = 7)
    private String period;

    // Plain text column: @Lob would become a PostgreSQL large object (oid), which breaks outside transactions.
    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /** Which engine produced it, e.g. "groq:llama-3.3-70b-versatile" or "rules". */
    private String source;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
