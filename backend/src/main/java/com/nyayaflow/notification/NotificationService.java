package com.nyayaflow.notification;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

import com.nyayaflow.common.ApiException;
import com.nyayaflow.common.PageResponse;
import com.nyayaflow.common.Texts;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Database-backed in-app notifications. Notifications are written in the same transaction as the
 * change that caused them, so users are never told about something that was rolled back.
 */
@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final Clock clock;

    public NotificationService(NotificationRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /**
     * Sends one notification to each recipient, skipping duplicates and the user who caused the
     * event (people do not need to be told about their own actions).
     */
    @Transactional
    public void notify(Collection<Long> recipientIds, Long actorId, NotificationType type, String title,
                       String message, Long caseId) {
        Set<Long> recipients = new LinkedHashSet<>(recipientIds);
        recipients.remove(null);
        if (actorId != null) {
            recipients.remove(actorId);
        }
        Instant now = clock.instant();
        for (Long recipientId : recipients) {
            repository.save(build(recipientId, type, title, message, caseId, now));
        }
    }

    /** Used by the demo seeder to create historical notifications. */
    @Transactional
    public void createAt(Long recipientId, NotificationType type, String title, String message, Long caseId,
                         Instant createdAt, boolean read) {
        Notification notification = build(recipientId, type, title, message, caseId, createdAt);
        if (read) {
            notification.setReadAt(createdAt.plusSeconds(3600));
        }
        repository.save(notification);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(Long userId, boolean unreadOnly, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        var result = unreadOnly
                ? repository.findByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : repository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.of(result, NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByRecipientIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification notification = repository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> ApiException.notFound("Notification", notificationId));
        if (notification.getReadAt() == null) {
            notification.setReadAt(clock.instant());
        }
    }

    @Transactional
    public int markAllRead(Long userId) {
        return repository.markAllRead(userId, clock.instant());
    }

    private static Notification build(Long recipientId, NotificationType type, String title, String message,
                                      Long caseId, Instant createdAt) {
        Notification notification = new Notification();
        notification.setRecipientId(Objects.requireNonNull(recipientId));
        notification.setType(type);
        notification.setTitle(Texts.truncate(title, 200));
        notification.setMessage(Texts.truncate(message, 1000));
        notification.setCaseId(caseId);
        notification.setCreatedAt(createdAt);
        return notification;
    }
}
