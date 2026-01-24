/**
 * Comprehensive Battle System Test
 * Tests all major battle components directly via database
 * Created: Dec 10, 2025
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function runComprehensiveTest(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  const results: TestResult[] = [];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 COMPREHENSIVE BATTLE SYSTEM TEST');
  console.log('   Date: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // ═══════════════════════════════════════════════════════════════
    // TEST 1: Action Types (renamed from attack_types)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 1: Action Types');
    const actionTypes = await client.query(`
      SELECT id, name, ap_cost, damage_multiplier
      FROM action_types
      ORDER BY sort_order
    `);

    const expectedActionTypes = ['jab', 'strike', 'heavy', 'defense', 'movement_1', 'movement_2', 'movement_3'];
    const foundIds = actionTypes.rows.map(r => r.id);
    const hasBasicTypes = expectedActionTypes.every(t => foundIds.includes(t));

    results.push({
      name: 'Action Types Exist',
      passed: actionTypes.rows.length >= 16 && hasBasicTypes,
      details: `Found ${actionTypes.rows.length} action types: ${foundIds.slice(0, 5).join(', ')}...`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: Characters & Stats
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 2: Characters & Stats');
    const characters = await client.query(`
      SELECT COUNT(*) as count FROM characters
    `);
    const userCharacters = await client.query(`
      SELECT COUNT(*) as count FROM user_characters
    `);

    results.push({
      name: 'Characters Exist',
      passed: parseInt(characters.rows[0].count) > 0 && parseInt(userCharacters.rows[0].count) > 0,
      details: `${characters.rows[0].count} base characters, ${userCharacters.rows[0].count} user characters`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: Powers & Spells Definitions
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 3: Powers & Spells Definitions');
    const powers = await client.query(`SELECT COUNT(*) as count FROM power_definitions`);
    const spells = await client.query(`SELECT COUNT(*) as count FROM spell_definitions`);

    results.push({
      name: 'Abilities Defined',
      passed: parseInt(powers.rows[0].count) > 0 && parseInt(spells.rows[0].count) > 0,
      details: `${powers.rows[0].count} powers, ${spells.rows[0].count} spells defined`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: Battle Tables Exist
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 4: Battle Tables');
    const battleTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'battle%'
    `);

    const requiredBattleTables = ['battles', 'battle_actions'];
    const foundTables = battleTables.rows.map(r => r.table_name);
    const hasRequiredTables = requiredBattleTables.every(t => foundTables.includes(t));

    results.push({
      name: 'Battle Tables Exist',
      passed: hasRequiredTables,
      details: `Found tables: ${foundTables.join(', ')}`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 5: Adherence System (check columns on user_characters)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 5: Adherence System');
    const adherenceColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_characters'
      AND column_name IN ('base_adherence', 'loyalty', 'discipline')
    `);

    results.push({
      name: 'Adherence Columns Exist',
      passed: adherenceColumns.rows.length > 0,
      details: `Found adherence columns: ${adherenceColumns.rows.map(r => r.column_name).join(', ') || 'none (may use psychology stats)'}`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 6: Create and Cleanup Test Battle
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 6: Battle Creation');
    const testBattleId = `test_comprehensive_${Date.now()}`;

    // Get a test user
    const testUser = await client.query(`SELECT id FROM users LIMIT 1`);
    if (testUser.rows.length === 0) {
      results.push({ name: 'Battle Creation', passed: false, details: 'No users found' });
    } else {
      const userId = testUser.rows[0].id;

      try {
        // Create battle
        await client.query(`
          INSERT INTO battles (id, user_id, opponent_user_id, status, current_round, turn_count, started_at)
          VALUES ($1, $2, $2, 'active', 1, 0, CURRENT_TIMESTAMP)
        `, [testBattleId, userId]);

        // Verify it exists
        const verify = await client.query(`SELECT id, status FROM battles WHERE id = $1`, [testBattleId]);

        // Cleanup
        await client.query(`DELETE FROM battles WHERE id = $1`, [testBattleId]);

        results.push({
          name: 'Battle Creation',
          passed: verify.rows.length === 1,
          details: `Created and cleaned up test battle: ${testBattleId}`
        });
      } catch (err: any) {
        results.push({
          name: 'Battle Creation',
          passed: false,
          details: `Error: ${err.message}`
        });
      }
    }
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 7: AP Economy Validation
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 7: AP Economy');
    const apCosts = await client.query(`
      SELECT id, ap_cost FROM action_types WHERE id IN ('jab', 'strike', 'heavy')
    `);

    const jabCost = apCosts.rows.find(r => r.id === 'jab')?.ap_cost;
    const strikeCost = apCosts.rows.find(r => r.id === 'strike')?.ap_cost;
    const heavyCost = apCosts.rows.find(r => r.id === 'heavy')?.ap_cost;

    const apValid = jabCost === 1 && strikeCost === 2 && heavyCost === 3;

    results.push({
      name: 'AP Economy Valid',
      passed: apValid,
      details: `Jab: ${jabCost} AP, Strike: ${strikeCost} AP, Heavy: ${heavyCost} AP (expected 1, 2, 3)`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 8: Spell AP Costs
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 8: Spell AP Costs');
    const spellApCosts = await client.query(`
      SELECT id, name, ap_cost FROM spell_definitions WHERE ap_cost IS NOT NULL LIMIT 5
    `);

    results.push({
      name: 'Spells Have AP Costs',
      passed: spellApCosts.rows.length > 0,
      details: spellApCosts.rows.length > 0
        ? `Sample: ${spellApCosts.rows.map(r => `${r.name}(${r.ap_cost}AP)`).join(', ')}`
        : 'No spells with AP costs found'
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 9: Psychology Stats (for Adherence)
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 9: Psychology Stats');
    const psychColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_characters'
      AND column_name IN ('stress', 'confidence', 'mental_health', 'base_adherence')
    `);

    results.push({
      name: 'Psychology Stats Exist',
      passed: psychColumns.rows.length >= 2,
      details: `Found columns: ${psychColumns.rows.map(r => r.column_name).join(', ') || 'none'}`
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // TEST 10: Auto-Unlock Trigger Fixed
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 TEST 10: Auto-Unlock Trigger');
    const triggerDef = await client.query(`
      SELECT pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname = 'auto_unlock_starters'
    `);

    const hasCorrectCode = triggerDef.rows.length > 0 &&
      triggerDef.rows[0].def.includes('s.id') &&
      !triggerDef.rows[0].def.includes('s.spell_id');

    results.push({
      name: 'Auto-Unlock Trigger Fixed',
      passed: hasCorrectCode,
      details: hasCorrectCode ? 'Trigger uses correct s.id (not s.spell_id)' : 'Trigger may still have bug'
    });
    console.log(`   ${results[results.length - 1].passed ? '✅' : '❌'} ${results[results.length - 1].details}\n`);

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    results.forEach(r => {
      console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${r.details}`);
    });

    console.log(`\n📈 Results: ${passed}/${results.length} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Battle system is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Review issues above.');
    }

  } catch (error) {
    console.error('❌ Test Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run
runComprehensiveTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
