-- Migration 212: Create user_characters entries for system characters
-- Each user gets their own instance of each system character (judges, therapists, hosts)
-- This enables personalized memories and relationships with system characters

-- Create user_characters entries for all existing users × all system characters
-- Uses a cross join to generate one entry per user per system character
-- Note: System characters often have extreme base stats, so we clamp to valid ranges
INSERT INTO user_characters (
  id,
  user_id,
  character_id,
  nickname,
  level,
  experience,
  bond_level,
  current_health,
  current_max_health,
  equipment,
  is_injured,
  total_battles,
  total_wins,
  current_stress,
  current_mental_health,
  current_training,
  current_team_player,
  current_ego,
  current_communication,
  acquired_at
)
SELECT 
  gen_random_uuid() AS id,
  u.id AS user_id,
  c.id AS character_id,
  c.name AS nickname,
  1 AS level,
  0 AS experience,
  0 AS bond_level,
  LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999) AS current_health,
  LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999) AS current_max_health,
  '[]' AS equipment,
  false AS is_injured,
  0 AS total_battles,
  0 AS total_wins,
  0 AS current_stress,
  -- Clamp psychology stats to valid range (0-100)
  LEAST(GREATEST(COALESCE(c.mental_health, 80), 0), 100) AS current_mental_health,
  LEAST(GREATEST(COALESCE(c.training, 75), 0), 100) AS current_training,
  LEAST(GREATEST(COALESCE(c.team_player, 70), 0), 100) AS current_team_player,
  LEAST(GREATEST(COALESCE(c.ego, 60), 0), 100) AS current_ego,
  LEAST(GREATEST(COALESCE(c.communication, 80), 0), 100) AS current_communication,
  NOW() AS acquired_at
FROM users u
CROSS JOIN characters c
WHERE c.role IN ('judge', 'therapist', 'host', 'system')
-- Don't create duplicates if already exists
AND NOT EXISTS (
  SELECT 1 FROM user_characters uc 
  WHERE uc.user_id = u.id AND uc.character_id = c.id
);

-- Log migration
INSERT INTO migration_log (name, description)
VALUES ('212_create_system_character_user_instances', 'Create user_characters entries for system characters (therapists, judges, hosts)')
ON CONFLICT (name) DO NOTHING;

-- IMPORTANT: The registration flow also needs to be updated to create these
-- entries for new users. See: backend/src/routes/auth.ts /register endpoint
