package com.nyayaflow.deadline;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Sends "deadline approaching" notifications every morning, and once at start-up. */
@Component
public class DeadlineReminderJob {

    private static final Logger log = LoggerFactory.getLogger(DeadlineReminderJob.class);

    private final DeadlineService deadlineService;

    public DeadlineReminderJob(DeadlineService deadlineService) {
        this.deadlineService = deadlineService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        run();
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "${nyayaflow.timezone}")
    public void run() {
        int sent = deadlineService.sendReminders();
        if (sent > 0) {
            log.info("Sent reminders for {} upcoming deadline(s)", sent);
        }
    }
}
