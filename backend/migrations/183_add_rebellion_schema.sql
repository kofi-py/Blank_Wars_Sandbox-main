-- Migration 183: Add Rebellion Flow Schema
-- Extends battle_actions, judge_rulings, and battles for the rebellion system
-- See: docs/gameplans/002-battle-rebellion-flow.md

-- ============================================
-- 1. EXTEND battle_actions TABLE
-- ============================================

-- Declaration: In-character statement spoken during turn
ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS declaration TEXT;

-- Adherence check results
ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS adherence_roll INTEGER;

ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS adherence_threshold INTEGER;

ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS adherence_modifiers JSONB;
-- Format: { "hp_modifier": -30, "team_losing": -10, "teammates_down": -15 }

-- Rebellion details (only populated when is_rebellion = true)
ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS rebellion_type TEXT;
-- Values: 'flee', 'refuse', 'friendly_fire', 'different_target', 'different_action'

ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS psych_snapshot JSONB;
-- Format: { "stress": 85, "morale": 22, "mental_health": 31, "team_trust": 45 }

ALTER TABLE battle_actions
ADD COLUMN IF NOT EXISTS coach_order JSONB;
-- Format: { "action": "attack", "target_id": "xxx", "label": "Attack Sun Wukong" }

-- Index for cross-domain rebellion queries
CREATE INDEX IF NOT EXISTS idx_battle_actions_rebellion
ON battle_actions(character_id)
WHERE is_rebellion = true;

COMMENT ON COLUMN battle_actions.declaration IS 'In-character statement spoken during turn execution';
COMMENT ON COLUMN battle_actions.rebellion_type IS 'Type of rebellion: flee, refuse, friendly_fire, different_target, different_action';
COMMENT ON COLUMN battle_actions.psych_snapshot IS 'Character psychological state at time of rebellion';
COMMENT ON COLUMN battle_actions.coach_order IS 'What the coach originally ordered (before rebellion)';

-- ============================================
-- 2. EXTEND judge_rulings TABLE
-- ============================================

-- Verdict: Standardized ruling outcome
ALTER TABLE judge_rulings
ADD COLUMN IF NOT EXISTS verdict TEXT;
-- Values: 'approved', 'tolerated', 'penalized', 'severely_penalized'

-- Mechanical effects: Structured game effects from ruling
ALTER TABLE judge_rulings
ADD COLUMN IF NOT EXISTS mechanical_effects JSONB;
-- Format: { "points_change": -10, "debuffs": ["shaken"], "damage_to_rebel": 5 }

-- The rebel's declaration that prompted the ruling
ALTER TABLE judge_rulings
ADD COLUMN IF NOT EXISTS rebel_declaration TEXT;

COMMENT ON COLUMN judge_rulings.verdict IS 'Standardized verdict: approved, tolerated, penalized, severely_penalized';
COMMENT ON COLUMN judge_rulings.mechanical_effects IS 'Structured game effects from the ruling';
COMMENT ON COLUMN judge_rulings.rebel_declaration IS 'The character declaration that prompted this ruling';

-- ============================================
-- 3. ADD judge_id TO battles TABLE
-- ============================================

-- Judge assigned to this battle (selected at battle start)
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS judge_id TEXT REFERENCES characters(id);

COMMENT ON COLUMN battles.judge_id IS 'Judge character assigned to rule on rebellions in this battle';

-- Index for finding battles by judge
CREATE INDEX IF NOT EXISTS idx_battles_judge_id ON battles(judge_id);

-- ============================================
-- 4. LOG MIGRATION
-- ============================================

INSERT INTO migration_log (version, name)
VALUES (183, '183_add_rebellion_schema')
ON CONFLICT (version) DO NOTHING;
