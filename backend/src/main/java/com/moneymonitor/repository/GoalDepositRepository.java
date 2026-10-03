package com.moneymonitor.repository;

import com.moneymonitor.domain.GoalDeposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GoalDepositRepository extends JpaRepository<GoalDeposit, Long> {

    List<GoalDeposit> findByGoalIdOrderByDateDescIdDesc(Long goalId);

    Optional<GoalDeposit> findByIdAndGoalId(Long id, Long goalId);

    /** Rows of [goalId, sum(amount), count] for all of a user's goals, in one query. */
    @Query("select d.goal.id, coalesce(sum(d.amount), 0), count(d) from GoalDeposit d where d.goal.user.id = :userId group by d.goal.id")
    List<Object[]> totalsByGoal(Long userId);

    @Modifying
    @Query("delete from GoalDeposit d where d.goal.id = :goalId")
    void deleteByGoalId(Long goalId);

    @Modifying
    @Query("delete from GoalDeposit d where d.goal.id in (select g.id from Goal g where g.user.id = :userId)")
    void deleteByUserId(Long userId);
}
