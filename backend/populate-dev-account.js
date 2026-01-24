const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function populateDevAccount() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Finding a suitable dev account to populate...');
    
    // Find test@example.com user (the main one mentioned in logs)
    const userResult = await pool.query(`
      SELECT id, email, username FROM users 
      WHERE email = 'test@example.com'
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ test@example.com not found, using first available test account');
      const anyTestUser = await pool.query(`
        SELECT id, email, username FROM users 
        WHERE email LIKE '%test%' AND email LIKE '%@%'
        LIMIT 1
      `);
      
      if (anyTestUser.rows.length === 0) {
        console.log('❌ No test accounts found');
        return;
      }
      
      userResult.rows[0] = anyTestUser.rows[0];
    }
    
    const user = userResult.rows[0];
    console.log(`📧 Using account: ${user.email} (${user.username})`);
    
    // Clear existing characters for this user
    const deleteResult = await pool.query(`
      DELETE FROM user_characters WHERE user_id = $1
    `, [user.id]);
    
    console.log(`🗑️  Cleared ${deleteResult.rowCount} existing characters`);
    
    // Get some good character templates
    const templates = await pool.query(`
      SELECT id, name, archetype, origin_era, base_health, base_attack, base_defense
      FROM characters 
      WHERE name IN ('Cleopatra VII', 'Merlin', 'Achilles', 'Joan of Arc', 'Socrates')
      ORDER BY name
    `);
    
    console.log(`🎭 Found ${templates.rows.length} character templates to add`);
    
    // Create user characters
    for (const template of templates.rows) {
      const newCharId = `userchar_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      await pool.query(`
        INSERT INTO user_characters (
          id, user_id, character_id,
          level, experience, bond_level,
          current_health, max_health,
          wallet, debt, financial_stress, coach_trust_level,
          current_mental_health, current_training, current_team_player,
          current_ego, current_communication, stress_level,
          fatigue_level, morale
        ) VALUES (
          $1, $2, $3,
          1, 0, 0,
          $4, $5,
          1000, 0, 0, 50,
          85, 75, 70,
          60, 80, 0,
          0, 80
        )
      `, [newCharId, user.id, template.id, template.base_health, template.base_health]);
      
      console.log(`✅ Created ${template.name} (${newCharId})`);
    }
    
    // Verify the characters were created
    const verification = await pool.query(`
      SELECT uc.id, c.name, c.archetype
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.user_id = $1
      ORDER BY c.name
    `, [user.id]);
    
    console.log(`\n🎉 SUCCESS! Created ${verification.rows.length} characters for ${user.email}:`);
    verification.rows.forEach(char => {
      console.log(`  ${char.name} (${char.archetype}) - ID: ${char.id}`);
    });
    
    console.log(`\n💡 You can now log in as ${user.email} to test the therapy system`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

populateDevAccount();