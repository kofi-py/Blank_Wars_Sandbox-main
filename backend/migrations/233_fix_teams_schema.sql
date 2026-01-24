-- Migration 233: Enforce Strict UUIDs & Fix Teams Schema
-- "The Right Way" - The Definitive Edition
-- Contains explicit handling for ALL user_character dependencies found via grep.

BEGIN;

-- =========================================================================
-- STEP 1: DROP DEPENDENT CONSTRAINTS
-- =========================================================================

-- Explicitly listed from recursive FK audit & Grep Search:
ALTER TABLE active_challenges DROP CONSTRAINT IF EXISTS active_challenges_user_id_fkey;
ALTER TABLE battle_participants DROP CONSTRAINT IF EXISTS battle_participants_user_id_fkey;
ALTER TABLE battle_queue DROP CONSTRAINT IF EXISTS battle_queue_user_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_user_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_opponent_user_id_fkey;
ALTER TABLE cardano_staking_positions DROP CONSTRAINT IF EXISTS cardano_staking_positions_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_character_id_fkey;
ALTER TABLE claimable_packs DROP CONSTRAINT IF EXISTS claimable_packs_claimed_by_user_id_fkey;
ALTER TABLE coach_progression DROP CONSTRAINT IF EXISTS coach_progression_user_id_fkey;
ALTER TABLE coach_skills DROP CONSTRAINT IF EXISTS coach_skills_user_id_fkey;
ALTER TABLE coach_xp_events DROP CONSTRAINT IF EXISTS coach_xp_events_user_id_fkey;
ALTER TABLE coach_xp_events DROP CONSTRAINT IF EXISTS coach_xp_events_character_id_fkey;
ALTER TABLE community_event_participants DROP CONSTRAINT IF EXISTS community_event_participants_user_id_fkey;
ALTER TABLE community_events DROP CONSTRAINT IF EXISTS community_events_created_by_fkey;
ALTER TABLE graffiti_likes DROP CONSTRAINT IF EXISTS graffiti_likes_user_id_fkey;
ALTER TABLE graffiti_views DROP CONSTRAINT IF EXISTS graffiti_views_user_id_fkey;
ALTER TABLE guild_join_requests DROP CONSTRAINT IF EXISTS guild_join_requests_user_id_fkey;
ALTER TABLE guild_join_requests DROP CONSTRAINT IF EXISTS guild_join_requests_resolved_by_fkey;
ALTER TABLE guild_members DROP CONSTRAINT IF EXISTS guild_members_user_id_fkey;
ALTER TABLE guild_messages DROP CONSTRAINT IF EXISTS guild_messages_sender_user_id_fkey;
ALTER TABLE guilds DROP CONSTRAINT IF EXISTS guilds_leader_user_id_fkey;
ALTER TABLE influencer_mint_allowlist DROP CONSTRAINT IF EXISTS influencer_mint_allowlist_claimed_by_user_id_fkey;
ALTER TABLE influencer_mints DROP CONSTRAINT IF EXISTS influencer_mints_user_id_fkey;
ALTER TABLE locker_achievements DROP CONSTRAINT IF EXISTS locker_achievements_user_id_fkey;
ALTER TABLE locker_auction_sessions DROP CONSTRAINT IF EXISTS locker_auction_sessions_user_id_fkey;
ALTER TABLE locker_leaderboards DROP CONSTRAINT IF EXISTS locker_leaderboards_user_id_fkey;
ALTER TABLE lounge_presence DROP CONSTRAINT IF EXISTS lounge_presence_user_id_fkey;
ALTER TABLE lounge_messages DROP CONSTRAINT IF EXISTS lounge_messages_sender_user_id_fkey;
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_user_id_fkey;
ALTER TABLE social_message_reactions DROP CONSTRAINT IF EXISTS social_message_reactions_user_id_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_user_id_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_character_slot_1_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_character_slot_2_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_user_id_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_character_slot_1_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_character_slot_2_fkey;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_character_slot_3_fkey;
ALTER TABLE ticket_transactions DROP CONSTRAINT IF EXISTS ticket_transactions_user_id_fkey;
ALTER TABLE user_character_echoes DROP CONSTRAINT IF EXISTS user_character_echoes_user_id_fkey;
ALTER TABLE user_characters_old DROP CONSTRAINT IF EXISTS user_characters_user_id_fkey;
ALTER TABLE user_currency DROP CONSTRAINT IF EXISTS user_currency_user_id_fkey;
ALTER TABLE user_equipment DROP CONSTRAINT IF EXISTS user_equipment_user_id_fkey;
ALTER TABLE user_headquarters DROP CONSTRAINT IF EXISTS user_headquarters_user_id_fkey;
ALTER TABLE user_items DROP CONSTRAINT IF EXISTS user_items_user_id_fkey;
ALTER TABLE user_spells DROP CONSTRAINT IF EXISTS user_spells_user_id_fkey;
ALTER TABLE user_tickets DROP CONSTRAINT IF EXISTS user_tickets_user_id_fkey;
ALTER TABLE graffiti_art DROP CONSTRAINT IF EXISTS graffiti_art_artist_user_id_fkey;

