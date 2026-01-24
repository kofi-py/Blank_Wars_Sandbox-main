
import { recordBondActivity } from '../src/services/bondTrackingService';
import { query } from '../src/database/postgres';

// Mock the database query function
jest.mock('../src/database/postgres', () => ({
    query: jest.fn()
}));

const mockQuery = query as jest.Mock;

async function runTests() {
    console.log('🧪 Starting Bond Tracking Service Tests...');

    // Setup mock responses
    // 1. Mock character lookup
    mockQuery.mockImplementation((sql, params) => {
        if (sql.includes('SELECT bond_level')) {
            return Promise.resolve({
                rows: [{
                    bond_level: 50,
                    personality_traits: ['Trusting', 'Strategic']
                }]
            });
        }
        if (sql.includes('UPDATE user_characters')) {
            return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes('INSERT INTO bond_activity_log')) {
            return Promise.resolve({
                rows: [{
                    id: 'test-log-id',
                    created_at: new Date()
                }]
            });
        }
        return Promise.resolve({ rows: [] });
    });

    try {
        // Test 1: Basic Bond Increase
        console.log('\nTest 1: Basic Bond Increase (Therapy Productive)');
        await recordBondActivity({
            user_character_id: 'test-char-1',
            activity_type: 'therapy_productive', // Base +3
            source: 'test'
        });

        // Verify update called with correct value
        // Base 3, 'Trusting' trait (+20%) -> 3.6 -> 4
        // Diminishing returns (50 bond) -> No reduction
        // Expected: 50 + 4 = 54
        const updateCall = mockQuery.mock.calls.find(call => call[0].includes('UPDATE user_characters'));
        console.log('Update called with:', updateCall ? updateCall[1] : 'NOT CALLED');

        if (updateCall && updateCall[1][0] === 54) {
            console.log('✅ Test 1 Passed');
        } else {
            console.error('❌ Test 1 Failed');
        }

        // Reset mocks
        mockQuery.mockClear();

        // Test 2: Diminishing Returns
        mockQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT bond_level')) {
                return Promise.resolve({
                    rows: [{
                        bond_level: 85, // High bond
                        personality_traits: []
                    }]
                });
            }
            return Promise.resolve({ rows: [{ id: 'log-id', created_at: new Date() }] });
        });

        console.log('\nTest 2: Diminishing Returns (High Bond)');
        await recordBondActivity({
            user_character_id: 'test-char-1',
            activity_type: 'therapy_breakthrough', // Base +5
            source: 'test'
        });

        // Base 5
        // > 80 bond -> 50% effectiveness -> 2.5 -> 3
        // Expected: 85 + 3 = 88
        const updateCall2 = mockQuery.mock.calls.find(call => call[0].includes('UPDATE user_characters'));
        console.log('Update called with:', updateCall2 ? updateCall2[1] : 'NOT CALLED');

        if (updateCall2 && updateCall2[1][0] === 88) {
            console.log('✅ Test 2 Passed');
        } else {
            console.error('❌ Test 2 Failed');
        }

    } catch (error) {
        console.error('❌ Test Suite Failed:', error);
    }
}

// We can't easily run jest mocks in a standalone script without jest environment.
// Let's write a simpler integration script that actually hits the DB if we want, 
// OR just rely on the code review since the logic is straightforward.
// Actually, let's try to run a real integration test if the DB is available.
