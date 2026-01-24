/**
 * Registration Flow Test
 * Tests the entire user registration and character creation process
 * READ-ONLY - simulates but doesn't actually create users
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function testRegistrationFlow() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('👤 REGISTRATION FLOW TEST\n');
    console.log('═'.repeat(70));

    // STEP 1: Check pack system readiness
    console.log('\n📦 STEP 1: Pack System Readiness');
    console.log('─'.repeat(70));

    const packCheck = await client.query(`
      SELECT pack_type, COUNT(*) as count
      FROM card_packs
      WHERE pack_type = 'standard_starter'
      GROUP BY pack_type
    `);

    if (packCheck.rows.length === 0) {
      console.log('  ❌ BLOCKER: No standard_starter pack template found!');
      console.log('     Registration will FAIL at pack generation step');
      return;
    } else {
      console.log(`  ✅ standard_starter pack exists (${packCheck.rows[0].count} templates)`);
    }

    // Check pack contents
    const packContents = await client.query(`
      SELECT
        cp.pack_type,
        cp.character_id,
        c.name,
        c.rarity
      FROM card_packs cp
      JOIN characters c ON cp.character_id = c.id
      WHERE cp.pack_type = 'standard_starter'
      LIMIT 10
    `);

    console.log(`  Pack contains ${packContents.rows.length} characters:`);
    packContents.rows.slice(0, 5).forEach(char => {
      console.log(`    - ${char.name} (${char.rarity || 'no rarity'})`);
    });

    // STEP 2: Check auto_unlock trigger status
    console.log('\n\n✨ STEP 2: Character Abilities Unlock System');
    console.log('─'.repeat(70));

    const triggerDef = await client.query(`
      SELECT pg_get_functiondef(oid) as def
      FROM pg_proc
      WHERE proname = 'auto_unlock_starters'
    `);

    if (triggerDef.rows.length === 0) {
      console.log('  ❌ BLOCKER: auto_unlock_starters trigger NOT FOUND!');
      console.log('     New characters will have 0 abilities');
    } else {
      const funcDef = triggerDef.rows[0].def;
      const hasSpellBug = funcDef.includes('s.spell_id');
      const hasPowerBug = funcDef.includes('p.power_id');

      console.log(`  ${hasPowerBug ? '❌' : '✅'} Power unlock: ${hasPowerBug ? 'BROKEN (p.power_id)' : 'OK (p.id)'}`);
      console.log(`  ${hasSpellBug ? '❌' : '✅'} Spell unlock: ${hasSpellBug ? 'BROKEN (s.spell_id)' : 'OK (s.id)'}`);

      if (hasSpellBug) {
        console.log('  ⚠️  New characters will get powers but NOT spells!');
      }
    }

    // Check starter definitions
    const starters = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM power_definitions WHERE is_starter = true) as starter_powers,
        (SELECT COUNT(*) FROM spell_definitions WHERE is_starter = true) as starter_spells
    `);

    console.log(`  Starter abilities defined: ${starters.rows[0].starter_powers} powers, ${starters.rows[0].starter_spells} spells`);

    if (parseInt(starters.rows[0].starter_powers) === 0 && parseInt(starters.rows[0].starter_spells) === 0) {
      console.log('  ⚠️  WARNING: No starter abilities defined!');
    }

    // STEP 3: Simulate character creation
    console.log('\n\n🎭 STEP 3: Character Creation Simulation');
    console.log('─'.repeat(70));

    // Get a sample character template
    const sampleChar = await client.query(`
      SELECT id, name, archetype, species, max_health, attack, defense, speed
      FROM characters
      WHERE id IN (SELECT character_id FROM card_packs WHERE pack_type = 'standard_starter' LIMIT 1)
      LIMIT 1
    `);

    if (sampleChar.rows.length === 0) {
      console.log('  ❌ No sample character found');
    } else {
      const char = sampleChar.rows[0];
      console.log(`  Simulating creation of: ${char.name}`);
      console.log(`    Archetype: ${char.archetype || 'none'}`);
      console.log(`    Species: ${char.species || 'none'}`);
      console.log(`    Stats: HP ${char.max_health}, ATK ${char.attack}, DEF ${char.defense}, SPD ${char.speed}`);

      // Check what starters would unlock
      const wouldUnlockPowers = await client.query(`
        SELECT pd.id, pd.name, pd.is_starter
        FROM power_definitions pd
        WHERE pd.is_starter = TRUE
      `);

      const wouldUnlockSpells = await client.query(`
        SELECT sd.id, sd.name, sd.is_starter, sd.archetype, sd.species, sd.character_id
        FROM spell_definitions sd
        WHERE sd.is_starter = TRUE
        AND (
          (sd.character_id IS NOT NULL AND sd.character_id = $1)
          OR (sd.archetype IS NOT NULL AND sd.archetype = $2)
          OR (sd.species IS NOT NULL AND sd.species = $3)
          OR (sd.archetype IS NULL AND sd.character_id IS NULL AND sd.species IS NULL)
        )
      `, [char.id, char.archetype, char.species]);

      console.log(`\n  Would unlock:`);
      console.log(`    ${wouldUnlockPowers.rows.length} powers`);
      wouldUnlockPowers.rows.forEach(p => {
        console.log(`      - ${p.name}`);
      });

      console.log(`    ${wouldUnlockSpells.rows.length} spells`);
      wouldUnlockSpells.rows.forEach(s => {
        console.log(`      - ${s.name} (${s.character_id ? 'signature' : s.archetype ? 'archetype' : s.species ? 'species' : 'universal'})`);
      });

      if (wouldUnlockPowers.rows.length === 0 && wouldUnlockSpells.rows.length === 0) {
        console.log(`    ⚠️  Character would have NO starting abilities!`);
      }
    }

    // STEP 4: Check recent registration attempts
    console.log('\n\n📊 STEP 4: Recent Registration Analysis');
    console.log('─'.repeat(70));

    const recentUsers = await client.query(`
      SELECT
        u.id,
        u.username,
        u.created_at,
        (SELECT COUNT(*) FROM user_characters WHERE user_id = u.id) as char_count
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    console.log('  Most recent user registrations:');
    recentUsers.rows.forEach(user => {
      const date = new Date(user.created_at).toLocaleString();
      const status = user.char_count > 0 ? '✅' : '❌';
      console.log(`    ${status} ${user.username || user.id.slice(0, 8)} - ${user.char_count} chars (${date})`);
    });

    // Check if recent users got abilities
    const recentWithAbilities = await client.query(`
      SELECT
        u.username,
        (SELECT COUNT(*) FROM character_powers cp
         JOIN user_characters uc ON cp.character_id = uc.id
         WHERE uc.user_id = u.id AND cp.unlocked = true) as powers,
        (SELECT COUNT(*) FROM character_spells cs
         JOIN user_characters uc ON cs.character_id = uc.id
         WHERE uc.user_id = u.id AND cs.unlocked = true) as spells
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    console.log('\n  Ability unlock success for recent users:');
    recentWithAbilities.rows.forEach(user => {
      const hasPowers = parseInt(user.powers) > 0;
      const hasSpells = parseInt(user.spells) > 0;
      const status = hasPowers && hasSpells ? '✅' : hasPowers ? '⚠️' : hasSpells ? '⚠️' : '❌';
      console.log(`    ${status} ${user.username || 'Unknown'}: ${user.powers} powers, ${user.spells} spells`);
    });

    // STEP 5: Database constraints check
    console.log('\n\n🔒 STEP 5: Registration Constraints');
    console.log('─'.repeat(70));

    // Check unique constraints
    const constraints = await client.query(`
      SELECT
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
      AND contype IN ('u', 'p')
    `);

    console.log('  User table constraints:');
    constraints.rows.forEach(c => {
      const type = c.constraint_type === 'p' ? 'Primary Key' : 'Unique';
      console.log(`    ✅ ${c.constraint_name} (${type})`);
    });

    // SUMMARY
    console.log('\n\n═'.repeat(70));
    console.log('📋 REGISTRATION FLOW SUMMARY');
    console.log('═'.repeat(70));

    const blockers = [];
    const warnings = [];

    if (packCheck.rows.length === 0) {
      blockers.push('No starter pack templates');
    }

    const hasPowerBug = triggerDef.rows.length > 0 && triggerDef.rows[0].def.includes('p.power_id');
    const hasSpellBug = triggerDef.rows.length > 0 && triggerDef.rows[0].def.includes('s.spell_id');

    if (hasPowerBug && hasSpellBug) {
      blockers.push('auto_unlock trigger completely broken');
    } else if (hasSpellBug) {
      warnings.push('Spells won\'t unlock (power unlock works)');
    } else if (hasPowerBug) {
      warnings.push('Powers won\'t unlock (spell unlock works)');
    }

    if (parseInt(starters.rows[0].starter_powers) === 0 && parseInt(starters.rows[0].starter_spells) === 0) {
      warnings.push('No starter abilities defined');
    }

    console.log(`  Blockers: ${blockers.length === 0 ? '✅ None' : '❌ ' + blockers.length}`);
    blockers.forEach(b => console.log(`    - ${b}`));

    console.log(`  Warnings: ${warnings.length === 0 ? '✅ None' : '⚠️  ' + warnings.length}`);
    warnings.forEach(w => console.log(`    - ${w}`));

    console.log(`\n  Registration Status: ${blockers.length === 0 ? '✅ SHOULD WORK' : '❌ WILL FAIL'}`);
    console.log(`  Character Abilities: ${warnings.length === 0 ? '✅ WILL UNLOCK' : '⚠️  PARTIAL/BROKEN'}`);

    console.log('\n✅ Registration Flow Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run test
testRegistrationFlow()
  .then(() => {
    console.log('✅ Registration flow analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Registration flow test failed:', error);
    process.exit(1);
  });
