const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function fixDevCharacters() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find the main test user
    const userResult = await pool.query(`
      SELECT * FROM users 
      WHERE username = 'testuser' AND email = 'test@example.com'
      LIMIT 1
    `);
    
    if (!userResult.rows[0]) {
      console.log('❌ Could not find testuser account');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ${user.username} (${user.id})`);
    
    // Delete old/broken characters
    const deleteResult = await pool.query(`
      DELETE FROM user_characters 
      WHERE user_id = $1
    `, [user.id]);
    
    console.log(`Deleted ${deleteResult.rowCount} old characters`);
    
    // Get all real character templates
    const templates = await pool.query(`
      SELECT * FROM characters 
      WHERE id NOT LIKE '%test%'
      ORDER BY name
      LIMIT 17
    `);
    
    console.log(`Found ${templates.rowCount} character templates to add`);
    
    // Add each character to the user
    for (const template of templates.rows) {
      const newCharId = `userchar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await pool.query(`
        INSERT INTO user_characters (
          id, user_id, character_id, nickname,
          level, experience, bond_level,
          current_health, max_health,
          wallet, debt, financial_stress, coach_trust_level,
          current_mental_health, current_training, current_team_player,
          current_ego, current_communication, stress_level,
          fatigue_level, morale
        ) VALUES (
          $1, $2, $3, $4,
          1, 0, 0,
          100, 100,
          1000, 0, 0, 50,
          85, 75, 70,
          60, 80, 0,
          0, 80
        )
      `, [newCharId, user.id, template.id, template.name]);
      
      console.log(`✅ Added ${template.name} (${newCharId})`);
    }
    
    // Verify
    const newChars = await pool.query(`
      SELECT uc.id, uc.character_id, c.name 
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.user_id = $1
    `, [user.id]);
    
    console.log(`\n✨ User now has ${newChars.rowCount} working characters!`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixDevCharacters();