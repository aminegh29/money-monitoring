package com.moneymonitor.service;

import com.moneymonitor.domain.Notification;
import com.moneymonitor.domain.User;
import com.moneymonitor.dto.FinanceDtos.NotificationDto;
import com.moneymonitor.exception.ApiException;
import com.moneymonitor.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repository;
    private final RealtimeService realtime;

    @Transactional
    public void notify(User user, Notification.Type type, String title, String message, String link) {
        Notification n = repository.save(Notification.builder()
                .user(user).type(type).title(title).message(message).link(link).build());
        realtime.toUser(user.getEmail(), RealtimeService.EventType.NOTIFICATION, NotificationDto.from(n));
    }

    /** Same as notify, but skipped if the user already got a notification with this exact title. */
    @Transactional
    public void notifyOnce(User user, Notification.Type type, String title, String message, String link) {
        if (!repository.existsByUserIdAndTitle(user.getId(), title)) {
            notify(user, type, title, message, link);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(Long userId) {
        return repository.findTop30ByUserIdOrderByCreatedAtDesc(userId).stream().map(NotificationDto::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Notification"));
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(Long userId) {
        repository.markAllRead(userId);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        repository.delete(repository.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Notification")));
    }
}
