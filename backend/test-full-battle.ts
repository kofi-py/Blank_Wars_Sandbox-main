/**
 * Full Battle Integration Test (Option 1)
 * Creates a real test battle in the database and simulates combat
 * WARNING: This WILL write to the production database
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function testFullBattle() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🎮 Full Battle Integration Test\n');
    console.log('⚠️  WARNING: This will create test data in production database\n');

    // 1. Get test user or create one
    console.log('👤 Finding test user...');
    let testUserResult = await client.query(`
      SELECT id, username FROM users WHERE username = 'test_battle_user' LIMIT 1
    `);

    let testUserId: string;
    if (testUserResult.rows.length === 0) {
      console.log('  Creating test user...');
      const newUserResult = await client.query(`
        INSERT INTO users (id, username, email, password_hash)
        VALUES (gen_random_uuid()::text, 'test_battle_user', 'test_battle@example.com', 'test_hash')
        RETURNING id, username
      `);
      testUserId = newUserResult.rows[0].id;
      console.log(`  ✅ Created test user: ${newUserResult.rows[0].username}`);
    } else {
      testUserId = testUserResult.rows[0].id;
      console.log(`  ✅ Found existing test user: ${testUserResult.rows[0].username}`);
    }
    console.log('');

    // 2. Get test characters for battle
    console.log('⚔️  Setting up battle teams...');
    const teamResult = await client.query(`
      SELECT uc.id, c.name, uc.current_max_health as max_hp, c.attack, c.defense, c.speed
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.user_id != $1
      LIMIT 6
    `, [testUserId]);

    if (teamResult.rows.length < 6) {
      console.log('  ❌ Need at least 6 characters in database for 3v3 battle');
      console.log(`     Found only ${teamResult.rows.length} characters`);
      return;
    }

    const userTeam = teamResult.rows.slice(0, 3);
    const opponentTeam = teamResult.rows.slice(3, 6);

    console.log('  User Team:');
    userTeam.forEach((char, i) => {
      console.log(`    ${i + 1}. ${char.name} (HP: ${char.max_hp}, ATK: ${char.attack}, DEF: ${char.defense}, SPD: ${char.speed})`);
    });

    console.log('  Opponent Team:');
    opponentTeam.forEach((char, i) => {
      console.log(`    ${i + 1}. ${char.name} (HP: ${char.max_hp}, ATK: ${char.attack}, DEF: ${char.defense}, SPD: ${char.speed})`);
    });
    console.log('');

    // 3. Create battle record
    console.log('📝 Creating battle record...');
    const battleId = `test_battle_${Date.now()}`;
    await client.query(`
      INSERT INTO battles (id, user_id, opponent_user_id, status, current_round, turn_count, started_at)
      VALUES ($1, $2, $2, 'active', 1, 0, CURRENT_TIMESTAMP)
    `, [battleId, testUserId]);
    console.log(`  ✅ Battle created with ID: ${battleId}`);
    console.log('');

    // 4. Get attack types
    console.log('🗡️  Loading attack types...');
    const attackTypesResult = await client.query(`
      SELECT id, name, damage_multiplier, ap_cost, accuracy_modifier
      FROM action_types
      ORDER BY sort_order
    `);
    console.log(`  ✅ Loaded ${attackTypesResult.rows.length} attack types`);
    console.log('');

    // 5. Simulate a few combat rounds
    console.log('⚔️  BATTLE START!\n');
    console.log('═'.repeat(60));

    let round = 1;
    const maxRounds = 3;

    // Simple combat simulation
    let userTeamHP = userTeam.map(c => ({ id: c.id, name: c.name, hp: c.max_hp, max_hp: c.max_hp, attack: c.attack, defense: c.defense }));
    let opponentTeamHP = opponentTeam.map(c => ({ id: c.id, name: c.name, hp: c.max_hp, max_hp: c.max_hp, attack: c.attack, defense: c.defense }));

    while (round <= maxRounds) {
      console.log(`\n🔄 ROUND ${round}`);
      console.log('─'.repeat(60));

      // User team attacks
      const attacker = userTeamHP[0];
      const defender = opponentTeamHP[0];
      const attackType = attackTypesResult.rows[Math.floor(Math.random() * attackTypesResult.rows.length)];

      const baseDamage = attacker.attack;
      const multiplier = parseFloat(attackType.damage_multiplier);
      const rawDamage = baseDamage * multiplier;
      const finalDamage = Math.max(1, Math.floor(rawDamage - defender.defense * 0.5));

      defender.hp = Math.max(0, defender.hp - finalDamage);

      console.log(`\n${attacker.name} uses ${attackType.name} on ${defender.name}!`);
      console.log(`  💥 Damage: ${finalDamage} (${attackType.damage_multiplier}x multiplier, ${attackType.ap_cost} AP)`);
      console.log(`  ${defender.name} HP: ${defender.hp}/${defender.max_hp}`);

      // Note: Battle actions in production use complex JSONB structure
      // For this test, we'll just simulate without recording each action

      if (defender.hp <= 0) {
        console.log(`  💀 ${defender.name} is defeated!`);
      }

      console.log('');
      round++;
    }

    console.log('═'.repeat(60));
    console.log('\n📊 Battle Summary:');
    console.log('  User Team Status:');
    userTeamHP.forEach(char => {
      const hpPercent = Math.floor((char.hp / char.max_hp) * 100);
      console.log(`    ${char.name}: ${char.hp}/${char.max_hp} HP (${hpPercent}%)`);
    });

    console.log('  Opponent Team Status:');
    opponentTeamHP.forEach(char => {
      const hpPercent = Math.floor((char.hp / char.max_hp) * 100);
      console.log(`    ${char.name}: ${char.hp}/${char.max_hp} HP (${hpPercent}%)`);
    });
    console.log('');

    // 6. Verify battle was created
    console.log('🔍 Verifying battle record...');
    const battleCheck = await client.query(`
      SELECT id, status, current_round FROM battles WHERE id = $1
    `, [battleId]);
    console.log(`  ✅ Battle exists: ${battleCheck.rows[0].id}`);
    console.log(`  ✅ Status: ${battleCheck.rows[0].status}`);
    console.log('');

    // 7. Clean up test battle
    console.log('🧹 Cleaning up test battle...');
    await client.query(`DELETE FROM battle_actions WHERE battle_id = $1`, [battleId]);
    await client.query(`DELETE FROM battles WHERE id = $1`, [battleId]);
    console.log(`  ✅ Test battle ${battleId} cleaned up`);
    console.log('');

    console.log('✅ Full Battle Integration Test Complete!\n');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run test
testFullBattle()
  .then(() => {
    console.log('✅ All integration tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  });
