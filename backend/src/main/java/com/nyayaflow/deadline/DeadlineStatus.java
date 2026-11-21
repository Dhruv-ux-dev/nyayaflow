package com.nyayaflow.deadline;

/** Stored status. "Overdue" is derived (pending and past due), so it never needs a batch job to stay correct. */
public enum DeadlineStatus {
    PENDING,
    COMPLETED
}
