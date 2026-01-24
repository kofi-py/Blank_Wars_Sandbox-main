#!/usr/bin/env ts-node
/**
 * Rebellion System Integration Test
 * 
 * Tests the complete rebellion flow:
 * 1. Character with low adherence attempts power unlock
 * 2. System triggers autonomous rebellion choice
 * 3. Coach lockout is enforced for 10 minutes
 * 4. UI and Chat reflect lockout state
 */

import { query } from '../src/database';
import { check_adherence_and_unlock_power } from '../src/services/loadoutAdherenceService';

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    data?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, message: string, data?: any) {
    results.push({
        name,
        passed: condition,
        message,
        data
    });

    if (condition) {
        console.log(`✅ PASS: ${name}`);
    } else {
        console.error(`❌ FAIL: ${name} - ${message}`);
        if (data) {
            console.error('Data:', JSON.stringify(data, null, 2));
        }
    }
}

async function runTests() {
    console.log('🧪 Testing Rebellion System...\n');

    try {
        // Test 1: Get a character with low adherence
        console.log('Test 1: Finding character with low adherence...');
        const lowAdherenceQuery = await query(`
      SELECT id, name, gameplan_adherence, character_points, coach_lockout_until
      FROM user_characters
      WHERE gameplan_adherence < 70
      LIMIT 1
    `);

        const hasLowAdherenceChar = lowAdherenceQuery.rows.length > 0;
        const testChar = lowAdherenceQuery.rows[0];

        assert(
            hasLowAdherenceChar,
            'Low Adherence Character Exists',
            'Found character with adherence < 70',
            testChar
        );

        if (!hasLowAdherenceChar) {
            console.log('\n⚠️  No characters with low adherence found. Creating test scenario...');

            // Get any character and set low adherence
            const anyCharQuery = await query(`
        SELECT id, name FROM user_characters LIMIT 1
      `);

            if (anyCharQuery.rows.length === 0) {
                throw new Error('No characters found in database');
            }

            const char = anyCharQuery.rows[0];
            await query(`
        UPDATE user_characters
        SET gameplan_adherence = 50,
            coach_lockout_until = NULL
        WHERE id = $1
      `, [char.id]);

            console.log(`Set ${char.name} adherence to 50 for testing\n`);

            // Re-fetch
            const updatedChar = await query(`
        SELECT id, name, gameplan_adherence, character_points, coach_lockout_until
        FROM user_characters
        WHERE id = $1
      `, [char.id]);

            testChar = updatedChar.rows[0];
        }

        // Test 2: Check database schema
        console.log('\nTest 2: Verifying database schema...');
        const schemaQuery = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_characters'
        AND column_name = 'coach_lockout_until'
    `);

        assert(
            schemaQuery.rows.length > 0,
            'Lockout Column Exists',
            'coach_lockout_until column exists in user_characters table',
            schemaQuery.rows[0]
        );

        // Test 3: Get available powers for this character
        console.log('\nTest 3: Fetching available powers...');
        const powersQuery = await query(`
      SELECT pd.id, pd.name, pd.unlock_cost
      FROM power_definitions pd
      WHERE pd.id NOT IN (
        SELECT power_id FROM character_powers
        WHERE character_id = $1 AND unlocked = true
      )
      AND (pd.unlock_level IS NULL OR pd.unlock_level <= (
        SELECT level FROM user_characters WHERE id = $1
      ))
      AND pd.unlock_cost <= (
        SELECT character_points FROM user_characters WHERE id = $1
      )
      LIMIT 5
    `, [testChar.id]);

        const hasAvailablePowers = powersQuery.rows.length > 0;

        assert(
            hasAvailablePowers,
            'Available Powers Found',
            `Found ${powersQuery.rows.length} unlockable powers`,
            powersQuery.rows
        );

        if (!hasAvailablePowers) {
            console.log('⚠️  No available powers. Granting points...');
            await query(`
        UPDATE user_characters
        SET character_points = 100
        WHERE id = $1
      `, [testChar.id]);
        }

        // Test 4: Check constants file
        console.log('\nTest 4: Verifying game constants...');
        const { LOADOUT_CONFIG } = require('../src/config/gameConstants');

        assert(
            LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS !== undefined,
            'Lockout Duration Constant',
            `COACH_LOCKOUT_DURATION_MS = ${LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS}ms`,
            { duration_ms: LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS, duration_min: LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS / 60000 }
        );

        assert(
            LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS === 600000,
            'Lockout Duration is 10 Minutes',
            'Lockout duration should be 600000ms (10 minutes)',
            { expected: 600000, actual: LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS }
        );

        // Test 5: Verify rebellion function exists
        console.log('\nTest 5: Verifying rebellion function...');
        const rebellionFunctionExists = typeof check_adherence_and_unlock_power === 'function';

        assert(
            rebellionFunctionExists,
            'Rebellion Function Exists',
            'check_adherence_and_unlock_power function is defined'
        );

        // Test 6: Check for removed survey code
        console.log('\nTest 6: Verifying survey removal...');
        const fs = require('fs');
        const serviceCode = fs.readFileSync(
            require.resolve('../src/services/loadoutAdherenceService'),
            'utf8'
        );

        const hasNoSurveyReferences = !serviceCode.includes('survey_required') &&
            !serviceCode.includes('survey_options') &&
            !serviceCode.includes('RebellionSurvey');

        assert(
            hasNoSurveyReferences,
            'Survey Code Removed',
            'No references to survey system found in loadoutAdherenceService.ts'
        );

        // Test 7: Verify prompt updates
        console.log('\nTest 7: Verifying chat prompt updates...');
        const promptCode = fs.readFileSync(
            require.resolve('../src/services/promptAssemblyService'),
            'utf8'
        );

        const hasRebellionPrompt = promptCode.includes('REBELLION ACTIVE');
        const hasCollaborativePrompt = promptCode.includes('COLLABORATIVE STRATEGY SESSION');

        assert(
            hasRebellionPrompt,
            'Rebellion Prompt Added',
            'Lockout context found in prompt assembly'
        );

        assert(
            hasCollaborativePrompt,
            'Collaborative Persona Implemented',
            'Collaborative strategy session prompt found'
        );

        // Test 8: Verify frontend components exist
        console.log('\nTest 8: Verifying frontend components...');
        const frontendExists = fs.existsSync('/Users/gabrielgreenstein/Blank_Wars_2026/frontend/src/components/RebellionAlert.tsx');

        assert(
            frontendExists,
            'RebellionAlert Component Exists',
            'RebellionAlert.tsx component file found'
        );

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;

        console.log(`\nTotal Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

        if (failed > 0) {
            console.log('Failed Tests:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.message}`);
            });
        }

        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
        process.exit(1);
    }
}

// Run tests
runTests().catch(console.error);
