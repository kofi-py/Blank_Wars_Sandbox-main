const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUsers() {
  const result = await pool.query('SELECT id, username FROM users LIMIT 5');
  console.log('Users in database:');
  result.rows.forEach(row => {
    console.log(`  - ${row.username} (${row.id})`);
  });
  
  const charResult = await pool.query('SELECT COUNT(*) FROM user_characters WHERE user_id = $1', [result.rows[0]?.id]);
  console.log(`\nUser "${result.rows[0]?.username}" has ${charResult.rows[0].count} characters`);
  
  await pool.end();
}

checkUsers().catch(console.error);
