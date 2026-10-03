package com.moneymonitor.repository;

import com.moneymonitor.domain.Role;
import com.moneymonitor.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(Role role);

    long countByEnabledTrue();

    long countByCreatedAtAfter(Instant after);

    List<User> findByEnabledTrue();

    List<User> findAllByOrderByCreatedAtDesc();
}
