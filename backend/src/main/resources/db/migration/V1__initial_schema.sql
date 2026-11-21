-- NyayaFlow initial schema.
-- Enumerated values are stored as text and validated by the application, which keeps
-- migrations simple when a new case type or document type is introduced.

CREATE TABLE courts (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    address     VARCHAR(300),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE courtrooms (
    id        BIGSERIAL PRIMARY KEY,
    court_id  BIGINT       NOT NULL REFERENCES courts (id),
    name      VARCHAR(100) NOT NULL,
    floor     VARCHAR(50),
    active    BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_courtroom_name UNIQUE (court_id, name)
);

CREATE TABLE users (
    id                       BIGSERIAL PRIMARY KEY,
    full_name                VARCHAR(150) NOT NULL,
    email                    VARCHAR(255) NOT NULL UNIQUE,
    password_hash            VARCHAR(255) NOT NULL,
    role                     VARCHAR(20)  NOT NULL,
    designation              VARCHAR(120),
    phone                    VARCHAR(30),
    bar_registration_number  VARCHAR(50) UNIQUE,
    court_id                 BIGINT REFERENCES courts (id),
    active                   BOOLEAN      NOT NULL DEFAULT TRUE,
    credentials_changed_at   TIMESTAMPTZ  NOT NULL,
    last_login_at            TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  NOT NULL,
    updated_at               TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_users_role ON users (role, active);

CREATE TABLE case_number_counters (
    case_type   VARCHAR(30) NOT NULL,
    year        INT         NOT NULL,
    last_value  INT         NOT NULL,
    PRIMARY KEY (case_type, year)
);

CREATE TABLE cases (
    id               BIGSERIAL PRIMARY KEY,
    case_number      VARCHAR(40)  NOT NULL UNIQUE,
    title            VARCHAR(300) NOT NULL,
    case_type        VARCHAR(30)  NOT NULL,
    description      TEXT,
    status           VARCHAR(30)  NOT NULL,
    priority         VARCHAR(20)  NOT NULL,
    filing_date      DATE         NOT NULL,
    court_id         BIGINT       NOT NULL REFERENCES courts (id),
    courtroom_id     BIGINT REFERENCES courtrooms (id),
    judge_id         BIGINT REFERENCES users (id),
    next_hearing_at  TIMESTAMP,
    disposed_on      DATE,
    closed_on        DATE,
    created_by       BIGINT REFERENCES users (id),
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    version          BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_judge ON cases (judge_id);
CREATE INDEX idx_cases_filing_date ON cases (filing_date);
CREATE INDEX idx_cases_next_hearing ON cases (next_hearing_at);

CREATE TABLE parties (
    id          BIGSERIAL PRIMARY KEY,
    case_id     BIGINT       NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    side        VARCHAR(20)  NOT NULL,
    party_type  VARCHAR(20)  NOT NULL,
    name        VARCHAR(200) NOT NULL,
    address     VARCHAR(300),
    position    INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_parties_case ON parties (case_id);

CREATE TABLE case_lawyers (
    id            BIGSERIAL PRIMARY KEY,
    case_id       BIGINT      NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    lawyer_id     BIGINT      NOT NULL REFERENCES users (id),
    side          VARCHAR(20) NOT NULL,
    lead_counsel  BOOLEAN     NOT NULL DEFAULT FALSE,
    added_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_case_lawyer UNIQUE (case_id, lawyer_id)
);

CREATE INDEX idx_case_lawyers_lawyer ON case_lawyers (lawyer_id);

CREATE TABLE case_status_changes (
    id           BIGSERIAL PRIMARY KEY,
    case_id      BIGINT      NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    from_status  VARCHAR(30),
    to_status    VARCHAR(30) NOT NULL,
    note         VARCHAR(1000),
    changed_by   BIGINT REFERENCES users (id),
    changed_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_status_changes_case ON case_status_changes (case_id, changed_at);

CREATE TABLE hearings (
    id                   BIGSERIAL PRIMARY KEY,
    case_id              BIGINT      NOT NULL REFERENCES cases (id),
    judge_id             BIGINT REFERENCES users (id),
    courtroom_id         BIGINT REFERENCES courtrooms (id),
    scheduled_at         TIMESTAMP   NOT NULL,
    duration_minutes     INT         NOT NULL,
    hearing_type         VARCHAR(40) NOT NULL,
    status               VARCHAR(20) NOT NULL,
    purpose              VARCHAR(1000),
    outcome              TEXT,
    reschedule_count     INT         NOT NULL DEFAULT 0,
    status_reason        VARCHAR(1000),
    created_by           BIGINT REFERENCES users (id),
    created_at           TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_hearings_case ON hearings (case_id, scheduled_at);
CREATE INDEX idx_hearings_schedule ON hearings (scheduled_at);
CREATE INDEX idx_hearings_judge ON hearings (judge_id, scheduled_at);
CREATE INDEX idx_hearings_courtroom ON hearings (courtroom_id, scheduled_at);

CREATE TABLE proceedings (
    id               BIGSERIAL PRIMARY KEY,
    case_id          BIGINT      NOT NULL REFERENCES cases (id),
    hearing_id       BIGINT REFERENCES hearings (id),
    proceeding_date  DATE        NOT NULL,
    summary          TEXT        NOT NULL,
    remarks          TEXT,
    recorded_by      BIGINT      NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_proceedings_case ON proceedings (case_id, proceeding_date);

CREATE TABLE court_orders (
    id           BIGSERIAL PRIMARY KEY,
    case_id      BIGINT       NOT NULL REFERENCES cases (id),
    hearing_id   BIGINT REFERENCES hearings (id),
    order_type   VARCHAR(30)  NOT NULL,
    title        VARCHAR(300) NOT NULL,
    content      TEXT         NOT NULL,
    remarks      TEXT,
    order_date   DATE         NOT NULL,
    issued_by    BIGINT       NOT NULL REFERENCES users (id),
    created_at   TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_orders_case ON court_orders (case_id, order_date);

CREATE TABLE documents (
    id               BIGSERIAL PRIMARY KEY,
    case_id          BIGINT       NOT NULL REFERENCES cases (id),
    title            VARCHAR(255) NOT NULL,
    document_type    VARCHAR(30)  NOT NULL,
    description      TEXT,
    current_version  INT          NOT NULL,
    uploaded_by      BIGINT       NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    deleted_at       TIMESTAMPTZ,
    deleted_by       BIGINT REFERENCES users (id)
);

CREATE INDEX idx_documents_case ON documents (case_id);

CREATE TABLE document_versions (
    id                 BIGSERIAL PRIMARY KEY,
    document_id        BIGINT       NOT NULL REFERENCES documents (id),
    version_number     INT          NOT NULL,
    original_filename  VARCHAR(255) NOT NULL,
    content_type       VARCHAR(150) NOT NULL,
    size_bytes         BIGINT       NOT NULL,
    sha256             VARCHAR(64)  NOT NULL,
    storage_key        VARCHAR(255) NOT NULL UNIQUE,
    change_note        VARCHAR(500),
    uploaded_by        BIGINT       NOT NULL REFERENCES users (id),
    uploaded_at        TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_document_version UNIQUE (document_id, version_number)
);

CREATE TABLE deadlines (
    id                BIGSERIAL PRIMARY KEY,
    case_id           BIGINT       NOT NULL REFERENCES cases (id),
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    due_date          DATE         NOT NULL,
    priority          VARCHAR(20)  NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    assigned_to       BIGINT REFERENCES users (id),
    created_by        BIGINT       NOT NULL REFERENCES users (id),
    completed_at      TIMESTAMPTZ,
    completed_by      BIGINT REFERENCES users (id),
    reminder_sent_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_deadlines_case ON deadlines (case_id);
CREATE INDEX idx_deadlines_due ON deadlines (status, due_date);

CREATE TABLE notifications (
    id            BIGSERIAL PRIMARY KEY,
    recipient_id  BIGINT        NOT NULL REFERENCES users (id),
    type          VARCHAR(40)   NOT NULL,
    title         VARCHAR(200)  NOT NULL,
    message       VARCHAR(1000) NOT NULL,
    case_id       BIGINT REFERENCES cases (id),
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);

CREATE TABLE audit_events (
    id           BIGSERIAL PRIMARY KEY,
    occurred_at  TIMESTAMPTZ   NOT NULL,
    actor_id     BIGINT REFERENCES users (id),
    actor_name   VARCHAR(150),
    action       VARCHAR(40)   NOT NULL,
    entity_type  VARCHAR(30),
    entity_id    BIGINT,
    case_id      BIGINT REFERENCES cases (id),
    summary      VARCHAR(1000) NOT NULL
);

CREATE INDEX idx_audit_occurred ON audit_events (occurred_at DESC);
CREATE INDEX idx_audit_case ON audit_events (case_id, occurred_at DESC);
CREATE INDEX idx_audit_actor ON audit_events (actor_id, occurred_at DESC);
