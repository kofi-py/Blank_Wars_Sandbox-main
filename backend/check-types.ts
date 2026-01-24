import { query } from './src/database/postgres';
import dotenv from 'dotenv';
dotenv.config();

async function checkTypes() {
  console.log('Checking column types...\n');

  // Check teams table
  const teams = await query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'teams'
    ORDER BY ordinal_position
  `);
  console.log('=== teams table ===');
  for (const row of teams.rows) {
    console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
  }

  // Check team_context table
  const teamContext = await query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'team_context'
    ORDER BY ordinal_position
  `);
  console.log('\n=== team_context table ===');
  for (const row of teamContext.rows) {
    console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
  }

  // Check user_characters table
  const userChars = await query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'user_characters'
    AND column_name IN ('id', 'user_id', 'character_id')
  `);
  console.log('\n=== user_characters (key columns) ===');
  for (const row of userChars.rows) {
    console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
  }

  process.exit(0);
}

checkTypes();
