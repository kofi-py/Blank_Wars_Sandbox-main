#!/bin/bash

# Backup directory
BACKUP_DIR="../backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/legacy_data_backup_$TIMESTAMP.csv"

# DB URL
DB_URL="postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway"

echo "Starting backup of legacy (non-UUID) data to $BACKUP_FILE..."

# Helper function to backup a table
backup_table() {
    local table=$1
    local column=$2
    local filter_col=$3 # specific column to check for non-uuid, usually same as column, or a foreign key
    
    echo "Backing up $table..."
    psql "$DB_URL" -c "\COPY (SELECT * FROM $table WHERE $filter_col IS NOT NULL AND $filter_col::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') TO STDOUT WITH CSV HEADER" >> "$BACKUP_FILE"
}

# 1. Chat Messages (Current Blocker)
backup_table "chat_messages" "character_id" "character_id"

# 2. Therapy & Skills
backup_table "therapy_evaluations" "user_character_id" "user_character_id"
backup_table "character_skills" "character_id" "character_id"
backup_table "distributed_challenge_rewards" "user_character_id" "user_character_id"
backup_table "team_chat_logs" "speaker_character_id" "speaker_character_id"
backup_table "team_equipment_pool" "loaned_to_character_id" "loaned_to_character_id"
backup_table "team_equipment_shared" "currently_held_by" "currently_held_by"

# 4. Orphan User Characters (Valid UUIDs but missing User)
echo "Backing up orphan user_characters..."
psql "$DB_URL" -c "\COPY (SELECT uc.* FROM user_characters uc LEFT JOIN users u ON uc.user_id = u.id WHERE u.id IS NULL) TO STDOUT WITH CSV HEADER" >> "$BACKUP_FILE"

# 5. Invalid Battles (Legacy test_battle_ ids)
echo "Backing up invalid battles..."
psql "$DB_URL" -c "\COPY (SELECT * FROM battles WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') TO STDOUT WITH CSV HEADER" >> "$BACKUP_FILE"

psql "$DB_URL" -c "\COPY (SELECT * FROM battles WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') TO STDOUT WITH CSV HEADER" >> "$BACKUP_FILE"

# 6. Ghost Data (Dependents of deleted/missing characters)
# This captures items/powers that might become ghosts after we delete the orphan characters, OR effectively are already ghosts.
echo "Backing up ghost dependent data..."
tables_to_check_ghosts=(
  "character_powers" "character_items" "character_skills" "character_spells"
  "character_abilities" "character_equipment" "character_modifiers"
  "character_experience_log" "character_healing_sessions" "character_progression"
  "bond_activity_log" "character_temporary_buffs" "character_spell_loadout" 
  "character_power_loadout" "power_unlock_log" "room_beds" "financial_decisions"
  "character_category_preferences" "distributed_challenge_rewards" "team_chat_logs"
  "team_equipment_pool" "team_equipment_shared" "coach_xp_events"
)

for table_name in "${tables_to_check_ghosts[@]}"; do
    col_name="character_id"
    # Helper to guess column name if not standard
    if [[ "$table_name" == "distributed_challenge_rewards" || "$table_name" == "character_power_loadout" || "$table_name" == "character_spell_loadout" || "$table_name" == "financial_decisions" || "$table_name" == "bond_activity_log" || "$table_name" == "therapy_evaluations" ]]; then
       col_name="user_character_id"
    elif [[ "$table_name" == "team_chat_logs" ]]; then
       col_name="speaker_character_id"
    elif [[ "$table_name" == "team_equipment_pool" ]]; then
       col_name="loaned_to_character_id"
    elif [[ "$table_name" == "team_equipment_shared" ]]; then
       col_name="currently_held_by"
    fi
    
    echo "Checking ghosts for $table_name ($col_name)..."
    psql "$DB_URL" -c "\COPY (SELECT t.* FROM $table_name t LEFT JOIN user_characters uc ON t.$col_name = uc.id WHERE uc.id IS NULL) TO STDOUT WITH CSV HEADER" >> "$BACKUP_FILE"
done


# 3. Other Dependent Tables (that we might have missed or are about to prune)
# Using a generic check for standard character_id/user_character_id columns
# Note: Some of these might already be empty if deleted, but safe to check.

tables_with_char_id=(
  "character_power_loadout"
  "coach_xp_events"
  "bond_activity_log"
  "cardano_nft_metadata"
  "character_temporary_buffs"
  "character_spell_loadout"
  "character_powers"
  "power_unlock_log"
  "character_spells"
  "character_modifiers"
  "room_beds"
  "financial_decisions"
  "character_category_preferences"
  "character_equipment"
  "character_items"
  "character_abilities"
  "character_experience_log"
  "character_healing_sessions"
  "character_progression"
  "character_relationships"
)

for table in "${tables_with_char_id[@]}"; do
    # Try with character_id
    count=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name='$table' AND column_name='character_id'" | tr -d ' ')
    if [ "$count" -eq "1" ]; then
         backup_table "$table" "character_id" "character_id"
    else
         # Try user_character_id
         count2=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name='$table' AND column_name='user_character_id'" | tr -d ' ')
         if [ "$count2" -eq "1" ]; then
             backup_table "$table" "user_character_id" "user_character_id"
         fi
    fi
done

echo "Backup complete. File saved to $BACKUP_FILE"
