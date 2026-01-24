Starting Container> 
blankwars-backend@1.0.0 start
> npm run build && ./migrations/run-migrations.sh && node dist/server.js
> blankwars-backend@1.0.0 build
> sh scripts/prebuild.sh && tsc --noEmitOnError false --skipLibCheck
2025-11-08 22:25:17 - Using DATABASE_URL for connection
2025-11-08 22:25:17 - Starting migration process for environment: development
2025-11-08 22:25:17 - Target version: latest
2025-11-08 22:25:17 - Database:  at :
2025-11-08 22:25:18 - Migration 001 already applied, skipping
2025-11-08 22:25:18 - Applying migration: 009_seed_achilles_powers.sql
2025-11-08 22:25:18 - Migration 002 already applied, skipping
2025-11-08 22:25:18 - Executing migration: /app/migrations/009_seed_achilles_powers.sql
2025-11-08 22:25:18 - Migration 003 already applied, skipping
2025-11-08 22:25:18 - Migration completed successfully in 0s: /app/migrations/009_seed_achilles_powers.sql
2025-11-08 22:25:18 - Executing migration: /app/migrations/007_rename_adherence_column.sql
2025-11-08 22:25:18 - Migration 004 already applied, skipping
2025-11-08 22:25:18 - Migration completed successfully in 0s: /app/migrations/007_rename_adherence_column.sql
2025-11-08 22:25:18 - Successfully applied migration: 007_rename_adherence_column.sql
2025-11-08 22:25:18 - Migration 005 already applied, skipping
2025-11-08 22:25:18 - Applying migration: 008_power_system.sql
2025-11-08 22:25:18 - Migration 006 already applied, skipping
2025-11-08 22:25:18 - Applying migration: 007_rename_adherence_column.sql
2025-11-08 22:25:18 - Executing migration: /app/migrations/008_power_system.sql
2025-11-08 22:25:18 - Migration completed successfully in 0s: /app/migrations/008_power_system.sql
2025-11-08 22:25:18 - Successfully applied migration: 008_power_system.sql
2025-11-08 22:25:18 - Successfully applied migration: 009_seed_achilles_powers.sql
2025-11-08 22:25:18 - Applying migration: 010_add_merlin_agentx_comedy_styles.sql
2025-11-08 22:25:18 - Executing migration: /app/migrations/010_add_merlin_agentx_comedy_styles.sql
2025-11-08 22:25:18 - Migration completed successfully in 0s: /app/migrations/010_add_merlin_agentx_comedy_styles.sql
2025-11-08 22:25:18 - Successfully applied migration: 010_add_merlin_agentx_comedy_styles.sql
2025-11-08 22:25:18 - Applying migration: 010_update_power_costs.sql
2025-11-08 22:25:18 - Executing migration: /app/migrations/010_update_power_costs.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/010_update_power_costs.sql
2025-11-08 22:25:19 - Successfully applied migration: 010_update_power_costs.sql
2025-11-08 22:25:19 - Applying migration: 011_equipment_tier_system.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/011_equipment_tier_system.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/011_equipment_tier_system.sql
2025-11-08 22:25:19 - Successfully applied migration: 011_equipment_tier_system.sql
2025-11-08 22:25:19 - Applying migration: 012_seed_tiered_equipment.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/012_seed_tiered_equipment.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/012_seed_tiered_equipment.sql
2025-11-08 22:25:19 - Successfully applied migration: 012_seed_tiered_equipment.sql
2025-11-08 22:25:19 - Applying migration: 013_add_appliance_archetype.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/013_add_appliance_archetype.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/013_add_appliance_archetype.sql
2025-11-08 22:25:19 - Successfully applied migration: 013_add_appliance_archetype.sql
2025-11-08 22:25:19 - Applying migration: 013_lost_and_found_wars_schema.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/013_lost_and_found_wars_schema.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/013_lost_and_found_wars_schema.sql
2025-11-08 22:25:19 - Successfully applied migration: 013_lost_and_found_wars_schema.sql
2025-11-08 22:25:19 - Applying migration: 014_seed_locker_items.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/014_seed_locker_items.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/014_seed_locker_items.sql
2025-11-08 22:25:19 - Successfully applied migration: 014_seed_locker_items.sql
2025-11-08 22:25:19 - Applying migration: 015_add_damage_resistance_system.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/015_add_damage_resistance_system.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/015_add_damage_resistance_system.sql
2025-11-08 22:25:19 - Successfully applied migration: 015_add_damage_resistance_system.sql
2025-11-08 22:25:19 - Applying migration: 016_add_status_effect_system.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/016_add_status_effect_system.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/016_add_status_effect_system.sql
2025-11-08 22:25:19 - Successfully applied migration: 016_add_status_effect_system.sql
2025-11-08 22:25:19 - Applying migration: 017_insert_crumbsworth_powers.sql
2025-11-08 22:25:19 - Executing migration: /app/migrations/017_insert_crumbsworth_powers.sql
2025-11-08 22:25:19 - Migration completed successfully in 0s: /app/migrations/017_insert_crumbsworth_powers.sql
2025-11-08 22:25:19 - Successfully applied migration: 017_insert_crumbsworth_powers.sql
2025-11-08 22:25:20 - Applying migration: 018_insert_appliance_archetype_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/018_insert_appliance_archetype_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/018_insert_appliance_archetype_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 018_insert_appliance_archetype_powers.sql
2025-11-08 22:25:20 - Applying migration: 019_insert_crumbsworth_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/019_insert_crumbsworth_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/019_insert_crumbsworth_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 019_insert_crumbsworth_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 020_insert_agent_x_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/020_insert_agent_x_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/020_insert_agent_x_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 020_insert_agent_x_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 021_insert_billy_the_kid_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/021_insert_billy_the_kid_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/021_insert_billy_the_kid_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 021_insert_billy_the_kid_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 022_insert_cleopatra_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/022_insert_cleopatra_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/022_insert_cleopatra_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 022_insert_cleopatra_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 023_insert_count_dracula_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/023_insert_count_dracula_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/023_insert_count_dracula_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 023_insert_count_dracula_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 024_insert_fenrir_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/024_insert_fenrir_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/024_insert_fenrir_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 024_insert_fenrir_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 025_insert_frankenstein_monster_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/025_insert_frankenstein_monster_signature_powers.sql
2025-11-08 22:25:20 - Migration completed successfully in 0s: /app/migrations/025_insert_frankenstein_monster_signature_powers.sql
2025-11-08 22:25:20 - Successfully applied migration: 025_insert_frankenstein_monster_signature_powers.sql
2025-11-08 22:25:20 - Applying migration: 026_insert_genghis_khan_signature_powers.sql
2025-11-08 22:25:20 - Executing migration: /app/migrations/026_insert_genghis_khan_signature_powers.sql
2025-11-08 22:25:21 - Migration completed successfully in 1s: /app/migrations/026_insert_genghis_khan_signature_powers.sql
2025-11-08 22:25:21 - Successfully applied migration: 026_insert_genghis_khan_signature_powers.sql
2025-11-08 22:25:21 - Applying migration: 027_insert_joan_of_arc_signature_powers.sql
2025-11-08 22:25:21 - Executing migration: /app/migrations/027_insert_joan_of_arc_signature_powers.sql
2025-11-08 22:25:21 - Migration completed successfully in 0s: /app/migrations/027_insert_joan_of_arc_signature_powers.sql
2025-11-08 22:25:21 - Applying migration: 031_insert_robin_hood_signature_powers.sql
2025-11-08 22:25:21 - Successfully applied migration: 027_insert_joan_of_arc_signature_powers.sql
2025-11-08 22:25:21 - Applying migration: 033_insert_sherlock_holmes_signature_powers.sql
2025-11-08 22:25:21 - Applying migration: 028_insert_merlin_signature_powers.sql
2025-11-08 22:25:21 - Executing migration: /app/migrations/033_insert_sherlock_holmes_signature_powers.sql
2025-11-08 22:25:21 - Executing migration: /app/migrations/031_insert_robin_hood_signature_powers.sql
📚 Found 43 characters in database
✅ PostgreSQL database initialized successfully
✅ Database initialized successfully
🟡 Calibrating tokenizer...
🧮 Tokenizer calibration: provider/GPT ratio = 1.192 (samples=1.250, 1.200, 1.154, 1.154, 1.200)
✅ Tokenizer calibrated
[schemaGuard] verifying expected columns...
[schemaGuard] claimable_packs OK
[schemaGuard] characters OK
[schemaGuard] equipment OK
🏥 Initializing healing facilities...
✅ Initialized 4 healing facilities
✅ Healing facilities initialized
⚕️ Starting healing scheduler (checking every 5 minutes)
🔄 Processing healing tasks...
✅ Healing scheduler started
🎫 Starting ticket cron jobs...
⏰ Daily reset job scheduled for midnight UTC
⏰ Hourly refresh job scheduled for every hour
✅ Ticket cron jobs started successfully
✅ Ticket cron service started
[AI-TRASH-TALK] Starting autonomous trash talk generation
[AI-TRASH-TALK] Autonomous trash talk scheduler started (runs every 30 mins)
✅ AI trash talk scheduler started
🟡 Starting HTTP server...
🚀 Blank Wars API Server running!
📍 Port: 8080
🌐 Frontend URL: https://www.blankwars.com
💾 Database: PostgreSQL (production mode)
🎮 Ready to serve battles and chats!
        wc.name as winner_name,
