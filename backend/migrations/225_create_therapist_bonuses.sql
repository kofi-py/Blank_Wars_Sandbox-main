-- Migration 225: Create therapist_bonuses table
-- Stores per-therapist bonus multipliers for real game stats

CREATE TABLE IF NOT EXISTS therapist_bonuses (
  id SERIAL PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id),
  bonus_type TEXT NOT NULL,  -- must match real stat: bond_level, experience, current_mental_health, etc.
  multiplier DECIMAL(4,2) NOT NULL,  -- e.g., 1.15 for +15%, 0.75 for -25%
  description TEXT NOT NULL,
  UNIQUE(character_id, bonus_type)
);

-- Carl Jung: relationship/team focused
INSERT INTO therapist_bonuses (character_id, bonus_type, multiplier, description) VALUES
  ('carl_jung', 'bond_level', 1.15, '+15% Bond Level growth'),
  ('carl_jung', 'current_team_player', 1.20, '+20% Team player improvement'),
  ('carl_jung', 'experience', 1.25, '+25% XP from therapy');

-- Zxk14bw7: mental/stress focused
INSERT INTO therapist_bonuses (character_id, bonus_type, multiplier, description) VALUES
  ('zxk14bw7', 'current_mental_health', 1.20, '+20% Mental health gains'),
  ('zxk14bw7', 'current_stress', 0.75, '-25% Stress from therapy'),
  ('zxk14bw7', 'current_communication', 1.30, '+30% Communication improvement');

-- Seraphina: morale/confidence focused
INSERT INTO therapist_bonuses (character_id, bonus_type, multiplier, description) VALUES
  ('seraphina', 'current_morale', 1.35, '+35% Morale boost'),
  ('seraphina', 'current_confidence', 1.20, '+20% Confidence boost'),
  ('seraphina', 'experience', 1.25, '+25% XP from therapy');

-- Index for fast lookups by therapist
CREATE INDEX idx_therapist_bonuses_character_id ON therapist_bonuses(character_id);
