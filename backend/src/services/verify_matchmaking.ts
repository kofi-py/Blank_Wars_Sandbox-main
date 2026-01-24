/**
 * Verify Matchmaking System
 * 
 * Tests the matchmaking logic by simulating two users joining the queue.
 * 
 * Scenarios:
 * 1. User A joins queue (should be added to queue)
 * 2. User B joins queue (should match with User A)
 * 3. Battle should be created
 */

import 'dotenv/config';
import { BattleManager } from './battleService';
import { query, cache } from '../database';
import { Server as SocketIOServer } from 'socket.io';

// Mock Socket.IO Server
const mockIo = {
    on: () => { },
    emit: () => { },
    to: () => ({ emit: () => { } }),
    use: () => { },
} as unknown as SocketIOServer;

async function runMatchmakingTest() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 MATCHMAKING SYSTEM TEST');
    console.log('   Testing queueing and matching logic');
    console.log('═══════════════════════════════════════════════════════\n');

    // Ensure SERVER_ID is set
    process.env.SERVER_ID = 'test-server-1';

    // Instantiate BattleManager
    const battleManager = new BattleManager(mockIo);

    // Test Users (from previous tests)
    const user_a_id = '004f3d5d-fc52-4379-ae82-3ae1c4c4c351';
    const user_b_id = '0b0442d6-6aae-40f8-83f3-1703921b37e7';

    // Clean up any existing queue/battles for these users
    console.log('🧹 Cleaning up previous state...');
    await query('DELETE FROM battles WHERE user_id IN ($1, $2) OR opponent_user_id IN ($1, $2)', [user_a_id, user_b_id]);

    try {
        // =============================================
        // TEST 1: User A Joins Queue
        // =============================================
        console.log(`\n📋 TEST 1: User A (${user_a_id}) joins queue...`);

        const char_a_result = await query(`
      SELECT character_slot_1 FROM teams WHERE user_id = $1 AND is_active = true
    `, [user_a_id]);
        const char_a_id = char_a_result.rows[0]?.character_slot_1?.trim();

        if (!char_a_id) throw new Error('User A has no active team');

        console.log('   🧪 DEBUG: Calling cache.addUserToMatchmaking directly...');
        await cache.addUserToMatchmaking('debug-user', { test: true }, 'pvp');
        console.log('   🧪 DEBUG: Call complete.');

        const result_a = await battleManager.find_match(user_a_id, char_a_id, 'pvp');

        console.log('   Result A:', result_a);

        // Debug: Check cache
        const queue_after_a = await cache.getMatchmakingQueue('pvp');
        console.log(`   Cache Queue Size: ${queue_after_a.length}`);
        console.log('   Cache Queue Users:', queue_after_a.map(u => u.id));

        if (result_a && result_a.status === 'waiting') {
            console.log('   ✅ User A added to queue (status: waiting)');
        } else if (result_a && result_a.status === 'found') {
            console.log('   ⚠️ User A found immediate match (unexpected but possible if queue wasn\'t empty)');
        } else {
            console.log('   ❌ User A failed to join queue');
        }

        // =============================================
        // TEST 2: User B Joins Queue (Should Match)
        // =============================================
        console.log(`\n📋 TEST 2: User B (${user_b_id}) joins queue...`);

        const char_b_result = await query(`
      SELECT character_slot_1 FROM teams WHERE user_id = $1 AND is_active = true
    `, [user_b_id]);
        const char_b_id = char_b_result.rows[0]?.character_slot_1?.trim();

        if (!char_b_id) throw new Error('User B has no active team');

        const result_b = await battleManager.find_match(user_b_id, char_b_id, 'pvp');

        console.log('   Result B:', result_b);

        if (result_b && result_b.status === 'found') {
            console.log(`   ✅ Match found! Battle ID: ${result_b.battle_id}`);
            console.log(`   Opponent: ${result_b.opponent.username}`);

            // Verify battle in database
            const battle_check = await query('SELECT * FROM battles WHERE id = $1', [result_b.battle_id]);
            if (battle_check.rows.length > 0) {
                console.log('   ✅ Battle persisted in database');
                console.log(`      User: ${battle_check.rows[0].user_id}`);
                console.log(`      Opponent: ${battle_check.rows[0].opponent_user_id}`);
                console.log(`      Status: ${battle_check.rows[0].status}`);
            } else {
                console.log('   ❌ Battle NOT found in database');
            }

        } else {
            console.log('   ❌ Match NOT found (status: ' + (result_b?.status || 'unknown') + ')');
        }

    } catch (error: any) {
        console.error('   ❌ Error:', error.message);
        if (error.stack) console.error(error.stack);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    process.exit(0);
}

runMatchmakingTest().catch(console.error);
