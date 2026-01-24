-- Migration: 006_healing_facilities
-- Description: Add healing facilities table for medical infrastructure
-- Created: 2025-07-22

BEGIN;

-- Create healing facilities table
CREATE TABLE healing_facilities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    healing_rate_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    currency_cost_per_hour INTEGER NOT NULL DEFAULT 0,
    premium_cost_per_hour INTEGER NOT NULL DEFAULT 0,
    max_injury_severity VARCHAR(20) NOT NULL,
    headquarters_tier_required VARCHAR(50) NOT NULL,
    description TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for common queries
CREATE INDEX idx_healing_facilities_type ON healing_facilities (facility_type);
CREATE INDEX idx_healing_facilities_hq_tier ON healing_facilities (headquarters_tier_required);
CREATE INDEX idx_healing_facilities_injury_severity ON healing_facilities (max_injury_severity);

-- Update migration log
INSERT INTO migration_log (version, name) VALUES (6, '006_healing_facilities') ON CONFLICT (version) DO NOTHING;

COMMIT;
