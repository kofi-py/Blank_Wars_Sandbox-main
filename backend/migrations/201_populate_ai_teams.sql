-- Migration 201: Populate AI Teams and Characters for PVE battles
-- Creates 3 AI coaches, 3 AI teams with 3 characters each

BEGIN;

-- Create AI coaches
INSERT INTO ai_coaches (id, name, difficulty_tier, personality_profile)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Coach Alpha', 'medium', 'Aggressive tactician'),
  ('b2222222-2222-2222-2222-222222222222', 'Coach Beta', 'hard', 'Defensive strategist'),
  ('c3333333-3333-3333-3333-333333333333', 'Coach Gamma', 'medium', 'Balanced commander')
ON CONFLICT (id) DO NOTHING;

-- Create 3 AI Teams
INSERT INTO ai_teams (id, coach_id, name, wins, losses, rating, is_active)
VALUES
  ('d4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'The Mythic Beasts', 0, 0, 1000, true),
  ('e5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'The Ancient Warriors', 0, 0, 1200, true),
  ('f6666666-6666-6666-6666-666666666666', 'c3333333-3333-3333-3333-333333333333', 'The Legends of Old', 0, 0, 1100, true)
ON CONFLICT (id) DO NOTHING;

-- Team 1: The Mythic Beasts (Fenrir, Sun Wukong, Unicorn)
INSERT INTO ai_characters (
  id, team_id, character_id, level, experience,
  current_health, max_health, current_mana, max_mana, current_energy, max_energy,
  attack, defense, speed, magic_attack, magic_defense,
  abilities, personality_traits, equipment
)
SELECT
  gen_random_uuid(),
  'd4444444-4444-4444-4444-444444444444'::uuid,
  c.id,
  10,
  0,
  c.max_health,
  c.max_health,
  100,  -- mana
  100,
  100,  -- energy
  100,
  c.attack,
  c.defense,
  c.speed,
  c.magic_attack,
  COALESCE(c.magic_defense, 10),
  '[]'::text,
  '[]'::text,
  '[]'::text
FROM characters c
WHERE c.id IN ('fenrir', 'sun_wukong', 'unicorn')
ON CONFLICT (team_id, character_id) DO NOTHING;

-- Team 2: The Ancient Warriors (Achilles, Genghis Khan, Shaka Zulu)
INSERT INTO ai_characters (
  id, team_id, character_id, level, experience,
  current_health, max_health, current_mana, max_mana, current_energy, max_energy,
  attack, defense, speed, magic_attack, magic_defense,
  abilities, personality_traits, equipment
)
SELECT
  gen_random_uuid(),
  'e5555555-5555-5555-5555-555555555555'::uuid,
  c.id,
  10,
  0,
  c.max_health,
  c.max_health,
  100,
  100,
  100,
  100,
  c.attack,
  c.defense,
  c.speed,
  c.magic_attack,
  COALESCE(c.magic_defense, 10),
  '[]'::text,
  '[]'::text,
  '[]'::text
FROM characters c
WHERE c.id IN ('achilles', 'genghis_khan', 'shaka_zulu')
ON CONFLICT (team_id, character_id) DO NOTHING;

-- Team 3: The Legends of Old (Merlin, Cleopatra, Joan of Arc)
INSERT INTO ai_characters (
  id, team_id, character_id, level, experience,
  current_health, max_health, current_mana, max_mana, current_energy, max_energy,
  attack, defense, speed, magic_attack, magic_defense,
  abilities, personality_traits, equipment
)
SELECT
  gen_random_uuid(),
  'f6666666-6666-6666-6666-666666666666'::uuid,
  c.id,
  10,
  0,
  c.max_health,
  c.max_health,
  100,
  100,
  100,
  100,
  c.attack,
  c.defense,
  c.speed,
  c.magic_attack,
  COALESCE(c.magic_defense, 10),
  '[]'::text,
  '[]'::text,
  '[]'::text
FROM characters c
WHERE c.id IN ('merlin', 'cleopatra', 'joan')
ON CONFLICT (team_id, character_id) DO NOTHING;

COMMIT;
