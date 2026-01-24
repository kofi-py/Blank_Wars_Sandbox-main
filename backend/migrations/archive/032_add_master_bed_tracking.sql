-- Migration: Add master bed assignment tracking for conflict injection
-- Created: 2025-10-03
-- Description: Track which character has the prestigious master bedroom bed
-- Governance: NO FALLBACKS (null = no one assigned yet)

-- Add master_bed_character_id to team_context to track the privileged character
ALTER TABLE team_context
ADD COLUMN master_bed_character_id VARCHAR(255) NULL REFERENCES characters(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_team_context_master_bed_character ON team_context(master_bed_character_id);

-- Add comment for documentation
COMMENT ON COLUMN team_context.master_bed_character_id IS 'Character ID who currently has the master bedroom bed (status symbol, source of team conflicts)';

-- Insert conflict triggers for master bed drama
INSERT INTO scene_triggers (scene_type, trigger_text, weight, domain) VALUES
('conflict', 'Someone thinks they deserve the master bedroom more than the current occupant', 2, 'living_quarters'),
('conflict', 'There''s jealousy about who gets to sleep in the master bed while others are on the floor', 2, 'living_quarters'),
('conflict', 'A character wants to challenge for the master bedroom privileges', 2, 'living_quarters'),
('mundane', 'Discussion about who should get the master bedroom when someone new joins', 1, 'living_quarters'),
('chaos', 'Multiple characters are fighting over who gets the master bedroom', 3, 'living_quarters');
