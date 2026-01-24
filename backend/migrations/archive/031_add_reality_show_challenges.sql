-- Migration: Add Reality Show Challenge System
-- Created: 2025-10-02
-- Description: Comprehensive challenge system with mini-games, rewards, and reality show parodies

-- ============================================================
-- CHALLENGE TEMPLATES (Reusable challenge definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Challenge Classification
  challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN (
    'physical',      -- Endurance, strength, agility challenges
    'mental',        -- Puzzles, memory, strategy
    'social',        -- Persuasion, alliances, voting
    'cooking',       -- Kitchen challenges (parody of cooking shows)
    'talent',        -- Performance-based challenges
    'survival',      -- Resource management, wilderness
    'creative',      -- Art, design, performance
    'team',          -- Requires multiple participants
    'individual',    -- Solo challenges
    'hybrid'         -- Mix of multiple types
  )),

  -- Participation Requirements
  min_participants INT NOT NULL DEFAULT 1,
  max_participants INT NOT NULL DEFAULT 10,
  requires_team BOOLEAN DEFAULT FALSE,

  -- Game Mechanics
  mechanics JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(mechanics) = 'object'), -- Detailed rules, scoring, win conditions
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')) DEFAULT 'medium',
  estimated_duration_minutes INT NOT NULL DEFAULT 30 CHECK (estimated_duration_minutes > 0),

  -- Parody/Theme
  reality_show_parody VARCHAR(100), -- e.g., "Survivor Tribal Council", "Top Chef Quickfire", "Amazing Race Detour"
  theme_tags TEXT[], -- ['competition', 'elimination', 'alliance', 'endurance']

  -- Rewards Configuration (USD in integer dollars, not cents)
  base_currency_reward INT NOT NULL DEFAULT 1000 CHECK (base_currency_reward >= 0),
  reward_scaling JSONB NOT NULL DEFAULT '{"first": 1.0, "second": 0.6, "third": 0.3}' CHECK (jsonb_typeof(reward_scaling) = 'object'),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenge_templates_type ON challenge_templates(challenge_type);
CREATE INDEX idx_challenge_templates_active ON challenge_templates(is_active);

-- ============================================================
-- CHALLENGE REWARDS (Link challenges to specific reward types)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_template_id UUID REFERENCES challenge_templates(id) ON DELETE CASCADE,

  -- Reward Type
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
    'currency',           -- In-game money
    'equipment',          -- Specific equipment items
    'battle_boost',       -- Temporary stat buffs for battles
    'special_item',       -- Unique challenge-exclusive items
    'training_bonus',     -- XP multipliers
    'healing_discount',   -- Reduced healing costs
    'unlock',             -- Unlock new features/areas
    'immunity',           -- Protection from elimination/penalties
    'advantage'           -- Game mechanic advantages
  )),

  -- Reward Details
  reward_config JSONB NOT NULL CHECK (jsonb_typeof(reward_config) = 'object'), -- Specific reward parameters
  placement_required VARCHAR(20) NOT NULL CHECK (placement_required IN ('winner', 'top_3', 'participant', 'loser')),

  -- Constraints
  is_guaranteed BOOLEAN NOT NULL DEFAULT FALSE, -- Always given or chance-based
  probability DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (probability >= 0.0 AND probability <= 1.0), -- 0.0 to 1.0 for chance-based rewards

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenge_rewards_template ON challenge_rewards(challenge_template_id);
CREATE INDEX idx_challenge_rewards_type ON challenge_rewards(reward_type);

-- ============================================================
-- ACTIVE CHALLENGES (Currently running challenge instances)
-- ============================================================
CREATE TABLE IF NOT EXISTS active_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_template_id UUID REFERENCES challenge_templates(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- Coach who initiated

  -- Challenge State
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'registration',  -- Accepting sign-ups
    'ready',         -- All participants registered, ready to start
    'in_progress',   -- Challenge is active
    'voting',        -- Social challenges may have voting phase
    'completed',     -- Finished, results recorded
    'cancelled'      -- Cancelled before completion
  )) DEFAULT 'registration',

  -- Timing
  registration_deadline TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,

  -- Game State
  game_state JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(game_state) = 'object'), -- Current challenge progress, variables, etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_active_challenges_status ON active_challenges(status);
