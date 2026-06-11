INSERT INTO events (name, description, status)
SELECT
    'Default Event',
    'Default active event for ScanGuard.',
    'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE name = 'Default Event'
);

-- Insert super admin after password hashing is implemented.
-- INSERT INTO users (username, password_hash, full_name, role, is_active)
-- VALUES ('superadmin', 'replace_with_password_hash', 'Super Admin', 'SUPER_ADMIN', TRUE);
