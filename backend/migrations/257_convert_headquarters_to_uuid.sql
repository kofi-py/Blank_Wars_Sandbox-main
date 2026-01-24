-- Migration 257: Convert headquarters tables from TEXT to UUID
-- Purpose: User table IDs should be UUID (user-specific instances), not TEXT
-- Affects: user_headquarters.id, headquarters_rooms.id, room_beds.id, and their FKs

BEGIN;

-- ============================================================================
-- STEP 1: Drop constraints that block type conversion
-- ============================================================================

-- Drop FK from headquarters_rooms to user_headquarters
ALTER TABLE headquarters_rooms DROP CONSTRAINT IF EXISTS headquarters_rooms_headquarters_id_fkey;

-- Drop FK from room_beds to headquarters_rooms
ALTER TABLE room_beds DROP CONSTRAINT IF EXISTS room_beds_room_id_fkey;

-- ============================================================================
-- STEP 2: Drop defaults that can't be auto-converted
-- ============================================================================

ALTER TABLE user_headquarters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE headquarters_rooms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE room_beds ALTER COLUMN id DROP DEFAULT;

-- ============================================================================
-- STEP 3: Convert types (PKs and FKs)
-- ============================================================================

-- Convert user_headquarters
ALTER TABLE user_headquarters
ALTER COLUMN id TYPE UUID USING id::uuid;

-- Convert headquarters_rooms
ALTER TABLE headquarters_rooms
ALTER COLUMN id TYPE UUID USING id::uuid,
ALTER COLUMN headquarters_id TYPE UUID USING headquarters_id::uuid;

-- Convert room_beds
ALTER TABLE room_beds
ALTER COLUMN id TYPE UUID USING id::uuid,
ALTER COLUMN room_id TYPE UUID USING room_id::uuid;

-- ============================================================================
-- STEP 4: Restore defaults
-- ============================================================================

ALTER TABLE user_headquarters ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE headquarters_rooms ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE room_beds ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================================
-- STEP 5: Recreate constraints
-- ============================================================================

ALTER TABLE headquarters_rooms
ADD CONSTRAINT headquarters_rooms_headquarters_id_fkey
FOREIGN KEY (headquarters_id) REFERENCES user_headquarters(id) ON DELETE CASCADE;

ALTER TABLE room_beds
ADD CONSTRAINT room_beds_room_id_fkey
FOREIGN KEY (room_id) REFERENCES headquarters_rooms(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 6: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (257, '257_convert_headquarters_to_uuid')
ON CONFLICT (version) DO NOTHING;

COMMIT;