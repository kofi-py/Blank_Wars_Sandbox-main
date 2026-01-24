-- Migration 042: Implement Team Sets System
-- Created: 2025-10-13
-- Description: Complete overhaul to support multiple team sets per user with chemistry tracking,
--              shared equipment, team events, and proper roommate vs teammate distinction
-- Fixes: Production 500 error from non-existent user_teams table
-- Vision: Users can create multiple 3-character team sets for tournaments, each with unique dynamics

-- ============================================================================
-- STEP 1: Fix user_headquarters to allow multiple HQs per user
-- ============================================================================

-- Remove UNIQUE constraint on user_id to allow users to own multiple headquarters
ALTER TABLE user_headquarters DROP CONSTRAINT IF EXISTS user_headquarters_user_id_key;

-- Add is_primary flag to track which HQ is the main one
ALTER TABLE user_headquarters ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- Ensure only one primary HQ per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_hq_per_user
  ON user_headquarters(user_id)
  WHERE is_primary = true;

COMMENT ON COLUMN user_headquarters.is_primary IS 'Main HQ - users can have multiple HQs as they grow (apartment -> mansion -> compound)';

-- ============================================================================
-- STEP 2: Add headquarters_id to user_characters (roommate tracking)
-- ============================================================================

-- Add column to link characters to specific HQs
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS headquarters_id UUID;

