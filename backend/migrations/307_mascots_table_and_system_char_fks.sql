-- Migration 307: Create Mascots Table, Make Stats Optional for Non-Contestants, Add System Character FKs
-- Enables mascots and other system characters to exist without combat stats

BEGIN;

-- =====================================================
-- 1. CREATE MASCOTS TABLE (bonus data for mascot characters)
-- =====================================================

CREATE TABLE mascots (
    id TEXT PRIMARY KEY,  -- matches characters.id for mascot characters
    name VARCHAR(100) NOT NULL,  -- kept for readability
    quality_tier TEXT NOT NULL CHECK (quality_tier IN ('great', 'good', 'decent', 'meh', 'thoughts_and_prayers')),
    base_stats JSONB NOT NULL DEFAULT '{}',  -- {"attack": 6, "confidence": 8}
    team_buff JSONB,  -- {"rage_proc": 5} or null
    enemy_debuff JSONB,  -- {"fear": 5} or null
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. MAKE COMBAT STAT COLUMNS NULLABLE ON CHARACTERS TABLE
-- (System characters like mascots, judges, therapists don't fight)
-- =====================================================

-- Combat stats
ALTER TABLE characters ALTER COLUMN max_health DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN attack DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN defense DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN speed DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN magic_attack DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN magic_defense DROP NOT NULL;

-- Attribute stats
ALTER TABLE characters ALTER COLUMN strength DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN dexterity DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN max_energy DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN intelligence DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN wisdom DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN charisma DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN spirit DROP NOT NULL;

-- Combat modifiers
ALTER TABLE characters ALTER COLUMN critical_chance DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN critical_damage DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN accuracy DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN evasion DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN max_mana DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN energy_regen DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN endurance DROP NOT NULL;

-- Battle images (non-combatants don't need these)
ALTER TABLE characters ALTER COLUMN battle_image_name DROP NOT NULL;
ALTER TABLE characters ALTER COLUMN battle_image_variants DROP NOT NULL;

-- =====================================================
-- 3. UPDATE CHECK CONSTRAINT: STATS REQUIRED ONLY FOR CONTESTANTS
-- (Drop existing and recreate with disease_resistance included)
-- =====================================================

ALTER TABLE characters DROP CONSTRAINT IF EXISTS chk_contestant_combat_stats;

ALTER TABLE characters
ADD CONSTRAINT chk_contestant_combat_stats
CHECK (
    role != 'contestant' OR (
        max_health IS NOT NULL AND
        attack IS NOT NULL AND
        defense IS NOT NULL AND
        speed IS NOT NULL AND
        magic_attack IS NOT NULL AND
        magic_defense IS NOT NULL AND
        strength IS NOT NULL AND
        dexterity IS NOT NULL AND
        max_energy IS NOT NULL AND
        intelligence IS NOT NULL AND
        wisdom IS NOT NULL AND
        charisma IS NOT NULL AND
        spirit IS NOT NULL AND
        critical_chance IS NOT NULL AND
        critical_damage IS NOT NULL AND
        accuracy IS NOT NULL AND
        evasion IS NOT NULL AND
        max_mana IS NOT NULL AND
        energy_regen IS NOT NULL AND
        endurance IS NOT NULL AND
        disease_resistance IS NOT NULL AND
        battle_image_name IS NOT NULL AND
        battle_image_variants IS NOT NULL
    )
);

-- =====================================================
-- 4. ADD SYSTEM CHARACTER FK COLUMNS TO USER_CHARACTERS
-- (For direct bonus lookups without joining through characters table)
-- Only ONE of these will be populated per row, based on role
-- =====================================================

ALTER TABLE user_characters
    ADD COLUMN mascot_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN judge_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN host_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_id TEXT REFERENCES characters(id) ON DELETE SET NULL;

-- Partial indexes for efficient FK lookups
CREATE INDEX idx_uc_mascot_id ON user_characters(mascot_id) WHERE mascot_id IS NOT NULL;
CREATE INDEX idx_uc_judge_id ON user_characters(judge_id) WHERE judge_id IS NOT NULL;
CREATE INDEX idx_uc_therapist_id ON user_characters(therapist_id) WHERE therapist_id IS NOT NULL;
CREATE INDEX idx_uc_trainer_id ON user_characters(trainer_id) WHERE trainer_id IS NOT NULL;
CREATE INDEX idx_uc_host_id ON user_characters(host_id) WHERE host_id IS NOT NULL;
CREATE INDEX idx_uc_real_estate_agent_id ON user_characters(real_estate_agent_id) WHERE real_estate_agent_id IS NOT NULL;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (307, '307_mascots_table_and_system_char_fks')
ON CONFLICT (version) DO NOTHING;
