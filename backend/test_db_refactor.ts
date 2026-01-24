import { db, query, initializeDatabase } from './src/database';

async function testNewDatabase() {
  try {
    console.log('🔍 Testing migration-driven PostgreSQL connection...');

    // Mock the database URL for testing
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/blankwars_dev';
      console.log('⚠️ Using default DATABASE_URL for testing');
    }

    console.log('✅ Database module imported successfully');
    console.log('🎯 Testing database initialization...');

    await initializeDatabase();
    console.log('✅ Database initialization completed successfully!');

    // Test a simple query
    const result = await query('SELECT COUNT(*) FROM migration_log');
    console.log('✅ Migration log table accessible, entries:', result.rows[0].count);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Check if it's a connection error vs schema error
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      console.log('📋 This appears to be a schema issue - migration system should handle this');
    } else if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      console.log('🔌 This appears to be a connection issue - check PostgreSQL server');
    }
  }
}

testNewDatabase();
