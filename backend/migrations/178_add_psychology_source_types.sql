-- Migration 171: Add psychology source types to character_modifiers
-- Extends the source_type enum to support psychology/emotional modifiers
-- These are applied by PsychologyService after battles and events

-- Drop existing constraint
ALTER TABLE character_modifiers DROP CONSTRAINT IF EXISTS character_modifiers_source_type_check;

-- Add new constraint with psychology source types
ALTER TABLE character_modifiers ADD CONSTRAINT character_modifiers_source_type_check
CHECK (source_type IN (
  -- Original source types
  'point_allocation',   -- Level up stat allocation
  'battle_victory',     -- Rewards from winning battles (XP, etc.)
  'item',               -- Equipment/consumable effects
  'buff',               -- Positive spell/ability effects
  'curse',              -- Negative spell/ability effects
  'training',           -- Training session rewards
  'event',              -- Special event rewards/penalties
  'other',              -- Catch-all for edge cases

  -- Psychology source types (NEW)
  'battle_defeat',          -- Morale penalty from losing
  'battle_victory_morale',  -- Morale boost from winning (separate from XP rewards)
  'critical_injury',        -- Stress from taking severe damage
  'near_death',             -- Trauma from nearly dying (health < 10%)
  'teammate_death',         -- Grief from ally dying in battle
  'team_morale_cascade',    -- Morale effect spreading from teammate
  'rivalry_dominance',      -- Confidence boost from beating rival
  'rivalry_humiliation',    -- Shame from losing to rival
  'ptsd',                   -- Fear debuff against specific opponent
  'trauma_decay',           -- Healing of trauma over time (positive modifier to counter negative)
  'therapy',                -- Bonuses from therapy/counseling sessions
  'bond_boost'              -- Morale from high bond with coach
));

-- Add optional context_data column for complex psychology rules
-- e.g., PTSD stores opponent_id, rivalry stores rival_id
ALTER TABLE character_modifiers ADD COLUMN IF NOT EXISTS context_data JSONB DEFAULT NULL;

COMMENT ON COLUMN character_modifiers.context_data IS 'JSON data for complex modifiers (e.g., PTSD opponent ID, rivalry details, trauma origin)';

-- Add index for psychology-specific queries
CREATE INDEX IF NOT EXISTS idx_character_modifiers_psychology
ON character_modifiers(user_character_id, source_type)
WHERE source_type IN (
  'battle_defeat', 'battle_victory_morale', 'critical_injury', 'near_death',
  'teammate_death', 'team_morale_cascade', 'rivalry_dominance', 'rivalry_humiliation',
  'ptsd', 'trauma_decay', 'therapy', 'bond_boost'
);