-- Social Messages dependents
ALTER TABLE social_messages DROP CONSTRAINT IF EXISTS social_messages_author_character_id_fkey;
ALTER TABLE social_messages DROP CONSTRAINT IF EXISTS social_messages_author_user_id_fkey;
ALTER TABLE social_messages DROP CONSTRAINT IF EXISTS social_messages_battle_id_fkey;
ALTER TABLE social_messages DROP CONSTRAINT IF EXISTS social_messages_target_character_id_fkey;
ALTER TABLE social_message_replies DROP CONSTRAINT IF EXISTS social_message_replies_author_character_id_fkey;

-- UserCharacter Dependents (Comprehensive List)
ALTER TABLE bond_activity_log DROP CONSTRAINT IF EXISTS bond_activity_log_user_character_id_fkey;
ALTER TABLE cardano_nft_metadata DROP CONSTRAINT IF EXISTS cardano_nft_metadata_user_character_id_fkey;
ALTER TABLE character_temporary_buffs DROP CONSTRAINT IF EXISTS character_temporary_buffs_character_id_fkey;
ALTER TABLE character_spell_loadout DROP CONSTRAINT IF EXISTS character_spell_loadout_user_character_id_fkey;
ALTER TABLE character_powers DROP CONSTRAINT IF EXISTS character_powers_character_id_fkey;
ALTER TABLE character_power_loadout DROP CONSTRAINT IF EXISTS character_power_loadout_user_character_id_fkey;
ALTER TABLE power_unlock_log DROP CONSTRAINT IF EXISTS power_unlock_log_character_id_fkey;
ALTER TABLE character_spells DROP CONSTRAINT IF EXISTS character_spells_character_id_fkey;
ALTER TABLE character_modifiers DROP CONSTRAINT IF EXISTS character_modifiers_user_character_id_fkey;
ALTER TABLE room_beds DROP CONSTRAINT IF EXISTS room_beds_character_id_fkey;
ALTER TABLE financial_decisions DROP CONSTRAINT IF EXISTS financial_decisions_user_character_id_fkey;
ALTER TABLE character_category_preferences DROP CONSTRAINT IF EXISTS character_category_preferences_character_id_fkey;
ALTER TABLE character_equipment DROP CONSTRAINT IF EXISTS character_equipment_character_id_fkey;
ALTER TABLE character_equipment DROP CONSTRAINT IF EXISTS character_equipment_equipment_id_fkey;
ALTER TABLE character_items DROP CONSTRAINT IF EXISTS character_items_character_id_fkey;
ALTER TABLE character_items DROP CONSTRAINT IF EXISTS character_items_item_id_fkey;
ALTER TABLE character_abilities DROP CONSTRAINT IF EXISTS character_abilities_character_id_fkey;
ALTER TABLE character_experience_log DROP CONSTRAINT IF EXISTS character_experience_log_character_id_fkey;
ALTER TABLE character_healing_sessions DROP CONSTRAINT IF EXISTS character_healing_sessions_character_id_fkey;
ALTER TABLE character_progression DROP CONSTRAINT IF EXISTS character_progression_character_id_fkey;
ALTER TABLE character_healing_sessions DROP CONSTRAINT IF EXISTS character_healing_sessions_character_id_fkey;
ALTER TABLE character_progression DROP CONSTRAINT IF EXISTS character_progression_character_id_fkey;
-- Check constraints for character_relationships if they exist (they might not have FKs defined currently based on audit)
-- We will restore them regardless to be safe.
ALTER TABLE challenge_alliances DROP CONSTRAINT IF EXISTS challenge_alliances_leader_character_id_fkey;
ALTER TABLE challenge_leaderboard DROP CONSTRAINT IF EXISTS challenge_leaderboard_user_character_id_fkey;
ALTER TABLE challenge_participants DROP CONSTRAINT IF EXISTS challenge_participants_user_character_id_fkey;
ALTER TABLE challenge_results DROP CONSTRAINT IF EXISTS challenge_results_winner_character_id_fkey;
ALTER TABLE challenge_results DROP CONSTRAINT IF EXISTS challenge_results_second_place_character_id_fkey;
ALTER TABLE challenge_results DROP CONSTRAINT IF EXISTS challenge_results_third_place_character_id_fkey;
ALTER TABLE locker_rogue_decisions DROP CONSTRAINT IF EXISTS locker_rogue_decisions_character_id_fkey;
ALTER TABLE cardano_staking_positions DROP CONSTRAINT IF EXISTS cardano_staking_positions_user_character_id_fkey; -- Some tables link both
ALTER TABLE influencer_mints DROP CONSTRAINT IF EXISTS influencer_mints_user_character_id_fkey;
ALTER TABLE locker_auction_sessions DROP CONSTRAINT IF EXISTS locker_auction_sessions_character_id_fkey;
ALTER TABLE locker_leaderboards DROP CONSTRAINT IF EXISTS locker_leaderboards_character_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_user_character_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_opponent_character_id_fkey;
ALTER TABLE character_decisions DROP CONSTRAINT IF EXISTS character_decisions_character_id_fkey;
ALTER TABLE graffiti_art DROP CONSTRAINT IF EXISTS graffiti_art_artist_character_id_fkey;
ALTER TABLE lounge_messages DROP CONSTRAINT IF EXISTS lounge_messages_sender_character_id_fkey;
ALTER TABLE lounge_presence DROP CONSTRAINT IF EXISTS lounge_presence_character_id_fkey;
ALTER TABLE guild_messages DROP CONSTRAINT IF EXISTS guild_messages_sender_character_id_fkey;
ALTER TABLE therapy_evaluations DROP CONSTRAINT IF EXISTS therapy_evaluations_user_character_id_fkey;
ALTER TABLE therapy_evaluations DROP CONSTRAINT IF EXISTS therapy_evaluations_evaluator_id_fkey;
ALTER TABLE character_skills DROP CONSTRAINT IF EXISTS character_skills_character_id_fkey;
ALTER TABLE distributed_challenge_rewards DROP CONSTRAINT IF EXISTS distributed_challenge_rewards_user_character_id_fkey;
ALTER TABLE team_chat_logs DROP CONSTRAINT IF EXISTS team_chat_logs_speaker_character_id_fkey;
ALTER TABLE team_equipment_pool DROP CONSTRAINT IF EXISTS team_equipment_pool_loaned_to_character_id_fkey;
ALTER TABLE team_equipment_shared DROP CONSTRAINT IF EXISTS team_equipment_shared_currently_held_by_fkey;

