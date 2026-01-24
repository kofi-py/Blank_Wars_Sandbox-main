import { db } from '../database/index';

async function fixDatabaseOwnership() {
  console.log('🔧 Checking and fixing database ownership issues...');
  
  try {
    // Get current database connection info
    const connection_result = await db.query('SELECT current_user, current_database()');
    const current_user = connection_result.rows[0].current_user;
    const current_db = connection_result.rows[0].current_database;
    
    console.log(`📊 Connected as: ${current_user} to database: ${current_db}`);
    
    // Check table ownership
    const ownership_query = `
      SELECT 
        schemaname,
        tablename, 
        tableowner 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('user_characters', 'users', 'characters', 'battles')
      ORDER BY tablename
    `;
    
    const ownership_result = await db.query(ownership_query);
    console.log('📋 Current table ownership:');
    ownership_result.rows.forEach(row => {
      console.log(`  ${row.tablename}: owned by ${row.tableowner}`);
    });
    
    // Check if we have permission to modify the user_characters table
    try {
      await db.query('SELECT COUNT(*) FROM user_characters LIMIT 1');
      console.log('✅ Successfully accessed user_characters table');
    } catch (error: any) {
      console.error('❌ Cannot access user_characters table:', error.message);
      
      if (error.message.includes('must be owner')) {
        console.log('🔧 Attempting to fix ownership (requires superuser privileges)...');
        
        try {
          // Try to change ownership to current user
          await db.query(`ALTER TABLE user_characters OWNER TO ${current_user}`);
          await db.query(`GRANT ALL PRIVILEGES ON TABLE user_characters TO ${current_user}`);
          
          // Fix sequence ownership if it exists
          await db.query(`ALTER SEQUENCE user_characters_id_seq OWNER TO ${current_user}`);
          await db.query(`GRANT USAGE, SELECT ON SEQUENCE user_characters_id_seq TO ${current_user}`);
          
          console.log('✅ Fixed user_characters table ownership');
        } catch (ownership_error: any) {
          console.error('❌ Could not fix ownership (requires superuser privileges):', ownership_error.message);
          console.log('📝 Manual fix required:');
          console.log(`   ALTER TABLE user_characters OWNER TO ${current_user};`);
          console.log(`   GRANT ALL PRIVILEGES ON TABLE user_characters TO ${current_user};`);
          console.log(`   ALTER SEQUENCE user_characters_id_seq OWNER TO ${current_user};`);
          console.log(`   GRANT USAGE, SELECT ON SEQUENCE user_characters_id_seq TO ${current_user};`);
        }
      }
    }
    
    // Test other critical tables
    const critical_tables = ['users', 'characters', 'battles'];
    for (const table of critical_tables) {
      try {
        await db.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        console.log(`✅ Successfully accessed ${table} table`);
      } catch (error: any) {
        console.warn(`⚠️ Cannot access ${table} table:`, error.message);
      }
    }
    
    console.log('🔧 Database ownership check completed');
    
  } catch (error) {
    console.error('❌ Error checking database ownership:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixDatabaseOwnership()
    .then(() => {
      console.log('✅ Database ownership fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database ownership fix failed:', error);
      process.exit(1);
    });
}

export { fixDatabaseOwnership };