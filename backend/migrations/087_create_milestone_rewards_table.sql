-- Create milestone_rewards table for character leveling milestones
-- Migration 087

BEGIN;

CREATE TABLE IF NOT EXISTS milestone_rewards (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ability', 'stat_boost', 'training_points', 'currency', 'special')),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  value INTEGER,
  icon VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast lookups by level
CREATE INDEX idx_milestone_rewards_level ON milestone_rewards(level);

-- Insert the 10 milestone rewards
INSERT INTO milestone_rewards (level, type, name, description, value, icon) VALUES
(5, 'training_points', 'First Milestone', 'Bonus training points for reaching level 5', 5, '🎯'),
(10, 'ability', 'Signature Ability Unlock', 'Unlock your first signature ability', NULL, '⚡'),
(15, 'stat_boost', 'Power Surge', 'Permanent +2 to all stats', 2, '💪'),
(20, 'special', 'Tier Advancement', 'Advanced training facilities unlocked', NULL, '🏛️'),
(25, 'training_points', 'Skill Mastery', 'Major training point bonus', 10, '📚'),
(30, 'ability', 'Ultimate Technique', 'Unlock powerful ultimate ability', NULL, '🌟'),
(35, 'stat_boost', 'Transcendence', 'Massive stat increase', 5, '✨'),
(40, 'special', 'Master Status', 'Cross-archetype skill learning unlocked', NULL, '👑'),
(45, 'ability', 'Legendary Power', 'Unlock legendary-tier abilities', NULL, '🔥'),
(50, 'special', 'Maximum Power', 'Achieve ultimate character potential', NULL, '💎');

COMMIT;
