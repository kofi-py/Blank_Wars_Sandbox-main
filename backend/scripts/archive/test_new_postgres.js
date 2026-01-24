// Test script for the new migration-driven PostgreSQL connection
require('dotenv').config();

async function testDatabase() {
  try {
    console.log('🔍 Testing new migration-driven PostgreSQL connection...');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Import the refactored database module
    const { db, query, initializeDatabase } = require('./src/database');

    console.log('✅ Database module imported successfully');

    // Test basic connection
    console.log('🔌 Testing database connection...');
    const testResult = await query('SELECT NOW() as current_time');
    console.log('✅ Connection successful! Current time:', testResult.rows[0].current_time);

    // Check if migration_log table exists (should be created by our new migration system)
    console.log('📋 Checking migration system...');
    const migrationCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migration_log'
      );
    `);

    if (migrationCheck.rows[0].exists) {
      console.log('✅ Migration system table found - checking migration status...');
      const migrations = await query('SELECT * FROM migration_log ORDER BY applied_at DESC LIMIT 5');
      console.log('Recent migrations:', migrations.rows);
    } else {
      console.log('⚠️ Migration table not found - will be created on initialization');
    }

    console.log('🎯 Testing database initialization...');
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    const { closeDatabase } = require('./src/database');
    await closeDatabase();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

testDatabase();
