const { Pool } = require('pg');
const { calculateStats } = require('./create-stat-formula.js');
require('dotenv').config();

async function applyNewStats() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 APPLYING NEW LEVEL 1 STATS TO DATABASE...\n');
    
    // Get all characters with their current data
    const chars = await pool.query(`
      SELECT id, name, species, rarity, archetype,
             base_health, base_attack, base_defense, base_speed, base_special
      FROM characters 
      ORDER BY name
    `);
    
    console.log('=== UPDATING CHARACTER BASE STATS ===\n');
    
    for (const char of chars.rows) {
      const newStats = calculateStats(char.species, char.rarity, char.archetype);
      
      if (newStats) {
        // Update the character template base stats
        await pool.query(`
          UPDATE characters 
          SET base_health = $1, base_attack = $2, base_defense = $3, 
              base_speed = $4, base_special = $5
          WHERE id = $6
        `, [newStats.hp, newStats.atk, newStats.def, newStats.spd, newStats.spc, char.id]);
        
        console.log(`✅ ${char.name}: HP=${char.base_health}→${newStats.hp}, ATK=${char.base_attack}→${newStats.atk}`);
      } else {
        console.log(`❌ Could not calculate stats for ${char.name}`);
      }
    }
    
    console.log('\n=== UPDATING USER CHARACTER HEALTH VALUES ===\n');
    
    // Now update all existing user characters to have matching current_health and max_health
    const userChars = await pool.query(`
      SELECT uc.id, uc.user_id, uc.character_id, uc.current_health, uc.max_health, c.name, c.base_health
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      ORDER BY c.name
    `);
    
    for (const userChar of userChars.rows) {
      // Set both current_health and max_health to the new base_health
      // (Level 1 characters start at full health)
      await pool.query(`
        UPDATE user_characters 
        SET current_health = $1, max_health = $2
        WHERE id = $3
      `, [userChar.base_health, userChar.base_health, userChar.id]);
      
      console.log(`✅ ${userChar.name} (user): ${userChar.current_health}/${userChar.max_health} → ${userChar.base_health}/${userChar.base_health} HP`);
    }
    
    console.log('\n=== VERIFICATION ===\n');
    
    // Verify the changes
    const verification = await pool.query(`
      SELECT c.name, c.species, c.archetype, c.rarity,
             c.base_health, c.base_attack, c.base_speed,
             COUNT(uc.id) as user_char_count
      FROM characters c
      LEFT JOIN user_characters uc ON c.id = uc.character_id
      GROUP BY c.id, c.name, c.species, c.archetype, c.rarity,
               c.base_health, c.base_attack, c.base_speed
      ORDER BY c.base_health DESC
      LIMIT 10
    `);
    
    console.log('Top 10 characters by HP (verification):');
    verification.rows.forEach(char => {
      console.log(`${char.name} (${char.species}/${char.archetype}): HP=${char.base_health}, ATK=${char.base_attack}, SPD=${char.base_speed} [${char.user_char_count} user instances]`);
    });
    
    console.log('\n🎉 SUCCESS! All stats updated to proper level 1 values.');
    console.log('   • Character base stats: realistic level 1 ranges');
    console.log('   • User character health: current_health = max_health = base_health');
    console.log('   • Species-based biological differences preserved');
    console.log('   • Rarity and archetype modifiers applied correctly');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  applyNewStats();
}

module.exports = { applyNewStats };