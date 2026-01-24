/**
 * Generate migration to fix whitespace in user_characters IDs
 * 
 * 1. Drops all FK constraints referencing user_characters
 * 2. Updates user_characters IDs (TRIM)
 * 3. Updates referencing columns (TRIM)
 * 4. Re-adds constraints with ON UPDATE CASCADE
 */

import fs from 'fs';

const constraints = [
    { table: 'social_messages', name: 'social_messages_author_character_id_fkey', def: 'FOREIGN KEY (author_character_id) REFERENCES user_characters(id)' },
    { table: 'social_messages', name: 'social_messages_target_character_id_fkey', def: 'FOREIGN KEY (target_character_id) REFERENCES user_characters(id)' },
    { table: 'social_message_replies', name: 'social_message_replies_author_character_id_fkey', def: 'FOREIGN KEY (author_character_id) REFERENCES user_characters(id)' },
    { table: 'influencer_mints', name: 'influencer_mints_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'cardano_staking_positions', name: 'cardano_staking_positions_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'locker_auction_sessions', name: 'locker_auction_sessions_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'locker_rogue_decisions', name: 'locker_rogue_decisions_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'locker_leaderboards', name: 'locker_leaderboards_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'battles', name: 'battles_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'battles', name: 'battles_opponent_character_id_fkey', def: 'FOREIGN KEY (opponent_character_id) REFERENCES user_characters(id)' },
    { table: 'bond_activity_log', name: 'bond_activity_log_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'character_decisions', name: 'character_decisions_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE' },
    { table: 'graffiti_art', name: 'graffiti_art_artist_character_id_fkey', def: 'FOREIGN KEY (artist_character_id) REFERENCES user_characters(id) ON DELETE SET NULL' },
    { table: 'lounge_messages', name: 'lounge_messages_sender_character_id_fkey', def: 'FOREIGN KEY (sender_character_id) REFERENCES user_characters(id) ON DELETE SET NULL' },
    { table: 'lounge_presence', name: 'lounge_presence_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE' },
    { table: 'guild_messages', name: 'guild_messages_sender_character_id_fkey', def: 'FOREIGN KEY (sender_character_id) REFERENCES user_characters(id) ON DELETE SET NULL' },
    { table: 'challenge_alliances', name: 'challenge_alliances_leader_character_id_fkey', def: 'FOREIGN KEY (leader_character_id) REFERENCES user_characters(id)' },
    { table: 'challenge_leaderboard', name: 'challenge_leaderboard_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'challenge_participants', name: 'challenge_participants_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'challenge_results', name: 'challenge_results_second_place_character_id_fkey', def: 'FOREIGN KEY (second_place_character_id) REFERENCES user_characters(id)' },
    { table: 'challenge_results', name: 'challenge_results_third_place_character_id_fkey', def: 'FOREIGN KEY (third_place_character_id) REFERENCES user_characters(id)' },
    { table: 'challenge_results', name: 'challenge_results_winner_character_id_fkey', def: 'FOREIGN KEY (winner_character_id) REFERENCES user_characters(id)' },
    { table: 'character_abilities', name: 'character_abilities_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_equipment', name: 'character_equipment_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_experience_log', name: 'character_experience_log_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_healing_sessions', name: 'character_healing_sessions_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_items', name: 'character_items_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_progression', name: 'character_progression_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_skills', name: 'character_skills_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'chat_messages', name: 'chat_messages_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'coach_xp_events', name: 'coach_xp_events_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'distributed_challenge_rewards', name: 'distributed_challenge_rewards_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'team_chat_logs', name: 'team_chat_logs_speaker_character_id_fkey', def: 'FOREIGN KEY (speaker_character_id) REFERENCES user_characters(id)' },
    { table: 'team_equipment_pool', name: 'team_equipment_pool_loaned_to_character_id_fkey', def: 'FOREIGN KEY (loaned_to_character_id) REFERENCES user_characters(id)' },
    { table: 'team_equipment_shared', name: 'team_equipment_shared_currently_held_by_fkey', def: 'FOREIGN KEY (currently_held_by) REFERENCES user_characters(id)' },
    { table: 'teams', name: 'teams_character_slot_1_fkey', def: 'FOREIGN KEY (character_slot_1) REFERENCES user_characters(id)' },
    { table: 'teams', name: 'teams_character_slot_2_fkey', def: 'FOREIGN KEY (character_slot_2) REFERENCES user_characters(id)' },
    { table: 'teams', name: 'teams_character_slot_3_fkey', def: 'FOREIGN KEY (character_slot_3) REFERENCES user_characters(id)' },
    { table: 'character_power_loadout', name: 'character_power_loadout_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'cardano_nft_metadata', name: 'cardano_nft_metadata_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'character_temporary_buffs', name: 'character_temporary_buffs_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_spell_loadout', name: 'character_spell_loadout_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id)' },
    { table: 'character_powers', name: 'character_powers_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'power_unlock_log', name: 'power_unlock_log_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_spells', name: 'character_spells_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id)' },
    { table: 'character_modifiers', name: 'character_modifiers_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE' },
    { table: 'character_category_preferences', name: 'character_category_preferences_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE' },
    { table: 'financial_decisions', name: 'financial_decisions_user_character_id_fkey', def: 'FOREIGN KEY (user_character_id) REFERENCES user_characters(id) ON DELETE CASCADE' },
    { table: 'room_beds', name: 'room_beds_character_id_fkey', def: 'FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE SET NULL' }
];

let sql = 'BEGIN;\n\n';

// 1. Drop constraints
sql += '-- 1. Drop FK constraints\n';
for (const c of constraints) {
    sql += `ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.name};\n`;
}

// 2. Update user_characters
sql += '\n-- 2. Update user_characters (Trim ID)\n';
sql += "UPDATE user_characters SET id = TRIM(id) WHERE id LIKE '% ';\n";

// 3. Update referencing tables
sql += '\n-- 3. Update referencing tables (Trim ID)\n';
// We need to know which column to update. We can parse it from definition.
// FOREIGN KEY (col_name) ...
for (const c of constraints) {
    const match = c.def.match(/FOREIGN KEY \(([^)]+)\)/);
    if (match && match[1]) {
        const col = match[1];
        sql += `UPDATE ${c.table} SET ${col} = TRIM(${col}) WHERE ${col} LIKE '% ';\n`;
    }
}

// 4. Restore constraints with ON UPDATE CASCADE
sql += '\n-- 4. Restore FK constraints with ON UPDATE CASCADE\n';
for (const c of constraints) {
    // Append ON UPDATE CASCADE if not present (it's not in the defs we got)
    let newDef = c.def;
    // If ON DELETE exists, insert before it? Or append?
    // Postgres allows multiple actions.
    newDef += ' ON UPDATE CASCADE';

    sql += `ALTER TABLE ${c.table} ADD CONSTRAINT ${c.name} ${newDef};\n`;
}

sql += '\nCOMMIT;\n';

fs.writeFileSync('migrations/216_fix_whitespace_ids_comprehensive.sql', sql);
console.log('Migration generated: migrations/216_fix_whitespace_ids_comprehensive.sql');
