import dotenv from 'dotenv';
import { query } from './src/database/postgres';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  try {
    console.log('🔑 Database configuration:');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('   DEV_DB_NAME:', process.env.DEV_DB_NAME);
    console.log('   DEV_DB_USER:', process.env.DEV_DB_USER);

    console.log('\n📡 Testing database connection...');

    // Test basic connection
    const result = await query('SELECT current_database(), current_user, version()');
    console.log('✅ Database connection successful!');
    console.log('📊 Current database:', result.rows[0].current_database);
    console.log('👤 Current user:', result.rows[0].current_user);

    // Check if healing_facilities table exists
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'healing_facilities'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ healing_facilities table exists');

      // Try to count rows
      const countResult = await query('SELECT COUNT(*) as count FROM healing_facilities');
      console.log('📊 healing_facilities has', countResult.rows[0].count, 'rows');
    } else {
      console.log('❌ healing_facilities table does NOT exist');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code) {
      console.error('🔍 Error code:', error.code);
    }
    process.exit(1);
  }
}

testDatabaseConnection();
