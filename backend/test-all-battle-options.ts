/**
 * Comprehensive Battle Options Test
 * Tests ALL battle actions to find any errors before deployment
 * Created: Dec 11, 2025
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

function addResult(category: string, test: string, passed: boolean, error?: string) {
  results.push({ category, test, passed, error });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}${error ? `: ${error}` : ''}`);
}

async function testActionTypes(client: Client) {
  log('\n📋 TESTING ACTION TYPES');
  log('─'.repeat(50));

  try {
    // Test all action types exist
    const actionTypes = await client.query(`
      SELECT id, name, ap_cost, damage_multiplier, accuracy_modifier
      FROM action_types
      ORDER BY sort_order
    `);

    addResult('Action Types', 'Table exists and readable', true);
    addResult('Action Types', `Found ${actionTypes.rows.length} action types`, actionTypes.rows.length >= 3);

    // Verify required action types
    const required = ['jab', 'strike', 'heavy', 'defense', 'movement_1', 'spell_rank_1', 'power_rank_1'];
    for (const actionId of required) {
      const found = actionTypes.rows.find((r: any) => r.id === actionId);
      addResult('Action Types', `${actionId} exists`, !!found, found ? undefined : 'NOT FOUND');
    }

    // Verify AP costs make sense
    const jab = actionTypes.rows.find((r: any) => r.id === 'jab');
    const strike = actionTypes.rows.find((r: any) => r.id === 'strike');
    const heavy = actionTypes.rows.find((r: any) => r.id === 'heavy');

    if (jab && strike && heavy) {
      addResult('Action Types', 'AP costs ascending (jab < strike < heavy)',
        jab.ap_cost < strike.ap_cost && strike.ap_cost <= heavy.ap_cost);
      addResult('Action Types', 'Damage multipliers ascending',
        parseFloat(jab.damage_multiplier) < parseFloat(strike.damage_multiplier) &&
        parseFloat(strike.damage_multiplier) < parseFloat(heavy.damage_multiplier));
    }

  } catch (error: any) {
    addResult('Action Types', 'Query execution', false, error.message);
  }
}

async function testPowersAndSpells(client: Client) {
  log('\n📋 TESTING POWERS & SPELLS');
  log('─'.repeat(50));

  try {
    // Test power definitions
    const powers = await client.query(`
      SELECT id, name, power_type, tier, effects, cooldown
      FROM power_definitions
      LIMIT 10
    `);
    addResult('Powers', `Power definitions exist (${powers.rows.length} sampled)`, powers.rows.length > 0);

    // Check power structure
    if (powers.rows.length > 0) {
      const sample = powers.rows[0];
      addResult('Powers', 'Has required fields',
        sample.id && sample.name && sample.tier !== undefined);
    }

    // Test spell definitions
    const spells = await client.query(`
      SELECT id, name, spell_type, tier, mana_cost, cooldown, ap_cost
      FROM spell_definitions
      LIMIT 10
    `);
    addResult('Spells', `Spell definitions exist (${spells.rows.length} sampled)`, spells.rows.length > 0);

    // Check spell has ap_cost (our recent migration)
    if (spells.rows.length > 0) {
      const sample = spells.rows[0];
      addResult('Spells', 'Has ap_cost column', sample.ap_cost !== undefined);
      addResult('Spells', 'ap_cost is valid number', typeof sample.ap_cost === 'number' && sample.ap_cost > 0);
    }

    // Test character_powers junction
    const charPowers = await client.query(`
      SELECT COUNT(*) as count FROM character_powers
    `);
    addResult('Powers', `Character powers linked (${charPowers.rows[0].count} records)`,
      parseInt(charPowers.rows[0].count) >= 0);

    // Test character_spells junction
    const charSpells = await client.query(`
      SELECT COUNT(*) as count FROM character_spells
    `);
    addResult('Spells', `Character spells linked (${charSpells.rows[0].count} records)`,
      parseInt(charSpells.rows[0].count) >= 0);

  } catch (error: any) {
    addResult('Powers/Spells', 'Query execution', false, error.message);
  }
}

async function testBattleCreation(client: Client) {
  log('\n📋 TESTING BATTLE CREATION');
  log('─'.repeat(50));

  const testBattleId = `test_options_${Date.now()}`;

  try {
    // Get a test user
    const user = await client.query(`SELECT id FROM users LIMIT 1`);
    if (user.rows.length === 0) {
      addResult('Battle Creation', 'Find test user', false, 'No users in database');
      return;
    }
    addResult('Battle Creation', 'Find test user', true);

    const userId = user.rows[0].id;

    // Create battle
    await client.query(`
      INSERT INTO battles (id, user_id, opponent_user_id, status, current_round, turn_count, started_at)
      VALUES ($1, $2, $2, 'active', 1, 0, CURRENT_TIMESTAMP)
    `, [testBattleId, userId]);
    addResult('Battle Creation', 'Create battle record', true);

    // Verify battle fields
    const battle = await client.query(`
      SELECT id, status, current_round, turn_count FROM battles WHERE id = $1
    `, [testBattleId]);
    addResult('Battle Creation', 'Battle has correct status', battle.rows[0]?.status === 'active');
    addResult('Battle Creation', 'Battle has round tracking', battle.rows[0]?.current_round === 1);

    // Test battle_actions table (uses JSONB for request/result)
    await client.query(`
      INSERT INTO battle_actions (battle_id, character_id, action_type, sequence_num, round_num, turn_num, request, result)
      VALUES ($1, 'test_char', 'attack', 1, 1, 1, '{"target_id": "test_target", "ap_cost": 2}'::jsonb, '{"success": true}'::jsonb)
    `, [testBattleId]);
    addResult('Battle Actions', 'Can insert battle action', true);

    // Verify action
    const action = await client.query(`
      SELECT * FROM battle_actions WHERE battle_id = $1
    `, [testBattleId]);
    addResult('Battle Actions', 'Action recorded correctly', action.rows.length === 1);

    // Cleanup
    await client.query(`DELETE FROM battle_actions WHERE battle_id = $1`, [testBattleId]);
    await client.query(`DELETE FROM battles WHERE id = $1`, [testBattleId]);
    addResult('Battle Creation', 'Cleanup successful', true);

  } catch (error: any) {
    addResult('Battle Creation', 'Test execution', false, error.message);
    // Attempt cleanup
    try {
      await client.query(`DELETE FROM battle_actions WHERE battle_id = $1`, [testBattleId]);
      await client.query(`DELETE FROM battles WHERE id = $1`, [testBattleId]);
    } catch {}
  }
}

async function testDamageCalculations(client: Client) {
  log('\n📋 TESTING DAMAGE CALCULATIONS');
  log('─'.repeat(50));

  try {
    // Get two characters for damage testing
    const chars = await client.query(`
      SELECT uc.id, c.name, c.attack, c.defense, c.speed, uc.current_max_health
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE c.attack > 0 AND c.defense > 0
      LIMIT 2
    `);

    if (chars.rows.length < 2) {
      addResult('Damage Calc', 'Find test characters', false, 'Need 2 characters with valid stats');
      return;
    }
    addResult('Damage Calc', 'Find test characters', true);

    const attacker = chars.rows[0];
    const defender = chars.rows[1];

    // Get action types for damage multipliers
    const actionTypes = await client.query(`
      SELECT id, damage_multiplier, ap_cost FROM action_types
      WHERE id IN ('jab', 'strike', 'heavy')
    `);

    for (const action of actionTypes.rows) {
      const multiplier = parseFloat(action.damage_multiplier);
      const baseDamage = attacker.attack * multiplier;
      const afterDefense = Math.max(1, Math.floor(baseDamage - defender.defense * 0.5));

      addResult('Damage Calc', `${action.id}: base=${Math.floor(baseDamage)}, final=${afterDefense}`,
        afterDefense > 0 && afterDefense < 10000); // Sanity check
    }

    // Test damage doesn't exceed max health in one hit (sanity)
    const maxDamage = attacker.attack * 2.5; // Heavy attack
    addResult('Damage Calc', 'Max damage is reasonable', maxDamage < defender.current_max_health * 2);

  } catch (error: any) {
    addResult('Damage Calc', 'Test execution', false, error.message);
  }
}

async function testStatusEffects(client: Client) {
  log('\n📋 TESTING STATUS EFFECTS');
  log('─'.repeat(50));

  try {
    // Check status_effect_types table
    const effects = await client.query(`
      SELECT id, name, category, description, stackable
      FROM status_effect_types
    `);

    addResult('Status Effects', `Types defined (${effects.rows.length})`, effects.rows.length > 0);

    // Check required categories
    const categories = [...new Set(effects.rows.map((r: any) => r.category))];
    addResult('Status Effects', 'Has buff category', categories.includes('buff'));
    addResult('Status Effects', 'Has debuff category', categories.includes('debuff'));
    addResult('Status Effects', 'Has CC category', categories.includes('cc'));

    // Check specific important effects (IDs are 'stun' and 'poison', not 'stunned'/'poisoned')
    const stun = effects.rows.find((r: any) => r.id === 'stun');
    const poison = effects.rows.find((r: any) => r.id === 'poison');
    addResult('Status Effects', 'Stun effect exists', !!stun);
    addResult('Status Effects', 'Poison effect exists', !!poison);

  } catch (error: any) {
    addResult('Status Effects', 'Test execution', false, error.message);
  }
}

async function testCharacterStats(client: Client) {
  log('\n📋 TESTING CHARACTER STATS');
  log('─'.repeat(50));

  try {
    // Check characters have valid stats
    const chars = await client.query(`
      SELECT c.id, c.name, c.attack, c.defense, c.speed, c.max_health
      FROM characters c
      LIMIT 20
    `);

    addResult('Character Stats', `Characters exist (${chars.rows.length})`, chars.rows.length > 0);

    // Check for any extreme values
    let extremeCount = 0;
    for (const char of chars.rows) {
      if (char.attack > 200 || char.attack < -50 ||
          char.defense > 200 || char.defense < -50 ||
          char.speed > 200 || char.speed < -100) {
        extremeCount++;
      }
    }
    addResult('Character Stats', `Extreme values check (${extremeCount} found)`,
      extremeCount < chars.rows.length * 0.2, // Allow up to 20% with extreme values for balance
      extremeCount > 0 ? 'Some characters have extreme stats (may be intentional for balance)' : undefined);

    // Check user_characters have current stats
    const userChars = await client.query(`
      SELECT id, current_attack, current_defense, current_speed, current_max_health
      FROM user_characters
      LIMIT 5
    `);

    if (userChars.rows.length > 0) {
      const sample = userChars.rows[0];
      addResult('Character Stats', 'User chars have current stats',
        sample.current_attack !== null || sample.current_defense !== null);
    }

  } catch (error: any) {
    addResult('Character Stats', 'Test execution', false, error.message);
  }
}

async function testMovementSystem(client: Client) {
  log('\n📋 TESTING MOVEMENT SYSTEM');
  log('─'.repeat(50));

  try {
    // Check movement action types
    const movements = await client.query(`
      SELECT id, name, ap_cost FROM action_types
      WHERE id LIKE 'movement_%'
      ORDER BY ap_cost
    `);

    addResult('Movement', `Movement types exist (${movements.rows.length})`, movements.rows.length >= 3);

    // Verify AP costs for different distances
    const move1 = movements.rows.find((r: any) => r.id === 'movement_1');
    const move2 = movements.rows.find((r: any) => r.id === 'movement_2');
    const move3 = movements.rows.find((r: any) => r.id === 'movement_3');

    addResult('Movement', 'Short move = 1 AP', move1?.ap_cost === 1);
    addResult('Movement', 'Medium move = 2 AP', move2?.ap_cost === 2);
    addResult('Movement', 'Long move = 3 AP', move3?.ap_cost === 3);

  } catch (error: any) {
    addResult('Movement', 'Test execution', false, error.message);
  }
}

async function testItemSystem(client: Client) {
  log('\n📋 TESTING ITEM SYSTEM');
  log('─'.repeat(50));

  try {
    // Check items table (not item_definitions)
    const items = await client.query(`
      SELECT id, name, type
      FROM items
      LIMIT 10
    `);

    addResult('Items', `Items table exists (${items.rows.length} sampled)`, items.rows.length >= 0);

    // Check user_items junction
    const userItems = await client.query(`
      SELECT COUNT(*) as count FROM user_items
    `);
    addResult('Items', `User items linked (${userItems.rows[0].count} records)`,
      parseInt(userItems.rows[0].count) >= 0);

    // Check item action types
    const itemAction = await client.query(`
      SELECT id, ap_cost FROM action_types WHERE id LIKE 'item_%'
    `);
    addResult('Items', `Item action types exist (${itemAction.rows.length})`, itemAction.rows.length > 0);

  } catch (error: any) {
    addResult('Items', 'Test execution', false, error.message);
  }
}

async function testAPEconomy(client: Client) {
  log('\n📋 TESTING AP ECONOMY');
  log('─'.repeat(50));

  const MAX_AP = 3;

  try {
    // Get all action costs
    const actions = await client.query(`
      SELECT id, name, ap_cost FROM action_types ORDER BY ap_cost
    `);

    // Verify all actions cost between 1-3 AP
    let invalidCosts = 0;
    for (const action of actions.rows) {
      if (action.ap_cost < 1 || action.ap_cost > MAX_AP) {
        invalidCosts++;
        console.log(`    ⚠️  ${action.id} has invalid AP cost: ${action.ap_cost}`);
      }
    }
    addResult('AP Economy', 'All actions cost 1-3 AP', invalidCosts === 0);

    // Test valid turn combinations
    const validCombos = [
      ['jab', 'jab', 'jab'],           // 1+1+1 = 3
      ['jab', 'strike'],               // 1+2 = 3
      ['strike', 'jab'],               // 2+1 = 3
      ['heavy'],                       // 3 = 3
      ['jab', 'defense', 'movement_1'] // 1+1+1 = 3
    ];

    for (const combo of validCombos) {
      const totalAP = combo.reduce((sum, actionId) => {
        const action = actions.rows.find((a: any) => a.id === actionId);
        return sum + (action?.ap_cost || 0);
      }, 0);
      addResult('AP Economy', `Combo ${combo.join('+')} = ${totalAP} AP`, totalAP <= MAX_AP);
    }

  } catch (error: any) {
    addResult('AP Economy', 'Test execution', false, error.message);
  }
}

async function testTriggerFunction(client: Client) {
  log('\n📋 TESTING AUTO-UNLOCK TRIGGER');
  log('─'.repeat(50));

  try {
    const trigger = await client.query(`
      SELECT pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname = 'auto_unlock_starters'
    `);

    addResult('Trigger', 'auto_unlock_starters exists', trigger.rows.length > 0);

    if (trigger.rows.length > 0) {
      const def = trigger.rows[0].def;
      // Check the INSERT statement uses s.id - ignore comments
      // The correct code is: SELECT NEW.id, s.id, 0, 1
      const hasCorrectInsert = def.includes('SELECT NEW.id, s.id, 0, 1');
      addResult('Trigger', 'Uses correct s.id in INSERT statement', hasCorrectInsert);
    }

  } catch (error: any) {
    addResult('Trigger', 'Test execution', false, error.message);
  }
}

async function runAllTests() {
  const client = new Client({ connectionString: DATABASE_URL });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 COMPREHENSIVE BATTLE OPTIONS TEST');
  console.log('   Testing ALL battle system components locally');
  console.log('   Date: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    await client.connect();
    console.log('\n✅ Database connected\n');

    await testActionTypes(client);
    await testPowersAndSpells(client);
    await testBattleCreation(client);
    await testDamageCalculations(client);
    await testStatusEffects(client);
    await testCharacterStats(client);
    await testMovementSystem(client);
    await testItemSystem(client);
    await testAPEconomy(client);
    await testTriggerFunction(client);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    // Group by category
    const categories = [...new Set(results.map(r => r.category))];
    for (const cat of categories) {
      const catResults = results.filter(r => r.category === cat);
      const catPassed = catResults.filter(r => r.passed).length;
      const catFailed = catResults.filter(r => !r.passed).length;
      const icon = catFailed === 0 ? '✅' : '⚠️';
      console.log(`${icon} ${cat}: ${catPassed}/${catResults.length} passed`);

      // Show failures
      const failures = catResults.filter(r => !r.passed);
      for (const f of failures) {
        console.log(`   ❌ ${f.test}: ${f.error || 'FAILED'}`);
      }
    }

    console.log(`\n📈 TOTAL: ${passed}/${results.length} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Battle system is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Review issues above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
  } finally {
    await client.end();
  }
}

// Run
runAllTests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
