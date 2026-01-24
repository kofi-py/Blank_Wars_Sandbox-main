-- Migration 213: Create System Team for System Characters
-- All system characters (judges, therapists, hosts) belong to the "Blank Wars" team
-- This provides them with team context without being actual combatants

BEGIN;

-- 1. Create a fixed system user (if not exists)
INSERT INTO users (id, email, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@blankwars.com',
  'BlankWars_System',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the "Blank Wars" system team
INSERT INTO teams (id, user_id, team_name, is_active, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Blank Wars',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create team_context for the system team
INSERT INTO team_context (
  team_id,
  current_scene_type,
  current_time_of_day,
  hq_tier,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'mundane',
  'afternoon',
  'basic_house',
  NOW()
)
ON CONFLICT (team_id) DO NOTHING;

-- 4. Update all system character user_characters to belong to the system user
UPDATE user_characters
SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE id LIKE 'system_%';

COMMIT;
