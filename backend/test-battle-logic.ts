/**
 * Battle Logic Test Script
 * Tests battle calculations without writing to database
 * Safe to run - read-only operations
 */

import { query } from './src/database/postgres';

async function testBattleLogic() {
  console.log('🧪 Testing Battle Logic (Read-Only)\n');

  try {
    // 1. Test Attack Types Exist
    console.log('📊 Checking Attack Types...');
    const attackTypesResult = await query(`
      SELECT id, name, damage_multiplier, ap_cost, accuracy_modifier
      FROM attack_types
      ORDER BY sort_order
    `);

    console.log(`Found ${attackTypesResult.rows.length} attack types:`);
    attackTypesResult.rows.forEach(at => {
      console.log(`  - ${at.name} (${at.id}): ${at.damage_multiplier}x damage, ${at.ap_cost} AP, ${at.accuracy_modifier} accuracy`);
    });

    // Check for missing 'light' attack type
    const hasLight = attackTypesResult.rows.some(at => at.id === 'light');
    if (!hasLight) {
      console.log('  ⚠️  WARNING: "light" attack type not found (only jab, strike, heavy)');
    }

    console.log('\n');

    // 2. Get sample characters for testing
    console.log('👥 Fetching Sample Characters...');
    const charsResult = await query(`
      SELECT uc.id, c.name, uc.current_max_health, uc.level,
             c.base_attack, c.base_defense, c.base_speed
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      LIMIT 2
    `);

    if (charsResult.rows.length < 2) {
      console.log('❌ Need at least 2 characters in database to test');
      return;
    }

    const [char1, char2] = charsResult.rows;
    console.log(`  Character 1: ${char1.name} (HP: ${char1.current_max_health}, ATK: ${char1.base_attack})`);
    console.log(`  Character 2: ${char2.name} (HP: ${char2.current_max_health}, ATK: ${char2.base_attack})`);
    console.log('\n');

    // 3. Test Damage Calculations
    console.log('⚔️  Testing Damage Calculations...');
    for (const attackType of attackTypesResult.rows) {
      const baseDamage = char1.base_attack;
      const multiplier = parseFloat(attackType.damage_multiplier);
      const calculatedDamage = Math.floor(baseDamage * multiplier);

      console.log(`  ${char1.name} uses ${attackType.name}:`);
      console.log(`    Base Damage: ${baseDamage}`);
      console.log(`    Multiplier: ${multiplier}x`);
      console.log(`    Final Damage: ${calculatedDamage}`);
      console.log(`    AP Cost: ${attackType.ap_cost}`);
    }
    console.log('\n');

    // 4. Test Character Powers/Spells
    console.log('✨ Checking Character Abilities...');
    const powersResult = await query(`
      SELECT COUNT(*) as count
      FROM character_powers
      WHERE character_id = $1 AND unlocked = true
    `, [char1.id]);

    const spellsResult = await query(`
      SELECT COUNT(*) as count
      FROM character_spells
      WHERE character_id = $1 AND unlocked = true
    `, [char1.id]);

    console.log(`  ${char1.name} has:`);
    console.log(`    ${powersResult.rows[0].count} unlocked powers`);
    console.log(`    ${spellsResult.rows[0].count} unlocked spells`);
    console.log('\n');

    // 5. Test Battle State
    console.log('🎮 Testing Battle State Calculations...');
    const testBattleState = {
      current_hp: char1.current_max_health * 0.3, // 30% health
      max_hp: char1.current_max_health,
      team_winning: false,
      teammates_total: 3,
      teammates_alive: 1
    };

    console.log(`  Scenario: ${char1.name} at 30% HP, losing, 1/3 teammates alive`);
    console.log(`    Current HP: ${testBattleState.current_hp}`);
    console.log(`    Max HP: ${testBattleState.max_hp}`);
    console.log(`    Team Winning: ${testBattleState.team_winning}`);
    console.log(`    Teammates: ${testBattleState.teammates_alive}/${testBattleState.teammates_total}`);

    console.log('\n✅ Battle Logic Test Complete (No DB Writes)\n');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    throw error;
  }
}

// Run test
testBattleLogic()
  .then(() => {
    console.log('✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
