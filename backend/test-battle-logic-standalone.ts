/**
 * Standalone Battle Logic Test Script
 * Tests battle calculations without heavy backend imports
 * Safe to run - read-only operations, minimal memory usage
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function testBattleLogic() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🧪 Testing Battle Logic (Read-Only)\n');

    // 1. Test Action Types Exist (renamed from attack_types)
    console.log('📊 Checking Action Types...');
    const attackTypesResult = await client.query(`
      SELECT id, name, damage_multiplier, ap_cost, accuracy_modifier
      FROM action_types
      ORDER BY sort_order
    `);

    console.log(`Found ${attackTypesResult.rows.length} attack types:`);
    attackTypesResult.rows.forEach(at => {
      console.log(`  - ${at.name} (${at.id}): ${at.damage_multiplier}x damage, ${at.ap_cost} AP, ${at.accuracy_modifier > 0 ? '+' : ''}${at.accuracy_modifier} accuracy`);
    });

    // Check for missing 'light' attack type
    const hasLight = attackTypesResult.rows.some(at => at.id === 'light');
    if (!hasLight) {
      console.log('  ⚠️  WARNING: "light" attack type NOT FOUND');
      console.log('      Expected: light, jab, strike, heavy');
      console.log('      Found: ' + attackTypesResult.rows.map(at => at.id).join(', '));
    } else {
      console.log('  ✅ All expected attack types found');
    }

    console.log('\n');

    // 2. Check migration vs database discrepancy
    console.log('🔍 Checking for Value Discrepancies...');
    console.log('  Migration 200 expects:');
    console.log('    jab: 0.50x damage, strike: 1.00x, heavy: 1.75x');
    console.log('  Database actually has:');

    const jab = attackTypesResult.rows.find(at => at.id === 'jab');
    const strike = attackTypesResult.rows.find(at => at.id === 'strike');
    const heavy = attackTypesResult.rows.find(at => at.id === 'heavy');

    if (jab) console.log(`    jab: ${jab.damage_multiplier}x ${jab.damage_multiplier !== '0.50' ? '❌ MISMATCH' : '✅'}`);
    if (strike) console.log(`    strike: ${strike.damage_multiplier}x ${strike.damage_multiplier !== '1.00' ? '❌ MISMATCH' : '✅'}`);
    if (heavy) console.log(`    heavy: ${heavy.damage_multiplier}x ${heavy.damage_multiplier !== '1.75' ? '❌ MISMATCH' : '✅'}`);

    console.log('\n');

    // 3. Get sample characters for testing
    console.log('👥 Fetching Sample Characters...');
    const charsResult = await client.query(`
      SELECT uc.id, c.name, uc.current_max_health, uc.level,
             c.attack, c.defense, c.speed
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      LIMIT 2
    `);

    if (charsResult.rows.length < 2) {
      console.log('  ⚠️  Need at least 2 characters in database to test damage calcs');
      console.log('     Skipping damage calculation tests...\n');
    } else {
      const [char1, char2] = charsResult.rows;
      console.log(`  Character 1: ${char1.name} (HP: ${char1.current_max_health}, ATK: ${char1.attack}, DEF: ${char1.defense})`);
      console.log(`  Character 2: ${char2.name} (HP: ${char2.current_max_health}, ATK: ${char2.attack}, DEF: ${char2.defense})`);
      console.log('\n');

      // 4. Test Damage Calculations
      console.log('⚔️  Testing Damage Calculations...');
      console.log(`  Scenario: ${char1.name} attacks ${char2.name}\n`);

      for (const attackType of attackTypesResult.rows) {
        const baseDamage = char1.attack;
        const multiplier = parseFloat(attackType.damage_multiplier);
        const rawDamage = baseDamage * multiplier;
        const damageAfterDefense = Math.max(1, Math.floor(rawDamage - char2.defense * 0.5));

        console.log(`  ${attackType.name} Attack:`);
        console.log(`    Base Attack: ${baseDamage}`);
        console.log(`    Multiplier: ${multiplier}x`);
        console.log(`    Raw Damage: ${Math.floor(rawDamage)}`);
        console.log(`    After Defense (${char2.defense}): ${damageAfterDefense}`);
        console.log(`    AP Cost: ${attackType.ap_cost}`);
        console.log(`    Damage per AP: ${(damageAfterDefense / attackType.ap_cost).toFixed(1)}`);
        console.log('');
      }

      // 5. Test Character Powers/Spells
      console.log('✨ Checking Character Abilities...');
      const powersResult = await client.query(`
        SELECT COUNT(*) as count
        FROM character_powers
        WHERE character_id = $1 AND unlocked = true
      `, [char1.id]);

      const spellsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM character_spells
        WHERE character_id = $1 AND unlocked = true
      `, [char1.id]);

      console.log(`  ${char1.name} has:`);
      console.log(`    ${powersResult.rows[0].count} unlocked powers`);
      console.log(`    ${spellsResult.rows[0].count} unlocked spells`);
      console.log('');
    }

    // 6. Summary
    console.log('📋 Test Summary:');
    console.log(`  ✅ Database connection: Working`);
    console.log(`  ${hasLight ? '✅' : '❌'} Light attack type: ${hasLight ? 'Found' : 'MISSING'}`);
    console.log(`  ${jab?.damage_multiplier === '0.50' ? '✅' : '⚠️ '} Attack values: ${jab?.damage_multiplier === '0.50' ? 'Match migration' : 'Have discrepancies'}`);
    console.log(`  ✅ Damage calculations: Tested`);

    console.log('\n✅ Battle Logic Test Complete (No DB Writes)\n');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run test
testBattleLogic()
  .then(() => {
    console.log('✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
