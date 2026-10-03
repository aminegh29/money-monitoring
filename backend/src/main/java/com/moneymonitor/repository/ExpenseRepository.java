package com.moneymonitor.repository;

import com.moneymonitor.domain.Expense;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    /** Loads the categories in the same query instead of one extra select per category. */
    @EntityGraph(attributePaths = "category")
    List<Expense> findByUserIdAndDateBetweenOrderByDateDescIdDesc(Long userId, LocalDate from, LocalDate to);

    /** Rows of [year, month, sum(amount)] for each month with expenses in the range. */
    @Query("select year(e.date), month(e.date), sum(e.amount) from Expense e where e.user.id = :userId and e.date between :from and :to group by year(e.date), month(e.date)")
    List<Object[]> monthlyTotals(Long userId, LocalDate from, LocalDate to);

    /** Rows of [categoryId, sum(amount)] for the range. */
    @Query("select e.category.id, sum(e.amount) from Expense e where e.user.id = :userId and e.date between :from and :to group by e.category.id")
    List<Object[]> categoryTotals(Long userId, LocalDate from, LocalDate to);

    List<Expense> findTop5ByUserIdOrderByDateDescIdDesc(Long userId);

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.user.id = :userId and e.date between :from and :to")
    BigDecimal sumForUser(Long userId, LocalDate from, LocalDate to);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.user.id = :userId and e.category.id = :categoryId and e.date between :from and :to")
    BigDecimal sumForUserAndCategory(Long userId, Long categoryId, LocalDate from, LocalDate to);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.date between :from and :to")
    BigDecimal sumAll(LocalDate from, LocalDate to);

    @Query("select count(e) from Expense e where e.date between :from and :to")
    long countAll(LocalDate from, LocalDate to);

    long countByUserId(Long userId);

    /** Rows of [userId, count] for the admin user list. */
    @Query("select e.user.id, count(e) from Expense e group by e.user.id")
    List<Object[]> countsByUser();

    boolean existsByCategoryId(Long categoryId);

    @Modifying
    @Query("delete from Expense e where e.user.id = :userId")
    void deleteByUserId(Long userId);
}
