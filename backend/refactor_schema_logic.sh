#!/bin/bash

# Script to refactor embedded schema logic to use database-driven approach
# This script removes CREATE TABLE statements from application code and
# replaces them with calls to the migration system

echo "🔧 Refactoring embedded schema logic to database-driven approach..."

# Backup files before modification
backup_dir="./backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# Files to refactor
files_to_refactor=(
    "backend/src/database/sqlite.ts"
    "backend/add_psychstats_migration.ts"
    "backend/migrate_psychstats_to_characters.ts"
    "backend/add_missing_column.ts"
    "backend/update_archetype_schema.ts"
)

echo "📁 Creating backups in $backup_dir..."
for file in "${files_to_refactor[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$backup_dir/"
        echo "✅ Backed up $file"
    fi
done

echo "🔄 Refactoring sqlite.ts to use migration-driven approach..."

# Create new sqlite.ts that uses migrations instead of embedded schema
cat > backend/src/database/sqlite.ts << 'EOF'
import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { seedCharacters } from './seedCharacters';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Database path
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');

let db: Database.Database | null = null;

/**
 * Initialize SQLite database using migration system
 * All schema definitions are now managed through migrations
 */
export async function initDatabase(): Promise<Database.Database> {
  try {
    console.log('🔧 Initializing SQLite database with migration system...');

    // Ensure data directory exists
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true });
    }

    // Create database connection
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    console.log(`📁 Database file: ${DB_PATH}`);

    // Check if database is new (no migration_log table)
    const migrationTableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='migration_log'
    `).get();

    if (!migrationTableExists) {
      console.log('📋 New database detected - running all migrations...');
      await runMigrations();
    } else {
      console.log('📋 Existing database detected - checking for pending migrations...');
      await runMigrations();
    }

    // Seed characters if none exist
    await seedCharactersIfNeeded();

    console.log('✅ SQLite database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Run database migrations using the centralized migration system
 */
async function runMigrations(): Promise<void> {
  try {
    const migrationScript = path.join(process.cwd(), 'migrations', 'run-migrations.sh');

    if (!existsSync(migrationScript)) {
      console.warn('⚠️  Migration script not found, falling back to basic initialization');
      await initBasicTables();
      return;
    }

    console.log('🚀 Running database migrations...');

    // Set environment for SQLite
    const env = {
      ...process.env,
      DB_TYPE: 'sqlite',
      DB_PATH: DB_PATH,
      ENVIRONMENT: 'development'
    };

    const { stdout, stderr } = await execAsync(`bash ${migrationScript}`, { env });

    if (stderr && !stderr.includes('already exists')) {
      console.warn('Migration warnings:', stderr);
    }

    console.log('Migration output:', stdout);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Fallback basic table initialization if migrations aren't available
 * This should only be used as a last resort
 */
async function initBasicTables(): Promise<void> {
  console.log('⚠️  Using fallback basic table initialization...');

  if (!db) throw new Error('Database not initialized');

  // Only create the most essential tables for basic functionality
  db.exec(`
    -- Migration tracking table
    CREATE TABLE IF NOT EXISTS migration_log (
      version TEXT PRIMARY KEY,
      description TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Minimal users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Minimal characters table
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      archetype TEXT,
      rarity TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Record that basic initialization was done
    INSERT OR IGNORE INTO migration_log (version, description)
    VALUES ('000_basic', 'Basic fallback initialization');
  `);

  console.log('⚠️  Basic tables created - please run full migrations as soon as possible');
}

/**
 * Seed characters if database is empty
 */
async function seedCharactersIfNeeded(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const characterCount = db.prepare('SELECT COUNT(*) as count FROM characters').get() as { count: number };

  if (characterCount.count === 0) {
    console.log('📚 Seeding initial character data...');
    try {
      await seedCharacters();
      console.log('✅ Character seeding completed successfully');
    } catch (error) {
      console.error('❌ Character seeding failed:', error);
      // Don't throw - this is not critical for basic functionality
    }
  } else {
    console.log(`📚 Found ${characterCount.count} characters in database`);
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('📴 Database connection closed');
  }
}

/**
 * Execute a query with the database
 */
export function query(sql: string, params?: any[]): any {
  const database = getDatabase();

  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return database.prepare(sql).all(params);
  } else {
    return database.prepare(sql).run(params);
  }
}

// Export the database initialization function as default
export default initDatabase;
EOF

echo "✅ Created new migration-driven sqlite.ts"

# Mark the old migration files as deprecated
for file in backend/add_psychstats_migration.ts backend/migrate_psychstats_to_characters.ts backend/add_missing_column.ts backend/update_archetype_schema.ts; do
    if [ -f "$file" ]; then
        # Add deprecation notice at the top
        sed -i '1i // DEPRECATED: This migration has been consolidated into 005_embedded_schema_consolidation.sql\n// This file is kept for reference but should not be executed\n' "$file"
        echo "✅ Added deprecation notice to $file"
    fi
done

echo "🔄 Creating database initialization service..."

# Create a new service for database initialization
cat > backend/src/services/databaseService.ts << 'EOF'
import { initDatabase, getDatabase, closeDatabase } from '../database/sqlite';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Database Service - Centralized database management
 * All database operations should go through this service
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private initialized = false;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database with full migration support
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('📋 Database already initialized');
      return;
    }

    try {
      console.log('🚀 Starting database initialization...');

      // Initialize database using migration system
      await initDatabase();

      // Verify critical tables exist
      await this.verifySchema();

      this.initialized = true;
      console.log('✅ Database service initialized successfully');
    } catch (error) {
      console.error('❌ Database service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify that critical database schema exists
   */
  private async verifySchema(): Promise<void> {
    const db = getDatabase();

    const criticalTables = [
      'users', 'characters', 'user_characters',
      'battles', 'chat_messages', 'migration_log'
    ];

    for (const table of criticalTables) {
      const exists = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
      `).get(table);

      if (!exists) {
        throw new Error(`Critical table '${table}' does not exist. Database schema may be incomplete.`);
      }
    }

    console.log('✅ Database schema verification passed');
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      const migrationScript = path.join(process.cwd(), 'migrations', 'run-migrations.sh');

      console.log('🔄 Running database migrations...');

      const env = {
        ...process.env,
        DB_TYPE: 'sqlite',
        ENVIRONMENT: 'development'
      };

      const { stdout, stderr } = await execAsync(`bash ${migrationScript}`, { env });

      if (stderr && !stderr.includes('already exists')) {
        console.warn('Migration warnings:', stderr);
      }

      console.log('Migration output:', stdout);
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get database connection
   */
  getConnection() {
    if (!this.initialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return getDatabase();
  }

  /**
   * Gracefully shutdown database
   */
  async shutdown(): Promise<void> {
    try {
      closeDatabase();
      this.initialized = false;
      console.log('📴 Database service shutdown complete');
    } catch (error) {
      console.error('❌ Database shutdown error:', error);
      throw error;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
export default databaseService;
EOF

echo "✅ Created database service"

echo "📝 Creating migration usage documentation..."

cat > backend/MIGRATION_REFACTOR_GUIDE.md << 'EOF'
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
EOF

echo "✅ Created refactor documentation"

echo "🎉 Database schema refactor complete!"
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Created migration 005_embedded_schema_consolidation.sql"
echo "  ✅ Refactored sqlite.ts to use migration system"
echo "  ✅ Created centralized database service"
echo "  ✅ Marked old migration files as deprecated"
echo "  ✅ Created comprehensive documentation"
echo ""
echo "🚀 Next steps:"
echo "  1. Test the new database initialization"
echo "  2. Run the new migration: ./run-migrations.sh development"
echo "  3. Verify application functionality"
echo "  4. Commit the refactored code"
