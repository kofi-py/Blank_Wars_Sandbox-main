const { Pool } = require('pg');
require('dotenv').config();

// SPECIES-BASED STAT FORMULA FOR LEVEL 1
const SPECIES_BASES = {
  // Physical species with inherent advantages
  'wolf': { hp: 70, atk: 17, def: 10, spd: 18, spc: 9 },           // Apex predator
  'construct': { hp: 75, atk: 16, def: 14, spd: 5, spc: 6 },       // Very tough, very slow
  'cyborg': { hp: 65, atk: 14, def: 16, spd: 7, spc: 8 },         // Durable, enhanced
  'vampire': { hp: 55, atk: 14, def: 11, spd: 12, spc: 8 },       // Supernatural
  'immortal_monkey': { hp: 50, atk: 15, def: 9, spd: 20, spc: 10 }, // Extremely fast
  
  // Human baseline (most common)
  'human': { hp: 50, atk: 12, def: 8, spd: 12, spc: 8 },              // Human baseline
  'human_magical': { hp: 40, atk: 6, def: 8, spd: 9, spc: 15 },   // Physically weak, high magic
  
  // Alien/exotic species
  'zeta_reticulan_grey': { hp: 30, atk: 7, def: 8, spd: 11, spc: 14 }, // Frail but intelligent
};

// RARITY MULTIPLIERS (training/experience quality)
const RARITY_MULTIPLIERS = {
  'uncommon': 1.0,
  'rare': 1.1, 
  'epic': 1.2,
  'legendary': 1.3,
  'mythic': 1.4
};

// ARCHETYPE MODIFIERS (role specialization)
const ARCHETYPE_MODIFIERS = {
  'scholar': { hp: 0.9, atk: 0.7, def: 0.9, spd: 0.9, spc: 1.4 },    // Weak but very smart
  'assassin': { hp: 0.9, atk: 1.1, def: 0.8, spd: 1.3, spc: 1.0 },   // Fast, decent attack, fragile
  'mage': { hp: 0.8, atk: 0.6, def: 1.0, spd: 0.9, spc: 1.5 },       // Very weak, very magical
  'leader': { hp: 1.1, atk: 1.0, def: 1.1, spd: 1.0, spc: 1.1 },     // Balanced, slightly better all around
  'trickster': { hp: 1.0, atk: 1.0, def: 0.9, spd: 1.4, spc: 1.0 },  // Very fast
  'mystic': { hp: 1.1, atk: 1.1, def: 1.2, spd: 1.0, spc: 0.9 },     // Balanced fighter/magic
  'warrior': { hp: 1.2, atk: 1.3, def: 1.1, spd: 1.0, spc: 0.8 },    // High HP/attack
  'beast': { hp: 1.4, atk: 1.3, def: 1.0, spd: 1.2, spc: 1.0 },      // Raw physical power
  'tank': { hp: 1.5, atk: 1.0, def: 1.8, spd: 0.6, spc: 0.7 },       // Extremely tanky, very slow
};

function calculateStats(species, rarity, archetype) {
  const base = SPECIES_BASES[species];
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  const archetypeMod = ARCHETYPE_MODIFIERS[archetype];
  
  if (!base || !rarityMult || !archetypeMod) {
    console.log(`Missing data for: ${species}/${rarity}/${archetype}`);
    return null;
  }
  
  return {
    hp: Math.round(base.hp * rarityMult * archetypeMod.hp),
    atk: Math.round(base.atk * rarityMult * archetypeMod.atk),
    def: Math.round(base.def * rarityMult * archetypeMod.def),
    spd: Math.round(base.spd * rarityMult * archetypeMod.spd),
    spc: Math.round(base.spc * rarityMult * archetypeMod.spc)
  };
}

async function generateNewStats() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== GENERATING NEW LEVEL 1 STATS ===\n');
    
    // Get all characters with their current stats and species info
    const chars = await pool.query(`
      SELECT name, species, rarity, archetype,
             base_health, base_attack, base_defense, base_speed, base_special
      FROM characters 
      ORDER BY species, name
    `);
    
    console.log('Current vs Proposed Stats:\n');
    
    const updates = [];
    
    chars.rows.forEach(char => {
      const newStats = calculateStats(char.species, char.rarity, char.archetype);
      
      if (newStats) {
        console.log(`${char.name} (${char.species}/${char.archetype}/${char.rarity}):`);
        console.log(`  OLD: HP=${char.base_health}, ATK=${char.base_attack}, DEF=${char.base_defense}, SPD=${char.base_speed}, SPC=${char.base_special}`);
        console.log(`  NEW: HP=${newStats.hp}, ATK=${newStats.atk}, DEF=${newStats.def}, SPD=${newStats.spd}, SPC=${newStats.spc}`);
        console.log(`  Change: HP(${char.base_health}→${newStats.hp}), ATK(${char.base_attack}→${newStats.atk})\n`);
        
        updates.push({
          name: char.name,
          newStats: newStats
        });
      } else {
        console.log(`❌ Could not calculate stats for ${char.name}: missing ${char.species}/${char.rarity}/${char.archetype}\n`);
      }
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Generated new stats for ${updates.length} characters`);
    console.log(`Health values now range from ~20 to ~100 (proper level 1 range)`);
    console.log(`Attack values now range from ~4 to ~25 (proper level 1 range)`);
    
    // Save the update script for later execution
    console.log(`\nTo apply these changes, run the update script that will be generated.`);
    
    return updates;
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  generateNewStats();
}

module.exports = { calculateStats, SPECIES_BASES, RARITY_MULTIPLIERS, ARCHETYPE_MODIFIERS };