Database query error: error: column b.user_character_id does not exist
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async query (/app/dist/database/postgres.js:30:24)
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  length: 118,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '421',
  routine: 'errorMissingColumn'
  table: undefined,
}
  column: undefined,
SQL: 
  dataType: undefined,
      SELECT
        b.id as battle_id,
  constraint: undefined,
  file: 'parse_relation.c',
        b.user_character_id as winner_char_id,
  line: '3716',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
        wc.avatar as winner_avatar,
        b.opponent_character_id as loser_char_id,
        lc.name as loser_name,
        lc.avatar as loser_avatar,
        b.ended_at,
        (b.user_final_health - b.opponent_final_health) as final_hp_diff
      FROM battles b
      JOIN user_characters wuc ON b.user_character_id = wuc.id
      JOIN characters wc ON wuc.character_id = wc.id
      LEFT JOIN user_characters luc ON b.opponent_character_id = luc.id
      LEFT JOIN characters lc ON luc.character_id = lc.id
      WHERE b.winner = 'user'
        AND b.ended_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM social_messages sm
          WHERE sm.battle_id = b.id
            AND sm.is_ai_generated = true
        )
      ORDER BY b.ended_at DESC
      LIMIT 10
    
Params: undefined
[AI-TRASH-TALK] Error generating autonomous trash talk: error: column b.user_character_id does not exist
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
  severity: 'ERROR',
  table: undefined,
  code: '42703',
