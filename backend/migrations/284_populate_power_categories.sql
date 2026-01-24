-- Migration 284: Populate power_definitions.category from effects JSON
-- This derives categories for the 117 powers that currently have NULL category

BEGIN;

-- Update powers based on effects content
-- Using same logic as spells, adapting for power-specific effects

-- 1. Heal powers
UPDATE power_definitions
SET category = 'heal'
WHERE category IS NULL
  AND (effects::text ILIKE '%"type":%"heal"%'
       OR effects::text ILIKE '%"heal":%'
       OR effects::text ILIKE '%lifesteal%');

-- 2. Offensive powers (damage focused)
UPDATE power_definitions
SET category = 'offensive'
WHERE category IS NULL
  AND (effects::text ILIKE '%"type":%"damage"%'
       OR effects::text ILIKE '%"damageType":%');

-- 3. Defensive powers
UPDATE power_definitions
SET category = 'defensive'
WHERE category IS NULL
  AND (effects::text ILIKE '%"armor":%'
       OR effects::text ILIKE '%"shield":%'
       OR effects::text ILIKE '%immunity_%'
       OR effects::text ILIKE '%block%'
       OR effects::text ILIKE '%"thorns":%');

-- 4. Debuff powers
UPDATE power_definitions
SET category = 'debuff'
WHERE category IS NULL
  AND (effects::text ILIKE '%debuff%'
       OR effects::text ILIKE '%"stun"%'
       OR effects::text ILIKE '%slow%'
       OR effects::text ILIKE '%weaken%');

-- 5. Support powers (buffs allies)
UPDATE power_definitions
SET category = 'support'
WHERE category IS NULL
  AND (effects::text ILIKE '%buff%'
       OR effects::text ILIKE '%ally%'
       OR effects::text ILIKE '%team%');

-- 6. Passive powers (no active effect, stat modifiers)
UPDATE power_definitions
SET category = 'passive'
WHERE category IS NULL
  AND (effects::text ILIKE '%passive%'
       OR effects::text ILIKE '%"stat_modifier"%'
       OR effects::text ILIKE '%aura%');

-- 7. Everything else is utility
UPDATE power_definitions
SET category = 'utility'
WHERE category IS NULL;

-- Log category distribution after update
DO $$
DECLARE
    category_counts TEXT;
BEGIN
    SELECT string_agg(category || ': ' || cnt::text, ', ' ORDER BY category)
    INTO category_counts
    FROM (
        SELECT COALESCE(category, 'NULL') as category, COUNT(*) as cnt
        FROM power_definitions
        GROUP BY category
    ) sub;

    RAISE NOTICE 'Power category distribution: %', category_counts;
END $$;

COMMIT;

-- Log migration (after commit to ensure it only logs on success)
INSERT INTO migration_log (version, name, description)
VALUES (284, '284_populate_power_categories', 'Derive power categories from effects JSON for 117 NULL entries')
ON CONFLICT (version) DO NOTHING;