CREATE INDEX idx_active_challenges_user ON active_challenges(user_id);
CREATE INDEX idx_active_challenges_timing ON active_challenges(start_time, end_time);

-- ============================================================
-- CHALLENGE PARTICIPANTS (Who's competing in each challenge)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_challenge_id UUID REFERENCES active_challenges(id) ON DELETE CASCADE,
  user_character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Participation Details
  registration_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_assignment VARCHAR(50), -- For team-based challenges

  -- Performance Tracking
  performance_metrics JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(performance_metrics) = 'object'), -- Challenge-specific scoring
  final_score DECIMAL(10,2) CHECK (final_score >= 0),
  placement INT CHECK (placement > 0), -- 1st, 2nd, 3rd, etc.

  -- Status
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  elimination_time TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(active_challenge_id, user_character_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(active_challenge_id);
CREATE INDEX idx_challenge_participants_character ON challenge_participants(user_character_id);
CREATE INDEX idx_challenge_participants_placement ON challenge_participants(active_challenge_id, placement);

-- ============================================================
-- CHALLENGE RESULTS (Historical record of completed challenges)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_challenge_id UUID REFERENCES active_challenges(id) ON DELETE CASCADE,
  challenge_template_id UUID REFERENCES challenge_templates(id),

  -- Winners
  winner_character_id TEXT REFERENCES user_characters(id),
  second_place_character_id TEXT REFERENCES user_characters(id),
  third_place_character_id TEXT REFERENCES user_characters(id),

  -- Statistics
  total_participants INT NOT NULL CHECK (total_participants > 0),
  completion_time_minutes INT CHECK (completion_time_minutes > 0),

  -- Detailed Results
  full_results JSONB NOT NULL CHECK (jsonb_typeof(full_results) = 'object'), -- Complete rankings, scores, events
  highlight_moments TEXT[], -- Notable events during challenge

  -- Rewards Distributed (USD in integer dollars, not cents)
  total_rewards_given JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(total_rewards_given) = 'object'), -- Summary of all rewards distributed

  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenge_results_winner ON challenge_results(winner_character_id);
CREATE INDEX idx_challenge_results_template ON challenge_results(challenge_template_id);
CREATE INDEX idx_challenge_results_completion ON challenge_results(completed_at);

-- ============================================================
-- DISTRIBUTED REWARDS (Track what rewards were actually given)
-- ============================================================
CREATE TABLE IF NOT EXISTS distributed_challenge_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_result_id UUID REFERENCES challenge_results(id) ON DELETE CASCADE,
  user_character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Reward Details
  reward_type VARCHAR(50) NOT NULL,
  reward_config JSONB NOT NULL CHECK (jsonb_typeof(reward_config) = 'object'), -- What was given

  -- Currency (if applicable) - USD in integer dollars, not cents
  currency_amount INT CHECK (currency_amount >= 0),

  -- Equipment (if applicable)
  equipment_id TEXT REFERENCES equipment(id) ON DELETE SET NULL,

  -- Battle Boost (if applicable)
  boost_effect JSONB CHECK (jsonb_typeof(boost_effect) = 'object'), -- Stat increases, duration
  boost_expires_at TIMESTAMPTZ,

  -- Item (if applicable)
  item_id UUID REFERENCES user_items(id) ON DELETE SET NULL,

  -- Status
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distributed_rewards_character ON distributed_challenge_rewards(user_character_id);
CREATE INDEX idx_distributed_rewards_result ON distributed_challenge_rewards(challenge_result_id);
CREATE INDEX idx_distributed_rewards_unclaimed ON distributed_challenge_rewards(claimed) WHERE claimed = FALSE;

