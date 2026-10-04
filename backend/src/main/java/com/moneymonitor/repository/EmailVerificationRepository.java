package com.moneymonitor.repository;

import com.moneymonitor.domain.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByUserId(Long userId);

    @Modifying
    @Query("delete from EmailVerification v where v.user.id = :userId")
    void deleteByUserId(Long userId);
}
