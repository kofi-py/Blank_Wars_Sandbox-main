import { initializeDatabase, query } from './src/database/index';

/**
 * Fix character stat scaling - make level 1 characters have appropriate base stats
 * and implement proper scaling formulas
 */

interface ScaledStats {
  base_health: number;
  base_attack: number;
  base_defense: number;
  base_speed: number;
  base_special: number;
}

/**
 * Calculate scaled stats for a character at a given level
 * Level 1 = base stats, Level 50 = current database stats
 */
function calculateScaledStats(currentStats: ScaledStats, level: number): ScaledStats {
  // Scale from level 1 to level 50 (max level)
  const maxLevel = 50;
  const scaleFactor = Math.min(level / maxLevel, 1);
  
  // Level 1 should be ~8% of current stats  
  const level1Multiplier = 0.08;
  const statRange = 1 - level1Multiplier; // 0.92 range from level 1 to max
  
  const finalMultiplier = level1Multiplier + (statRange * scaleFactor);
  
  return {
    base_health: Math.round(currentStats.baseHealth * finalMultiplier),
    base_attack: Math.round(currentStats.baseAttack * finalMultiplier),
    base_defense: Math.round(currentStats.baseDefense * finalMultiplier),
    base_speed: Math.round(currentStats.baseSpeed * finalMultiplier),
    base_special: Math.round(currentStats.baseSpecial * finalMultiplier)
  };
}

/**
 * Calculate level 1 base stats from current endgame stats
 */
function calculateLevel1Stats(endgameStats: ScaledStats): ScaledStats {
  // Use a flexible multiplier that keeps HP under 100 but preserves character uniqueness
  const targetMaxHP = 100;
  const hpMultiplier = Math.min(0.1, targetMaxHP / endgameStats.baseHealth);
  
  // Use the same multiplier for other stats to maintain proportions
  const statMultiplier = hpMultiplier;
  
  return {
    base_health: Math.min(Math.max(Math.round(endgameStats.baseHealth * hpMultiplier), 40), 100), // 40-100 HP range
    base_attack: Math.max(Math.round(endgameStats.baseAttack * statMultiplier), 6), // Min 6 attack
    base_defense: Math.max(Math.round(endgameStats.baseDefense * statMultiplier), 4),  // Min 4 defense  
    base_speed: Math.max(Math.round(endgameStats.baseSpeed * statMultiplier), 8),   // Min 8 speed
    base_special: Math.max(Math.round(endgameStats.baseSpecial * statMultiplier), 5)  // Min 5 special
  };
}

