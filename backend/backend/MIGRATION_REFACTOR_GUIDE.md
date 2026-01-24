# Database Migration Refactor Guide

## Overview
This refactor moved all embedded schema logic from application code to the centralized database migration system.

## Changes Made

### 1. Consolidated Schema Logic
- **Before**: Schema definitions scattered across multiple TypeScript files
- **After**: All schema centralized in `migrations/005_embedded_schema_consolidation.sql`

### 2. Refactored Database Initialization
- **Before**: `sqlite.ts` contained extensive CREATE TABLE statements
- **After**: `sqlite.ts` uses migration system for all schema operations

### 3. Created Database Service
- **New**: `services/databaseService.ts` provides centralized database management
- **Benefits**: Better error handling, migration management, schema verification

## Files Modified

### Core Database Files
- `backend/src/database/sqlite.ts` - Now migration-driven
- `backend/src/services/databaseService.ts` - New centralized service

### Migration Files
- `backend/migrations/005_embedded_schema_consolidation.sql` - New consolidated migration
- Various migration scripts marked as deprecated

### Deprecated Files (kept for reference)
- `backend/add_psychstats_migration.ts`
- `backend/migrate_psychstats_to_characters.ts` 
- `backend/add_missing_column.ts`
- `backend/update_archetype_schema.ts`

## Usage

### Application Startup
```typescript
import { databaseService } from './services/databaseService';

// Initialize database with migrations
await databaseService.initialize();

// Get database connection
const db = databaseService.getConnection();
```

### Running Migrations Manually
```bash
cd backend/migrations
./run-migrations.sh development
```

### Adding New Schema Changes
1. Create new migration file: `006_feature_name.sql`
2. Add to migrations directory
3. Run migration script
4. **Never** add schema logic to application code

## Benefits

1. **Centralized Schema Management**: All database structure in one place
2. **Version Control**: Database changes tracked through migrations
3. **Environment Consistency**: Same schema across dev/staging/production
4. **Rollback Support**: Can revert database changes if needed
5. **Reduced Code Duplication**: No more scattered CREATE TABLE statements

## Migration System Features

- ✅ Automatic migration tracking
- ✅ Environment-specific configuration
- ✅ Rollback support
- ✅ Dependency validation
- ✅ PostgreSQL and SQLite support
- ✅ Comprehensive logging

## Next Steps

1. Test the refactored database initialization
2. Verify all existing functionality still works
3. Remove deprecated migration scripts after verification
4. Update documentation to reflect new migration-driven approach
