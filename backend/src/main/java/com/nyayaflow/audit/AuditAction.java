package com.nyayaflow.audit;

/** Auditable actions, grouped into categories for filtering the activity log. */
public enum AuditAction {
    USER_LOGIN(Category.ACCESS),
    USER_LOGIN_FAILED(Category.ACCESS),
    USER_CREATED(Category.USERS),
    USER_UPDATED(Category.USERS),
    USER_DEACTIVATED(Category.USERS),
    USER_ACTIVATED(Category.USERS),
    USER_PASSWORD_RESET(Category.USERS),
    PASSWORD_CHANGED(Category.USERS),
    PROFILE_UPDATED(Category.USERS),
    COURT_CREATED(Category.CONFIGURATION),
    COURT_UPDATED(Category.CONFIGURATION),
    COURTROOM_CREATED(Category.CONFIGURATION),
    COURTROOM_UPDATED(Category.CONFIGURATION),
    CASE_CREATED(Category.CASES),
    CASE_UPDATED(Category.CASES),
    JUDGE_ASSIGNED(Category.CASES),
    LAWYER_ADDED(Category.CASES),
    LAWYER_REMOVED(Category.CASES),
    CASE_STATUS_CHANGED(Category.CASES),
    HEARING_SCHEDULED(Category.HEARINGS),
    HEARING_RESCHEDULED(Category.HEARINGS),
    HEARING_CANCELLED(Category.HEARINGS),
    HEARING_COMPLETED(Category.HEARINGS),
    HEARING_ADJOURNED(Category.HEARINGS),
    DOCUMENT_UPLOADED(Category.DOCUMENTS),
    DOCUMENT_VERSION_ADDED(Category.DOCUMENTS),
    DOCUMENT_UPDATED(Category.DOCUMENTS),
    DOCUMENT_DELETED(Category.DOCUMENTS),
    PROCEEDING_RECORDED(Category.PROCEEDINGS),
    PROCEEDING_UPDATED(Category.PROCEEDINGS),
    ORDER_ISSUED(Category.ORDERS),
    DEADLINE_CREATED(Category.DEADLINES),
    DEADLINE_UPDATED(Category.DEADLINES),
    DEADLINE_COMPLETED(Category.DEADLINES),
    DEADLINE_REOPENED(Category.DEADLINES),
    DEADLINE_DELETED(Category.DEADLINES);

    public enum Category {
        ACCESS, USERS, CONFIGURATION, CASES, HEARINGS, DOCUMENTS, PROCEEDINGS, ORDERS, DEADLINES
    }

    private final Category category;

    AuditAction(Category category) {
        this.category = category;
    }

    public Category category() {
        return category;
    }
}
