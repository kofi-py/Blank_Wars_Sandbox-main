/**
 * Ability Definitions Validation Test
 * Deep validation of power and spell definitions
 * Checks for broken effects, missing data, invalid JSONB
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway";

async function validateAbilityDefinitions() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('⚡ ABILITY DEFINITIONS VALIDATION TEST\n');
    console.log('═'.repeat(70));

    // TEST 1: Power Definitions Deep Dive
    console.log('\n💪 TEST 1: Power Definitions Validation');
    console.log('─'.repeat(70));

    const totalPowers = await client.query(`SELECT COUNT(*) as count FROM power_definitions`);
    console.log(`  Total Powers: ${totalPowers.rows[0].count}`);

    // Check effects structure
    const powersEffects = await client.query(`
      SELECT
        id, name, effects,
        jsonb_typeof(effects) as effects_type,
        CASE
          WHEN effects IS NULL THEN 'null'
          WHEN effects = '{}'::jsonb THEN 'empty'
          WHEN effects = '[]'::jsonb THEN 'empty_array'
          ELSE 'has_data'
        END as effects_status
      FROM power_definitions
      LIMIT 500
    `);

    const effectsAnalysis = {
      null: 0,
      empty: 0,
      empty_array: 0,
      has_data: 0
    };

    powersEffects.rows.forEach(p => {
      effectsAnalysis[p.effects_status]++;
    });

    console.log(`\n  Effects Analysis:`);
    console.log(`    ${effectsAnalysis.null === 0 ? '✅' : '❌'} NULL effects: ${effectsAnalysis.null}`);
    console.log(`    ${effectsAnalysis.empty === 0 ? '✅' : '⚠️ '} Empty object {}: ${effectsAnalysis.empty}`);
    console.log(`    ${effectsAnalysis.empty_array === 0 ? '✅' : '⚠️ '} Empty array []: ${effectsAnalysis.empty_array}`);
    console.log(`    ✅ Has data: ${effectsAnalysis.has_data}`);

    // Check for missing critical fields
    const missingFields = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE name IS NULL OR name = '') as missing_name,
        COUNT(*) FILTER (WHERE description IS NULL OR description = '') as missing_desc,
        COUNT(*) FILTER (WHERE tier IS NULL) as missing_tier,
        COUNT(*) FILTER (WHERE category IS NULL) as missing_category
      FROM power_definitions
    `);

    const mf = missingFields.rows[0];
    console.log(`\n  Missing Fields:`);
    console.log(`    ${mf.missing_name === '0' ? '✅' : '❌'} Name: ${mf.missing_name} missing`);
    console.log(`    ${mf.missing_desc === '0' ? '✅' : '⚠️ '} Description: ${mf.missing_desc} missing`);
    console.log(`    ${mf.missing_tier === '0' ? '✅' : '⚠️ '} Tier: ${mf.missing_tier} missing`);
    console.log(`    ${mf.missing_category === '0' ? '✅' : '⚠️ '} Category: ${mf.missing_category} missing`);

    // Check tier distribution
    const tierDist = await client.query(`
      SELECT tier, COUNT(*) as count
      FROM power_definitions
      WHERE tier IS NOT NULL
      GROUP BY tier
      ORDER BY tier
    `);

    console.log(`\n  Tier Distribution:`);
    tierDist.rows.forEach(t => {
      console.log(`    Tier ${t.tier}: ${t.count} powers`);
    });

    // Check for invalid/suspicious values
    const suspiciousPowers = await client.query(`
      SELECT id, name, unlock_cost, rank_up_cost
      FROM power_definitions
      WHERE unlock_cost < 0 OR unlock_cost > 10000
         OR rank_up_cost < 0 OR rank_up_cost > 10000
      LIMIT 5
    `);

    console.log(`\n  ${suspiciousPowers.rows.length === 0 ? '✅' : '⚠️ '} Suspicious costs: ${suspiciousPowers.rows.length}`);
    if (suspiciousPowers.rows.length > 0) {
      suspiciousPowers.rows.forEach(p => {
        console.log(`    - ${p.name}: unlock=${p.unlock_cost}, rank_up=${p.rank_up_cost}`);
      });
    }

    // TEST 2: Spell Definitions Deep Dive
    console.log('\n\n✨ TEST 2: Spell Definitions Validation');
    console.log('─'.repeat(70));

    const totalSpells = await client.query(`SELECT COUNT(*) as count FROM spell_definitions`);
    console.log(`  Total Spells: ${totalSpells.rows[0].count}`);

    // Check effects structure
    const spellsEffects = await client.query(`
      SELECT
        id, name, effects,
        CASE
          WHEN effects IS NULL THEN 'null'
          WHEN effects = '{}'::jsonb THEN 'empty'
          WHEN effects = '[]'::jsonb THEN 'empty_array'
          ELSE 'has_data'
        END as effects_status
      FROM spell_definitions
      LIMIT 500
    `);

    const spellEffectsAnalysis = {
      null: 0,
      empty: 0,
      empty_array: 0,
      has_data: 0
    };

    spellsEffects.rows.forEach(s => {
      spellEffectsAnalysis[s.effects_status]++;
    });

    console.log(`\n  Effects Analysis:`);
    console.log(`    ${spellEffectsAnalysis.null === 0 ? '✅' : '❌'} NULL effects: ${spellEffectsAnalysis.null}`);
    console.log(`    ${spellEffectsAnalysis.empty === 0 ? '✅' : '⚠️ '} Empty object {}: ${spellEffectsAnalysis.empty}`);
    console.log(`    ${spellEffectsAnalysis.empty_array === 0 ? '✅' : '⚠️ '} Empty array []: ${spellEffectsAnalysis.empty_array}`);
    console.log(`    ✅ Has data: ${spellEffectsAnalysis.has_data}`);

    // Check mana costs
    const manaCostDist = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE mana_cost <= 0) as zero_or_negative,
        COUNT(*) FILTER (WHERE mana_cost BETWEEN 1 AND 10) as low_cost,
        COUNT(*) FILTER (WHERE mana_cost BETWEEN 11 AND 50) as medium_cost,
        COUNT(*) FILTER (WHERE mana_cost > 50) as high_cost,
        AVG(mana_cost)::numeric(10,2) as avg_cost
      FROM spell_definitions
    `);

    const mc = manaCostDist.rows[0];
    console.log(`\n  Mana Cost Distribution:`);
    console.log(`    ${mc.zero_or_negative === '0' ? '✅' : '⚠️ '} Zero/Negative: ${mc.zero_or_negative}`);
    console.log(`    Low (1-10): ${mc.low_cost}`);
    console.log(`    Medium (11-50): ${mc.medium_cost}`);
    console.log(`    High (>50): ${mc.high_cost}`);
    console.log(`    Average: ${mc.avg_cost} mana`);

    // Check cooldowns
    const cooldownCheck = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE cooldown_turns < 0) as negative,
        COUNT(*) FILTER (WHERE cooldown_turns = 0) as instant,
        COUNT(*) FILTER (WHERE cooldown_turns BETWEEN 1 AND 3) as short,
        COUNT(*) FILTER (WHERE cooldown_turns > 3) as long
      FROM spell_definitions
    `);

    const cd = cooldownCheck.rows[0];
    console.log(`\n  Cooldown Distribution:`);
    console.log(`    ${cd.negative === '0' ? '✅' : '❌'} Negative cooldowns: ${cd.negative}`);
    console.log(`    Instant (0): ${cd.instant}`);
    console.log(`    Short (1-3): ${cd.short}`);
    console.log(`    Long (>3): ${cd.long}`);

    // TEST 3: Archetype/Species/Character Specificity
    console.log('\n\n🎭 TEST 3: Ability Specificity Analysis');
    console.log('─'.repeat(70));

    const powerSpecificity = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE character_id IS NOT NULL) as character_specific,
        COUNT(*) FILTER (WHERE archetype IS NOT NULL) as archetype_specific,
        COUNT(*) FILTER (WHERE species IS NOT NULL) as species_specific,
        COUNT(*) FILTER (WHERE character_id IS NULL AND archetype IS NULL AND species IS NULL) as universal
      FROM power_definitions
    `);

    const ps = powerSpecificity.rows[0];
    console.log(`  Power Specificity:`);
    console.log(`    Character-specific (signature): ${ps.character_specific}`);
    console.log(`    Archetype-specific: ${ps.archetype_specific}`);
    console.log(`    Species-specific: ${ps.species_specific}`);
    console.log(`    Universal: ${ps.universal}`);

    const spellSpecificity = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE character_id IS NOT NULL) as character_specific,
        COUNT(*) FILTER (WHERE archetype IS NOT NULL) as archetype_specific,
        COUNT(*) FILTER (WHERE species IS NOT NULL) as species_specific,
        COUNT(*) FILTER (WHERE character_id IS NULL AND archetype IS NULL AND species IS NULL) as universal
      FROM spell_definitions
    `);

    const ss = spellSpecificity.rows[0];
    console.log(`\n  Spell Specificity:`);
    console.log(`    Character-specific (signature): ${ss.character_specific}`);
    console.log(`    Archetype-specific: ${ss.archetype_specific}`);
    console.log(`    Species-specific: ${ss.species_specific}`);
    console.log(`    Universal: ${ss.universal}`);

    // TEST 4: Starter Abilities Check
    console.log('\n\n🌟 TEST 4: Starter Abilities Detailed Check');
    console.log('─'.repeat(70));

    const starterPowers = await client.query(`
      SELECT id, name, character_id, archetype, species
      FROM power_definitions
      WHERE is_starter = true
    `);

    console.log(`  Starter Powers (${starterPowers.rows.length}):`);
    starterPowers.rows.forEach(p => {
      const type = p.character_id ? `signature (${p.character_id})` :
                   p.archetype ? `archetype (${p.archetype})` :
                   p.species ? `species (${p.species})` : 'universal';
      console.log(`    - ${p.name} [${type}]`);
    });

    const starterSpells = await client.query(`
      SELECT id, name, character_id, archetype, species
      FROM spell_definitions
      WHERE is_starter = true
    `);

    console.log(`\n  Starter Spells (${starterSpells.rows.length}):`);
    starterSpells.rows.forEach(s => {
      const type = s.character_id ? `signature (${s.character_id})` :
                   s.archetype ? `archetype (${s.archetype})` :
                   s.species ? `species (${s.species})` : 'universal';
      console.log(`    - ${s.name} [${type}]`);
    });

    if (starterPowers.rows.length === 0 && starterSpells.rows.length === 0) {
      console.log(`\n  ❌ CRITICAL: No starter abilities defined!`);
      console.log(`     New characters will have ZERO starting abilities`);
    } else if (starterPowers.rows.length === 0) {
      console.log(`\n  ⚠️  WARNING: No starter powers (only spells)`);
    } else if (starterSpells.rows.length === 0) {
      console.log(`\n  ⚠️  WARNING: No starter spells (only powers)`);
    }

    // TEST 5: Effects JSON Structure Validation
    console.log('\n\n🔬 TEST 5: Effects JSON Structure Sampling');
    console.log('─'.repeat(70));

    const samplePowerEffects = await client.query(`
      SELECT name, effects
      FROM power_definitions
      WHERE effects IS NOT NULL AND effects != '{}'::jsonb
      LIMIT 3
    `);

    console.log(`  Sample Power Effects (first 3):`);
    samplePowerEffects.rows.forEach(p => {
      console.log(`\n    ${p.name}:`);
      try {
        const effects = p.effects;
        const keys = Object.keys(effects);
        if (keys.length === 0) {
          console.log(`      (empty object)`);
        } else {
          console.log(`      Keys: ${keys.join(', ')}`);
        }
      } catch (e) {
        console.log(`      ❌ Invalid JSON: ${e.message}`);
      }
    });

    const sampleSpellEffects = await client.query(`
      SELECT name, effects
      FROM spell_definitions
      WHERE effects IS NOT NULL AND effects != '{}'::jsonb
      LIMIT 3
    `);

    console.log(`\n  Sample Spell Effects (first 3):`);
    sampleSpellEffects.rows.forEach(s => {
      console.log(`\n    ${s.name}:`);
      try {
        const effects = s.effects;
        const keys = Object.keys(effects);
        if (keys.length === 0) {
          console.log(`      (empty object)`);
        } else {
          console.log(`      Keys: ${keys.join(', ')}`);
        }
      } catch (e) {
        console.log(`      ❌ Invalid JSON: ${e.message}`);
      }
    });

    // SUMMARY
    console.log('\n\n═'.repeat(70));
    console.log('📋 ABILITY DEFINITIONS SUMMARY');
    console.log('═'.repeat(70));

    const issues = [];
    if (effectsAnalysis.null > 0) issues.push(`${effectsAnalysis.null} powers with NULL effects`);
    if (spellEffectsAnalysis.null > 0) issues.push(`${spellEffectsAnalysis.null} spells with NULL effects`);
    if (parseInt(mf.missing_name) > 0) issues.push(`${mf.missing_name} powers missing names`);
    if (starterPowers.rows.length === 0 && starterSpells.rows.length === 0) {
      issues.push('NO starter abilities defined (CRITICAL)');
    }
    if (parseInt(mc.zero_or_negative) > 0) issues.push(`${mc.zero_or_negative} spells with invalid mana cost`);
    if (parseInt(cd.negative) > 0) issues.push(`${cd.negative} spells with negative cooldown`);

    console.log(`  Total Powers: ${totalPowers.rows[0].count}`);
    console.log(`  Total Spells: ${totalSpells.rows[0].count}`);
    console.log(`  Starter Powers: ${starterPowers.rows.length}`);
    console.log(`  Starter Spells: ${starterSpells.rows.length}`);
    console.log(`\n  Issues Found: ${issues.length === 0 ? '✅ None' : '⚠️  ' + issues.length}`);
    issues.forEach(issue => console.log(`    - ${issue}`));

    console.log('\n✅ Ability Definitions Validation Complete!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run test
validateAbilityDefinitions()
  .then(() => {
    console.log('✅ Ability definitions validation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ability definitions validation failed:', error);
    process.exit(1);
  });
