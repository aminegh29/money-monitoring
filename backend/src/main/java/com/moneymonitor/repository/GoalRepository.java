package com.moneymonitor.repository;

import com.moneymonitor.domain.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByUserIdOrderByDeadlineAscIdAsc(Long userId);

    Optional<Goal> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("delete from Goal g where g.user.id = :userId")
    void deleteByUserId(Long userId);
}
