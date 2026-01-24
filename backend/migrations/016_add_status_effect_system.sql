-- Migration: Add status effect system (Phase 1)
-- Purpose: Define status effect types and support for CC diminishing returns
-- Research: Based on best practices - duration stacking, CC diminishing returns

-- Step 1: Create status effect types reference table
CREATE TABLE IF NOT EXISTS status_effect_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cc', 'buff', 'debuff', 'dot', 'hot')),
  description TEXT,
  icon TEXT,
  stackable BOOLEAN DEFAULT FALSE,
  cc_diminishing BOOLEAN DEFAULT FALSE -- true for stun/fear/charm (prevents permanent CC)
);

-- Step 2: Seed core status effects
INSERT INTO status_effect_types (id, name, category, description, icon, stackable, cc_diminishing) VALUES
  -- Crowd Control (with diminishing returns to prevent permanent stun-locks)
  ('stun', 'Stunned', 'cc', 'Cannot take actions', '😵', FALSE, TRUE),
  ('fear', 'Feared', 'cc', 'Forced to flee', '😱', FALSE, TRUE),
  ('charm', 'Charmed', 'cc', 'Controlled by enemy', '😍', FALSE, TRUE),
  ('confusion', 'Confused', 'cc', 'Attacks random targets', '😵‍💫', FALSE, TRUE),
  ('paralyze', 'Paralyzed', 'cc', 'Cannot act or dodge', '⚡', FALSE, TRUE),
  ('blind', 'Blinded', 'cc', 'Cannot target specific enemies', '🙈', FALSE, FALSE),

  -- Damage Over Time (stackable per research - duration extends)
  ('bleed', 'Bleeding', 'dot', 'Physical damage each turn', '🩸', TRUE, FALSE),
  ('burn', 'Burning', 'dot', 'Fire damage each turn', '🔥', TRUE, FALSE),
  ('poison', 'Poisoned', 'dot', 'Poison damage each turn', '💉', TRUE, FALSE),

  -- Debuffs (not stackable - refresh duration instead)
  ('slow', 'Slowed', 'debuff', 'Reduced speed', '🐌', FALSE, FALSE),
  ('disarm', 'Disarmed', 'debuff', 'Cannot use weapon attacks', '🚫', FALSE, FALSE),
  ('grievous_wound', 'Grievous Wound', 'debuff', 'Reduced healing received', '💔', FALSE, FALSE),
  ('armor_break', 'Armor Break', 'debuff', 'Reduced defense', '🛡️💥', FALSE, FALSE),

  -- Buffs/Heals (shields stack, others refresh)
  ('haste', 'Haste', 'buff', 'Increased speed', '⚡', FALSE, FALSE),
  ('shield', 'Shield', 'buff', 'Absorbs damage', '🛡️', TRUE, FALSE),
  ('regeneration', 'Regeneration', 'hot', 'Heal over time', '💚', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_status_effect_category ON status_effect_types(category);

-- Step 4: Add comments for documentation
COMMENT ON TABLE status_effect_types IS 'Reference table for all status effects with stacking and diminishing returns rules';
COMMENT ON COLUMN status_effect_types.stackable IS 'If true, duration extends when reapplied; if false, refreshes to longest duration';
COMMENT ON COLUMN status_effect_types.cc_diminishing IS 'If true, applies diminishing returns (full -> half -> quarter -> immune) to prevent permanent CC';
