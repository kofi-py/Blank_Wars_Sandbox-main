-- Migration 270: Fix Adherence Calculation
--
-- SUMMARY OF CHANGES:
-- 1. Fix corrupted base psych stats in characters table
--    - Base 50 + positive modifiers only (negative modifiers ignored)
--    - All stats capped at 0-100
--    - Specific ego values for deity-like characters
--    - Starting stress capped at 50, fatigue at 0
--
-- 2. Update gameplan_adherence formula:
--    - Stress weight reduced from 0.15 to 0.10
--    - Added +10 base bonus
--    - Uses coach_trust_level directly
--
-- 3. Refresh user_characters from corrected base values
--
-- NOTE: During gameplay, current values CAN go outside 0-100 range.
-- The caps here are only for starting/base values.

BEGIN;

-- ============================================================================
-- STEP 1: Fix base psych stats in characters table
-- ============================================================================

-- First, store the archetype modifiers (positive values only will be used)
CREATE TEMP TABLE archetype_psych_mods (
    archetype TEXT PRIMARY KEY,
    training_mod INT,
    ego_mod INT,
    team_player_mod INT,
    mental_health_mod INT
);

INSERT INTO archetype_psych_mods VALUES
    ('warrior', 10, 15, 5, -10),
    ('mystic', 10, 10, -5, 20),
    ('trickster', 5, 15, 0, 0),
    ('beast', -15, 10, -5, -10),
    ('machine', 20, -20, 15, -30),
    ('legend', 15, 20, 0, -5),
    ('outlaw', 10, 20, -10, -10),
    ('hero', 10, 10, 10, 5),
    ('antihero', 5, 25, -5, -15),
    ('system', 0, 0, 0, 0);

-- Define middle group (extra ego reduction)
CREATE TEMP TABLE middle_group_chars (name TEXT PRIMARY KEY);
INSERT INTO middle_group_chars VALUES
    ('Nikola Tesla'), ('Rilak Trelkar'), ('Ramses II'), ('Napoleon Bonaparte'),
    ('Space Cyborg'), ('Aleister Crowley'), ('Little Bo Peep'), ('Sherlock Holmes');

-- Define deity-like characters (specific ego values, stat floors)
CREATE TEMP TABLE deity_like_chars (name TEXT PRIMARY KEY, fixed_ego INT);
INSERT INTO deity_like_chars VALUES
    ('Unicorn', 80),
    ('Mami Wata', 85),
    ('Kali', 85),
    ('Quetzalcoatl', 90),
    ('Sun Wukong', 95),
    ('Archangel Michael', 90);

