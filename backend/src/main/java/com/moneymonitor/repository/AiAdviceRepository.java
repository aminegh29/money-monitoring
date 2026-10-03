package com.moneymonitor.repository;

import com.moneymonitor.domain.AiAdvice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface AiAdviceRepository extends JpaRepository<AiAdvice, Long> {

    Optional<AiAdvice> findByUserIdAndPeriod(Long userId, String period);

    @Modifying
    @Query("delete from AiAdvice a where a.user.id = :userId")
    void deleteByUserId(Long userId);

    @Modifying
    @Query("delete from AiAdvice a where a.user.id = :userId and a.period in :periods")
    void deleteForPeriods(Long userId, java.util.Collection<String> periods);
}
