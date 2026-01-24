/**
 * Bug Hunter Test Suite
 * Focused on finding edge cases, data inconsistencies, and hidden bugs
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function huntBugs() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🐛 BUG HUNTER TEST SUITE\n');
    console.log('═'.repeat(70));

    // BUG TEST 1: Orphaned Records (Foreign Key Issues)
    console.log('\n🔍 TEST 1: Orphaned Records & Foreign Key Integrity');
    console.log('─'.repeat(70));

    // Check for user_characters without valid user
    const orphanedChars = await client.query(`
      SELECT uc.id, uc.user_id
      FROM user_characters uc
      LEFT JOIN users u ON uc.user_id = u.id
      WHERE u.id IS NULL
      LIMIT 5
    `);
    console.log(`  ${orphanedChars.rows.length === 0 ? '✅' : '❌'} Orphaned user_characters: ${orphanedChars.rows.length}`);
    if (orphanedChars.rows.length > 0) {
      console.log('    Found characters with no user!');
      orphanedChars.rows.forEach(char => {
        console.log(`      - Character ${char.id} references missing user ${char.user_id}`);
      });
    }

    // Check for character_powers without valid character
    const orphanedPowers = await client.query(`
      SELECT cp.id, cp.character_id
      FROM character_powers cp
      LEFT JOIN user_characters uc ON cp.character_id = uc.id
      WHERE uc.id IS NULL
      LIMIT 5
    `);
    console.log(`  ${orphanedPowers.rows.length === 0 ? '✅' : '❌'} Orphaned character_powers: ${orphanedPowers.rows.length}`);

    // Check for character_spells without valid character
    const orphanedSpells = await client.query(`
      SELECT cs.id, cs.character_id
      FROM character_spells cs
      LEFT JOIN user_characters uc ON cs.character_id = uc.id
      WHERE uc.id IS NULL
      LIMIT 5
    `);
    console.log(`  ${orphanedSpells.rows.length === 0 ? '✅' : '❌'} Orphaned character_spells: ${orphanedSpells.rows.length}`);

    // Check for battles with missing users
    const orphanedBattles = await client.query(`
      SELECT b.id, b.user_id
      FROM battles b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE u.id IS NULL
    `);
    console.log(`  ${orphanedBattles.rows.length === 0 ? '✅' : '❌'} Orphaned battles: ${orphanedBattles.rows.length}`);

    // BUG TEST 2: Duplicate Records
    console.log('\n\n🔍 TEST 2: Duplicate Records');
    console.log('─'.repeat(70));

    // Check for duplicate user emails
    const dupEmails = await client.query(`
      SELECT email, COUNT(*) as count
      FROM users
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    console.log(`  ${dupEmails.rows.length === 0 ? '✅' : '❌'} Duplicate user emails: ${dupEmails.rows.length}`);
    if (dupEmails.rows.length > 0) {
      console.log('    Users with duplicate emails:');
      dupEmails.rows.forEach(dup => {
        console.log(`      - ${dup.email}: ${dup.count} users`);
      });
    }

    // Check for duplicate usernames
    const dupUsernames = await client.query(`
      SELECT username, COUNT(*) as count
      FROM users
      WHERE username IS NOT NULL
      GROUP BY username
      HAVING COUNT(*) > 1
    `);
    console.log(`  ${dupUsernames.rows.length === 0 ? '✅' : '❌'} Duplicate usernames: ${dupUsernames.rows.length}`);
    if (dupUsernames.rows.length > 0) {
      console.log('    Duplicate usernames found:');
      dupUsernames.rows.forEach(dup => {
        console.log(`      - ${dup.username}: ${dup.count} accounts`);
      });
    }

    // BUG TEST 3: Missing Required Data
    console.log('\n\n🔍 TEST 3: Missing Required Data');
    console.log('─'.repeat(70));

    // Users without characters
    const usersNoChars = await client.query(`
      SELECT u.id, u.username
      FROM users u
      LEFT JOIN user_characters uc ON u.id = uc.user_id
      WHERE uc.id IS NULL
      LIMIT 5
    `);
    console.log(`  ${usersNoChars.rows.length === 0 ? '✅' : '⚠️ '} Users without any characters: ${usersNoChars.rows.length}`);
    if (usersNoChars.rows.length > 0) {
      usersNoChars.rows.slice(0, 3).forEach(user => {
        console.log(`      - ${user.username || user.id}`);
      });
    }

    // Powers without effects
    const powersNoEffects = await client.query(`
      SELECT id, name, effects
      FROM power_definitions
      WHERE effects IS NULL OR effects = '{}'::jsonb
      LIMIT 5
    `);
    console.log(`  ${powersNoEffects.rows.length === 0 ? '✅' : '⚠️ '} Powers with no effects: ${powersNoEffects.rows.length}`);
    if (powersNoEffects.rows.length > 0) {
      powersNoEffects.rows.forEach(power => {
        console.log(`      - ${power.name}: effects = ${power.effects || 'null'}`);
      });
    }

    // Spells without effects
    const spellsNoEffects = await client.query(`
      SELECT id, name, effects
      FROM spell_definitions
      WHERE effects IS NULL OR effects = '{}'::jsonb
      LIMIT 5
    `);
    console.log(`  ${spellsNoEffects.rows.length === 0 ? '✅' : '⚠️ '} Spells with no effects: ${spellsNoEffects.rows.length}`);
    if (spellsNoEffects.rows.length > 0) {
      spellsNoEffects.rows.forEach(spell => {
        console.log(`      - ${spell.name}: effects = ${spell.effects || 'null'}`);
      });
    }

    // BUG TEST 4: Data Range Violations
    console.log('\n\n🔍 TEST 4: Data Range Violations');
    console.log('─'.repeat(70));

    // Characters with HP > max_health
    const hpViolations = await client.query(`
      SELECT c.name, uc.current_health, uc.current_max_health
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.current_health > uc.current_max_health
      LIMIT 5
    `);
    console.log(`  ${hpViolations.rows.length === 0 ? '✅' : '❌'} Characters with HP > max HP: ${hpViolations.rows.length}`);
    if (hpViolations.rows.length > 0) {
      hpViolations.rows.forEach(char => {
        console.log(`      - ${char.name}: ${char.current_health}/${char.current_max_health} HP`);
      });
    }

    // Characters with level 0 or negative
    const badLevels = await client.query(`
      SELECT c.name, uc.level
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.level <= 0
      LIMIT 5
    `);
    console.log(`  ${badLevels.rows.length === 0 ? '✅' : '❌'} Characters with level <= 0: ${badLevels.rows.length}`);

    // Powers/spells with invalid mastery levels
    const badMastery = await client.query(`
      SELECT COUNT(*) as count
      FROM character_powers
      WHERE mastery_level NOT BETWEEN 1 AND 10
    `);
    console.log(`  ${badMastery.rows[0].count === '0' ? '✅' : '⚠️ '} Powers with invalid mastery: ${badMastery.rows[0].count}`);

    // BUG TEST 5: Inconsistent State
    console.log('\n\n🔍 TEST 5: Inconsistent State');
    console.log('─'.repeat(70));

    // Characters with injuries but full HP
    const injuredButHealthy = await client.query(`
      SELECT c.name, uc.is_injured, uc.current_health, uc.current_max_health
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE uc.is_injured = true AND uc.current_health >= uc.current_max_health
      LIMIT 5
    `);
    console.log(`  ${injuredButHealthy.rows.length === 0 ? '✅' : '⚠️ '} Injured but at full HP: ${injuredButHealthy.rows.length}`);

    // Powers on cooldown but cooldown expired
    const expiredCooldowns = await client.query(`
      SELECT COUNT(*) as count
      FROM character_powers
      WHERE on_cooldown = true AND (cooldown_expires_at IS NULL OR cooldown_expires_at < CURRENT_TIMESTAMP)
    `);
    console.log(`  ${expiredCooldowns.rows[0].count === '0' ? '✅' : '⚠️ '} Powers stuck on cooldown: ${expiredCooldowns.rows[0].count}`);

    // Characters in battle but battle is completed
    const stuckInBattle = await client.query(`
      SELECT uc.id, c.name, b.status
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      JOIN battles b ON uc.current_battle_id = b.id
      WHERE b.status = 'completed'
      LIMIT 5
    `);
    console.log(`  ${stuckInBattle.rows.length === 0 ? '✅' : '❌'} Characters stuck in completed battles: ${stuckInBattle.rows.length}`);

    // BUG TEST 6: Trigger Functionality
    console.log('\n\n🔍 TEST 6: Trigger Functionality Tests');
    console.log('─'.repeat(70));

    // Test if auto_unlock_starters would work
    const starterTest = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM power_definitions WHERE is_starter = true) as starter_powers,
        (SELECT COUNT(*) FROM spell_definitions WHERE is_starter = true) as starter_spells,
        (SELECT COUNT(*) FROM character_powers WHERE unlocked = true) as unlocked_powers,
        (SELECT COUNT(*) FROM character_spells WHERE unlocked = true) as unlocked_spells
    `);

    const st = starterTest.rows[0];
    console.log(`  Starter definitions: ${st.starter_powers} powers, ${st.starter_spells} spells`);
    console.log(`  Actually unlocked: ${st.unlocked_powers} powers, ${st.unlocked_spells} spells`);
    console.log(`  ${st.unlocked_powers === '0' && st.unlocked_spells === '0' ? '❌' : '✅'} Unlock trigger working: ${st.unlocked_powers === '0' ? 'NO - nothing unlocked!' : 'Yes'}`);

    // BUG TEST 7: Nullability Issues
    console.log('\n\n🔍 TEST 7: Unexpected NULL Values');
    console.log('─'.repeat(70));

    // Check for null character names
    const nullNames = await client.query(`
      SELECT COUNT(*) as count FROM characters WHERE name IS NULL
    `);
    console.log(`  ${nullNames.rows[0].count === '0' ? '✅' : '❌'} Characters with NULL names: ${nullNames.rows[0].count}`);

    // Check for null attack/defense/speed
    const nullStats = await client.query(`
      SELECT COUNT(*) as count
      FROM characters
      WHERE attack IS NULL OR defense IS NULL OR speed IS NULL OR max_health IS NULL
    `);
    console.log(`  ${nullStats.rows[0].count === '0' ? '✅' : '❌'} Characters with NULL stats: ${nullStats.rows[0].count}`);

    // Users with null username AND null email
    const nullUsers = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE username IS NULL AND email IS NULL
    `);
    console.log(`  ${nullUsers.rows[0].count === '0' ? '✅' : '⚠️ '} Users with no username/email: ${nullUsers.rows[0].count}`);

    // SUMMARY
    console.log('\n\n═'.repeat(70));
    console.log('🎯 BUG HUNT SUMMARY');
    console.log('═'.repeat(70));

    const bugCount = [
      orphanedChars.rows.length,
      orphanedPowers.rows.length,
      orphanedSpells.rows.length,
      orphanedBattles.rows.length,
      dupEmails.rows.length,
      dupUsernames.rows.length,
      powersNoEffects.rows.length,
      spellsNoEffects.rows.length,
      hpViolations.rows.length,
      badLevels.rows.length,
      stuckInBattle.rows.length
    ].filter(count => count > 0).length;

    console.log(`  Bugs/Issues Found: ${bugCount}`);
    console.log(`  Critical: ${st.unlocked_powers === '0' ? '1' : '0'} (auto_unlock trigger broken)`);
    console.log(`  High: ${orphanedChars.rows.length > 0 || hpViolations.rows.length > 0 ? orphanedChars.rows.length + hpViolations.rows.length : 0}`);
    console.log(`  Medium: ${dupEmails.rows.length + dupUsernames.rows.length}`);
    console.log(`  Low: ${powersNoEffects.rows.length + spellsNoEffects.rows.length}`);

    console.log('\n✅ Bug Hunt Complete!\n');

  } catch (error) {
    console.error('\n❌ Bug Hunt Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run bug hunt
huntBugs()
  .then(() => {
    console.log('✅ Bug hunting completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Bug hunt failed:', error);
    process.exit(1);
  });
