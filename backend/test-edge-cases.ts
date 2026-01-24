/**
 * Edge Cases & Final Validation Test
 * Tests unusual scenarios, limits, and edge cases
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function testEdgeCases() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔥 EDGE CASES & FINAL VALIDATION TEST\n');
    console.log('═'.repeat(70));

    // TEST 1: Extreme Character Loadouts
    console.log('\n⚡ TEST 1: Character Power/Spell Capacity');
    console.log('─'.repeat(70));

    const maxAbilities = await client.query(`
      SELECT
        uc.id,
        c.name,
        (SELECT COUNT(*) FROM character_powers WHERE character_id = uc.id) as total_powers,
        (SELECT COUNT(*) FROM character_spells WHERE character_id = uc.id) as total_spells
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      ORDER BY (SELECT COUNT(*) FROM character_powers WHERE character_id = uc.id) +
               (SELECT COUNT(*) FROM character_spells WHERE character_id = uc.id) DESC
      LIMIT 5
    `);

    console.log(`  Characters with Most Abilities:`);
    maxAbilities.rows.forEach((char, i) => {
      const total = parseInt(char.total_powers) + parseInt(char.total_spells);
      console.log(`    ${i + 1}. ${char.name}: ${char.total_powers} powers + ${char.total_spells} spells = ${total} total`);
    });

    // Check if any character has > 100 abilities (suspicious)
    const tooManyAbilities = await client.query(`
      SELECT c.name,
             (SELECT COUNT(*) FROM character_powers WHERE character_id = uc.id) +
             (SELECT COUNT(*) FROM character_spells WHERE character_id = uc.id) as total
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      WHERE (SELECT COUNT(*) FROM character_powers WHERE character_id = uc.id) +
            (SELECT COUNT(*) FROM character_spells WHERE character_id = uc.id) > 100
    `);

    console.log(`\n  ${tooManyAbilities.rows.length === 0 ? '✅' : '⚠️ '} Characters with >100 abilities: ${tooManyAbilities.rows.length}`);

    // TEST 2: Duplicate Character Ownership
    console.log('\n\n👥 TEST 2: Character Ownership Patterns');
    console.log('─'.repeat(70));

    // Check if users have duplicate character types
    const duplicateChars = await client.query(`
      SELECT
        u.username,
        c.name as char_name,
        COUNT(*) as copies
      FROM user_characters uc
      JOIN users u ON uc.user_id = u.id
      JOIN characters c ON uc.character_id = c.id
      GROUP BY u.id, u.username, c.id, c.name
      HAVING COUNT(*) > 1
      LIMIT 5
    `);

    console.log(`  ${duplicateChars.rows.length === 0 ? '✅' : '📊'} Users with duplicate characters: ${duplicateChars.rows.length}`);
    if (duplicateChars.rows.length > 0) {
      duplicateChars.rows.forEach(dup => {
        console.log(`    - ${dup.username || 'Unknown'} has ${dup.copies}x ${dup.char_name}`);
      });
    }

    // Check distribution
    const charDistribution = await client.query(`
      SELECT
        c.name,
        COUNT(DISTINCT uc.user_id) as owners,
        COUNT(*) as total_instances
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.id
      GROUP BY c.id, c.name
      ORDER BY total_instances DESC
      LIMIT 5
    `);

    console.log(`\n  Most Popular Characters:`);
    charDistribution.rows.forEach((char, i) => {
      console.log(`    ${i + 1}. ${char.name}: ${char.total_instances} instances, ${char.owners} unique owners`);
    });

    // TEST 3: Team Composition Validation
    console.log('\n\n🎮 TEST 3: Battle Team Validation');
    console.log('─'.repeat(70));

    // Check if any user has < 3 characters (can't form a team)
    const insufficientTeams = await client.query(`
      SELECT u.username, COUNT(uc.id) as char_count
      FROM users u
      LEFT JOIN user_characters uc ON u.id = uc.user_id
      GROUP BY u.id, u.username
      HAVING COUNT(uc.id) > 0 AND COUNT(uc.id) < 3
      LIMIT 5
    `);

    console.log(`  ${insufficientTeams.rows.length === 0 ? '✅' : '⚠️ '} Users with < 3 characters (can't form team): ${insufficientTeams.rows.length}`);
    if (insufficientTeams.rows.length > 0) {
      insufficientTeams.rows.forEach(user => {
        console.log(`    - ${user.username || 'Unknown'}: only ${user.char_count} characters`);
      });
    }

    // Check average team size potential
    const teamSizes = await client.query(`
      SELECT
        AVG(char_count)::numeric(10,2) as avg_chars,
        MAX(char_count) as max_chars,
        MIN(char_count) FILTER (WHERE char_count > 0) as min_chars_nonzero
      FROM (
        SELECT user_id, COUNT(*) as char_count
        FROM user_characters
        GROUP BY user_id
      ) as counts
    `);

    const ts = teamSizes.rows[0];
    console.log(`\n  Team Potential:`);
    console.log(`    Average characters per user: ${ts.avg_chars}`);
    console.log(`    Max characters (whale user): ${ts.max_chars}`);
    console.log(`    Min characters (active user): ${ts.min_chars_nonzero}`);

    // TEST 4: Database Performance Indicators
    console.log('\n\n⚡ TEST 4: Performance & Size Indicators');
    console.log('─'.repeat(70));

    const tableSizes = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);

    console.log(`  Largest Tables:`);
    tableSizes.rows.forEach((table, i) => {
      console.log(`    ${i + 1}. ${table.tablename}: ${table.size}`);
    });

    // TEST 5: Timestamp Consistency
    console.log('\n\n📅 TEST 5: Timestamp Data Quality');
    console.log('─'.repeat(70));

    // Check for future dates
    const futureDates = await client.query(`
      SELECT COUNT(*) as count
      FROM user_characters
      WHERE created_at > CURRENT_TIMESTAMP
    `);

    console.log(`  ${futureDates.rows[0].count === '0' ? '✅' : '❌'} Characters created in the future: ${futureDates.rows[0].count}`);

    // Check for very old dates (before 2020)
    const ancientDates = await client.query(`
      SELECT COUNT(*) as count
      FROM user_characters
      WHERE created_at < '2020-01-01'
    `);

    console.log(`  ${ancientDates.rows[0].count === '0' ? '✅' : '⚠️ '} Characters created before 2020: ${ancientDates.rows[0].count}`);

    // TEST 6: Battle System Edge Cases
    console.log('\n\n⚔️  TEST 6: Battle System Edge Cases');
    console.log('─'.repeat(70));

    // Check for battles with same user as opponent
    const selfBattles = await client.query(`
      SELECT COUNT(*) as count
      FROM battles
      WHERE user_id = opponent_user_id AND opponent_user_id IS NOT NULL
    `);

    console.log(`  ${selfBattles.rows[0].count === '0' ? '✅' : '⚠️ '} Self-battles (user vs self): ${selfBattles.rows[0].count}`);

    // Check battle duration
    const battleDurations = await client.query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at))) as avg_duration_sec,
        MAX(EXTRACT(EPOCH FROM (COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at))) as max_duration_sec
      FROM battles
      WHERE started_at IS NOT NULL
    `);

    if (battleDurations.rows[0].avg_duration_sec) {
      const avg = parseFloat(battleDurations.rows[0].avg_duration_sec);
      const max = parseFloat(battleDurations.rows[0].max_duration_sec);
      console.log(`\n  Battle Durations:`);
      console.log(`    Average: ${(avg / 60).toFixed(2)} minutes`);
      console.log(`    Longest: ${(max / 60).toFixed(2)} minutes`);

      if (max > 86400) {
        console.log(`    ⚠️  Longest battle is > 24 hours (stuck battle?)`);
      }
    }

    // Check for abandoned battles
    const abandonedBattles = await client.query(`
      SELECT COUNT(*) as count
      FROM battles
      WHERE status = 'active'
        AND started_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
    `);

    console.log(`\n  ${abandonedBattles.rows[0].count === '0' ? '✅' : '⚠️ '} Abandoned battles (active >24h): ${abandonedBattles.rows[0].count}`);

    // TEST 7: Character Level Distribution
    console.log('\n\n📊 TEST 7: Character Progression Distribution');
    console.log('─'.repeat(70));

    const levelDist = await client.query(`
      SELECT
        level,
        COUNT(*) as count
      FROM user_characters
      GROUP BY level
      ORDER BY level
      LIMIT 10
    `);

    console.log(`  Level Distribution (first 10):`);
    levelDist.rows.forEach(l => {
      const bar = '█'.repeat(Math.min(Math.floor(parseInt(l.count) / 10), 50));
      console.log(`    Lvl ${l.level.toString().padStart(2)}: ${l.count.toString().padStart(4)} ${bar}`);
    });

    const levelStats = await client.query(`
      SELECT
        AVG(level)::numeric(10,2) as avg_level,
        MAX(level) as max_level,
        MIN(level) as min_level
      FROM user_characters
    `);

    const ls = levelStats.rows[0];
    console.log(`\n  Level Stats:`);
    console.log(`    Average: ${ls.avg_level}`);
    console.log(`    Max: ${ls.max_level}`);
    console.log(`    Min: ${ls.min_level}`);

    // FINAL SUMMARY
    console.log('\n\n═'.repeat(70));
    console.log('🎯 EDGE CASES TEST SUMMARY');
    console.log('═'.repeat(70));

    const warnings = [];
    if (parseInt(futureDates.rows[0].count) > 0) warnings.push('Future timestamps detected');
    if (parseInt(selfBattles.rows[0].count) > 0) warnings.push('Self-battles exist');
    if (parseInt(abandonedBattles.rows[0].count) > 0) warnings.push(`${abandonedBattles.rows[0].count} abandoned battles`);
    if (insufficientTeams.rows.length > 0) warnings.push(`${insufficientTeams.rows.length} users can't form teams`);

    console.log(`  Warnings Found: ${warnings.length === 0 ? '✅ None' : '⚠️  ' + warnings.length}`);
    warnings.forEach(w => console.log(`    - ${w}`));

    console.log(`\n  Database Health: ${warnings.length === 0 ? '✅ EXCELLENT' : warnings.length < 3 ? '✅ GOOD' : '⚠️  NEEDS ATTENTION'}`);

    console.log('\n✅ Edge Cases Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run test
testEdgeCases()
  .then(() => {
    console.log('✅ Edge cases testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Edge cases test failed:', error);
    process.exit(1);
  });