🔄 Found 0 characters eligible for natural resurrection
  detail: undefined,
  column: undefined,
  hint: undefined,
  dataType: undefined,
  position: '421',
✅ Healing task processing completed in 68ms
  internalPosition: undefined,
    at async query (/app/dist/database/postgres.js:30:24)
  internalQuery: undefined,
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  where: undefined,
  length: 118,
  schema: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3716',
  routine: 'errorMissingColumn'
} 
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 48ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 33ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 37ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 49ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 65ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 36ms
[AI-TRASH-TALK] Starting autonomous trash talk generation
Database query error: error: column b.user_character_id does not exist
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async query (/app/dist/database/postgres.js:30:24)
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  length: 118,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '421',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3716',
  routine: 'errorMissingColumn'
}
SQL: 
      SELECT
        b.id as battle_id,
        b.user_character_id as winner_char_id,
        wc.name as winner_name,
        wc.avatar as winner_avatar,
        b.opponent_character_id as loser_char_id,
        lc.name as loser_name,
        lc.avatar as loser_avatar,
        b.ended_at,
        (b.user_final_health - b.opponent_final_health) as final_hp_diff
      FROM battles b
      JOIN user_characters wuc ON b.user_character_id = wuc.id
      JOIN characters wc ON wuc.character_id = wc.id
      LEFT JOIN user_characters luc ON b.opponent_character_id = luc.id
      LEFT JOIN characters lc ON luc.character_id = lc.id
      WHERE b.winner = 'user'
        AND b.ended_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM social_messages sm
          WHERE sm.battle_id = b.id
            AND sm.is_ai_generated = true
        )
      ORDER BY b.ended_at DESC
      LIMIT 10
    
Params: undefined
[AI-TRASH-TALK] Error generating autonomous trash talk: error: column b.user_character_id does not exist
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async query (/app/dist/database/postgres.js:30:24)
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  length: 118,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '421',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3716',
  routine: 'errorMissingColumn'
}
⏱️ Starting hourly ticket refresh check...
📊 Found 0 users eligible for hourly refresh
✅ Hourly refresh completed in 113ms: 0 users, 0 tickets added, 0 errors
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 45ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 45ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 41ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 87ms
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 44ms
 internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '3716',
  routine: 'errorMissingColumn'
🔄 Processing healing tasks...
🔄 Found 0 characters eligible for natural resurrection
✅ Healing task processing completed in 31ms
[AI-TRASH-TALK] Starting autonomous trash talk generation
Database query error: error: column b.user_character_id does not exist
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async query (/app/dist/database/postgres.js:30:24)
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  length: 118,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '421',
}
SQL: 
      SELECT
        b.id as battle_id,
        b.user_character_id as winner_char_id,
        wc.name as winner_name,
        wc.avatar as winner_avatar,
        b.opponent_character_id as loser_char_id,
        lc.name as loser_name,
        lc.avatar as loser_avatar,
        b.ended_at,
        (b.user_final_health - b.opponent_final_health) as final_hp_diff
      FROM battles b
      JOIN user_characters wuc ON b.user_character_id = wuc.id
      JOIN characters wc ON wuc.character_id = wc.id
      LEFT JOIN user_characters luc ON b.opponent_character_id = luc.id
      LEFT JOIN characters lc ON luc.character_id = lc.id
      WHERE b.winner = 'user'
        AND b.ended_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM social_messages sm
          WHERE sm.battle_id = b.id
            AND sm.is_ai_generated = true
        )
      ORDER BY b.ended_at DESC
      LIMIT 10
    
  file: 'parse_relation.c',
Params: undefined
  line: '3716',
[AI-TRASH-TALK] Error generating autonomous trash talk: error: column b.user_character_id does not exist  
    at /app/node_modules/pg-pool/index.js:45:11
  routine: 'errorMissingColumn'
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
}
    at async query (/app/dist/database/postgres.js:30:24)
    at async generateAutonomousTrashTalk (/app/dist/services/aiTrashTalkService.js:25:31) {
  length: 118,
  severity: 'ERROR',
  code: '42703',
  detail: undefined,
  hint: undefined,
  position: '421',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
Stopping Container