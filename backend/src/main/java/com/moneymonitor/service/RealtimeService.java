package com.moneymonitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Pushes events to connected browsers over STOMP. */
@Service
@RequiredArgsConstructor
public class RealtimeService {

    public enum EventType {
        EXPENSES_CHANGED, INCOMES_CHANGED, BUDGETS_CHANGED, CATEGORIES_CHANGED, PROFILE_CHANGED, GOALS_CHANGED,
        NOTIFICATION, ACCOUNT_DISABLED, ADMIN_ACTIVITY
    }

    public record RealtimeEvent(EventType type, Object payload) {}

    private final SimpMessagingTemplate messaging;

    /** The STOMP user name is the account email (Principal#getName of the authenticated token). */
    public void toUser(String email, EventType type, Object payload) {
        afterCommit(() -> messaging.convertAndSendToUser(email, "/queue/events", new RealtimeEvent(type, payload)));
    }

    public void toAdmins(String message) {
        afterCommit(() -> messaging.convertAndSend("/topic/admin", new RealtimeEvent(EventType.ADMIN_ACTIVITY, message)));
    }

    /** Only notify clients once the data is actually committed, so a refresh sees the new state. */
    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
