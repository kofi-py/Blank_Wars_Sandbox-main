-- Migration 197: Fix Sleeping Arrangement System
--
-- Problem: The sleeping system was partially built but broken:
-- 1. room_beds migration 117 failed (UUID/TEXT type mismatch) - table doesn't exist
-- 2. character_living_context table is dead - never populated
-- 3. masterBedConflictService.ts reads dead table, never called
-- 4. user_characters.sleeping_arrangement never updated (stuck at default)
-- 5. BED_HIERARCHY hardcoded in headquartersService.ts instead of DB
--
-- Solution: Create proper tables, triggers, and cleanup dead code

-- ============================================================================
-- STEP 1: Create sleeping_spot_types lookup table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sleeping_spot_types (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    mood_modifier INTEGER NOT NULL,
    comfort_tier INTEGER NOT NULL,  -- 1=best, 5=worst (for assignment priority)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sleeping_spot_types IS 'Lookup table for bed/sleeping spot types with mood modifiers and comfort rankings';

INSERT INTO sleeping_spot_types (id, display_name, mood_modifier, comfort_tier) VALUES
    ('master_bed', 'Master Bed', 10, 1),
    ('bed', 'Bed', 10, 1),  -- Legacy alias for master_bed
    ('bunk_bed', 'Bunk Bed', 2, 2),
    ('coffin', 'Coffin', 0, 2),
    ('couch', 'Couch', -2, 3),
    ('air_mattress', 'Air Mattress', -5, 4),
    ('floor', 'Floor', -10, 5)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    mood_modifier = EXCLUDED.mood_modifier,
    comfort_tier = EXCLUDED.comfort_tier;

-- ============================================================================
-- STEP 2: Create room_beds table (fixes failed migration 117)
-- Key fix: room_id is TEXT to match headquarters_rooms.id
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_beds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT NOT NULL,
    bed_id TEXT NOT NULL,
    bed_type TEXT NOT NULL,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    comfort_bonus INTEGER DEFAULT 0,
    character_id TEXT,
    stat_modifier_type TEXT DEFAULT 'morale',
    stat_modifier_value INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT room_beds_room_id_fkey
        FOREIGN KEY (room_id) REFERENCES headquarters_rooms(id) ON DELETE CASCADE,
    CONSTRAINT room_beds_bed_type_fkey
        FOREIGN KEY (bed_type) REFERENCES sleeping_spot_types(id),
    CONSTRAINT room_beds_character_id_fkey
        FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_room_beds_room_id ON room_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_room_beds_character_id ON room_beds(character_id);
CREATE INDEX IF NOT EXISTS idx_room_beds_bed_type ON room_beds(bed_type);

COMMENT ON TABLE room_beds IS 'Individual sleeping spots within HQ rooms. Character assignment syncs to user_characters.sleeping_arrangement via trigger.';

-- ============================================================================
-- STEP 3: Create trigger to sync room_beds → user_characters.sleeping_arrangement
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_sleeping_arrangement()
RETURNS TRIGGER AS $$
BEGIN
    -- When character assigned to bed, update their sleeping_arrangement
    IF NEW.character_id IS NOT NULL THEN
        UPDATE user_characters
        SET sleeping_arrangement = NEW.bed_type
        WHERE id = NEW.character_id;
    END IF;

    -- When character removed from bed (either nulled or reassigned), set old character to floor
    IF TG_OP = 'UPDATE' AND OLD.character_id IS NOT NULL
       AND (NEW.character_id IS NULL OR OLD.character_id != NEW.character_id) THEN
        UPDATE user_characters
        SET sleeping_arrangement = 'floor'
        WHERE id = OLD.character_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sleeping_arrangement ON room_beds;

CREATE TRIGGER trg_sync_sleeping_arrangement
AFTER INSERT OR UPDATE ON room_beds
FOR EACH ROW EXECUTE FUNCTION sync_sleeping_arrangement();

-- ============================================================================
-- STEP 4: Delete dead character_living_context table
-- ============================================================================

DROP TABLE IF EXISTS character_living_context CASCADE;

-- ============================================================================
-- STEP 5: Delete redundant team_context.master_bed_character_id column
-- ============================================================================

ALTER TABLE team_context DROP COLUMN IF EXISTS master_bed_character_id;

-- ============================================================================
-- STEP 6: Drop legacy characters.default_mood column (replaced by calculate_current_mood)
-- ============================================================================

ALTER TABLE characters DROP COLUMN IF EXISTS default_mood;

-- ============================================================================
-- STEP 7: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (197, '197_fix_sleeping_arrangement_system')
ON CONFLICT (version) DO NOTHING;
