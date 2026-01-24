const path = require('path');
// .env is in backend/ directory, which is parent of backend/scripts/
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('DEBUG: DATABASE_URL is ' + (process.env.DATABASE_URL ? 'SET' : 'NOT SET'));
if (!process.env.DATABASE_URL) {
    console.log('DEBUG: Attempting to load .env from: ' + path.resolve(__dirname, '../.env'));
    // Try loading from default location just in case
    require('dotenv').config();
    console.log('DEBUG: Retry - DATABASE_URL is ' + (process.env.DATABASE_URL ? 'SET' : 'NOT SET'));
}

const { query } = require('../src/database/index');

async function verifyMigrations() {
    console.log('🔍 Starting Comprehensive Migration Verification...');
    let allPassed = true;

    try {
        // 1. Verify Migration 160: Progression Columns
        console.log('\n--- Verifying Migration 160 (Progression Columns) ---');

        const spellCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'character_spells' AND column_name IN ('mastery_points', 'mastery_level')
    `);

        if (spellCols.rows.length === 2) {
            console.log('✅ character_spells columns (mastery_points, mastery_level) exist.');
        } else {
            console.error('❌ Missing columns in character_spells!');
            allPassed = false;
        }

        const defCols = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'spell_definitions' AND column_name IN ('is_starter', 'strength_level', 'required_stats')
    `);

        if (defCols.rows.length >= 3) { // might be more if we check others
            console.log('✅ spell_definitions columns (is_starter, strength_level, required_stats) exist.');
        } else {
            console.error('❌ Missing columns in spell_definitions!');
            allPassed = false;
        }

        // 2. Verify Migration 161: Mastery Config
        console.log('\n--- Verifying Migration 161 (Mastery Config) ---');
        const configTable = await query(`
      SELECT to_regclass('public.mastery_config') as table_exists
    `);

        if (configTable.rows[0].table_exists) {
            console.log('✅ mastery_config table exists.');

            const configCount = await query('SELECT count(*) FROM mastery_config');
            if (parseInt(configCount.rows[0].count) > 0) {
                console.log(`✅ mastery_config has data (${configCount.rows[0].count} rows).`);
            } else {
                console.error('❌ mastery_config table is empty!');
                allPassed = false;
            }
        } else {
            console.error('❌ mastery_config table missing!');
            allPassed = false;
        }

        // 3. Verify Migration 162: Mastery Triggers
        console.log('\n--- Verifying Migration 162 (Mastery Triggers) ---');
        // We can check pg_trigger
        const triggers = await query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name IN ('update_spell_mastery_level', 'update_power_mastery_level')
    `);

        if (triggers.rows.length === 2) {
            console.log('✅ Mastery level update triggers exist.');
        } else {
            console.error(`❌ Missing triggers! Found: ${triggers.rows.map(r => r.trigger_name).join(', ')}`);
            allPassed = false;
        }

        // 4. Verify Migration 163: Auto Unlock Starters Trigger
        console.log('\n--- Verifying Migration 163 (Auto Unlock Starters) ---');
        const starterTrigger = await query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_auto_unlock_starters'
    `);

        if (starterTrigger.rows.length === 1) {
            console.log('✅ trigger_auto_unlock_starters exists.');
        } else {
            console.error('❌ trigger_auto_unlock_starters missing!');
            allPassed = false;
        }

        // 5. Verify Migration 164: Seed Starter Flags
        console.log('\n--- Verifying Migration 164 (Seed Starter Flags) ---');
        const starterSpells = await query(`
      SELECT name, is_starter FROM spell_definitions WHERE name = 'Minor Heal'
    `);

        if (starterSpells.rows.length > 0 && starterSpells.rows[0].is_starter) {
            console.log('✅ "Minor Heal" is flagged as starter.');
        } else {
            console.error('❌ "Minor Heal" is NOT flagged as starter!');
            allPassed = false;
        }

        const starterPowers = await query(`
      SELECT name, is_starter FROM power_definitions WHERE name = 'Focus'
    `);

        if (starterPowers.rows.length > 0 && starterPowers.rows[0].is_starter) {
            console.log('✅ "Focus" is flagged as starter.');
        } else {
            console.error('❌ "Focus" is NOT flagged as starter!');
            allPassed = false;
        }

    } catch (err) {
        console.error('❌ Error during verification:', err);
        allPassed = false;
    } finally {
        console.log('\n----------------------------------------');
        if (allPassed) {
            console.log('🎉 ALL CHECKS PASSED. The system is consistent.');
        } else {
            console.log('⚠️ SOME CHECKS FAILED. Review output above.');
        }
        process.exit(allPassed ? 0 : 1);
    }
}

verifyMigrations();
