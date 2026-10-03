package com.moneymonitor.repository;

import com.moneymonitor.domain.Income;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface IncomeRepository extends JpaRepository<Income, Long> {

    List<Income> findByUserIdAndDateBetweenOrderByDateDescIdDesc(Long userId, LocalDate from, LocalDate to);

    Optional<Income> findByIdAndUserId(Long id, Long userId);

    @Query("select coalesce(sum(i.amount), 0) from Income i where i.user.id = :userId and i.date between :from and :to")
    BigDecimal sumForUser(Long userId, LocalDate from, LocalDate to);

    /** Rows of [year, month, sum(amount)] for each month with income in the range. */
    @Query("select year(i.date), month(i.date), sum(i.amount) from Income i where i.user.id = :userId and i.date between :from and :to group by year(i.date), month(i.date)")
    List<Object[]> monthlyTotals(Long userId, LocalDate from, LocalDate to);

    @Modifying
    @Query("delete from Income i where i.user.id = :userId")
    void deleteByUserId(Long userId);
}
