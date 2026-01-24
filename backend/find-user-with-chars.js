const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findUserWithChars() {
  const result = await pool.query(`
    SELECT u.id, u.username, COUNT(uc.id) as char_count
    FROM users u
    LEFT JOIN user_characters uc ON u.id = uc.user_id
    GROUP BY u.id, u.username
    HAVING COUNT(uc.id) > 0
    ORDER BY char_count DESC
    LIMIT 5
  `);
  
  console.log('Users with characters:');
  if (result.rows.length === 0) {
    console.log('  NO USERS HAVE CHARACTERS!');
  } else {
    result.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.char_count} characters`);
    });
  }
  
  await pool.end();
}

findUserWithChars().catch(console.error);