-- ============================================================
-- CHALLENGE LEADERBOARD (Overall stats across all challenges)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE UNIQUE,

  -- Aggregate Stats
  total_challenges_entered INT NOT NULL DEFAULT 0 CHECK (total_challenges_entered >= 0),
  total_challenges_won INT NOT NULL DEFAULT 0 CHECK (total_challenges_won >= 0),
  total_top_3_finishes INT NOT NULL DEFAULT 0 CHECK (total_top_3_finishes >= 0),

  -- By Challenge Type
  wins_by_type JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(wins_by_type) = 'object'), -- {"physical": 5, "mental": 3, ...}

  -- Rewards Earned (USD in integer dollars, not cents)
  total_currency_earned INT NOT NULL DEFAULT 0 CHECK (total_currency_earned >= 0),
  total_items_won INT NOT NULL DEFAULT 0 CHECK (total_items_won >= 0),

  -- Streaks
  current_win_streak INT NOT NULL DEFAULT 0 CHECK (current_win_streak >= 0),
  best_win_streak INT NOT NULL DEFAULT 0 CHECK (best_win_streak >= 0),

  -- Rankings
  overall_rank INT CHECK (overall_rank > 0),
  elo_rating INT NOT NULL DEFAULT 1000 CHECK (elo_rating >= 0), -- Competitive ranking

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_rank ON challenge_leaderboard(overall_rank);
CREATE INDEX idx_leaderboard_elo ON challenge_leaderboard(elo_rating DESC);

-- ============================================================
-- CHALLENGE ALLIANCES (Social dynamics, Survivor-style)
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_challenge_id UUID REFERENCES active_challenges(id) ON DELETE CASCADE,

  -- Alliance Info
  alliance_name VARCHAR(100),
  leader_character_id TEXT REFERENCES user_characters(id),

  -- Members
  member_character_ids TEXT[], -- Array of character IDs

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  formed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alliances_challenge ON challenge_alliances(active_challenge_id);
CREATE INDEX idx_alliances_leader ON challenge_alliances(leader_character_id);

-- ============================================================
-- Seed Data: Sample Reality Show Challenge Templates
-- ============================================================

-- Example: Survivor-style Tribal Council
INSERT INTO challenge_templates (name, description, challenge_type, min_participants, max_participants, requires_team, mechanics, difficulty, reality_show_parody, theme_tags, base_currency_reward)
VALUES (
  'Tribal Showdown',
  'Vote off the weakest link in a dramatic tribal council. Form alliances, betray friends, and survive elimination!',
  'social',
  6,
  16,
  TRUE,
  '{"voting_rounds": 3, "immunity_idol": true, "alliance_bonus": 1.2, "betrayal_penalty": 0.5}',
  'medium',
  'Survivor Tribal Council',
  ARRAY['voting', 'alliance', 'elimination', 'strategy'],
  2500
);

-- Example: Top Chef Quickfire
INSERT INTO challenge_templates (name, description, challenge_type, min_participants, max_participants, requires_team, mechanics, difficulty, reality_show_parody, theme_tags, base_currency_reward)
VALUES (
  'Kitchen Arena',
  'Create the best dish under pressure! Time limit, mystery ingredients, and harsh judges await.',
  'cooking',
  2,
  8,
  FALSE,
  '{"time_limit_seconds": 600, "mystery_ingredient": true, "judge_scoring": ["taste", "presentation", "creativity"], "pressure_penalty": 0.1}',
  'hard',
  'Top Chef Quickfire Challenge',
  ARRAY['cooking', 'creativity', 'time_pressure'],
  3000
);

