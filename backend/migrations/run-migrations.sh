#!/bin/bash

# PostgreSQL Migration Runner for Blank Wars
# Usage: ./run-migrations.sh [environment] [target_version]
# Example: ./run-migrations.sh production 004

# Removed set -e - causes issues with pipelines and while loops

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR"
LOG_FILE="$SCRIPT_DIR/migration.log"

# Default values
ENVIRONMENT=${1:-development}
TARGET_VERSION=${2:-latest}

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Database connection string
if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
    log "Using DATABASE_URL for connection"
else
    # Fallback only for development env if DATABASE_URL is not set
    if [ "$ENVIRONMENT" = "development" ]; then
        DB_HOST="${DEV_DB_HOST:-localhost}"
        DB_PORT="${DEV_DB_PORT:-5432}"
        DB_NAME="${DEV_DB_NAME:-blankwars}"
        DB_USER="${DEV_DB_USER:-$(whoami)}"
        DB_PASSWORD="${DEV_DB_PASSWORD:-}"
        DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        log "Using development connection parameters: $DB_HOST:$DB_PORT/$DB_NAME"
    else
        log "Error: DATABASE_URL is not set for environment '$ENVIRONMENT'. Cannot connect to database."
        exit 1
    fi
fi

# Function to execute SQL
execute_sql() {
    local sql_file="$1"
    log "Executing migration: $sql_file"

    start_time=$(date +%s)
    if psql -v ON_ERROR_STOP=1 "$DB_URL" -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        log "Migration completed successfully in ${duration}s: $sql_file"
        return 0
    else
        log "Migration failed: $sql_file"
        return 1
    fi
}

# Function to check if a migration has been applied
is_migration_applied() {
    local version="$1"
    local count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM migration_log WHERE version = '$version';" 2>/dev/null | tr -d ' ')
    [ "$count" = "1" ]
}

# Function to get applied migrations
get_applied_migrations() {
    psql "$DB_URL" -t -c "SELECT version FROM migration_log ORDER BY version;" 2>/dev/null | tr -d ' ' | grep -v '^$'
}

# Create database if it doesn't exist (for development)
if [ "$ENVIRONMENT" = "development" ]; then
    createdb "$DB_NAME" 2>/dev/null || true
fi

log "Starting migration process for environment: $ENVIRONMENT"
log "Target version: $TARGET_VERSION"
log "Database: $DB_NAME at $DB_HOST:$DB_PORT"

# Check database connectivity
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log "Error: Cannot connect to database. Please check your connection parameters."
    exit 1
fi

# Get list of migration files
migration_files=($(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

if [ ${#migration_files[@]} -eq 0 ]; then
    log "No migration files found in $MIGRATIONS_DIR"
    exit 1
fi

# Check if migration_log table exists, if not, create it
#if ! psql "$DB_URL" -c "SELECT 1 FROM migration_log LIMIT 1;" > /dev/null 2>&1; then
#    log "Migration system not initialized. Creating migration_log table..."
#    psql "$DB_URL" <<EOF
#CREATE TABLE IF NOT EXISTS migration_log (
#    id SERIAL PRIMARY KEY,
#    version VARCHAR(10) NOT NULL UNIQUE,
#    name VARCHAR(255),
#    description VARCHAR(255),
#    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#);
#CREATE INDEX IF NOT EXISTS idx_migration_log_version ON migration_log(version);
#EOF
#    if [ $? -eq 0 ]; then
#        log "Migration system initialized successfully"
#    else
#        log "Error: Failed to initialize migration system"
#        exit 1
#    fi
#else
#    # Ensure description column exists and name is nullable (for backwards compatibility)
#    psql "$DB_URL" -c "ALTER TABLE migration_log ADD COLUMN IF NOT EXISTS description VARCHAR(255);" > /dev/null 2>&1 || true
#    psql "$DB_URL" -c "ALTER TABLE migration_log ALTER COLUMN name DROP NOT NULL;" > /dev/null 2>&1 || true
#fi

# Apply migrations
for migration_file in "${migration_files[@]}"; do
    filename=$(basename "$migration_file")
    version=$(echo "$filename" | grep -o '^[0-9]\+')

    # Skip if this is the migration system file and it's already been run
    if [[ "$filename" == "000_migration_system.sql" ]] && is_migration_applied "000"; then
        continue
    fi

    # Check if we should apply this migration
    if [ "$TARGET_VERSION" != "latest" ] && [ "$version" -gt "$TARGET_VERSION" ]; then
        log "Skipping migration $version (beyond target version $TARGET_VERSION)"
        continue
    fi

    # Check if migration is already applied
    if is_migration_applied "$version"; then
        log "Migration $version already applied, skipping"
        continue
    fi

    # Apply migration
    log "Applying migration: $filename"
    if execute_sql "$migration_file"; then
        log "Successfully applied migration: $filename"
    else
        log "Failed to apply migration: $filename"
        exit 1
    fi
done

# Show final status
log "Migration process completed successfully!"
log "Applied migrations:"
get_applied_migrations | while read -r version; do
    if [ -n "$version" ]; then
        log "  - Version $version"
    fi
done || true

# Show database schema info
log "Current database schema version: $(psql "$DB_URL" -t -c "SELECT MAX(version) FROM migration_log;" | tr -d ' ')"
log "Total tables in database: $(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')"

echo "Migration completed successfully! Check $LOG_FILE for detailed logs."
