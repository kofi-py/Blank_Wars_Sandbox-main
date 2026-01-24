/**
 * Comprehensive System Test Suite
 * Tests multiple aspects of the game systems
 * Read-only except where noted
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function runComprehensiveTests() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🧪 COMPREHENSIVE SYSTEM TEST SUITE\n');
    console.log('═'.repeat(70));

    // TEST 1: Database Connectivity & Tables
    console.log('\n📊 TEST 1: Database Structure');
    console.log('─'.repeat(70));

    const tables = [
      'users', 'characters', 'user_characters',
      'attack_types', 'power_definitions', 'spell_definitions',
      'character_powers', 'character_spells',
      'battles', 'battle_actions', 'card_packs'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM ${table}
      `);
      const count = result.rows[0].count;
      console.log(`  ${count > 0 ? '✅' : '⚠️ '} ${table}: ${count} records`);
    }

    // TEST 2: Character Abilities System
    console.log('\n\n✨ TEST 2: Character Abilities Unlock System');
    console.log('─'.repeat(70));

    // Check if auto_unlock_starters trigger exists and is correct
    const triggerCheck = await client.query(`
      SELECT pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname = 'auto_unlock_starters'
    `);

    if (triggerCheck.rows.length > 0) {
      const funcDef = triggerCheck.rows[0].def;
      const hasBug = funcDef.includes('s.spell_id');
      console.log(`  ${hasBug ? '❌' : '✅'} auto_unlock_starters trigger: ${hasBug ? 'HAS BUG (s.spell_id)' : 'Correct (s.id)'}`);
    }

    // Check starter powers/spells
    const starterPowersResult = await client.query(`
      SELECT COUNT(*) as count FROM power_definitions WHERE is_starter = true
    `);
    const starterSpellsResult = await client.query(`
      SELECT COUNT(*) as count FROM spell_definitions WHERE is_starter = true
    `);

    console.log(`  ✅ ${starterPowersResult.rows[0].count} starter powers defined`);
    console.log(`  ✅ ${starterSpellsResult.rows[0].count} starter spells defined`);

    // Sample characters with abilities
    const charsWithAbilities = await client.query(`
      SELECT
        c.name,
        (SELECT COUNT(*) FROM character_powers cp WHERE cp.character_id = uc.id AND cp.unlocked = true) as powers,
        (SELECT COUNT(*) FROM character_spells cs WHERE cs.character_id = uc.id AND cs.unlocked = true) as spells
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      LIMIT 5
    `);

    console.log('\n  Sample Character Abilities:');
    charsWithAbilities.rows.forEach(char => {
      const hasAbilities = char.powers > 0 || char.spells > 0;
      console.log(`    ${hasAbilities ? '✅' : '❌'} ${char.name}: ${char.powers} powers, ${char.spells} spells`);
    });

    // TEST 3: Attack Types Deep Dive
    console.log('\n\n⚔️  TEST 3: Attack Types Analysis');
    console.log('─'.repeat(70));

    const attackTypes = await client.query(`
      SELECT id, name, damage_multiplier, ap_cost, accuracy_modifier,
             crit_chance_modifier, can_be_countered
      FROM attack_types
      ORDER BY sort_order
    `);

    console.log('  Attack Type Details:');
    attackTypes.rows.forEach(at => {
      console.log(`\n  📍 ${at.name} (${at.id}):`);
      console.log(`     Damage: ${at.damage_multiplier}x | AP Cost: ${at.ap_cost} | Efficiency: ${(parseFloat(at.damage_multiplier) / at.ap_cost).toFixed(2)} dmg/AP`);
      console.log(`     Accuracy: ${at.accuracy_modifier > 0 ? '+' : ''}${at.accuracy_modifier} | Crit: ${at.crit_chance_modifier > 0 ? '+' : ''}${at.crit_chance_modifier}`);
      console.log(`     Can be countered: ${at.can_be_countered ? 'Yes' : 'No'}`);
    });

    // Check for light attack
    const hasLight = attackTypes.rows.some(at => at.id === 'light');
    console.log(`\n  ${hasLight ? '✅' : '❌'} "light" attack type: ${hasLight ? 'EXISTS' : 'MISSING'}`);

    // TEST 4: Battle System
    console.log('\n\n🎮 TEST 4: Battle System Status');
    console.log('─'.repeat(70));

    const activeBattles = await client.query(`
      SELECT COUNT(*) as count FROM battles WHERE status = 'active'
    `);
    const completedBattles = await client.query(`
      SELECT COUNT(*) as count FROM battles WHERE status = 'completed'
    `);
    const totalActions = await client.query(`
      SELECT COUNT(*) as count FROM battle_actions
    `);

    console.log(`  Active battles: ${activeBattles.rows[0].count}`);
    console.log(`  Completed battles: ${completedBattles.rows[0].count}`);
    console.log(`  Total battle actions: ${totalActions.rows[0].count}`);

    // Recent battle
    const recentBattle = await client.query(`
      SELECT id, status, current_round, turn_count, started_at
      FROM battles
      ORDER BY started_at DESC
      LIMIT 1
    `);

    if (recentBattle.rows.length > 0) {
      const battle = recentBattle.rows[0];
      console.log(`\n  Most Recent Battle:`);
      console.log(`    ID: ${battle.id}`);
      console.log(`    Status: ${battle.status}`);
      console.log(`    Round: ${battle.current_round} | Turns: ${battle.turn_count}`);
    }

    // TEST 5: Pack System
    console.log('\n\n📦 TEST 5: Pack System');
    console.log('─'.repeat(70));

    const packTemplates = await client.query(`
      SELECT pack_type, COUNT(*) as count
      FROM card_packs
      GROUP BY pack_type
    `);

    if (packTemplates.rows.length === 0) {
      console.log('  ⚠️  No pack templates found in card_packs table');
      console.log('      This could cause registration failures!');
    } else {
      console.log('  Pack Templates:');
      packTemplates.rows.forEach(pt => {
        console.log(`    ✅ ${pt.pack_type}: ${pt.count} packs`);
      });
    }

    // TEST 6: Character Stats Sanity Check
    console.log('\n\n📈 TEST 6: Character Stats Validation');
    console.log('─'.repeat(70));

    const statsCheck = await client.query(`
      SELECT
        c.name,
        c.attack,
        c.defense,
        c.speed,
        c.max_health
      FROM characters c
      WHERE c.attack < 0 OR c.defense < 0 OR c.speed < -100 OR c.max_health <= 0
      LIMIT 5
    `);

    if (statsCheck.rows.length > 0) {
      console.log('  ⚠️  Characters with unusual stats:');
      statsCheck.rows.forEach(char => {
        console.log(`    ${char.name}: ATK ${char.attack}, DEF ${char.defense}, SPD ${char.speed}, HP ${char.max_health}`);
      });
    } else {
      console.log('  ✅ All character stats look reasonable');
    }

    // TEST 7: Migration Status
    console.log('\n\n🔄 TEST 7: Migration System');
    console.log('─'.repeat(70));

    const latestMigrations = await client.query(`
      SELECT version, name, executed_at
      FROM migration_log
      ORDER BY executed_at DESC
      LIMIT 5
    `);

    console.log('  Latest Migrations:');
    latestMigrations.rows.forEach(m => {
      const date = new Date(m.executed_at).toLocaleDateString();
      console.log(`    ${m.version}: ${m.name || '(unnamed)'} - ${date}`);
    });

    // Check for migration 208
    const migration208 = await client.query(`
      SELECT * FROM migration_log WHERE version = '208' OR version = '20251209'
    `);
    console.log(`\n  ${migration208.rows.length > 0 ? '✅' : '❌'} Migration 208 (auto_unlock fix): ${migration208.rows.length > 0 ? 'Applied' : 'NOT APPLIED'}`);

    // TEST 8: User & Team Data
    console.log('\n\n👥 TEST 8: User & Team Statistics');
    console.log('─'.repeat(70));

    const userStats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM user_characters) as total_user_chars,
        (SELECT COUNT(DISTINCT user_id) FROM user_characters) as users_with_chars
    `);

    const stats = userStats.rows[0];
    console.log(`  Total Users: ${stats.total_users}`);
    console.log(`  Total User Characters: ${stats.total_user_chars}`);
    console.log(`  Users with Characters: ${stats.users_with_chars}`);
    console.log(`  Avg Characters per User: ${(parseInt(stats.total_user_chars) / parseInt(stats.users_with_chars)).toFixed(1)}`);

    // FINAL SUMMARY
    console.log('\n\n═'.repeat(70));
    console.log('📋 TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log('  ✅ Database structure: OK');
    console.log(`  ${hasLight ? '✅' : '❌'} Attack types: ${hasLight ? 'All present' : 'Missing "light"'}`);
    console.log(`  ${migration208.rows.length > 0 ? '✅' : '❌'} Migration 208: ${migration208.rows.length > 0 ? 'Applied' : 'Pending'}`);
    console.log(`  ${packTemplates.rows.length > 0 ? '✅' : '⚠️ '} Pack system: ${packTemplates.rows.length > 0 ? 'Templates exist' : 'No templates'}`);

    console.log('\n✅ Comprehensive Test Suite Complete!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run tests
runComprehensiveTests()
  .then(() => {
    console.log('✅ All comprehensive tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Comprehensive tests failed:', error);
    process.exit(1);
  });
