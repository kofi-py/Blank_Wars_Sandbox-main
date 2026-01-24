-- Migration 198: Mood Calculation System
--
-- Implements the mood calculation system from gameplan 005:
-- current_mood = formula(stats) + character.mood_modifier + SUM(gameplay_modifiers)
--
-- This migration creates:
-- 1. mood_event_types lookup table
-- 2. mood_modifier column on characters table
-- 3. gameplay_mood_modifiers JSONB on user_characters table
-- 4. Seeds all data

-- ============================================================================
-- STEP 1: Create mood_event_types lookup table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mood_event_types (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    base_value INTEGER NOT NULL,
    default_decay_rate INTEGER,
    default_expires_in_days INTEGER,
    default_removable_by TEXT[],
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE mood_event_types IS 'Lookup table for mood event definitions. Handlers reference this to apply mood modifiers consistently.';

-- ============================================================================
-- STEP 2: Seed mood_event_types
-- ============================================================================

INSERT INTO mood_event_types (id, category, base_value, default_decay_rate, default_expires_in_days, default_removable_by, description) VALUES
    -- Battle Events
    ('battle_win', 'battle', 3, 1, 7, NULL, 'Standard battle victory'),
    ('battle_loss', 'battle', -4, 1, 7, NULL, 'Standard battle defeat'),
    ('championship_win', 'battle', 15, NULL, 30, NULL, 'Won a championship/tournament'),
    ('humiliating_defeat', 'battle', -10, 1, 10, ARRAY['therapy'], 'Badly outclassed loss'),
    ('near_death', 'battle', -15, 2, 14, ARRAY['therapy'], 'Health dropped below 10%'),
    ('critical_injury', 'battle', -10, 1, 14, ARRAY['therapy'], 'Health dropped below 20%'),
    ('won_while_injured', 'battle', 5, 1, 7, NULL, 'Won despite low health (grit bonus)'),
    ('win_streak_3', 'battle', 5, 1, 7, NULL, '3+ win streak momentum'),
    ('loss_streak_3', 'battle', -5, 1, 7, NULL, '3+ loss streak slump'),

    -- Social/Team Events
    ('teammate_death', 'social', -20, 2, NULL, ARRAY['therapy'], 'Ally died in battle'),
    ('teammate_praised', 'social', 4, 1, 5, NULL, 'Received praise from teammate'),
    ('bond_milestone', 'social', 6, NULL, 14, NULL, 'Hit bond level milestone'),
    ('public_humiliation', 'social', -8, 1, 7, NULL, 'Heckled or mocked publicly'),
    ('betrayal_by_ally', 'social', -15, NULL, NULL, ARRAY['therapy', 'revenge'], 'Betrayed by trusted ally'),
    ('betrayal_revenge', 'social', 8, NULL, 14, NULL, 'Got revenge on betrayer'),

    -- Rivalry Events
    ('rivalry_dominance', 'rivalry', 10, 1, 14, NULL, 'Beat personal rival'),
    ('rivalry_humiliation', 'rivalry', -12, 1, 14, ARRAY['therapy', 'revenge'], 'Lost to personal rival'),

    -- Financial Events
    ('went_into_debt', 'financial', -8, NULL, NULL, ARRAY['paying_debt'], 'Entered debt state'),
    ('paid_off_debt', 'financial', 8, 1, 30, NULL, 'Cleared all debt'),
    ('payday_windfall', 'financial', 5, 1, 14, NULL, 'Big earnings or windfall'),

    -- Living Situation Events
    ('living_conflict', 'living', -5, 1, 5, NULL, 'Drama with housemates'),
    ('moved_to_master_bed', 'living', 4, NULL, 7, NULL, 'Upgraded sleeping situation'),
    ('evicted_from_bed', 'living', -6, 1, 7, NULL, 'Lost good sleeping spot'),

    -- Therapy Events
    ('therapy_basic', 'therapy', 5, NULL, 14, NULL, 'Completed therapy session'),
    ('therapy_intensive', 'therapy', 10, NULL, 21, NULL, 'Completed intensive therapy'),
    ('therapy_breakthrough', 'therapy', 15, NULL, 30, NULL, 'Major therapeutic breakthrough'),

    -- Other Events
    ('failed_rebellion', 'other', -10, 1, 14, NULL, 'Rebellion attempt failed'),
    ('successful_rebellion', 'other', 12, NULL, 21, NULL, 'Rebellion succeeded'),
    ('award_recognition', 'other', 8, 1, 30, NULL, 'Received award/recognition'),
    ('team_morale_boost', 'other', 3, 1, 3, NULL, 'Team morale cascade (positive)'),
    ('team_morale_drain', 'other', -3, 1, 3, NULL, 'Team morale cascade (negative)')
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    base_value = EXCLUDED.base_value,
    default_decay_rate = EXCLUDED.default_decay_rate,
    default_expires_in_days = EXCLUDED.default_expires_in_days,
    default_removable_by = EXCLUDED.default_removable_by,
    description = EXCLUDED.description;

-- ============================================================================
-- STEP 3: Add mood_modifier column to characters table
-- ============================================================================

ALTER TABLE characters ADD COLUMN IF NOT EXISTS mood_modifier INTEGER DEFAULT 0;

COMMENT ON COLUMN characters.mood_modifier IS 'Static mood baseline for personality. Range: -40 to +40. Scaled to match existing signature modifiers.';

-- ============================================================================
-- STEP 4: Seed characters.mood_modifier for all 33 playable characters
-- ============================================================================

UPDATE characters SET mood_modifier = CASE id
    WHEN 'achilles' THEN 8
    WHEN 'agent_x' THEN -12
    WHEN 'aleister_crowley' THEN -25
    WHEN 'archangel_michael' THEN 30
    WHEN 'billy_the_kid' THEN 12
    WHEN 'cleopatra' THEN 5
    WHEN 'crumbsworth' THEN 5
    WHEN 'don_quixote' THEN 40
    WHEN 'dracula' THEN -25
    WHEN 'fenrir' THEN -20
    WHEN 'frankenstein_monster' THEN -30
    WHEN 'genghis_khan' THEN 10
    WHEN 'holmes' THEN -15
    WHEN 'jack_the_ripper' THEN -40
    WHEN 'joan' THEN 5
    WHEN 'kali' THEN -15
    WHEN 'kangaroo' THEN 15
    WHEN 'karna' THEN 5
    WHEN 'little_bo_peep' THEN 25
    WHEN 'mami_wata' THEN 18
    WHEN 'merlin' THEN 12
    WHEN 'napoleon_bonaparte' THEN -5
    WHEN 'quetzalcoatl' THEN 15
    WHEN 'ramses_ii' THEN -8
    WHEN 'rilak_trelkar' THEN -12
    WHEN 'robin_hood' THEN 15
    WHEN 'sam_spade' THEN 8
    WHEN 'shaka_zulu' THEN 10
    WHEN 'space_cyborg' THEN -15
    WHEN 'sun_wukong' THEN 30
    WHEN 'tesla' THEN -10
    WHEN 'unicorn' THEN 30
    WHEN 'velociraptor' THEN -12
    ELSE 0
END
WHERE id IN (
    'achilles', 'agent_x', 'aleister_crowley', 'archangel_michael',
    'billy_the_kid', 'cleopatra', 'crumbsworth', 'don_quixote', 'dracula',
    'fenrir', 'frankenstein_monster', 'genghis_khan', 'holmes', 'jack_the_ripper',
    'joan', 'kali', 'kangaroo', 'karna', 'little_bo_peep', 'mami_wata', 'merlin',
    'napoleon_bonaparte', 'quetzalcoatl', 'ramses_ii', 'rilak_trelkar', 'robin_hood',
    'sam_spade', 'shaka_zulu', 'space_cyborg', 'sun_wukong', 'tesla', 'unicorn',
    'velociraptor'
);

-- ============================================================================
-- STEP 5: Add gameplay_mood_modifiers JSONB column to user_characters
-- ============================================================================

ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS gameplay_mood_modifiers JSONB DEFAULT '{"modifiers": []}'::jsonb;

COMMENT ON COLUMN user_characters.gameplay_mood_modifiers IS 'Tracked mood modifiers from gameplay events. Each modifier references mood_event_types.id as source.';

CREATE INDEX IF NOT EXISTS idx_user_characters_mood_modifiers ON user_characters USING gin (gameplay_mood_modifiers);

-- ============================================================================
-- STEP 6: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (198, '198_mood_calculation_system')
ON CONFLICT (version) DO NOTHING;
