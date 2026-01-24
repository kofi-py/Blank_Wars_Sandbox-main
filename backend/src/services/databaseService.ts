import { initialize_database, db, closeDatabase } from '../database/postgres';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const exec_async = promisify(exec);

/**
 * Database Service - Centralized PostgreSQL database management
 * All database operations should go through this service
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private initialized = false;

  private constructor() {}

  static get_instance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('📋 Database already initialized');
      return;
    }

    try {
      console.log('🚀 Starting database initialization...');

      // Initialize database using migration system
      await initialize_database();

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
    const critical_tables = [
      'users', 'characters', 'user_characters',
      'battles', 'chat_messages', 'migration_log'
    ];

    for (const table of critical_tables) {
      try {
        const result = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [table]);

        if (!result.rows[0]?.exists) {
          console.warn(`⚠️ Table '${table}' does not exist. Database schema may be incomplete.`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not verify table '${table}':`, error);
      }
    }
    console.log('✅ Database schema verification completed');
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    try {
      const migration_script = path.join(process.cwd(), 'migrations', 'run-migrations.sh');

      console.log('🔄 Running database migrations...');

      const env = {
        ...process.env,
        DB_TYPE: 'postgresql',
        ENVIRONMENT: process.env.NODE_ENV || 'development'
      };

      const { stdout, stderr } = await exec_async(`sh ${migration_script}`, { env });

      if (stderr && !stderr.includes('already exists') && !stderr.includes('already applied')) {
        console.warn('Migration warnings:', stderr);
      }

      if (stdout) {
        console.log('Migration output:', stdout);
      }
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get database connection pool
   */
  getConnection() {
    if (!this.initialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return db;
  }

  /**
   * Gracefully shutdown database
   */
  async shutdown(): Promise<void> {
    try {
      await closeDatabase();
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

  /**
   * Execute a database query
   */
  async query(sql: string, params?: any[]) {
    if (!this.initialized) {
      throw new Error('Database service not initialized. Call initialize() first.');
    }
    return await db.query(sql, params);
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      const result = await db.query('SELECT 1 as health');
      return {
        status: 'healthy',
        connected: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const database_service = DatabaseService.get_instance();
