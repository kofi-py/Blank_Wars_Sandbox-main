import { query } from './src/database/postgres';

async function checkDatabaseTables() {
  try {
    console.log('🔍 Checking Railway PostgreSQL database tables...\n');
    
    // Get all tables in the database
    const tablesResult = await query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tablesResult.rows.length} tables in database:\n`);
    
    for (const table of tablesResult.rows) {
      console.log(`📋 Table: ${table.table_name}`);
      
      // Get column information for each table
      const columnsResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log(`   Columns (${columnsResult.rows.length}):`);
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
      
      // Get row count
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        console.log(`   📈 Rows: ${countResult.rows[0].count}\n`);
      } catch (err) {
        console.log(`   📈 Rows: Error counting (${err.message})\n`);
      }
    }
    
    console.log('✅ Database audit complete!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseTables();