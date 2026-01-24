#!/usr/bin/env node

/**
 * Database Utilities for Blank Wars
 * 
 * Collection of utility functions for common database operations
 * and troubleshooting pack opening issues.
 * 
 * Usage Examples:
 *   node database-utils.js count-characters
 *   node database-utils.js check-user-characters <user-id>
 *   node database-utils.js create-test-pack <user-id>
 *   node database-utils.js simulate-pack-opening <user-id>
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class DatabaseUtils {
  
  // Count characters by rarity
  async countCharacters() {
    console.log('📊 CHARACTER COUNT BY RARITY');
    console.log('=' .repeat(40));
    
    try {
      const result = await pool.query(`
        SELECT 
          rarity,
          COUNT(*) as count,
          STRING_AGG(name, ', ') as sample_names
        FROM characters 
        GROUP BY rarity 
        ORDER BY 
          CASE rarity 
            WHEN 'mythic' THEN 6
            WHEN 'legendary' THEN 5
            WHEN 'epic' THEN 4
            WHEN 'rare' THEN 3
            WHEN 'uncommon' THEN 2
            WHEN 'common' THEN 1
          END DESC
      `);
      
      if (result.rows.length === 0) {
        console.log('❌ No characters found in database');
        return false;
      }
      
      let total = 0;
      result.rows.forEach(row => {
        total += parseInt(row.count);
        console.log(`${row.rarity.toUpperCase().padEnd(10)}: ${row.count.toString().padStart(2)} characters`);
        console.log(`   Sample: ${row.sample_names.substring(0, 60)}${row.sample_names.length > 60 ? '...' : ''}`);
        console.log('');
      });
      
      console.log(`Total Characters: ${total}`);
      return true;
    } catch (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
  }

  // Check specific user's characters
  async checkUserCharacters(userId) {
    console.log(`👤 USER CHARACTERS FOR: ${userId}`);
    console.log('=' .repeat(50));
    
    try {
      // Check if user exists
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        console.log('❌ User not found in database');
        return false;
      }
      
      const user = userResult.rows[0];
      console.log(`User: ${user.username} (${user.id})`);
      
      // Get user's characters
      const charactersResult = await pool.query(`
        SELECT 
          uc.id,
          uc.character_id,
          c.name,
          c.rarity,
          uc.level,
          uc.acquired_at,
          uc.serial_number
        FROM user_characters uc
        LEFT JOIN characters c ON uc.character_id = c.id
        WHERE uc.user_id = $1
        ORDER BY uc.acquired_at DESC
      `, [userId]);
      
      if (charactersResult.rows.length === 0) {
        console.log('📭 User has no characters');
        return true;
      }
      
      console.log(`\n📚 ${charactersResult.rows.length} characters owned:`);
      console.table(charactersResult.rows);
      
      // Show rarity breakdown
      const rarityBreakdown = {};
      charactersResult.rows.forEach(char => {
        rarityBreakdown[char.rarity] = (rarityBreakdown[char.rarity] || 0) + 1;
      });
      
      console.log('\n🎯 Rarity Breakdown:');
      Object.entries(rarityBreakdown).forEach(([rarity, count]) => {
        console.log(`   ${rarity}: ${count}`);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
  }

  // Create a test pack for debugging
  async createTestPack(userId = null) {
    console.log('🎁 CREATING TEST PACK');
    console.log('=' .repeat(30));
    
    try {
      // Get random characters for the pack
      const charactersResult = await pool.query(`
        SELECT id, name, rarity FROM characters 
        ORDER BY RANDOM() 
        LIMIT 3
      `);
      
      if (charactersResult.rows.length === 0) {
        console.log('❌ No characters available for pack creation');
        return null;
      }
      
      // Create the pack
      const packId = uuidv4();
      await pool.query(
        'INSERT INTO claimable_packs (id, pack_type) VALUES ($1, $2)',
        [packId, 'test_pack']
      );
      
      console.log(`📦 Created pack: ${packId}`);
      console.log('📋 Pack contents:');
      
      // Add characters to pack
      for (const character of charactersResult.rows) {
        await pool.query(
          'INSERT INTO claimable_pack_contents (pack_id, character_id) VALUES ($1, $2)',
          [packId, character.id]
        );
        console.log(`   + ${character.name} (${character.rarity})`);
      }
      
      if (userId) {
        console.log(`\n🎯 Pack ready for user ${userId} to claim`);
        console.log(`   Claim token: ${packId}`);
      }
      
      return packId;
    } catch (error) {
      console.error('❌ Error creating test pack:', error.message);
      return null;
    }
  }

  // Simulate pack opening process
  async simulatePackOpening(userId) {
    console.log(`🎮 SIMULATING PACK OPENING FOR USER: ${userId}`);
    console.log('=' .repeat(50));
    
    try {
      // Check if user exists
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        console.log('❌ User not found. Creating test user...');
        
        // Create test user
        await pool.query(
          'INSERT INTO users (id, username, email) VALUES ($1, $2, $3)',
          [userId, `testuser_${userId.slice(-6)}`, `test_${userId}@example.com`]
        );
        console.log('✅ Created test user');
      }
      
      // Create a test pack
      console.log('\n1️⃣  Creating test pack...');
      const packId = await this.createTestPack();
      if (!packId) return false;
      
      // Simulate the pack claiming process
      console.log('\n2️⃣  Simulating pack claim...');
      
      // Get pack contents before claiming
      const contentsResult = await pool.query(`
        SELECT 
          cpc.character_id,
          c.name,
          c.rarity
        FROM claimable_pack_contents cpc
        JOIN characters c ON cpc.character_id = c.id
        WHERE cpc.pack_id = $1
      `, [packId]);
      
      console.log('📋 Pack contains:');
      contentsResult.rows.forEach(char => {
        console.log(`   • ${char.name} (${char.rarity})`);
      });
      
      // Check if user already owns any of these characters
      console.log('\n3️⃣  Checking for duplicates...');
      const existingResult = await pool.query(`
        SELECT character_id FROM user_characters 
        WHERE user_id = $1 AND character_id = ANY($2)
      `, [userId, contentsResult.rows.map(c => c.character_id)]);
      
      const ownedCharacterIds = existingResult.rows.map(row => row.character_id);
      console.log(`   User already owns: ${ownedCharacterIds.length} of these characters`);
      
      // Simulate granting new characters
      console.log('\n4️⃣  Granting characters...');
      let grantedCount = 0;
      
      for (const character of contentsResult.rows) {
        if (ownedCharacterIds.includes(character.character_id)) {
          console.log(`   🔄 ${character.name} → Converted to echo (duplicate)`);
        } else {
          // Grant the character
          const userCharId = uuidv4();
          await pool.query(`
            INSERT INTO user_characters (
              id, user_id, character_id, serial_number, 
              current_health, max_health, level, experience, bond_level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userCharId,
            userId, 
            character.character_id,
            `test-${Date.now()}-${character.character_id}`,
            100, // current_health
            100, // max_health  
            1,   // level
            0,   // experience
            0    // bond_level
          ]);
          
          console.log(`   ✅ ${character.name} → Granted successfully`);
          grantedCount++;
        }
      }
      
      // Mark pack as claimed
      await pool.query(
        'UPDATE claimable_packs SET is_claimed = TRUE, claimed_by_user_id = $1, claimed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userId, packId]
      );
      
      console.log('\n5️⃣  Pack opening complete!');
      console.log(`   📊 Results: ${grantedCount} new characters granted`);
      
      // Show user's updated collection
      await this.checkUserCharacters(userId);
      
      return true;
    } catch (error) {
      console.error('❌ Simulation failed:', error.message);
      return false;
    }
  }

  // Check pack system integrity
  async checkPackIntegrity() {
    console.log('🔍 PACK SYSTEM INTEGRITY CHECK');
    console.log('=' .repeat(40));
    
    try {
      // 1. Check for packs without contents
      const emptyPacksResult = await pool.query(`
        SELECT cp.id, cp.pack_type 
        FROM claimable_packs cp
        LEFT JOIN claimable_pack_contents cpc ON cp.id = cpc.pack_id
        WHERE cpc.pack_id IS NULL
      `);
      
      if (emptyPacksResult.rows.length > 0) {
        console.log(`❌ Found ${emptyPacksResult.rows.length} packs with no contents:`);
        emptyPacksResult.rows.forEach(pack => {
          console.log(`   • ${pack.pack_type} (${pack.id})`);
        });
      } else {
        console.log('✅ All packs have contents');
      }
      
      // 2. Check for orphaned pack contents
      const orphanedContentsResult = await pool.query(`
        SELECT cpc.id, cpc.character_id
        FROM claimable_pack_contents cpc
        LEFT JOIN claimable_packs cp ON cpc.pack_id = cp.id
        WHERE cp.id IS NULL
      `);
      
      if (orphanedContentsResult.rows.length > 0) {
        console.log(`⚠️  Found ${orphanedContentsResult.rows.length} orphaned pack contents`);
      } else {
        console.log('✅ No orphaned pack contents');
      }
      
      // 3. Check for invalid character references
      const invalidCharsResult = await pool.query(`
        SELECT cpc.character_id, COUNT(*) as count
        FROM claimable_pack_contents cpc
        LEFT JOIN characters c ON cpc.character_id = c.id
        WHERE c.id IS NULL
        GROUP BY cpc.character_id
      `);
      
      if (invalidCharsResult.rows.length > 0) {
        console.log(`❌ Found ${invalidCharsResult.rows.length} invalid character references in packs:`);
        invalidCharsResult.rows.forEach(ref => {
          console.log(`   • ${ref.character_id} (${ref.count} references)`);
        });
      } else {
        console.log('✅ All pack contents reference valid characters');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const utils = new DatabaseUtils();
  
  if (args.length === 0) {
    console.log('DATABASE UTILITIES - Available Commands:');
    console.log('');
    console.log('  count-characters              - Count characters by rarity');
    console.log('  check-user <user-id>          - Show user\'s characters');
    console.log('  create-test-pack [user-id]    - Create a test pack');
    console.log('  simulate-pack <user-id>       - Simulate full pack opening');
    console.log('  check-integrity               - Check pack system integrity');
    console.log('');
    console.log('Examples:');
    console.log('  node database-utils.js count-characters');
    console.log('  node database-utils.js check-user user123');
    console.log('  node database-utils.js simulate-pack user123');
    return;
  }

  try {
    const command = args[0];
    
    switch (command) {
      case 'count-characters':
        await utils.countCharacters();
        break;
        
      case 'check-user':
        if (!args[1]) {
          console.log('❌ Please provide a user ID');
          return;
        }
        await utils.checkUserCharacters(args[1]);
        break;
        
      case 'create-test-pack':
        await utils.createTestPack(args[1]);
        break;
        
      case 'simulate-pack':
        if (!args[1]) {
          console.log('❌ Please provide a user ID');
          return;
        }
        await utils.simulatePackOpening(args[1]);
        break;
        
      case 'check-integrity':
        await utils.checkPackIntegrity();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see available commands');
    }
    
  } catch (error) {
    console.error('❌ Command failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseUtils };