package com.moneymonitor.repository;

import com.moneymonitor.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    /** Global defaults plus the user's own categories. */
    @Query("select c from Category c where c.owner is null or c.owner.id = :userId order by c.name")
    List<Category> findVisibleTo(Long userId);

    List<Category> findByOwnerIsNull();

    long countByOwnerIsNull();

    @Modifying
    @Query("delete from Category c where c.owner.id = :userId")
    void deleteByOwnerId(Long userId);
}
