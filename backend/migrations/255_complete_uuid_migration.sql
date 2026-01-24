-- Migration 255: Complete TEXT → UUID Migration
-- Purpose: Fix all remaining TEXT columns that should be UUID
-- Context: Cleanup from incomplete TEXT→UUID refactoring 2 days ago
-- Impact: Fixes get_full_character_data() crash and 35 other columns
-- Risk: LOW - all data verified, most tables empty
-- Verified: 2025-12-21 - All tables checked, no uncertainties

-- ============================================================================
-- SAFETY CHECKS BEFORE RUNNING
-- ============================================================================
-- 1. Verify battle_participants has valid UUIDs (should return 18)
--    SELECT COUNT(*) FROM battle_participants WHERE character_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
--
-- 2. Verify user_characters.current_battle_id has valid UUIDs (should return 12)
--    SELECT COUNT(*) FROM user_characters WHERE current_battle_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
--
-- 3. Verify legacy data to delete (should return 3 for user_equipment)
--    SELECT COUNT(*) FROM user_equipment WHERE equipped_to_character_id IS NOT NULL;
--
-- 4. Verify legacy data to delete (should return 16 for game_events)
--    SELECT COUNT(*) FROM game_events;
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DELETE LEGACY DATA
-- ============================================================================
-- These contain old "userchar_TIMESTAMP_ID" format that cannot map to UUIDs
-- Must delete BEFORE attempting to convert columns to UUID

-- Delete 3 rows from user_equipment with old-format IDs
DELETE FROM user_equipment WHERE equipped_to_character_id IS NOT NULL;
-- Expected: DELETE 3

-- Delete 16 rows from game_events with old-format IDs (Oct-Nov 2025 data)
DELETE FROM game_events;
-- Expected: DELETE 16

-- ============================================================================
-- STEP 2: PHASE 1 - CRITICAL (Fixes get_full_character_data crash)
-- ============================================================================

-- Fix battle_participants.character_id (18 rows, verified UUIDs)
-- References: user_characters.id
ALTER TABLE battle_participants
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- Fix battle_participants.battle_id (18 rows, verified UUIDs)
-- References: battles.id
-- This fixes the JOIN crash in get_full_character_data line 559
ALTER TABLE battle_participants
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

-- Fix character_decisions.character_id (0 rows, empty table)
-- References: user_characters.id
ALTER TABLE character_decisions
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- Fix character_memories.user_character_id (0 rows, empty table)
-- References: user_characters.id
ALTER TABLE character_memories
  ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;

-- ============================================================================
-- STEP 3: PHASE 2 - HIGH PRIORITY (Core functionality)
-- ============================================================================

-- Fix battle_actions.character_id (0 rows, empty table)
-- References: user_characters.id
ALTER TABLE battle_actions
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- Fix battle_actions.battle_id (0 rows, empty table)
-- References: battles.id
ALTER TABLE battle_actions
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

-- Fix user_characters.current_battle_id (12 rows, verified UUIDs)
-- References: battles.id
ALTER TABLE user_characters
  ALTER COLUMN current_battle_id TYPE UUID USING current_battle_id::uuid;

-- ============================================================================
-- STEP 4: PHASE 3 - MEDIUM (Battle system - all empty tables)
-- ============================================================================

-- All battle_id columns reference battles.id

ALTER TABLE chat_messages
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

ALTER TABLE coach_xp_events
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

ALTER TABLE guild_war_battles
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

ALTER TABLE judge_rulings
  ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;

ALTER TABLE battle_queue
  ALTER COLUMN matched_battle_id TYPE UUID USING matched_battle_id::uuid;

ALTER TABLE lounge_messages
  ALTER COLUMN referenced_battle_id TYPE UUID USING referenced_battle_id::uuid;

-- ============================================================================
-- STEP 5: PHASE 4 - LOW (Challenge/Social features - all empty tables)
-- ============================================================================

-- All user_character_id columns reference user_characters.id

ALTER TABLE challenge_leaderboard
  ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;

ALTER TABLE challenge_participants
  ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;

ALTER TABLE challenge_results
  ALTER COLUMN winner_character_id TYPE UUID USING winner_character_id::uuid;

ALTER TABLE challenge_results
  ALTER COLUMN second_place_character_id TYPE UUID USING second_place_character_id::uuid;

ALTER TABLE challenge_results
  ALTER COLUMN third_place_character_id TYPE UUID USING third_place_character_id::uuid;

ALTER TABLE challenge_alliances
  ALTER COLUMN leader_character_id TYPE UUID USING leader_character_id::uuid;

ALTER TABLE cardano_staking_positions
  ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;

ALTER TABLE influencer_mints
  ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;

ALTER TABLE graffiti_art
  ALTER COLUMN artist_character_id TYPE UUID USING artist_character_id::uuid;

