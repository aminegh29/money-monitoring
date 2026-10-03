package com.moneymonitor.repository;

import com.moneymonitor.domain.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserIdAndPeriod(Long userId, String period);

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    Optional<Budget> findByUserIdAndPeriodAndCategoryId(Long userId, String period, Long categoryId);

    Optional<Budget> findByUserIdAndPeriodAndCategoryIsNull(Long userId, String period);

    boolean existsByCategoryId(Long categoryId);

    @Modifying
    @Query("delete from Budget b where b.user.id = :userId")
    void deleteByUserId(Long userId);
}
