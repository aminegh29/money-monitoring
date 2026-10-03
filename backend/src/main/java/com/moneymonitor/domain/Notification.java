package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    public enum Type { INFO, WARNING, SUCCESS, REPORT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String message;

    /** Optional frontend route to open when the notification is clicked. */
    private String link;

    @Builder.Default
    @Column(name = "is_read")
    private boolean read = false;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
