-- Migration: 000_migration_system
-- Description: Create migration tracking table
-- Created: 2025-07-22

BEGIN;

-- Migration tracking table
-- Migration tracking table
CREATE TABLE IF NOT EXISTS migration_log (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_migration_log_executed ON migration_log (executed_at);

-- Record this migration
INSERT INTO migration_log (version, name) VALUES (0, '000_migration_system') ON CONFLICT (version) DO NOTHING;

COMMIT;
