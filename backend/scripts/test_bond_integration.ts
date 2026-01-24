
// Manual mock setup
const mockQuery = {
    calls: [] as any[],
    implementation: null as any
};

// Mock the database module
const mockDb = {
    query: async (sql: string, params: any[]) => {
        mockQuery.calls.push([sql, params]);
        if (mockQuery.implementation) {
            return mockQuery.implementation(sql, params);
        }
        return { rows: [] };
    }
};

// We need to use a bit of a hack to mock the module import since we're not using Jest
// In a real node script, we can't easily intercept imports without a loader.
// So instead, we'll just import the functions and test the logic if we can extract it,
// OR we'll test the private functions if we export them for testing.
//
// BETTER APPROACH: Let's just test the logic functions (applyPersonalityModifier, applyDiminishingReturns)
// by temporarily exporting them or copying them here for verification, 
// OR we can create a real integration test that connects to the DB.
//
// Let's try the Real Integration Test approach since we have a running DB.
// It's more reliable anyway.

import { recordBondActivity } from '../src/services/bondTrackingService';
import { query } from '../src/database/postgres';

async function runIntegrationTest() {
    console.log('🧪 Starting Bond Tracking Integration Test (Real DB)...');

    try {
        // 1. Find a test character
        const charResult = await query('SELECT id, bond_level FROM user_characters LIMIT 1', []);
        if (charResult.rows.length === 0) {
            console.log('⚠️ No characters found to test with.');
            return;
        }

        const testChar = charResult.rows[0];
        const startBond = testChar.bond_level || 0;
        console.log(`Found test character: ${testChar.id} (Bond: ${startBond})`);

        // 2. Record a bond activity
        console.log('Recording "therapy_productive" (+3 base)...');
        const log = await recordBondActivity({
            user_character_id: testChar.id,
            activity_type: 'therapy_productive',
            source: 'test_script'
        });

        console.log('✅ Activity Recorded:', log);
        console.log(`Bond Change: ${log.bond_level_before} -> ${log.bond_level_after} (Delta: ${log.bond_change})`);

        // 3. Verify DB update
        const verifyResult = await query('SELECT bond_level FROM user_characters WHERE id = $1', [testChar.id]);
        const endBond = verifyResult.rows[0].bond_level;

        if (endBond === log.bond_level_after) {
            console.log('✅ Database updated successfully');
        } else {
            console.error(`❌ Database mismatch! Expected ${log.bond_level_after}, got ${endBond}`);
        }

        // 4. Cleanup (Optional - revert bond)
        // await query('UPDATE user_characters SET bond_level = $1 WHERE id = $2', [startBond, testChar.id]);
        // console.log('Reverted bond level.');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }

    try {
        // 5. Test Level Up Logic (Performance Coaching)
        const charResult = await query('SELECT id FROM user_characters LIMIT 1', []);
        if (charResult.rows.length > 0) {
            const testChar = charResult.rows[0];
            console.log('\nTesting Level Up Bond Logic...');

            const log = await recordBondActivity({
                user_character_id: testChar.id,
                activity_type: 'performance_coaching',
                context: {
                    event_id: 'test_event_123',
                    level: 5,
                    description: 'Character reached a new level'
                },
                source: 'progression_system'
            });

            console.log('✅ Level Up Activity Recorded:', log);
            console.log(`Bond Change: ${log.bond_level_before} -> ${log.bond_level_after} (+${log.bond_change})`);
        }
    } catch (error) {
        console.error('❌ Level Up Test Failed:', error);
    }

    // process.exit(0);
}

runIntegrationTest().then(() => {
    console.log('Test completed.');
    // Force exit if needed after a timeout
    // setTimeout(() => process.exit(0), 1000);
});
