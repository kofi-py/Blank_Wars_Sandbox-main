const { Pool } = require('pg');
require('dotenv').config();

async function checkDevAccount() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find all test/dev users
    console.log('=== FINDING DEV/TEST USERS ===');
    const users = await pool.query(`
      SELECT id, username, email 
      FROM users 
      WHERE email LIKE '%test%' OR email LIKE '%dev%' 
         OR username LIKE '%test%' OR username LIKE '%dev%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('Found', users.rowCount, 'dev/test users:');
    users.rows.forEach(u => console.log(`  - ${u.username} (${u.email}): ${u.id}`));
    
    // Check each user's characters
    console.log('\n=== CHECKING THEIR CHARACTERS ===');
    for (const user of users.rows) {
      const chars = await pool.query(`
        SELECT uc.id, uc.character_id, c.name 
        FROM user_characters uc
        LEFT JOIN characters c ON uc.character_id = c.id
        WHERE uc.user_id = $1
      `, [user.id]);
      
      console.log(`\nUser ${user.username} has ${chars.rowCount} characters:`);
      chars.rows.slice(0, 5).forEach(c => {
        console.log(`  - ${c.id} -> ${c.character_id} (${c.name || 'NO NAME'})`);
      });
    }
    
    // Find the specific problematic character
    console.log('\n=== FINDING PROBLEMATIC CHARACTER ===');
    const problemChar = await pool.query(`
      SELECT uc.*, u.username, u.email
      FROM user_characters uc
      JOIN users u ON uc.user_id = u.id
      WHERE uc.id LIKE '%1755100335173%'
      LIMIT 1
    `);
    
    if (problemChar.rows[0]) {
      console.log('Problem character belongs to:', problemChar.rows[0].username, problemChar.rows[0].email);
      console.log('Character ID:', problemChar.rows[0].id);
      console.log('Character template:', problemChar.rows[0].character_id);
    }
    
    // List all available real character templates
    console.log('\n=== AVAILABLE REAL CHARACTERS ===');
    const realChars = await pool.query(`
      SELECT id, name FROM characters 
      WHERE id NOT LIKE '%test%' 
      ORDER BY name
    `);
    console.log('Found', realChars.rowCount, 'real character templates:');
    realChars.rows.forEach(c => console.log(`  - ${c.id}: ${c.name}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDevAccount();