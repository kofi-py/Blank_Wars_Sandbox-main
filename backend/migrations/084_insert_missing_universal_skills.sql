-- Migration: Insert Missing Universal Skill Powers
-- Purpose: Add the 7 missing universal skill-tier powers from the original design

-- These were designed in cc_10_26_25_1.13pm_power_system.md but never inserted into database

-- Use ON CONFLICT DO NOTHING to make this migration idempotent (safe to re-run)
INSERT INTO power_definitions (id, name, tier, category, description, flavor_text, icon, max_rank, power_type, effects, unlock_level, unlock_cost, energy_cost, cooldown) VALUES

-- 2. Archery - Skilled ranged combat
('archery', 'Archery', 'skill', 'combat', 'Skilled ranged combat', 'The art of the bow, precision from distance', '🏹', 10, 'active',
'[{"type": "stat_modifier", "stat": "ranged_damage", "value": 10, "duration": 0, "target": "self", "description": "+10% ranged damage on this attack"}]'::jsonb, 1, 1, 8, 0),

-- 4. Athletics - Physical conditioning and speed
('athletics', 'Athletics', 'skill', 'progression', 'Physical conditioning and speed', 'Speed and agility through training', '🏃', 10, 'passive',
'[{"type": "stat_modifier", "stat": "speed", "value": 5, "target": "self", "description": "+5% speed"}, {"type": "stat_modifier", "stat": "evasion", "value": 3, "target": "self", "description": "+3% evasion"}]'::jsonb, 1, 1, 0, 0),

-- 5. Strength - Raw physical power
('strength', 'Strength', 'skill', 'combat', 'Raw physical power', 'Pure physical might', '💪', 10, 'passive',
'[{"type": "stat_modifier", "stat": "physical_attack", "value": 5, "target": "self", "description": "+5% physical attack damage"}]'::jsonb, 1, 1, 0, 0),

-- 7. First Aid - Basic healing knowledge
('first_aid', 'First Aid', 'skill', 'progression', 'Basic healing knowledge', 'Save lives with basic medical training', '🩹', 10, 'active',
'[{"type": "heal", "value": 10, "target": "ally_or_self", "description": "Heal self or ally for 10% max HP"}]'::jsonb, 1, 1, 10, 2),

-- 8. Perception - Awareness and detection
('perception', 'Perception', 'skill', 'progression', 'Awareness and detection', 'Nothing escapes your notice', '👁️', 10, 'passive',
'[{"type": "stat_modifier", "stat": "accuracy", "value": 5, "target": "self", "description": "+5% accuracy"}, {"type": "special", "effect": "detect_stealth", "value": 10, "description": "detect stealth enemies 10% better"}]'::jsonb, 1, 1, 0, 0),

-- 9. Focus - Concentration under pressure
('focus', 'Focus', 'skill', 'combat', 'Concentration under pressure', 'Precision through mental discipline', '🎯', 10, 'active',
'[{"type": "stat_modifier", "stat": "critical_chance", "value": 8, "duration": 0, "target": "self", "description": "+8% critical hit chance on this attack"}]'::jsonb, 1, 1, 10, 0),

-- 10. Crafting - Item knowledge and optimization
('crafting', 'Crafting', 'skill', 'progression', 'Create and enhance items', 'The art of creation and enhancement', '🛠️', 10, 'passive',
'[{"type": "special", "effect": "crafting_tier_unlock", "description": "Can craft basic items from materials"}, {"type": "stat_modifier", "stat": "crafted_item_effectiveness", "value": 5, "target": "self", "description": "+5% effectiveness of crafted items"}]'::jsonb, 1, 1, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Verify count
DO $$
DECLARE
  skill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO skill_count FROM power_definitions WHERE tier = 'skill';
  RAISE NOTICE 'Total universal skill powers after migration: %', skill_count;

  IF skill_count < 10 THEN
    RAISE WARNING 'Expected at least 10 universal skills, found %', skill_count;
  END IF;
END $$;
