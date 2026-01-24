-- Migration 065: Fix Spell Schema Consistency with Powers
-- Purpose: Make spell_definitions match power_definitions structure
-- STATUS: SKIPPED / OBSOLETE
-- Reason: Migration 037 already defines the correct schema (tier, archetype, species columns).
-- This migration was intended to fix an older version of 037 but is now dangerous/redundant.

BEGIN;

-- No-op

COMMIT;
