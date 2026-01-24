-- Migration 143: Fix trailing spaces in IDs
-- Bug introduced in commit 38154e39 (Nov 21) - trailing spaces added to ID generation
-- Affected: user_characters.id, user_characters.serial_number, battles.id, user_equipment.id

BEGIN;

-- Temporarily disable FK constraint checks so we can update PKs and FKs together
-- SET session_replication_role = replica;

-- 1. Update PKs FIRST (now safe with FK checks disabled)
UPDATE user_characters SET id = TRIM(id) WHERE id LIKE '% ';
UPDATE user_characters SET serial_number = TRIM(serial_number) WHERE serial_number LIKE '% ';
UPDATE battles SET id = TRIM(id) WHERE id LIKE '% ';
UPDATE user_equipment SET id = TRIM(id) WHERE id LIKE '% ';

-- 2. Update FK references

-- References to user_characters.id
UPDATE character_powers SET character_id = TRIM(character_id) WHERE character_id LIKE '% ';
UPDATE character_spells SET character_id = TRIM(character_id) WHERE character_id LIKE '% ';
UPDATE character_equipment SET character_id = TRIM(character_id) WHERE character_id LIKE '% ';
UPDATE character_power_loadout SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE character_spell_loadout SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE challenge_participants SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE challenge_leaderboard SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE distributed_challenge_rewards SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE financial_decisions SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE bond_activity_log SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE character_decisions SET character_id = TRIM(character_id) WHERE character_id LIKE '% ';
UPDATE cardano_nft_metadata SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE cardano_staking_positions SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';

-- References in battles table (both as FK and own columns)
UPDATE battles SET user_character_id = TRIM(user_character_id) WHERE user_character_id LIKE '% ';
UPDATE battles SET opponent_character_id = TRIM(opponent_character_id) WHERE opponent_character_id LIKE '% ';

-- References to battles.id
UPDATE social_messages SET battle_id = TRIM(battle_id) WHERE battle_id LIKE '% ';

-- References in social_messages
UPDATE social_messages SET author_character_id = TRIM(author_character_id) WHERE author_character_id LIKE '% ';
UPDATE social_messages SET target_character_id = TRIM(target_character_id) WHERE target_character_id LIKE '% ';

-- Re-enable FK constraint checks
-- SET session_replication_role = DEFAULT;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (143, '143_trim_trailing_spaces_from_ids') ON CONFLICT (version) DO NOTHING;

COMMIT;