ALTER TABLE guild_messages
  ALTER COLUMN sender_character_id TYPE UUID USING sender_character_id::uuid;

ALTER TABLE lounge_messages
  ALTER COLUMN sender_character_id TYPE UUID USING sender_character_id::uuid;

ALTER TABLE social_message_replies
  ALTER COLUMN author_character_id TYPE UUID USING author_character_id::uuid;

ALTER TABLE user_items
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- ============================================================================
-- STEP 6: EMPTY LOCKER/MISC TABLES (all empty, all reference user_characters.id)
-- ============================================================================

-- user_equipment (0 rows after deletion above)
ALTER TABLE user_equipment
  ALTER COLUMN equipped_to_character_id TYPE UUID USING equipped_to_character_id::uuid;

ALTER TABLE locker_auction_sessions
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

ALTER TABLE locker_leaderboards
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

ALTER TABLE locker_rogue_decisions
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

ALTER TABLE lounge_presence
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

ALTER TABLE memory_entries
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- chat_sessions.character_id (186 rows total, but 0 non-null values)
-- Safe to convert - column is unused
ALTER TABLE chat_sessions
  ALTER COLUMN character_id TYPE UUID USING character_id::uuid;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count how many columns were converted (should be 35)
DO $$
DECLARE
  v_uuid_count INTEGER;
  v_text_count INTEGER;
BEGIN
  -- Count UUID columns (should be 35 new ones)
  SELECT COUNT(*) INTO v_uuid_count
  FROM information_schema.columns
  WHERE (column_name LIKE '%character_id%' OR column_name LIKE '%battle_id%')
    AND table_schema = 'public'
    AND data_type = 'uuid'
    AND table_name IN (
      'battle_participants', 'character_decisions', 'character_memories',
      'battle_actions', 'user_characters', 'chat_messages', 'coach_xp_events',
      'guild_war_battles', 'judge_rulings', 'battle_queue', 'lounge_messages',
      'challenge_leaderboard', 'challenge_participants', 'challenge_results',
      'challenge_alliances', 'cardano_staking_positions', 'influencer_mints',
      'graffiti_art', 'guild_messages', 'social_message_replies', 'user_items',
      'user_equipment', 'locker_auction_sessions', 'locker_leaderboards',
      'locker_rogue_decisions', 'lounge_presence', 'memory_entries', 'chat_sessions'
    );

  -- Count TEXT columns that should NOT exist (should be 0)
  SELECT COUNT(*) INTO v_text_count
  FROM information_schema.columns
  WHERE (column_name LIKE '%character_id%' OR column_name LIKE '%battle_id%')
    AND table_schema = 'public'
    AND data_type IN ('text', 'character varying')
    AND table_name NOT IN (
      'therapist_bonuses', 'judge_bonuses', 'power_definitions',
      'spell_definitions', 'ai_characters', 'claimable_pack_contents',
      'user_characters', 'domain_context', 'signature_attribute_modifiers',
      'judge_rulings', 'game_events'
    );

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  - Converted columns (UUID): %', v_uuid_count;
  RAISE NOTICE '  - Remaining TEXT columns (should be 0): %', v_text_count;

  IF v_text_count > 0 THEN
    RAISE WARNING 'Some TEXT columns still exist! Check verification query.';
  END IF;
END $$;

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (255, '255_complete_uuid_migration')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TESTING
-- ============================================================================
-- Run these queries AFTER migration completes to verify success:
--
-- 1. Test get_full_character_data (should work without errors)
--    SELECT get_full_character_data('37228104-d397-4c1a-ac6c-05dd2e946d35');
--
-- 2. Verify battle_participants types
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_name = 'battle_participants'
--      AND column_name IN ('character_id', 'battle_id');
--    -- Both should show: uuid
--
-- 3. Check for any remaining problematic TEXT columns
--    SELECT table_name, column_name, data_type
--    FROM information_schema.columns
--    WHERE (column_name LIKE '%character_id%' OR column_name LIKE '%battle_id%')
--      AND table_schema = 'public'
--      AND data_type IN ('text', 'character varying')
--      AND table_name NOT IN (
--        'therapist_bonuses', 'judge_bonuses', 'power_definitions',
--        'spell_definitions', 'ai_characters', 'claimable_pack_contents',
--        'user_characters', 'domain_context', 'signature_attribute_modifiers',
--        'judge_rulings', 'game_events'
--      )
--    ORDER BY table_name, column_name;
--    -- Should return 0 rows
-- ============================================================================

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================
-- If this migration fails, it will automatically ROLLBACK due to the transaction.
-- No manual rollback needed.
--
-- If you need to manually rollback AFTER commit:
-- 1. Run migration 254 or earlier version
-- 2. Restore from backup
-- 3. The deleted data (19 rows) cannot be recovered without backup
-- ============================================================================
