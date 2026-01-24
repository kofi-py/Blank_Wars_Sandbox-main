#!/usr/bin/env node

/**
 * Comprehensive Database Diagnostic Tool for Blank Wars
 * 
 * This script checks all database tables related to the pack opening system
 * and helps identify why packs might be returning 0 characters.
 * 
 * Usage: node database-diagnostic.js [options]
 * Options:
 *   --check-all     Check all tables comprehensively
 *   --check-chars   Check only character-related tables
 *   --check-packs   Check only pack-related tables  
 *   --check-users   Check only user-related tables
 *   --fix-basic     Attempt basic fixes for common issues
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class DatabaseDiagnostic {
  constructor() {
    this.results = {
      characters: { count: 0, issues: [] },
      user_characters: { count: 0, issues: [] },
      claimable_packs: { count: 0, issues: [] },
      claimable_pack_contents: { count: 0, issues: [] },
      users: { count: 0, issues: [] },
      overall: { status: 'unknown', critical_issues: [] }
    };
  }

  async checkDatabaseConnection() {
    try {
      console.log('🔌 Testing database connection...');
      const result = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connected successfully');
      console.log(`📅 Server time: ${result.rows[0].current_time}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.results.overall.critical_issues.push('Database connection failed');
      return false;
    }
  }

  async checkCharactersTable() {
    console.log('\n📚 CHARACTERS TABLE ANALYSIS');
    console.log('=' .repeat(50));
    
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'characters'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.error('❌ Characters table does not exist!');
        this.results.characters.issues.push('Table does not exist');
        return;
      }

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) as total FROM characters');
      const totalCharacters = parseInt(countResult.rows[0].total);
      this.results.characters.count = totalCharacters;
      
      console.log(`📊 Total characters: ${totalCharacters}`);
      
      if (totalCharacters === 0) {
        console.error('❌ CRITICAL: Characters table is empty!');
        console.log('   → This is why pack opening returns 0 characters');
        console.log('   → Solution: Run character seeding script');
        this.results.characters.issues.push('Table is empty - no characters to grant');
        this.results.overall.critical_issues.push('No characters in database');
        return;
      }

      // Check rarity distribution
      const rarityResult = await pool.query(`
        SELECT rarity, COUNT(*) as count 
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
      
      console.log('\n🎯 Rarity Distribution:');
      rarityResult.rows.forEach(row => {
        console.log(`   ${row.rarity.padEnd(10)}: ${row.count} characters`);
      });

      // Check for missing required fields
      const missingDataResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_names,
          COUNT(CASE WHEN base_health IS NULL OR base_health <= 0 THEN 1 END) as invalid_health,
          COUNT(CASE WHEN rarity IS NULL THEN 1 END) as missing_rarity,
          COUNT(CASE WHEN archetype IS NULL THEN 1 END) as missing_archetype
        FROM characters
      `);
      
      const missing = missingDataResult.rows[0];
      if (missing.missing_names > 0) {
        console.warn(`⚠️  ${missing.missing_names} characters missing names`);
        this.results.characters.issues.push(`${missing.missing_names} characters missing names`);
      }
      if (missing.invalid_health > 0) {
        console.warn(`⚠️  ${missing.invalid_health} characters have invalid health`);
        this.results.characters.issues.push(`${missing.invalid_health} characters have invalid health`);
      }

      // Show sample characters
      const sampleResult = await pool.query(`
        SELECT id, name, rarity, base_health 
        FROM characters 
        ORDER BY 
          CASE rarity 
            WHEN 'mythic' THEN 6
            WHEN 'legendary' THEN 5
            WHEN 'epic' THEN 4
            WHEN 'rare' THEN 3
            WHEN 'uncommon' THEN 2
            WHEN 'common' THEN 1
          END DESC
        LIMIT 10
      `);
      
      console.log('\n🎭 Sample Characters:');
      console.table(sampleResult.rows);
      
      if (this.results.characters.issues.length === 0) {
        console.log('✅ Characters table looks healthy');
      }

    } catch (error) {
      console.error('❌ Error checking characters table:', error.message);
      this.results.characters.issues.push(`Query error: ${error.message}`);
    }
  }

  async checkUserCharactersTable() {
    console.log('\n👥 USER_CHARACTERS TABLE ANALYSIS');
    console.log('=' .repeat(50));
    
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'user_characters'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.error('❌ User_characters table does not exist!');
        this.results.user_characters.issues.push('Table does not exist');
        return;
      }

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) as total FROM user_characters');
      const totalUserCharacters = parseInt(countResult.rows[0].total);
      this.results.user_characters.count = totalUserCharacters;
      
      console.log(`📊 Total user characters: ${totalUserCharacters}`);
      
      if (totalUserCharacters === 0) {
        console.log('ℹ️  User characters table is empty (this is normal for new installations)');
      } else {
        // Show user distribution
        const userDistResult = await pool.query(`
          SELECT 
            COUNT(DISTINCT user_id) as unique_users,
            AVG(character_count) as avg_characters_per_user
          FROM (
            SELECT user_id, COUNT(*) as character_count
            FROM user_characters 
            GROUP BY user_id
          ) user_counts
        `);
        
        console.log(`👤 Unique users with characters: ${userDistResult.rows[0].unique_users}`);
        console.log(`📈 Average characters per user: ${parseFloat(userDistResult.rows[0].avg_characters_per_user || 0).toFixed(2)}`);

        // Show recent character grants
        const recentResult = await pool.query(`
          SELECT uc.user_id, uc.character_id, c.name, uc.acquired_at
          FROM user_characters uc
          LEFT JOIN characters c ON uc.character_id = c.id
          ORDER BY uc.acquired_at DESC
          LIMIT 5
        `);
        
        console.log('\n🕒 Recent Character Grants:');
        console.table(recentResult.rows);
      }

      // Check for data integrity issues
      const integrityResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN character_id NOT IN (SELECT id FROM characters) THEN 1 END) as orphaned_characters,
          COUNT(CASE WHEN current_health IS NULL OR current_health < 0 THEN 1 END) as invalid_health,
          COUNT(CASE WHEN max_health IS NULL OR max_health <= 0 THEN 1 END) as invalid_max_health
        FROM user_characters
      `);
      
      const integrity = integrityResult.rows[0];
      if (integrity.orphaned_characters > 0) {
        console.warn(`⚠️  ${integrity.orphaned_characters} user characters reference non-existent characters`);
        this.results.user_characters.issues.push(`${integrity.orphaned_characters} orphaned character references`);
      }
      if (integrity.invalid_health > 0) {
        console.warn(`⚠️  ${integrity.invalid_health} user characters have invalid health values`);
        this.results.user_characters.issues.push(`${integrity.invalid_health} invalid health values`);
      }

      if (this.results.user_characters.issues.length === 0) {
        console.log('✅ User characters table looks healthy');
      }

    } catch (error) {
      console.error('❌ Error checking user_characters table:', error.message);
      this.results.user_characters.issues.push(`Query error: ${error.message}`);
    }
  }

  async checkPackTables() {
    console.log('\n📦 PACK SYSTEM ANALYSIS');
    console.log('=' .repeat(50));
    
    try {
      // Check claimable_packs table
      const packsCountResult = await pool.query('SELECT COUNT(*) as total FROM claimable_packs');
      const totalPacks = parseInt(packsCountResult.rows[0].total);
      this.results.claimable_packs.count = totalPacks;
      
      console.log(`📊 Total claimable packs: ${totalPacks}`);
      
      if (totalPacks > 0) {
        // Show pack status distribution
        const packStatusResult = await pool.query(`
          SELECT 
            pack_type,
            COUNT(*) as total,
            COUNT(CASE WHEN is_claimed = FALSE THEN 1 END) as unclaimed,
            COUNT(CASE WHEN is_claimed = TRUE THEN 1 END) as claimed
          FROM claimable_packs
          GROUP BY pack_type
        `);
        
        console.log('\n📋 Pack Status by Type:');
        console.table(packStatusResult.rows);

        // Show recent pack activity
        const recentPacksResult = await pool.query(`
          SELECT id, pack_type, is_claimed, created_at, claimed_at
          FROM claimable_packs
          ORDER BY created_at DESC
          LIMIT 5
        `);
        
        console.log('\n🕒 Recent Pack Activity:');
        console.table(recentPacksResult.rows);
      }

      // Check claimable_pack_contents table  
      const contentsCountResult = await pool.query('SELECT COUNT(*) as total FROM claimable_pack_contents');
      const totalContents = parseInt(contentsCountResult.rows[0].total);
      this.results.claimable_pack_contents.count = totalContents;
      
      console.log(`\n📊 Total pack contents: ${totalContents}`);
      
      if (totalContents === 0 && totalPacks > 0) {
        console.error('❌ CRITICAL: Packs exist but have no contents!');
        console.log('   → This will cause pack opening to fail');
        console.log('   → Packs need contents to grant characters');
        this.results.claimable_pack_contents.issues.push('Packs exist but have no contents');
        this.results.overall.critical_issues.push('Packs have no contents to grant');
      }

      if (totalContents > 0) {
        // Check content integrity
        const contentIntegrityResult = await pool.query(`
          SELECT 
            COUNT(CASE WHEN character_id NOT IN (SELECT id FROM characters) THEN 1 END) as invalid_character_refs,
            COUNT(CASE WHEN pack_id NOT IN (SELECT id FROM claimable_packs) THEN 1 END) as invalid_pack_refs,
            COUNT(DISTINCT character_id) as unique_characters_in_packs
          FROM claimable_pack_contents
        `);
        
        const contentIntegrity = contentIntegrityResult.rows[0];
        console.log(`🎭 Unique characters in packs: ${contentIntegrity.unique_characters_in_packs}`);
        
        if (contentIntegrity.invalid_character_refs > 0) {
          console.warn(`⚠️  ${contentIntegrity.invalid_character_refs} pack contents reference invalid characters`);
          this.results.claimable_pack_contents.issues.push(`${contentIntegrity.invalid_character_refs} invalid character references`);
        }
        if (contentIntegrity.invalid_pack_refs > 0) {
          console.warn(`⚠️  ${contentIntegrity.invalid_pack_refs} pack contents reference invalid packs`);
          this.results.claimable_pack_contents.issues.push(`${contentIntegrity.invalid_pack_refs} invalid pack references`);
        }

        // Show sample pack contents
        const sampleContentsResult = await pool.query(`
          SELECT 
            pc.pack_id, 
            p.pack_type, 
            pc.character_id, 
            c.name as character_name,
            c.rarity
          FROM claimable_pack_contents pc
          LEFT JOIN claimable_packs p ON pc.pack_id = p.id
          LEFT JOIN characters c ON pc.character_id = c.id
          ORDER BY pc.created_at DESC
          LIMIT 10
        `);
        
        console.log('\n🎁 Sample Pack Contents:');
        console.table(sampleContentsResult.rows);
      }

    } catch (error) {
      console.error('❌ Error checking pack tables:', error.message);
      this.results.claimable_packs.issues.push(`Query error: ${error.message}`);
    }
  }

  async checkUsersTable() {
    console.log('\n👤 USERS TABLE ANALYSIS');
    console.log('=' .repeat(50));
    
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = parseInt(countResult.rows[0].total);
      this.results.users.count = totalUsers;
      
      console.log(`📊 Total users: ${totalUsers}`);
      
      if (totalUsers === 0) {
        console.log('ℹ️  No users in database yet');
      } else {
        // Show user statistics
        const userStatsResult = await pool.query(`
          SELECT 
            COUNT(CASE WHEN subscription_tier = 'free' THEN 1 END) as free_users,
            COUNT(CASE WHEN subscription_tier = 'premium' THEN 1 END) as premium_users,
            COUNT(CASE WHEN subscription_tier = 'legendary' THEN 1 END) as legendary_users,
            AVG(level) as avg_level,
            MAX(created_at) as latest_signup
          FROM users
        `);
        
        const stats = userStatsResult.rows[0];
        console.log(`🆓 Free users: ${stats.free_users}`);
        console.log(`💎 Premium users: ${stats.premium_users}`);
        console.log(`👑 Legendary users: ${stats.legendary_users}`);
        console.log(`📈 Average user level: ${parseFloat(stats.avg_level || 0).toFixed(2)}`);
        console.log(`📅 Latest signup: ${stats.latest_signup || 'N/A'}`);
      }

    } catch (error) {
      console.error('❌ Error checking users table:', error.message);
      this.results.users.issues.push(`Query error: ${error.message}`);
    }
  }

  async generateDiagnosticSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));

    // Determine overall system status
    if (this.results.overall.critical_issues.length > 0) {
      console.log('🔴 SYSTEM STATUS: CRITICAL ISSUES FOUND');
      console.log('\n❌ Critical Issues:');
      this.results.overall.critical_issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else if (this.results.characters.issues.length > 0 || 
               this.results.user_characters.issues.length > 0 ||
               this.results.claimable_packs.issues.length > 0) {
      console.log('🟡 SYSTEM STATUS: WARNINGS FOUND');
    } else {
      console.log('🟢 SYSTEM STATUS: HEALTHY');
    }

    // Table summaries
    console.log('\n📊 Table Summary:');
    console.log(`   Characters: ${this.results.characters.count} ${this.results.characters.issues.length ? '(⚠️  has issues)' : '(✅)'}`);
    console.log(`   User Characters: ${this.results.user_characters.count} ${this.results.user_characters.issues.length ? '(⚠️  has issues)' : '(✅)'}`);
    console.log(`   Claimable Packs: ${this.results.claimable_packs.count} ${this.results.claimable_packs.issues.length ? '(⚠️  has issues)' : '(✅)'}`);
    console.log(`   Pack Contents: ${this.results.claimable_pack_contents.count} ${this.results.claimable_pack_contents.issues.length ? '(⚠️  has issues)' : '(✅)'}`);
    console.log(`   Users: ${this.results.users.count} ${this.results.users.issues.length ? '(⚠️  has issues)' : '(✅)'}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (this.results.characters.count === 0) {
      console.log('   1. 🚨 URGENT: Run all migrations to populate characters table');
      console.log('      → npm start (runs migrations automatically)');
    }
    
    if (this.results.claimable_pack_contents.count === 0 && this.results.claimable_packs.count > 0) {
      console.log('   2. 🚨 URGENT: Packs exist but have no contents. Pack opening will fail.');
      console.log('      → This is likely a bug in the pack generation system');
    }
    
    if (this.results.characters.count > 0 && this.results.claimable_pack_contents.count === 0) {
      console.log('   3. ℹ️  Consider creating test packs to verify pack opening functionality');
      console.log('      → Use the PackService.generatePack() method');
    }

    // Pack opening troubleshooting guide
    console.log('\n🔧 PACK OPENING TROUBLESHOOTING:');
    console.log('If packs are returning 0 characters, check:');
    console.log('   1. Characters table is populated (✓ if > 0 characters)');
    console.log('   2. Pack contents exist for the packs being opened');
    console.log('   3. Character IDs in pack contents match actual character IDs');
    console.log('   4. User authentication is working (user ID is valid)');
    console.log('   5. Pack claiming logic in PackService is functioning correctly');
  }

  async runFullDiagnostic() {
    console.log('🔬 BLANK WARS DATABASE DIAGNOSTIC');
    console.log('=' .repeat(60));
    console.log(`Database URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=' .repeat(60));

    const connected = await this.checkDatabaseConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed without database connection');
      return false;
    }

    await this.checkCharactersTable();
    await this.checkUserCharactersTable();
    await this.checkPackTables();
    await this.checkUsersTable();
    await this.generateDiagnosticSummary();

    return true;
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const diagnostic = new DatabaseDiagnostic();

  try {
    if (args.includes('--check-chars')) {
      await diagnostic.checkDatabaseConnection();
      await diagnostic.checkCharactersTable();
    } else if (args.includes('--check-packs')) {
      await diagnostic.checkDatabaseConnection();
      await diagnostic.checkPackTables();
    } else if (args.includes('--check-users')) {
      await diagnostic.checkDatabaseConnection();
      await diagnostic.checkUsersTable();
    } else {
      // Run full diagnostic by default
      await diagnostic.runFullDiagnostic();
    }
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseDiagnostic };