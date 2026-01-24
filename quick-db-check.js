#!/usr/bin/env node

/**
 * Quick Database Check for Pack Opening Issues
 * 
 * This is a simplified version that quickly checks the most common issues
 * that cause pack opening to return 0 characters.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function quickCheck() {
  console.log('🔍 QUICK PACK OPENING DIAGNOSTIC');
  console.log('=' .repeat(40));

  try {
    // 1. Check if characters table has data
    console.log('1️⃣  Checking characters table...');
    const charactersResult = await pool.query('SELECT COUNT(*) as count FROM characters');
    const characterCount = parseInt(charactersResult.rows[0].count);
    
    if (characterCount === 0) {
      console.log('❌ FOUND THE PROBLEM: Characters table is empty!');
      console.log('   → Pack opening needs characters to grant');
      console.log('   → Run all migrations: npm start (runs migrations automatically)');
      return;
    }
    console.log(`✅ Characters table has ${characterCount} characters`);

    // 2. Check if there are any unclaimed packs
    console.log('\n2️⃣  Checking for available packs...');
    const packsResult = await pool.query(`
      SELECT COUNT(*) as count FROM claimable_packs WHERE is_claimed = FALSE
    `);
    const unclaimedPacks = parseInt(packsResult.rows[0].count);
    console.log(`📦 Unclaimed packs: ${unclaimedPacks}`);

    // 3. Check if packs have contents
    console.log('\n3️⃣  Checking pack contents...');
    const contentsResult = await pool.query('SELECT COUNT(*) as count FROM claimable_pack_contents');
    const contentCount = parseInt(contentsResult.rows[0].count);
    
    if (contentCount === 0) {
      console.log('❌ FOUND THE PROBLEM: Pack contents table is empty!');
      console.log('   → Packs exist but have no characters to grant');
      console.log('   → This is a pack generation bug');
      return;
    }
    console.log(`✅ Pack contents: ${contentCount} items`);

    // 4. Quick pack system test
    console.log('\n4️⃣  Testing pack system integration...');
    const packIntegrityResult = await pool.query(`
      SELECT 
        cp.id as pack_id,
        cp.pack_type,
        COUNT(cpc.character_id) as character_count,
        COUNT(CASE WHEN cpc.character_id IN (SELECT id FROM characters) THEN 1 END) as valid_characters
      FROM claimable_packs cp
      LEFT JOIN claimable_pack_contents cpc ON cp.id = cpc.pack_id
      WHERE cp.is_claimed = FALSE
      GROUP BY cp.id, cp.pack_type
      LIMIT 5
    `);

    if (packIntegrityResult.rows.length === 0) {
      console.log('ℹ️  No unclaimed packs to test');
    } else {
      console.log('📋 Sample pack analysis:');
      packIntegrityResult.rows.forEach(pack => {
        const status = pack.character_count == pack.valid_characters ? '✅' : '❌';
        console.log(`   ${status} ${pack.pack_type}: ${pack.character_count} chars (${pack.valid_characters} valid)`);
      });
    }

    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(40));
    console.log('🎯 SUMMARY:');
    
    if (characterCount > 0 && contentCount > 0) {
      console.log('✅ Database appears healthy for pack opening');
      console.log('\n🔧 If packs still return 0 characters, check:');
      console.log('   • User authentication (valid user ID)');
      console.log('   • Pack claiming logic in PackService');  
      console.log('   • Network/API connectivity');
      console.log('   • Frontend pack opening code');
    } else {
      console.log('❌ Critical database issues found (see above)');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n💡 Common fixes:');
    console.log('   • Check DATABASE_URL environment variable');
    console.log('   • Ensure PostgreSQL is running');
    console.log('   • Verify database permissions');
  } finally {
    await pool.end();
  }
}

quickCheck().catch(console.error);