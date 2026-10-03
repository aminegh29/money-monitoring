package com.moneymonitor.repository;

import com.moneymonitor.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop30ByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    long countByUserIdAndReadFalse(Long userId);

    boolean existsByUserIdAndTitle(Long userId, String title);

    @Modifying
    @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    void markAllRead(Long userId);

    @Modifying
    @Query("delete from Notification n where n.user.id = :userId")
    void deleteByUserId(Long userId);
}
