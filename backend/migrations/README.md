# Database Migration System

This directory contains the PostgreSQL database migration system for Blank Wars.

## Overview

The migration system provides versioned, incremental database schema changes that can be safely applied to development, staging, and production environments.

## Migration Files

Migrations are numbered sequentially and contain both the schema changes and rollback information:

- `000_migration_system.sql` - Creates the migration tracking table
- `001_initial_schema.sql` - Core user and character system tables
- `002_battle_system.sql` - Battle mechanics, equipment, and combat features
- `003_social_and_economy.sql` - Chat, packs, economy, and social features
- `004_tournaments_and_analytics.sql` - Tournament system and analytics

## Running Migrations

### Prerequisites

1. PostgreSQL 15+ installed and running
2. Database credentials configured via environment variables
3. `psql` command-line tool available

### Environment Variables

Set these environment variables based on your target environment:

#### Development
```bash
export DEV_DB_HOST=localhost
export DEV_DB_PORT=5432
export DEV_DB_NAME=blankwars_dev
export DEV_DB_USER=postgres
export DEV_DB_PASSWORD=postgres
```

#### Staging
```bash
export STAGING_DB_HOST=staging-db.example.com
export STAGING_DB_PORT=5432
export STAGING_DB_NAME=blankwars_staging
export STAGING_DB_USER=blankwars_staging
export STAGING_DB_PASSWORD=your_staging_password
```

#### Production
```bash
export PROD_DB_HOST=prod-db.example.com
export PROD_DB_PORT=5432
export PROD_DB_NAME=blankwars_prod
export PROD_DB_USER=blankwars_prod
export PROD_DB_PASSWORD=your_production_password
```

### Running All Migrations

```bash
# Development environment (default)
./run-migrations.sh

# Staging environment
./run-migrations.sh staging

# Production environment
./run-migrations.sh production
```

### Running Specific Migrations

```bash
# Apply migrations up to version 002
./run-migrations.sh development 002

# Apply migrations up to version 003 in staging
./run-migrations.sh staging 003
```

## Migration Safety

- Migrations are idempotent - running them multiple times is safe
- Each migration is wrapped in a transaction
- Applied migrations are tracked in the `migration_log` table
- Migration logs are written to `migration.log`

## Schema Overview

### Core Tables

#### User System
- `users` - User accounts and profiles
- `refresh_tokens` - JWT refresh token storage
- `user_currency` - User currency balances
- `user_friendships` - Social connections

#### Character System
- `characters` - Master character templates
- `user_characters` - User-owned character instances
- `user_character_echoes` - Duplicate character tracking

#### Battle System
- `battles` - Battle instances and results
- `battle_queue` - Matchmaking queue
- `equipment` - Equipment templates
- `user_equipment` - User-owned equipment instances

#### Social Features
- `chat_messages` - All chat and messaging
- `character_conflicts` - Conflict tracking
- `therapy_sessions` - Therapy and counseling

#### Economy
- `card_packs` - Pack templates
- `qr_codes` - Physical pack QR codes
- `claimable_packs` - Reward packs
- `purchases` - Transaction history

#### Tournament System
- `tournaments` - Tournament definitions
- `tournament_participants` - Tournament participation
- `training_sessions` - Training activities
- `analytics_events` - User behavior tracking

## Custom Types

The system uses PostgreSQL enums for type safety:

- `subscription_tier` - User subscription levels
- `character_archetype` - Character types
- `character_rarity` - Rarity levels
- `battle_status` - Battle states
- `tournament_status` - Tournament states
- `event_source` - Chat and event sources

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** thoroughly in development and staging
3. **Review migration logs** after completion
4. **Use transactions** for complex schema changes
5. **Include rollback instructions** in migration comments
6. **Version control** all migration files

## Troubleshooting

### Common Issues

1. **Connection refused**: Check database is running and credentials are correct
2. **Permission denied**: Ensure database user has CREATE and ALTER privileges
3. **Table already exists**: Migration may have been partially applied - check `migration_log`

### Checking Migration Status

```sql
-- See all applied migrations
SELECT * FROM migration_log ORDER BY version;

-- Check current schema version
SELECT MAX(version) as current_version FROM migration_log;

-- Count tables in database
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```

### Manual Migration Rollback

If you need to rollback a migration manually:

1. Identify the migration version to rollback
2. Run the appropriate DROP/ALTER statements
3. Remove the entry from `migration_log`

```sql
-- Example rollback (be very careful!)
DELETE FROM migration_log WHERE version = '004';
-- Then run appropriate DROP statements...
```

## Development Workflow

1. Create new migration file with next sequential number
2. Test migration in development environment
3. Apply to staging for integration testing
4. Deploy to production during maintenance window
5. Monitor application for any issues

## Support

For issues with the migration system:

1. Check `migration.log` for detailed error messages
2. Verify database connectivity and permissions
3. Ensure all prerequisites are installed
4. Review migration file syntax for SQL errors