-- Add foreign key constraint
ALTER TABLE user_characters ADD CONSTRAINT IF NOT EXISTS fk_user_characters_hq
  FOREIGN KEY (headquarters_id) REFERENCES user_headquarters(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_characters_hq ON user_characters(headquarters_id);

COMMENT ON COLUMN user_characters.headquarters_id IS 'Which HQ this character is assigned to live in - roommates share same headquarters_id';

-- Migrate existing characters to their user's HQ
UPDATE user_characters uc
SET headquarters_id = (
  SELECT id FROM user_headquarters WHERE user_id = uc.user_id LIMIT 1
)
WHERE headquarters_id IS NULL;

-- ============================================================================
-- STEP 3: Create teams table (Team Sets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_name VARCHAR(100), -- User's custom name or NULL for default "Team Set 1"
  character_slot_1 TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
  character_slot_2 TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
  character_slot_3 TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false, -- Only ONE team can be active per user
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one active team per user using partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_team_per_user
  ON teams(user_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(user_id, is_active) WHERE is_active = true;

COMMENT ON TABLE teams IS 'User-created team sets - saved 3-character configurations for battles/tournaments';
COMMENT ON COLUMN teams.team_name IS 'User-given name like "Tournament Squad" or NULL for default "Team Set 1"';
COMMENT ON COLUMN teams.is_active IS 'The currently selected team for gameplay - only one per user';

-- ============================================================================
-- STEP 4: Migrate existing active_teammates from team_context to teams table
-- ============================================================================

-- Create teams from existing team_context data
-- Note: team_context.team_id currently stores user_id, active_teammates is TEXT[] array
INSERT INTO teams (user_id, team_name, character_slot_1, character_slot_2, character_slot_3, is_active)
SELECT
  tc.team_id::text as user_id,
  'Default Team' as team_name,
  CASE WHEN array_length(tc.active_teammates, 1) >= 1
       THEN tc.active_teammates[1] END as character_slot_1,
  CASE WHEN array_length(tc.active_teammates, 1) >= 2
       THEN tc.active_teammates[2] END as character_slot_2,
  CASE WHEN array_length(tc.active_teammates, 1) >= 3
       THEN tc.active_teammates[3] END as character_slot_3,
  true as is_active
FROM team_context tc
WHERE tc.active_teammates IS NOT NULL
  AND array_length(tc.active_teammates, 1) > 0
  AND EXISTS (SELECT 1 FROM users WHERE id = tc.team_id::text)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: Update team_context to reference new teams table
-- ============================================================================

-- Add temporary column for new team_id
ALTER TABLE team_context ADD COLUMN IF NOT EXISTS new_team_id UUID;

-- Populate new_team_id by matching team_context.team_id (user_id) to teams.user_id
UPDATE team_context tc
SET new_team_id = t.id
FROM teams t
WHERE tc.team_id = t.user_id::varchar
  AND t.is_active = true;

-- For any team_context rows without a match, create a placeholder team
INSERT INTO teams (user_id, team_name, is_active)
SELECT DISTINCT tc.team_id::text, 'Default Team', true
FROM team_context tc
WHERE tc.new_team_id IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE id = tc.team_id::text)
  AND NOT EXISTS (SELECT 1 FROM teams WHERE user_id = tc.team_id::text AND is_active = true)
ON CONFLICT DO NOTHING;

-- Update the remaining NULL new_team_ids
UPDATE team_context tc
SET new_team_id = t.id
FROM teams t
WHERE tc.new_team_id IS NULL
  AND tc.team_id = t.user_id::varchar
  AND t.is_active = true;

-- SAFETY: Delete any orphaned team_context rows that still have NULL new_team_id
-- These are rows where team_id doesn't match any valid user
-- DISABLED: This migration already ran. Commenting out to prevent data loss on re-runs.
-- DELETE FROM team_context WHERE new_team_id IS NULL;

-- Drop old team_id column and rename new_team_id
ALTER TABLE team_context DROP COLUMN IF EXISTS team_id;
ALTER TABLE team_context RENAME COLUMN new_team_id TO team_id;

-- Make team_id NOT NULL and add foreign key
ALTER TABLE team_context ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE team_context ADD CONSTRAINT fk_team_context_team
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Recreate unique constraint on team_id
ALTER TABLE team_context DROP CONSTRAINT IF EXISTS team_context_team_id_key;
ALTER TABLE team_context ADD CONSTRAINT team_context_team_id_key UNIQUE (team_id);

-- Drop active_teammates column (now redundant - teams table has slots)
ALTER TABLE team_context DROP COLUMN IF EXISTS active_teammates;

COMMENT ON TABLE team_context IS 'Environmental context for each team - HQ tier, scene type, time of day';
COMMENT ON COLUMN team_context.team_id IS 'References teams.id - each team has its own context';

-- ============================================================================
-- STEP 6: Create team_relationships table (Chemistry & Bonuses)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  chemistry_score INTEGER DEFAULT 50 CHECK (chemistry_score BETWEEN 0 AND 100),
  total_battles INTEGER DEFAULT 0,
  total_victories INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  conflicts_unresolved INTEGER DEFAULT 0,
  shared_activities INTEGER DEFAULT 0,
  relationship_bonuses JSONB DEFAULT '{}', -- Example: {"teamwork": 15, "trust": 20, "synergy": 10}
  relationship_penalties JSONB DEFAULT '{}', -- Example: {"friction": -5, "distrust": -10}
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_relationships_team ON team_relationships(team_id);

COMMENT ON TABLE team_relationships IS 'Tracks evolving chemistry, bonuses, and shared history for each team set';
COMMENT ON COLUMN team_relationships.chemistry_score IS 'Team harmony 0-100 - affects performance and interactions';
COMMENT ON COLUMN team_relationships.relationship_bonuses IS 'Earned bonuses from collective success (JSON)';

-- Initialize relationships for all existing teams
INSERT INTO team_relationships (team_id, chemistry_score)
SELECT id, 50 FROM teams
ON CONFLICT (team_id) DO NOTHING;

-- ============================================================================
-- STEP 7: Create team_events table (Shared History Ticker)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'battle_victory', 'conflict', 'resolution', 'activity', 'milestone'
  event_description TEXT NOT NULL,
  impact_on_chemistry INTEGER DEFAULT 0, -- +/- chemistry change
  characters_involved TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_events_team ON team_events(team_id, created_at DESC);

COMMENT ON TABLE team_events IS 'Rolling history of shared experiences for this specific team combo';
COMMENT ON COLUMN team_events.event_description IS 'AI-generated or template-based description of what happened';
COMMENT ON COLUMN team_events.impact_on_chemistry IS 'How this event affected team chemistry (+/-)';

-- ============================================================================
-- STEP 8: Create team_equipment_shared table (Equipment Trading Pool)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_equipment_shared (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL,
  currently_held_by TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
  last_transferred_at TIMESTAMP,
  transfer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_equipment_team ON team_equipment_shared(team_id);
CREATE INDEX IF NOT EXISTS idx_team_equipment_holder ON team_equipment_shared(currently_held_by);

COMMENT ON TABLE team_equipment_shared IS 'Equipment that can be traded between team members';
COMMENT ON COLUMN team_equipment_shared.currently_held_by IS 'Which team member has it right now';

-- ============================================================================
-- STEP 9: Create team_chat_logs table (AI Team Conversations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  speaker_character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat', -- 'chat', 'conflict', 'joke', 'strategy'
  coach_triggered BOOLEAN DEFAULT false,
  topic VARCHAR(100), -- Random topic injector or NULL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_chat_team ON team_chat_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_chat_speaker ON team_chat_logs(speaker_character_id);

COMMENT ON TABLE team_chat_logs IS 'AI-to-AI conversations specific to this team combo (coach can interact)';
COMMENT ON COLUMN team_chat_logs.topic IS 'Random injected topic like conflict generator produces';

-- ============================================================================
-- STEP 10: Record migration
-- ============================================================================

INSERT INTO migration_log (version, name) VALUES (42, '042_implement_team_sets_system') ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to verify migration)
-- ============================================================================

-- SELECT 'teams count' as check, COUNT(*) as result FROM teams;
-- SELECT 'team_context count' as check, COUNT(*) as result FROM team_context;
-- SELECT 'team_relationships count' as check, COUNT(*) as result FROM team_relationships;
-- SELECT 'user_characters with HQ' as check, COUNT(*) as result FROM user_characters WHERE headquarters_id IS NOT NULL;
-- SELECT 'active teams per user' as check, user_id, COUNT(*) as active_count FROM teams WHERE is_active = true GROUP BY user_id;
