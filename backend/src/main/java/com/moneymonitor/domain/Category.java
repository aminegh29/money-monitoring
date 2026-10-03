package com.moneymonitor.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * A spending category. Categories with a null owner are global defaults shared by everyone;
 * users can add their own on top.
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Emoji shown next to the category name. */
    private String icon;

    /** Hex color used in charts. */
    private String color;

    /** true for needs (rent, groceries...), false for wants (entertainment, shopping...). */
    @Builder.Default
    private boolean essential = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;
}
