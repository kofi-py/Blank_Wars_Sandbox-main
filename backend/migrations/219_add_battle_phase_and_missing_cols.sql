-- Migration: Add missing columns to battles table
-- Required for BattleManager.create_battle logic

ALTER TABLE battles
ADD COLUMN phase TEXT DEFAULT 'round_combat',
ADD COLUMN max_rounds INTEGER DEFAULT 3,
ADD COLUMN round_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN coaching_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN ai_judge_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN global_morale JSONB DEFAULT '{"user": 50, "opponent": 50}'::jsonb;

-- Add check constraint for phase
ALTER TABLE battles
ADD CONSTRAINT battles_phase_check CHECK (phase IN ('deployment', 'round_combat', 'round_resolution', 'game_over'));