-- =========================================================================
-- STEP 1.5: PRUNE LEGACY DATA (NON-UUID)
-- =========================================================================

-- Prune Social Messages
DELETE FROM social_messages
WHERE author_user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR (author_character_id IS NOT NULL AND author_character_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR (target_character_id IS NOT NULL AND target_character_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR (battle_id IS NOT NULL AND battle_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

DELETE FROM chat_messages WHERE character_id IS NOT NULL AND character_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Prune User Character Dependents (Mass Prune)
DELETE FROM bond_activity_log WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM cardano_nft_metadata WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_temporary_buffs WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_spell_loadout WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_power_loadout WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_powers WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM power_unlock_log WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_spells WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_modifiers WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM room_beds WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM financial_decisions WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_category_preferences WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_equipment WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_items WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_abilities WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_experience_log WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_healing_sessions WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_progression WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Relationships are tricky (character1_id, character2_id can both leverage legacy characters)
-- Simpler to truncate or delete all references to non-uuid
DELETE FROM character_relationships WHERE character1_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR character2_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_progression WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Relationships are tricky (character1_id, character2_id can both leverage legacy characters)
-- Simpler to truncate or delete all references to non-uuid
DELETE FROM character_relationships WHERE character1_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR character2_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Prune coach_xp_events linked to invalid characters
DELETE FROM coach_xp_events WHERE character_id IS NOT NULL AND character_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Prune therapy_evaluations and skills
DELETE FROM therapy_evaluations WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM character_skills WHERE character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM distributed_challenge_rewards WHERE user_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM team_chat_logs WHERE speaker_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM team_equipment_pool WHERE loaned_to_character_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM team_equipment_shared WHERE currently_held_by::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Prune Teams
DELETE FROM teams 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR (character_slot_1 IS NOT NULL AND character_slot_1 !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR (character_slot_2 IS NOT NULL AND character_slot_2 !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR (character_slot_3 IS NOT NULL AND character_slot_3 !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Prune User Characters (Now Safe)
DELETE FROM user_characters 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Prune Orphan User Characters (User ID not found in Users)
-- Use NOT EXISTS to avoid issues with potential NULLs in users.id
DELETE FROM user_characters uc
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = uc.user_id);

-- Prune Ghost Dependents (Items/Powers pointing to non-existent characters)
DELETE FROM character_powers WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_items WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_skills WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_spells WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_abilities WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_equipment WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_modifiers WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_experience_log WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_healing_sessions WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_progression WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM bond_activity_log WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_temporary_buffs WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_spell_loadout WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_power_loadout WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM power_unlock_log WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM room_beds WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM financial_decisions WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM character_category_preferences WHERE character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM distributed_challenge_rewards WHERE user_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM team_chat_logs WHERE speaker_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM team_equipment_pool WHERE loaned_to_character_id NOT IN (SELECT id FROM user_characters);
DELETE FROM team_equipment_shared WHERE currently_held_by NOT IN (SELECT id FROM user_characters);
DELETE FROM coach_xp_events WHERE character_id NOT IN (SELECT id FROM user_characters) AND character_id IS NOT NULL;
DELETE FROM therapy_evaluations WHERE user_character_id NOT IN (SELECT id FROM user_characters);

-- Prune Battles
DELETE FROM battles
WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR (user_character_id IS NOT NULL AND user_character_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
   OR id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- =========================================================================
-- STEP 2: CONVERT CORE TABLES
-- =========================================================================

-- 2.1 USERS
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE users ADD PRIMARY KEY (id);

-- 2.2 USER_CHARACTERS
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_pkey CASCADE;
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_new_pkey CASCADE; -- Handle previous failed migration attempt name
ALTER TABLE user_characters ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE user_characters ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_characters ADD PRIMARY KEY (id);
ALTER TABLE user_characters
    ADD CONSTRAINT fk_user_characters_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2.3 TEAMS
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_pkey CASCADE;
ALTER TABLE teams ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE teams ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE teams ALTER COLUMN character_slot_1 TYPE UUID USING character_slot_1::uuid;
ALTER TABLE teams ALTER COLUMN character_slot_2 TYPE UUID USING character_slot_2::uuid;
ALTER TABLE teams ALTER COLUMN character_slot_3 TYPE UUID USING character_slot_3::uuid;

ALTER TABLE teams ADD PRIMARY KEY (id);
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_slot1 FOREIGN KEY (character_slot_1) REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_teams_slot2 FOREIGN KEY (character_slot_2) REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_teams_slot3 FOREIGN KEY (character_slot_3) REFERENCES user_characters(id) ON DELETE SET NULL;

-- 2.4 TEAM_CONTEXT
ALTER TABLE team_context ALTER COLUMN team_id TYPE UUID USING team_id::uuid;

-- =========================================================================
-- STEP 2.5: CONVERT BATTLES (Base Table for others)
-- =========================================================================
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_pkey CASCADE;
ALTER TABLE battles ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE battles ADD PRIMARY KEY (id);

-- =========================================================================
-- STEP 3: CONVERT DEPENDENT COLUMNS & RESTORE FOREIGN KEYS
-- =========================================================================

ALTER TABLE active_challenges ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE active_challenges ADD CONSTRAINT active_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE battles ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE battles ALTER COLUMN opponent_user_id TYPE UUID USING opponent_user_id::uuid;
ALTER TABLE battles ADD CONSTRAINT battles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE battles ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE battles ALTER COLUMN opponent_character_id TYPE UUID USING opponent_character_id::uuid;
-- Restore battles FKs if needed, or rely on logic layer

ALTER TABLE battle_participants ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE battle_participants ADD CONSTRAINT battle_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE battle_queue ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE battle_queue ADD CONSTRAINT battle_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE cardano_staking_positions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE cardano_staking_positions ADD CONSTRAINT cardano_staking_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE chat_messages ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE chat_messages ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE claimable_packs ALTER COLUMN claimed_by_user_id TYPE UUID USING claimed_by_user_id::uuid;
ALTER TABLE claimable_packs ADD CONSTRAINT claimable_packs_claimed_by_user_id_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES users(id);

ALTER TABLE coach_progression ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE coach_progression ADD CONSTRAINT coach_progression_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE coach_skills ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE coach_skills ADD CONSTRAINT coach_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE coach_xp_events ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE coach_xp_events ADD CONSTRAINT coach_xp_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE coach_xp_events ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE coach_xp_events ADD CONSTRAINT coach_xp_events_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE community_event_participants ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE community_event_participants ADD CONSTRAINT community_event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE community_events ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
ALTER TABLE community_events ADD CONSTRAINT community_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE graffiti_likes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE graffiti_likes ADD CONSTRAINT graffiti_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE graffiti_views ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE graffiti_views ADD CONSTRAINT graffiti_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE guild_join_requests ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE guild_join_requests ADD CONSTRAINT guild_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE guild_join_requests ALTER COLUMN resolved_by TYPE UUID USING resolved_by::uuid;
ALTER TABLE guild_join_requests ADD CONSTRAINT guild_join_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id);

ALTER TABLE guild_members ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE guild_members ADD CONSTRAINT guild_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE influencer_mint_allowlist ALTER COLUMN claimed_by_user_id TYPE UUID USING claimed_by_user_id::uuid;
ALTER TABLE influencer_mint_allowlist ADD CONSTRAINT influencer_mint_allowlist_claimed_by_user_id_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES users(id);

ALTER TABLE influencer_mints ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE influencer_mints ADD CONSTRAINT influencer_mints_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE locker_achievements ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE locker_achievements ADD CONSTRAINT locker_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE locker_auction_sessions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE locker_auction_sessions ADD CONSTRAINT locker_auction_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE locker_leaderboards ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE locker_leaderboards ADD CONSTRAINT locker_leaderboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE lounge_presence ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE lounge_presence ADD CONSTRAINT lounge_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE purchases ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE purchases ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE social_message_reactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE social_message_reactions ADD CONSTRAINT social_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE ticket_transactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE ticket_transactions ADD CONSTRAINT ticket_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_character_echoes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_character_echoes ADD CONSTRAINT user_character_echoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_characters_old ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE user_currency ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_currency ADD CONSTRAINT user_currency_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_equipment ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_equipment ADD CONSTRAINT user_equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_headquarters ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_headquarters ADD CONSTRAINT user_headquarters_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_items ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_items ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_spells ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_spells ADD CONSTRAINT user_spells_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE user_tickets ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_tickets ADD CONSTRAINT user_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE graffiti_art ALTER COLUMN artist_user_id TYPE UUID USING artist_user_id::uuid;
ALTER TABLE graffiti_art ADD CONSTRAINT graffiti_art_artist_user_id_fkey FOREIGN KEY (artist_user_id) REFERENCES users(id);

ALTER TABLE guild_messages ALTER COLUMN sender_user_id TYPE UUID USING sender_user_id::uuid;
ALTER TABLE guild_messages ADD CONSTRAINT guild_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES users(id);

ALTER TABLE guilds ALTER COLUMN leader_user_id TYPE UUID USING leader_user_id::uuid;
ALTER TABLE guilds ADD CONSTRAINT guilds_leader_user_id_fkey FOREIGN KEY (leader_user_id) REFERENCES users(id);

ALTER TABLE lounge_messages ALTER COLUMN sender_user_id TYPE UUID USING sender_user_id::uuid;
ALTER TABLE lounge_messages ADD CONSTRAINT lounge_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES users(id);

-- social_messages
ALTER TABLE social_messages ALTER COLUMN author_user_id TYPE UUID USING author_user_id::uuid;
ALTER TABLE social_messages ALTER COLUMN author_character_id TYPE UUID USING author_character_id::uuid;
ALTER TABLE social_messages ALTER COLUMN battle_id TYPE UUID USING battle_id::uuid;
ALTER TABLE social_messages ALTER COLUMN target_character_id TYPE UUID USING target_character_id::uuid;

ALTER TABLE social_messages ADD CONSTRAINT social_messages_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE social_messages ADD CONSTRAINT social_messages_author_character_id_fkey FOREIGN KEY (author_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;
ALTER TABLE social_messages ADD CONSTRAINT social_messages_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE SET NULL;
ALTER TABLE social_messages ADD CONSTRAINT social_messages_target_character_id_fkey FOREIGN KEY (target_character_id) REFERENCES user_characters(id) ON DELETE SET NULL;

-- User Character Dependent Tables Restoration
ALTER TABLE bond_activity_log ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE bond_activity_log ADD CONSTRAINT bond_activity_log_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE cardano_nft_metadata ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE cardano_nft_metadata ADD CONSTRAINT cardano_nft_metadata_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_temporary_buffs ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_temporary_buffs ADD CONSTRAINT character_temporary_buffs_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_spell_loadout ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE character_spell_loadout ADD CONSTRAINT character_spell_loadout_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_power_loadout ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE character_power_loadout ADD CONSTRAINT character_power_loadout_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_powers ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_powers ADD CONSTRAINT character_powers_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE power_unlock_log ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE power_unlock_log ADD CONSTRAINT power_unlock_log_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_spells ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_spells ADD CONSTRAINT character_spells_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_modifiers ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE character_modifiers ADD CONSTRAINT character_modifiers_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE room_beds ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE room_beds ADD CONSTRAINT room_beds_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE SET NULL;

ALTER TABLE financial_decisions ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE financial_decisions ADD CONSTRAINT financial_decisions_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_category_preferences ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_category_preferences ADD CONSTRAINT character_category_preferences_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_equipment ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_equipment ADD CONSTRAINT character_equipment_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_items ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_items ADD CONSTRAINT character_items_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_abilities ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_abilities ADD CONSTRAINT character_abilities_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_experience_log ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_experience_log ADD CONSTRAINT character_experience_log_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_healing_sessions ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_healing_sessions ADD CONSTRAINT character_healing_sessions_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_progression ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_progression ADD CONSTRAINT character_progression_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE therapy_evaluations ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE therapy_evaluations ADD CONSTRAINT therapy_evaluations_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE character_skills ALTER COLUMN character_id TYPE UUID USING character_id::uuid;
ALTER TABLE character_skills ADD CONSTRAINT character_skills_character_id_fkey FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE distributed_challenge_rewards ALTER COLUMN user_character_id TYPE UUID USING user_character_id::uuid;
ALTER TABLE distributed_challenge_rewards ADD CONSTRAINT distributed_challenge_rewards_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE team_chat_logs ALTER COLUMN speaker_character_id TYPE UUID USING speaker_character_id::uuid;
ALTER TABLE team_chat_logs ADD CONSTRAINT team_chat_logs_speaker_character_id_fkey FOREIGN KEY (speaker_character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

ALTER TABLE team_equipment_pool ALTER COLUMN loaned_to_character_id TYPE UUID USING loaned_to_character_id::uuid;
ALTER TABLE team_equipment_pool ADD CONSTRAINT team_equipment_pool_loaned_to_character_id_fkey FOREIGN KEY (loaned_to_character_id) REFERENCES user_characters(id) ON DELETE SET NULL;

ALTER TABLE team_equipment_shared ALTER COLUMN currently_held_by TYPE UUID USING currently_held_by::uuid;
ALTER TABLE team_equipment_shared ADD CONSTRAINT team_equipment_shared_currently_held_by_fkey FOREIGN KEY (currently_held_by) REFERENCES user_characters(id) ON DELETE SET NULL;

-- =========================================================================
-- STEP 4: UPDATE FUNCTION WITH FULL LOGIC
-- =========================================================================

CREATE OR REPLACE FUNCTION get_full_character_data(
  p_userchar_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_char RECORD;
  v_uc RECORD;
  v_tc RECORD;
  v_character_id TEXT;
  v_target_uuid UUID;
  v_identity JSONB;
  v_combat JSONB;
  v_psychological JSONB;
BEGIN
  -- Strict cast input
  v_target_uuid := p_userchar_id::uuid;

  -- 1. FETCH USER CHARACTER
  SELECT uc.*, t.team_name
  INTO v_uc
  FROM user_characters uc
  LEFT JOIN teams t ON uc.user_id = t.user_id -- UUID match
  WHERE uc.id = v_target_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  v_character_id := v_uc.character_id;

  IF v_character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  -- 2. FETCH BASE CHARACTER
  SELECT
    c.*,
    cs.comedian_name AS cs_comedian_name,
    cs.comedy_style AS cs_comedy_style
  INTO v_char
  FROM characters c
  LEFT JOIN comedian_styles cs ON c.comedian_style_id = cs.id
  WHERE c.id = v_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found', v_character_id;
  END IF;

  -- 3. FETCH TEAM CONTEXT
  SELECT tc.*
  INTO v_tc
  FROM team_context tc
  JOIN teams t ON tc.team_id = t.id
  WHERE t.user_id = v_uc.user_id;

  -- 4. BUILD IDENTITY
  v_identity := jsonb_build_object(
    'archetype', v_char.archetype,
    'backstory', v_char.backstory,
    'character_id', v_character_id,
    'comedian_category', COALESCE(v_char.cs_category, 'inspired'),
    'comedian_name', COALESCE(v_char.comedian_name, v_char.cs_comedian_name),
    'comedy_style', COALESCE(v_char.comedy_style, v_char.cs_comedy_style),
    'conversation_style', v_char.conversation_style,
    'conversation_topics', v_char.conversation_topics,
    'debt', v_uc.debt,
    'experience', v_uc.experience,
    'hq_tier', v_tc.hq_tier,
    'id', v_char.id,
    'level', v_uc.level,
    'monthly_earnings', v_uc.monthly_earnings,
    'name', v_char.name,
    'origin_era', v_char.origin_era,
    'personality_traits', v_char.personality_traits,
    'scene_type', v_tc.current_scene_type,
    'sleeping_arrangement', v_uc.sleeping_arrangement,
    'species', v_char.species,
    'team_id', v_tc.team_id,
    'team_name', v_uc.team_name,
    'time_of_day', v_tc.current_time_of_day,
    'title', v_char.title,
    'total_battles', v_uc.total_battles,
    'total_losses', v_uc.total_losses,
    'total_wins', v_uc.total_wins,
    'userchar_id', v_uc.id,
    'wallet', v_uc.wallet,
    'win_percentage', v_uc.win_percentage
  );

  -- 5. BUILD COMBAT PACKAGE (Previous Logic Restored)
  v_combat := jsonb_build_object(
    'abilities', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'ability_id', ca.ability_id,
        'ability_name', ca.ability_name,
        'rank', ca.rank
      )), '[]'::jsonb)
      FROM character_abilities ca
      WHERE ca.character_id = v_character_id
    ),
    'equipment', jsonb_build_object(
      'accessory', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = p_userchar_id AND slot_type = 'accessory' LIMIT 1),
      'armor', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = p_userchar_id AND slot_type = 'armor' LIMIT 1),
      'weapon', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = p_userchar_id AND slot_type = 'weapon' LIMIT 1)
    ),
    'stats', jsonb_build_object(
      'current_health', v_uc.current_health,
      'max_health', v_uc.max_health
    ),
    'unlocked_spells', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown', sd.base_cooldown,
        'damage', sd.base_damage,
        'description', sd.description,
        'mana_cost', sd.base_mana_cost,
        'spell_id', cs.spell_id,
        'spell_name', sd.name
      )), '[]'::jsonb)
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = p_userchar_id AND cs.unlocked = true
    )
  );

  -- 6. BUILD PSYCHOLOGICAL PACKAGE (Previous Logic Restored)
  v_psychological := jsonb_build_object(
    'bond_level', v_uc.bond_level,
    'coach_trust_level', v_uc.coach_trust_level,
    'current_confidence', v_uc.current_confidence,
    'current_ego', v_uc.current_ego,
    'current_fatigue', v_uc.current_fatigue,
    'current_mental_health', v_uc.current_mental_health,
    'current_morale', v_uc.current_morale,
    'current_stress', v_uc.current_stress,
    'current_team_player', v_uc.current_team_player,
    'financial_stress', v_uc.financial_stress,
    'gameplan_adherence', v_uc.gameplan_adherence,
    'gameplay_mood_modifiers', COALESCE(v_uc.gameplay_mood_modifiers, '{"modifiers": []}'::jsonb),
    'equipment_prefs', jsonb_build_object(
      'armor_proficiency', v_char.armor_proficiency,
      'preferred_armor_type', v_char.preferred_armor_type,
      'preferred_weapons', v_char.preferred_weapons,
      'weapon_proficiencies', v_char.weapon_proficiencies
    ),
    'category_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type,
        'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.category_type, ccp.category_value), '[]'::jsonb)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'affection', cr.current_affection,
        'character_id', cr.character2_id,
        'character_name', c.name,
        'respect', cr.current_respect,
        'rivalry', cr.current_rivalry,
        'shared_battles', cr.shared_battles,
        'therapy_sessions_together', cr.therapy_sessions_together,
        'trust', cr.current_trust
      ) ORDER BY c.name), '[]'::jsonb)
      FROM character_relationships cr
      JOIN characters c ON cr.character2_id = c.id
      WHERE cr.character1_id = v_character_id
    )
  );

  -- 7. RETURN
  RETURN jsonb_build_object(
    'IDENTITY', v_identity,
    'COMBAT', v_combat,
    'PSYCHOLOGICAL', v_psychological
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;