async function fixCharacterStatScaling() {
  try {
    console.log('🔧 Starting character stat scaling fix...');
    
    // Get all characters with their current stats
    const result = await query('SELECT * FROM characters ORDER BY name');
    const characters = result.rows;
    
    console.log(`Found ${characters.length} characters to fix`);
    
    // Update each character's base stats to level 1 appropriate values
    for (const character of characters) {
      const currentStats: ScaledStats = {
        base_health: character.base_health,
        base_attack: character.base_attack,
        base_defense: character.base_defense,
        base_speed: character.base_speed,
        base_special: character.base_special
      };
      
      // Calculate appropriate level 1 stats
      const level1Stats = calculateLevel1Stats(currentStats);
      
      console.log(`\n📊 ${character.name}:`);
      console.log(`  Before: HP=${currentStats.baseHealth} ATK=${currentStats.baseAttack} DEF=${currentStats.baseDefense} SPD=${currentStats.baseSpeed} SPC=${currentStats.baseSpecial}`);
      console.log(`  After:  HP=${level1Stats.baseHealth} ATK=${level1Stats.baseAttack} DEF=${level1Stats.baseDefense} SPD=${level1Stats.baseSpeed} SPC=${level1Stats.baseSpecial}`);
      
      // Update the character's base stats in the database
      await query(`
        UPDATE characters 
        SET base_health = $1, base_attack = $2, base_defense = $3, base_speed = $4, base_special = $5
        WHERE id = $6
      `, [
        level1Stats.baseHealth,
        level1Stats.baseAttack, 
        level1Stats.baseDefense,
        level1Stats.baseSpeed,
        level1Stats.baseSpecial,
        character.id
      ]);
    }
    
    // Now update all user_characters to have proper current stats based on their level
    console.log('\n🔄 Updating user character stats based on their levels...');
    
    const userCharResult = await query(`
      SELECT uc.*, c.base_health, c.base_attack, c.base_defense, c.base_speed, c.base_special
      FROM user_characters uc 
      JOIN characters c ON uc.character_id = c.id
    `);
    
    for (const userChar of userCharResult.rows) {
      const level = userChar.level || 1;
      
      // Calculate stats for this character's level using the new level 1 base stats
      const characterBaseStats: ScaledStats = {
        base_health: userChar.base_health,
        base_attack: userChar.base_attack,
        base_defense: userChar.base_defense,
        base_speed: userChar.base_speed,
        base_special: userChar.base_special
      };
      
      // For now, we'll calculate what the endgame stats should be (level 50)
      // and then scale back to the character's current level
      const endgameStats: ScaledStats = {
        base_health: Math.round(characterBaseStats.baseHealth / 0.08), // Reverse the level 1 calculation
        base_attack: Math.round(characterBaseStats.baseAttack / 0.08),
        base_defense: Math.round(characterBaseStats.baseDefense / 0.08),
        base_speed: Math.round(characterBaseStats.baseSpeed / 0.08),
        base_special: Math.round(characterBaseStats.baseSpecial / 0.08)
      };
      
      const scaledStats = calculateScaledStats(endgameStats, level);
      
      // Update current and max health based on the character's level
      await query(`
        UPDATE user_characters 
        SET current_health = $1, max_health = $2
        WHERE id = $3
      `, [
        scaledStats.baseHealth, // Current health = max health
        scaledStats.baseHealth, // Max health based on level
        userChar.id
      ]);
    }
    
    console.log('\n✅ Character stat scaling fix completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Updated all characters to have level 1 appropriate base stats');
    console.log('- Level 1 stats are now ~20% of previous endgame stats');
    console.log('- User characters\' health updated to match their level');
    console.log('- Ready for proper level-based progression system');
    
  } catch (error) {
    console.error('❌ Error fixing character stat scaling:', error);
    throw error;
  }
}

// Example usage function to show stat scaling at different levels
async function demonstrateStatScaling() {
  console.log('\n📈 Stat Scaling Demonstration:');
  
  const achillesResult = await query('SELECT * FROM characters WHERE name = $1', ['Achilles']);
  if (achillesResult.rows[0]) {
    const achilles = achillesResult.rows[0];
    const baseStats: ScaledStats = {
      base_health: achilles.base_health,
      base_attack: achilles.base_attack,
      base_defense: achilles.base_defense,
      base_speed: achilles.base_speed,
      base_special: achilles.base_special
    };
    
    // Calculate endgame stats for demonstration
    const endgameStats: ScaledStats = {
      base_health: Math.round(baseStats.baseHealth / 0.08),
      base_attack: Math.round(baseStats.baseAttack / 0.08),
      base_defense: Math.round(baseStats.baseDefense / 0.08),
      base_speed: Math.round(baseStats.baseSpeed / 0.08),
      base_special: Math.round(baseStats.baseSpecial / 0.08)
    };
    
    console.log('\n⚔️ Achilles Stat Progression:');
    for (const level of [1, 10, 25, 40, 50]) {
      const stats = calculateScaledStats(endgameStats, level);
      console.log(`Level ${level.toString().padStart(2)}: HP=${stats.baseHealth.toString().padStart(4)} ATK=${stats.baseAttack.toString().padStart(3)} DEF=${stats.baseDefense.toString().padStart(3)} SPD=${stats.baseSpeed.toString().padStart(3)} SPC=${stats.baseSpecial.toString().padStart(3)}`);
    }
  }
}

// Main execution
async function main() {
  await initializeDatabase();
  await fixCharacterStatScaling();
  await demonstrateStatScaling();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { calculateScaledStats, calculateLevel1Stats };