-- Migration 259: Backfill Headquarters for All Users
-- Purpose: Create initial headquarters for all existing users
-- Context: Registration never created HQ - fixes therapy module crash
-- Impact: Creates HQ for 141 users, assigns 414 characters to beds

BEGIN;

-- ============================================================================
-- STEP 0: Fix headquarters_rooms constraint to allow living_room
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE headquarters_rooms
DROP CONSTRAINT IF EXISTS headquarters_rooms_room_type_check;

-- Add it back with living_room included
ALTER TABLE headquarters_rooms
ADD CONSTRAINT headquarters_rooms_room_type_check
CHECK (room_type = ANY (ARRAY[
  'bedroom'::text,
  'kitchen'::text,
  'training_room'::text,
  'lounge'::text,
  'living_room'::text,
  'office'::text,
  'storage'::text,
  'medical_bay'::text,
  'trophy_room'::text,
  'library'::text,
  'workshop'::text
]));

-- ============================================================================
-- STEP 1: Create headquarters for all users
-- ============================================================================

INSERT INTO user_headquarters (id, user_id, tier_id, balance, gems, unlocked_themes, is_primary, created_at, updated_at)
SELECT
  gen_random_uuid() as id,
  u.id as user_id,
  (ARRAY['your_parents_basement', 'radioactive_roach_motel', 'hobo_camp'])[floor(random() * 3 + 1)::int] as tier_id,
  50000 as balance,
  100 as gems,
  '[]'::jsonb as unlocked_themes,
  true as is_primary,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_headquarters uh WHERE uh.user_id = u.id
);

-- ============================================================================
-- STEP 2: Create rooms for each headquarters (3 rooms per HQ)
-- ============================================================================

-- Bedroom 1 (bunk bed room)
INSERT INTO headquarters_rooms (id, headquarters_id, room_id, room_type, capacity, occupied_slots, theme, furniture, assigned_characters, position_x, position_y, width, height, created_at)
SELECT
  gen_random_uuid() as id,
  uh.id as headquarters_id,
  'bedroom_1' as room_id,
  'bedroom' as room_type,
  2 as capacity,
  0 as occupied_slots,
  'default' as theme,
  '[]'::jsonb as furniture,
  '[]'::jsonb as assigned_characters,
  0 as position_x,
  0 as position_y,
  1 as width,
  1 as height,
  CURRENT_TIMESTAMP as created_at
FROM user_headquarters uh;

-- Bedroom 2 (master bed room)
INSERT INTO headquarters_rooms (id, headquarters_id, room_id, room_type, capacity, occupied_slots, theme, furniture, assigned_characters, position_x, position_y, width, height, created_at)
SELECT
  gen_random_uuid() as id,
  uh.id as headquarters_id,
  'bedroom_2' as room_id,
  'bedroom' as room_type,
  1 as capacity,
  0 as occupied_slots,
  'default' as theme,
  '[]'::jsonb as furniture,
  '[]'::jsonb as assigned_characters,
  1 as position_x,
  0 as position_y,
  1 as width,
  1 as height,
  CURRENT_TIMESTAMP as created_at
FROM user_headquarters uh;

-- Living Room (couch room)
INSERT INTO headquarters_rooms (id, headquarters_id, room_id, room_type, capacity, occupied_slots, theme, furniture, assigned_characters, position_x, position_y, width, height, created_at)
SELECT
  gen_random_uuid() as id,
  uh.id as headquarters_id,
  'living_room' as room_id,
  'living_room' as room_type,
  1 as capacity,
  0 as occupied_slots,
  'default' as theme,
  '[]'::jsonb as furniture,
  '[]'::jsonb as assigned_characters,
  0 as position_x,
  1 as position_y,
  1 as width,
  1 as height,
  CURRENT_TIMESTAMP as created_at
FROM user_headquarters uh;

-- ============================================================================
-- STEP 3: Create beds in each room (3 beds total per HQ)
-- ============================================================================

-- Bunk bed in Bedroom 1 (capacity 2)
INSERT INTO room_beds (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value, created_at)
SELECT
  gen_random_uuid() as id,
  hr.id as room_id,
  'bunk_bed_1' as bed_id,
  'bunk_bed' as bed_type,
  0 as position_x,
  0 as position_y,
  2 as capacity,
  0 as comfort_bonus,
  NULL as character_id,
  'morale' as stat_modifier_type,
  2 as stat_modifier_value,
  CURRENT_TIMESTAMP as created_at
FROM headquarters_rooms hr
WHERE hr.room_id = 'bedroom_1';

-- Master bed in Bedroom 2 (capacity 1)
INSERT INTO room_beds (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value, created_at)
SELECT
  gen_random_uuid() as id,
  hr.id as room_id,
  'master_bed_1' as bed_id,
  'master_bed' as bed_type,
  0 as position_x,
  0 as position_y,
  1 as capacity,
  0 as comfort_bonus,
  NULL as character_id,
  'morale' as stat_modifier_type,
  10 as stat_modifier_value,
  CURRENT_TIMESTAMP as created_at
FROM headquarters_rooms hr
WHERE hr.room_id = 'bedroom_2';