-- Update TRAINING in characters table
-- Base 50 + positive archetype mod + positive species mod + positive individual mod
-- Capped at 0-100
-- Deity species gets 0 for species/individual mods
-- Unicorn gets fixed 50
UPDATE characters c SET training =
    CASE
        WHEN c.name = 'Unicorn' THEN 50
        WHEN c.species = 'deity' THEN
            LEAST(100, GREATEST(0,
                50 + GREATEST(0, COALESCE((SELECT training_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
            ))
        ELSE
            LEAST(100, GREATEST(0,
                50
                + GREATEST(0, COALESCE((SELECT training_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM species_attribute_modifiers WHERE species = c.species AND attribute_name = 'training'), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'training'), 0))
            ))
    END
WHERE c.role = 'contestant';

-- Update EGO in characters table
-- Deity-like characters get specific fixed values
-- Others: Base 50 + positive mods - 30 (all) - 30 extra (middle group)
-- Capped at 0-100
UPDATE characters c SET ego =
    CASE
        WHEN c.name IN (SELECT name FROM deity_like_chars) THEN
            (SELECT fixed_ego FROM deity_like_chars WHERE name = c.name)
        ELSE
            LEAST(100, GREATEST(0,
                50
                + GREATEST(0, COALESCE((SELECT ego_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM species_attribute_modifiers WHERE species = c.species AND attribute_name = 'ego'), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'ego'), 0))
                - 30  -- all characters
                - CASE WHEN c.name IN (SELECT name FROM middle_group_chars) THEN 30 ELSE 0 END
            ))
    END
WHERE c.role = 'contestant';

-- Update TEAM_PLAYER in characters table
-- Deity-like characters get floor of 50
-- Others: Base 50 + positive mods, capped 0-100
UPDATE characters c SET team_player =
    CASE
        WHEN c.name IN (SELECT name FROM deity_like_chars) THEN
            LEAST(100, GREATEST(50,
                50
                + GREATEST(0, COALESCE((SELECT team_player_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'team_player'), 0))
            ))
        WHEN c.species = 'deity' THEN
            LEAST(100, GREATEST(50,
                50 + GREATEST(0, COALESCE((SELECT team_player_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
            ))
        ELSE
            LEAST(100, GREATEST(0,
                50
                + GREATEST(0, COALESCE((SELECT team_player_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM species_attribute_modifiers WHERE species = c.species AND attribute_name = 'team_player'), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'team_player'), 0))
            ))
    END
WHERE c.role = 'contestant';

-- Update MENTAL_HEALTH in characters table
-- Deity-like characters get floor of 50
-- Others: Base 50 + positive mods, capped 0-100
UPDATE characters c SET mental_health =
    CASE
        WHEN c.name IN (SELECT name FROM deity_like_chars) THEN
            LEAST(100, GREATEST(50,
                50
                + GREATEST(0, COALESCE((SELECT mental_health_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'mental_health'), 0))
            ))
        WHEN c.species = 'deity' THEN
            LEAST(100, GREATEST(50,
                50 + GREATEST(0, COALESCE((SELECT mental_health_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
            ))
        ELSE
            LEAST(100, GREATEST(0,
                50
                + GREATEST(0, COALESCE((SELECT mental_health_mod FROM archetype_psych_mods WHERE archetype = c.archetype), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM species_attribute_modifiers WHERE species = c.species AND attribute_name = 'mental_health'), 0))
                + GREATEST(0, COALESCE((SELECT modifier FROM signature_attribute_modifiers sam WHERE sam.character_id = c.id AND attribute_name = 'mental_health'), 0))
            ))
    END
WHERE c.role = 'contestant';

-- Update STRESS - cap at 50 for base values
UPDATE characters SET stress = LEAST(50, GREATEST(0, stress))
WHERE role = 'contestant';

-- Update FATIGUE - set to 0 for base values (fresh start)
UPDATE characters SET fatigue = 0
WHERE role = 'contestant';

-- System characters (non-contestants) get neutral base values
UPDATE characters SET
    training = 50,
    ego = 50,
    team_player = 50,
    mental_health = 50,
    stress = 25,
    fatigue = 0
WHERE role != 'contestant';

-- ============================================================================
-- STEP 2: Update gameplan_adherence generated column formula
-- ============================================================================

-- Drop and recreate the generated column with new formula:
-- - Stress weight: 0.10 (was 0.15)
-- - Added +10 base bonus
-- - Simplified coach_trust calculation (uses coach_trust_level directly)

ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

ALTER TABLE user_characters ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
    CASE WHEN current_max_health = 0 THEN 0 ELSE
    GREATEST(0, LEAST(100, ROUND(
        -- Positive factors
        (current_training::NUMERIC * 0.20) +
        (current_mental_health::NUMERIC * 0.15) +
        (current_team_player::NUMERIC * 0.20) +
        -- Coach trust component (inlined - can't reference generated column)
        (LEAST(100, GREATEST(0,
            50 +
            CASE WHEN financial_personality->>'spending_style' = 'strategic' THEN 5 ELSE 0 END +
            CASE WHEN financial_personality->>'spending_style' = 'impulsive' THEN -5 ELSE 0 END +
            (((financial_personality->>'financial_wisdom')::NUMERIC - 50) * 0.05)
        ))::NUMERIC * 0.10) +
        (current_morale::NUMERIC * 0.10) +
        -- Base bonus
        10 -
        -- Negative factors
        ((CASE
            WHEN current_ego <= 100 THEN current_ego::NUMERIC
            ELSE 100::NUMERIC + ((current_ego - 100)::NUMERIC * 0.5)
        END - 50::NUMERIC) * 0.20) -
        (current_stress::NUMERIC * 0.10) -
        (current_fatigue::NUMERIC * 0.10) -
        -- HP penalty (up to -25 if near death)
        ((1.0 - (current_health::NUMERIC / current_max_health::NUMERIC)) * 25::NUMERIC)
    )))
    END
) STORED;

-- ============================================================================
-- STEP 3: Refresh user_characters from corrected base values
-- ============================================================================

-- Update current psych stats in user_characters from fixed characters table
UPDATE user_characters uc SET
    current_training = c.training,
    current_ego = c.ego,
    current_team_player = c.team_player,
    current_mental_health = c.mental_health,
    current_stress = c.stress,
    current_fatigue = c.fatigue,
    current_morale = c.morale
FROM characters c
WHERE uc.character_id = c.id;

-- Clean up temp tables
DROP TABLE IF EXISTS archetype_psych_mods;
DROP TABLE IF EXISTS middle_group_chars;
DROP TABLE IF EXISTS deity_like_chars;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
--
-- BACKEND CODE CHANGES REQUIRED (not part of this migration):
--
-- File: backend/src/services/battleAdherenceService.ts
--
-- Update applyBattleStateModifiers() with reduced penalties:
--
-- OLD:                          NEW:
-- HP <= 10%: -50               HP <= 10%: -30
-- HP <= 25%: -30               HP <= 25%: -20
-- HP <= 50%: -15               HP <= 50%: -10
-- Team losing: -10             Team losing: -5
-- Teammates down: up to -20    Teammates down: up to -10
--
-- This reduces max battle penalty from -80 to -45
-- ============================================================================

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (270, '270_fix_adherence_calculation')
ON CONFLICT (version) DO NOTHING;
