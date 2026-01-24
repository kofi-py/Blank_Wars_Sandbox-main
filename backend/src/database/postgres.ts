import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
const dotenv = require('dotenv');
dotenv.config();

const exec_async = promisify(exec);

// Import cache service
import { cache_service as cache } from '../services/cacheService';

// PostgreSQL database connection for all environments
const database_url = process.env.DATABASE_URL;

if (!database_url || !(database_url.startsWith('postgres') || database_url.startsWith('postgresql'))) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string');
}

console.log('🐘 Using PostgreSQL database with migration system');
export const db = new Pool({
  connectionString: database_url,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// PostgreSQL query function
export const query = async (sql: string, params?: any[]): Promise<any> => {
  try {
    const result = await db.query(sql, params || []);
    return {
      rows: result.rows,
      row_count: result.rowCount
    };
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

/**
 * Initialize database using migration system
 * All schema definitions are now managed through migrations
 */
export const initialize_database = async (): Promise<void> => {
  try {
    console.log('🔧 Initializing PostgreSQL database with migration system...');

    // Check if database is new (no migration_log table)
    const migration_table_exists = await checkIfMigrationTableExists();

    if (process.env.NODE_ENV === 'production') {
      console.log('📋 Production environment detected - skipping internal migration run (handled by start script)...');
    } else {
      if (!migration_table_exists) {
        console.log('📋 New database detected - running all migrations...');
        await runMigrations();
      } else {
        console.log('📋 Existing database detected - checking for pending migrations...');
        await runMigrations();
      }
    }

    // Seed characters if needed
    await seed_characters_if_empty();

    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Check if migration_log table exists
 */
async function checkIfMigrationTableExists(): Promise<boolean> {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migration_log'
      );
    `);
    return result.rows[0]?.exists || false;
  } catch (error) {
    console.log('Migration table check failed, assuming new database');
    return false;
  }
}

/**
 * Run database migrations using the centralized migration system
 */
async function runMigrations(): Promise<void> {
  try {
    const migration_script = path.join(__dirname, '..', '..', 'migrations', 'run-migrations.sh');

    console.log('🚀 Running database migrations...');

    // Set environment for PostgreSQL
    const env = {
      ...process.env,
      DB_TYPE: 'postgresql',
      ENVIRONMENT: process.env.NODE_ENV || 'development'
    };

    const { stdout, stderr } = await exec_async(`bash ${migration_script}`, { env });

    if (stderr && !stderr.includes('already exists') && !stderr.includes('already applied')) {
      console.warn('Migration warnings:', stderr);
    }

    if (stdout) {
      console.log('Migration output:', stdout);
    }
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed, falling back to basic initialization:', error);
    await fallbackBasicInitialization();
  }
}

/**
 * Fallback basic table initialization if migrations fail
 * This should only be used as a last resort
 */
async function fallbackBasicInitialization(): Promise<void> {
  console.log('⚠️  Using fallback basic table initialization...');

  try {
    // Create migration tracking table first
    await query(`
      CREATE TABLE IF NOT EXISTS migration_log (
        version TEXT PRIMARY KEY,
        description TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create minimal essential tables for basic functionality
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        subscription_tier TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        archetype TEXT,
        rarity TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_characters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        character_id TEXT NOT NULL,
        current_level INTEGER DEFAULT 1,
        bond_level INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id)
      );
    `);

    // Record that basic initialization was done
    await query(`
      INSERT INTO migration_log (version, description)
      VALUES (0, 'Basic fallback initialization - please run full migrations ASAP')
      ON CONFLICT (version) DO NOTHING;
    `);

    console.log('⚠️  Basic tables created - please run full migrations as soon as possible');
  } catch (error) {
    console.error('❌ Even fallback initialization failed:', error);
    throw error;
  }
}

/**
 * Seed characters if database is empty
 */
export const seed_characters_if_empty = async (): Promise<void> => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM characters');
    const character_count = parseInt(result.rows[0]?.count || '0');

    if (character_count === 0) {
      console.log('📚 Database is empty - character seeding will be handled by migration system...');
      console.log('💡 To seed characters manually, run the appropriate seeding script');
    } else {
      console.log(`📚 Found ${character_count} characters in database`);
    }
  } catch (error) {
    console.error('❌ Character count check failed:', error);
    // Don't throw - this is not critical for basic functionality
  }
};

/**
 * Get database connection pool
 */
export function getDatabase(): Pool {
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await db.end();
    console.log('📴 PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Database closure error:', error);
    throw error;
  }
}

// Re-export cache service from the proper service
export { cache_service as cache } from '../services/cacheService';

// Legacy export for backwards compatibility
export default { db, query, initialize_database, seed_characters_if_empty };