-- Couch in Living Room (capacity 1)
INSERT INTO room_beds (id, room_id, bed_id, bed_type, position_x, position_y, capacity, comfort_bonus, character_id, stat_modifier_type, stat_modifier_value, created_at)
SELECT
  gen_random_uuid() as id,
  hr.id as room_id,
  'couch_1' as bed_id,
  'couch' as bed_type,
  0 as position_x,
  0 as position_y,
  1 as capacity,
  0 as comfort_bonus,
  NULL as character_id,
  'morale' as stat_modifier_type,
  -2 as stat_modifier_value,
  CURRENT_TIMESTAMP as created_at
FROM headquarters_rooms hr
WHERE hr.room_id = 'living_room';

-- ============================================================================
-- STEP 4: Set headquarters_id on all user_characters to their actual HQ id
-- ============================================================================

UPDATE user_characters uc
SET headquarters_id = uh.id
FROM user_headquarters uh
WHERE uc.user_id = uh.user_id
  AND uc.headquarters_id IS NULL
  AND uh.is_primary = true;

-- ============================================================================
-- STEP 5: Assign characters to beds (first-come-first-serve by created_at)
-- ============================================================================

-- Assign 1st character (oldest created_at) to master bed
WITH ranked_chars AS (
  SELECT
    uc.id as char_id,
    uc.user_id,
    ROW_NUMBER() OVER (PARTITION BY uc.user_id ORDER BY uc.id ASC) as rank
  FROM user_characters uc
  WHERE uc.headquarters_id IS NOT NULL
),
master_beds AS (
  SELECT
    rb.id as bed_id,
    hr.headquarters_id,
    uh.user_id
  FROM room_beds rb
  JOIN headquarters_rooms hr ON rb.room_id = hr.id
  JOIN user_headquarters uh ON hr.headquarters_id = uh.id
  WHERE rb.bed_type = 'master_bed'
)
UPDATE room_beds rb
SET character_id = rc.char_id
FROM ranked_chars rc
JOIN master_beds mb ON mb.user_id = rc.user_id
WHERE rb.id = mb.bed_id
  AND rc.rank = 1;

-- Assign 2nd and 3rd characters to bunk bed (capacity 2)
WITH ranked_chars AS (
  SELECT
    uc.id as char_id,
    uc.user_id,
    ROW_NUMBER() OVER (PARTITION BY uc.user_id ORDER BY uc.id ASC) as rank
  FROM user_characters uc
  WHERE uc.headquarters_id IS NOT NULL
),
bunk_beds AS (
  SELECT
    rb.id as bed_id,
    hr.headquarters_id,
    uh.user_id
  FROM room_beds rb
  JOIN headquarters_rooms hr ON rb.room_id = hr.id
  JOIN user_headquarters uh ON hr.headquarters_id = uh.id
  WHERE rb.bed_type = 'bunk_bed'
)
UPDATE room_beds rb
SET character_id = rc.char_id
FROM ranked_chars rc
JOIN bunk_beds bb ON bb.user_id = rc.user_id
WHERE rb.id = bb.bed_id
  AND rc.rank IN (2, 3);

-- Assign 4th character to couch
WITH ranked_chars AS (
  SELECT
    uc.id as char_id,
    uc.user_id,
    ROW_NUMBER() OVER (PARTITION BY uc.user_id ORDER BY uc.id ASC) as rank
  FROM user_characters uc
  WHERE uc.headquarters_id IS NOT NULL
),
couches AS (
  SELECT
    rb.id as bed_id,
    hr.headquarters_id,
    uh.user_id
  FROM room_beds rb
  JOIN headquarters_rooms hr ON rb.room_id = hr.id
  JOIN user_headquarters uh ON hr.headquarters_id = uh.id
  WHERE rb.bed_type = 'couch'
)
UPDATE room_beds rb
SET character_id = rc.char_id
FROM ranked_chars rc
JOIN couches c ON c.user_id = rc.user_id
WHERE rb.id = c.bed_id
  AND rc.rank = 4;

-- Note: Characters 5+ will be assigned to floor dynamically by the system

-- ============================================================================
-- STEP 6: Verify migration
-- ============================================================================

DO $$
DECLARE
  hq_count INTEGER;
  room_count INTEGER;
  bed_count INTEGER;
  assigned_char_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO hq_count FROM user_headquarters;
  SELECT COUNT(*) INTO room_count FROM headquarters_rooms;
  SELECT COUNT(*) INTO bed_count FROM room_beds;
  SELECT COUNT(*) INTO assigned_char_count FROM user_characters WHERE headquarters_id IS NOT NULL;

  RAISE NOTICE 'Migration 259 Complete:';
  RAISE NOTICE '  - Headquarters created: %', hq_count;
  RAISE NOTICE '  - Rooms created: %', room_count;
  RAISE NOTICE '  - Beds created: %', bed_count;
  RAISE NOTICE '  - Characters assigned to HQ: %', assigned_char_count;
END $$;

-- ============================================================================
-- STEP 7: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (259, '259_backfill_headquarters')
ON CONFLICT (version) DO NOTHING;

COMMIT;
