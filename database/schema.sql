CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    barcode_value VARCHAR(100) NOT NULL,
    scanned_by_user_id UUID NOT NULL REFERENCES users(id),
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS duplicate_scan_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    barcode_value VARCHAR(100) NOT NULL,
    attempted_by_user_id UUID NOT NULL REFERENCES users(id),
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    original_scan_id UUID REFERENCES scans(id),
    device_id VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SCANNER'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'events_status_check'
    ) THEN
        ALTER TABLE events
            ADD CONSTRAINT events_status_check
            CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scans_event_id_barcode_value_key'
    ) THEN
        ALTER TABLE scans
            ADD CONSTRAINT scans_event_id_barcode_value_key
            UNIQUE (event_id, barcode_value);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_scans_event_id_barcode_value
    ON scans(event_id, barcode_value);

CREATE INDEX IF NOT EXISTS idx_scans_barcode_value
    ON scans(barcode_value);

CREATE INDEX IF NOT EXISTS idx_scans_scanned_by_user_id
    ON scans(scanned_by_user_id);

CREATE INDEX IF NOT EXISTS idx_scans_scanned_at
    ON scans(scanned_at);

CREATE INDEX IF NOT EXISTS idx_duplicate_scan_attempts_event_id_barcode_value
    ON duplicate_scan_attempts(event_id, barcode_value);

CREATE INDEX IF NOT EXISTS idx_duplicate_scan_attempts_attempted_at
    ON duplicate_scan_attempts(attempted_at);

CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);

CREATE INDEX IF NOT EXISTS idx_events_status
    ON events(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at);
