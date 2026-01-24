-- Add psychological stats to the characters table.
-- This is a non-destructive operation that adds new columns with default values.

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS gameplan_adherence_level INTEGER DEFAULT 75,
ADD COLUMN IF NOT EXISTS current_mental_health INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS stress_level INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS team_trust INTEGER DEFAULT 85,
ADD COLUMN IF NOT EXISTS battle_focus INTEGER DEFAULT 90;