-- Example: Amazing Race Detour
INSERT INTO challenge_templates (name, description, challenge_type, min_participants, max_participants, requires_team, mechanics, difficulty, reality_show_parody, theme_tags, base_currency_reward)
VALUES (
  'Race Against Time',
  'Choose between two difficult tasks: "Brains" (solve a complex puzzle) or "Brawn" (physical obstacle course). First to finish wins!',
  'hybrid',
  4,
  12,
  TRUE,
  '{"task_options": ["puzzle", "physical"], "team_size": 2, "checkpoint_bonuses": true, "time_penalties": [30, 60, 120]}',
  'extreme',
  'Amazing Race Detour',
  ARRAY['racing', 'teamwork', 'decision_making', 'endurance'],
  5000
);

-- Example: The Voice Battle Round
INSERT INTO challenge_templates (name, description, challenge_type, min_participants, max_participants, requires_team, mechanics, difficulty, reality_show_parody, theme_tags, base_currency_reward)
VALUES (
  'Battle of Talents',
  'Showcase your unique talent in head-to-head matchups. Coaches can steal losing performers!',
  'talent',
  4,
  8,
  FALSE,
  '{"performance_categories": ["singing", "comedy", "poetry", "combat_demo"], "judge_count": 3, "steal_mechanic": true}',
  'medium',
  'The Voice Battle Rounds',
  ARRAY['performance', 'competition', 'talent'],
  2000
);

-- ============================================================
-- Functions and Triggers
-- ============================================================

-- Update challenge leaderboard when results are recorded
CREATE OR REPLACE FUNCTION update_challenge_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Update winner stats
  IF NEW.winner_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_challenges_won, total_top_3_finishes, current_win_streak)
    VALUES (NEW.winner_character_id, 1, 1, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_challenges_won = challenge_leaderboard.total_challenges_won + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = challenge_leaderboard.current_win_streak + 1,
      best_win_streak = GREATEST(challenge_leaderboard.best_win_streak, challenge_leaderboard.current_win_streak + 1),
      updated_at = NOW();
  END IF;

  -- Update second place stats
  IF NEW.second_place_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_top_3_finishes)
    VALUES (NEW.second_place_character_id, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = 0,
      updated_at = NOW();
  END IF;

  -- Update third place stats
  IF NEW.third_place_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_top_3_finishes)
    VALUES (NEW.third_place_character_id, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = 0,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge_leaderboard
  AFTER INSERT ON challenge_results
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_leaderboard();

-- Update leaderboard when rewards are distributed
CREATE OR REPLACE FUNCTION update_leaderboard_rewards()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency_amount IS NOT NULL THEN
    UPDATE challenge_leaderboard
    SET total_currency_earned = total_currency_earned + NEW.currency_amount,
        updated_at = NOW()
    WHERE user_character_id = NEW.user_character_id;
  END IF;

  IF NEW.item_id IS NOT NULL THEN
    UPDATE challenge_leaderboard
    SET total_items_won = total_items_won + 1,
        updated_at = NOW()
    WHERE user_character_id = NEW.user_character_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_rewards
  AFTER INSERT ON distributed_challenge_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_rewards();

-- Table documentation
COMMENT ON TABLE challenge_templates IS 'Reusable challenge definitions inspired by reality TV shows';
COMMENT ON TABLE active_challenges IS 'Currently running challenge instances';
COMMENT ON TABLE challenge_results IS 'Historical record of completed challenges';
COMMENT ON TABLE challenge_leaderboard IS 'Overall player statistics and rankings across all challenges';
COMMENT ON TABLE challenge_alliances IS 'Social alliances formed during challenges (Survivor-style)';
COMMENT ON TABLE distributed_challenge_rewards IS 'Track actual rewards given to characters';

-- Money column documentation (Governance: Dollars-Everywhere)
COMMENT ON COLUMN challenge_templates.base_currency_reward IS 'Base reward in USD integer dollars (NOT cents)';
COMMENT ON COLUMN distributed_challenge_rewards.currency_amount IS 'Reward amount in USD integer dollars (NOT cents)';
COMMENT ON COLUMN challenge_leaderboard.total_currency_earned IS 'Lifetime earnings in USD integer dollars (NOT cents)';
