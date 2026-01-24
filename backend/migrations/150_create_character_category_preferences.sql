-- Migration: 201_create_character_category_preferences.sql
-- Purpose: Create table for character preferences by category (weapon style, power type, attributes, etc.)
-- These preferences modify adherence checks when coach recommends items matching/conflicting with preferences

CREATE TABLE IF NOT EXISTS character_category_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  category_type TEXT NOT NULL,
  category_value TEXT NOT NULL,
  preference_score INTEGER NOT NULL DEFAULT 0
    CHECK (preference_score BETWEEN -100 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, category_type, category_value)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_char_cat_pref_char ON character_category_preferences(character_id);
CREATE INDEX IF NOT EXISTS idx_char_cat_pref_type ON character_category_preferences(category_type, category_value);

-- Add comments documenting the system
COMMENT ON TABLE character_category_preferences IS
  'Character preferences for item/ability categories. Scores modify adherence checks: +score increases compliance, -score increases rebellion chance.';

COMMENT ON COLUMN character_category_preferences.category_type IS
  'Category type: weapon_style, armor_style, power_category, spell_effect, attribute';

COMMENT ON COLUMN character_category_preferences.category_value IS
  'Specific value within category (e.g., melee_blade, offensive, strength)';

COMMENT ON COLUMN character_category_preferences.preference_score IS
  'Preference from -100 (hates) to +100 (loves). Modifier = score * 0.15 applied to adherence threshold.';

-- Reference table documenting valid category_type/category_value combinations
-- This is for documentation only, not enforced by FK (flexibility for future additions)
/*
CATEGORY REFERENCE:

weapon_style:
  - melee_blade (swords, daggers, knives)
  - melee_blunt (maces, hammers, clubs)
  - polearm (spears, staffs as weapons)
  - ranged_physical (bows, guns)
  - ranged_energy (plasma, energy weapons)
  - magic_focus (orbs, wands, staves for casting)
  - natural (claws, whips, natural weapons)

armor_style:
  - heavy (plate, heavy armor)
  - medium (leather, tech armor)
  - light (robes, cloth, cloaks)

power_category:
  - offensive (damage-dealing powers)
  - defensive (protection, shields)
  - support (buffs, team assistance)
  - heal (restoration)
  - debuff (enemy weakening)
  - utility (movement, vision, misc)
  - passive (always-on effects)

spell_effect:
  - damage (direct damage spells)
  - healing (heal, regen, revive)
  - buff (positive stat modifiers)
  - debuff (negative effects on enemies)
  - shield (barriers, reflect, immunity)
  - utility (teleport, purge, mana restore)
  - control (mark, untargetable, reveal)

attribute:
  - strength
  - dexterity
  - intelligence
  - wisdom
  - charisma
  - defense
  - speed
  - spirit
*/

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (150, '150_create_character_category_preferences')
ON CONFLICT (version) DO NOTHING;
