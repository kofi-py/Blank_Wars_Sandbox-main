-- Migration: Seed challenge templates
-- Created: 2025-10-03
-- Description: Add reality show challenge templates (Survivor, Top Chef, Amazing Race parodies)

-- Clear existing templates to prevent duplicates
DELETE FROM challenge_templates;

-- Insert challenge templates
INSERT INTO challenge_templates (
  id,
  name,
  description,
  challenge_type,
  min_participants,
  max_participants,
  requires_team,
  mechanics,
  difficulty,
  estimated_duration_minutes,
  reality_show_parody,
  theme_tags,
  base_currency_reward,
  reward_scaling,
  is_active,
  created_at,
  updated_at
) VALUES

-- Survivor-style challenges
(
  gen_random_uuid(),
  'Tribal Immunity Challenge',
  'Compete in a grueling physical and mental challenge to win immunity from elimination. The last person standing wins protection and a cash prize.',
  'physical',
  3,
  12,
  false,
  '{"type": "endurance", "obstacles": ["balance beam", "puzzle", "swimming"], "scoring": "elimination"}'::jsonb,
  'medium',
  45,
  'Survivor Immunity Challenge',
  ARRAY['competition', 'endurance', 'immunity', 'elimination'],
  1500,
  '{"first": 1.0, "second": 0.6, "third": 0.3}'::jsonb,
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Reward Challenge: Feast or Famine',
  'Win a luxury feast and supplies for your alliance, or go hungry. This challenge tests strategy, strength, and teamwork.',
  'team',
  6,
  16,
  true,
  '{"type": "team_competition", "categories": ["strength", "puzzle", "speed"], "team_size": 2}'::jsonb,
  'hard',
  60,
  'Survivor Reward Challenge',
  ARRAY['team', 'strategy', 'alliance', 'reward'],
  2000,
  '{"first": 1.0, "second": 0.5, "third": 0.0}'::jsonb,
  true,
  NOW(),
  NOW()
),

-- Top Chef-style challenges
(
  gen_random_uuid(),
  'Quickfire Challenge',
  'Create a dish in 30 minutes using mystery ingredients. Impress the judges with creativity and execution to win a cash advantage.',
  'creative',
  3,
  8,
  false,
  '{"type": "timed_creation", "time_limit": 30, "mystery_box": true, "judging_criteria": ["taste", "presentation", "creativity"]}'::jsonb,
  'easy',
  30,
  'Top Chef Quickfire',
  ARRAY['creative', 'speed', 'cooking', 'judging'],
  800,
  '{"first": 1.0, "second": 0.4, "third": 0.0}'::jsonb,
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Elimination Challenge: Restaurant Wars',
  'Form teams and run a pop-up restaurant. One team will be eliminated based on food quality, service, and profit.',
  'team',
  6,
  12,
  true,
  '{"type": "business_competition", "team_size": 3, "judging": ["food", "service", "profit", "teamwork"]}'::jsonb,
  'extreme',
  90,
  'Top Chef Restaurant Wars',
  ARRAY['team', 'business', 'elimination', 'cooking', 'management'],
  3000,
  '{"first": 1.0, "second": 0.0, "third": 0.0}'::jsonb,
  true,
  NOW(),
  NOW()
),

-- Amazing Race-style challenges
(
  gen_random_uuid(),
  'Roadblock: Solve the Ancient Puzzle',
  'Navigate a complex puzzle challenge alone while your partner watches. First to solve advances, last place risks elimination.',
  'mental',
  4,
  10,
  false,
  '{"type": "solo_puzzle", "difficulty": "high", "time_pressure": true, "hint_system": true}'::jsonb,
  'medium',
  40,
  'Amazing Race Roadblock',
  ARRAY['mental', 'puzzle', 'solo', 'race'],
  1200,
  '{"first": 1.0, "second": 0.5, "third": 0.2}'::jsonb,
  true,
  NOW(),
  NOW()
),

(
  gen_random_uuid(),
  'Detour: Brains or Brawn',
  'Choose between a mental challenge or a physical challenge. Both lead to the same destination, but which path will you take?',
  'hybrid',
  4,
  12,
  false,
  '{"type": "choice_based", "paths": ["mental", "physical"], "scoring": "first_to_finish"}'::jsonb,
  'hard',
  50,
  'Amazing Race Detour',
  ARRAY['choice', 'strategy', 'hybrid', 'race'],
  1800,
  '{"first": 1.0, "second": 0.6, "third": 0.3}'::jsonb,
  true,
  NOW(),
  NOW()
),

-- Big Brother-style challenges
(
  gen_random_uuid(),
  'Head of Household Competition',
  'Win power over the house by outlasting everyone in this endurance challenge. The winner chooses who faces elimination.',
  'social',
  5,
  14,
  false,
  '{"type": "endurance", "social_strategy": true, "power": "nomination", "alliances_matter": true}'::jsonb,
  'medium',
  35,
  'Big Brother HOH Competition',
  ARRAY['social', 'endurance', 'power', 'alliances'],
  1000,
  '{"first": 1.0, "second": 0.0, "third": 0.0}'::jsonb,
  true,
  NOW(),
  NOW()
),

-- The Challenge-style
(
  gen_random_uuid(),
  'Daily Challenge: The Gauntlet',
  'Navigate an obstacle course filled with physical and mental challenges. Top performers win safety and rewards.',
  'physical',
  6,
  16,
  false,
  '{"type": "obstacle_course", "checkpoints": 5, "penalties": true, "scoring": "time_based"}'::jsonb,
  'hard',
  55,
  'The Challenge Daily',
  ARRAY['physical', 'obstacles', 'speed', 'competition'],
  2200,
  '{"first": 1.0, "second": 0.7, "third": 0.4}'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Add default reward configurations
INSERT INTO challenge_rewards (
  id,
  challenge_template_id,
  reward_type,
  reward_config,
  placement_required,
  is_guaranteed,
  probability,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  'currency',
  jsonb_build_object('base_amount', base_currency_reward, 'scaling', reward_scaling),
  'winner',
  true,
  1.0,
  NOW(),
  NOW()
FROM challenge_templates
WHERE is_active = true;

COMMENT ON TABLE challenge_templates IS 'Reality show challenge templates - seeded with Survivor, Top Chef, Amazing Race, Big Brother, and The Challenge parodies';
