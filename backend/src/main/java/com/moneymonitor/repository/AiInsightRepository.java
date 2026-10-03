package com.moneymonitor.repository;

import com.moneymonitor.domain.AiInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.Optional;

public interface AiInsightRepository extends JpaRepository<AiInsight, Long> {

    Optional<AiInsight> findByUserIdAndKindAndPeriodKeyAndLang(Long userId, String kind, String periodKey, String lang);

    /** Drops cached texts of one kind for the given periods, in every language. */
    @Modifying
    @Query("delete from AiInsight a where a.user.id = :userId and a.kind = :kind and a.periodKey in :keys")
    void deleteFor(Long userId, String kind, Collection<String> keys);

    /** Drops every cached text of the given kinds, e.g. all savings and goal plans after new spending. */
    @Modifying
    @Query("delete from AiInsight a where a.user.id = :userId and a.kind in :kinds")
    void deleteKinds(Long userId, Collection<String> kinds);

    @Modifying
    @Query("delete from AiInsight a where a.user.id = :userId")
    void deleteByUserId(Long userId);
}
