
import { BattleManager } from '../src/services/battleService';
import { db_adapter } from '../src/services/databaseAdapter';
import { query } from '../src/database';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

async function auditBattleSystem() {
    console.log('🛡️ Starting Comprehensive Battle System Audit...');
    const auditResults: Record<string, boolean> = {};
    let testTeamId: string | null = null;
    let testCharIds: string[] = [];

    try {
        // -------------------------------------------------------------------------
        // 1. Setup Test Data (Robust Method)
        // -------------------------------------------------------------------------
        console.log('\n📝 Step 1: Setting up Test Data...');

        // Get User
        const userResult = await query('SELECT id FROM users LIMIT 1');
        const user_id = userResult.rows[0]?.id;
        if (!user_id) throw new Error('No user found');

        // Get Character Definitions
        const charDefResult = await query('SELECT id FROM characters LIMIT 3');
        if (charDefResult.rows.length < 3) throw new Error('Not enough character definitions');

        // Create 3 Test Characters (using verified INSERT statement)
        for (let i = 0; i < 3; i++) {
            const charDefId = charDefResult.rows[i].id;
            const newId = uuidv4();
            testCharIds.push(newId);

            // Clean up any existing collision
            await query('DELETE FROM user_characters WHERE user_id = $1 AND character_id = $2', [user_id, charDefId]);

            await query(`
            INSERT INTO user_characters (
                id, user_id, character_id, 
                current_health, current_max_health,
                level, experience, character_points, is_injured,
                acquired_at
            )
            VALUES ($1, $2, $3, 100, 100, 1, 0, 0, false, NOW())
            ON CONFLICT DO NOTHING
        `, [newId, user_id, charDefId]);
        }
        console.log(`✅ Created ${testCharIds.length} test characters.`);

        // Deactivate any existing active teams for this user
        await query('UPDATE teams SET is_active = false WHERE user_id = $1', [user_id]);

        // Create Test Team
        testTeamId = uuidv4();
        console.log('Creating test team:', testTeamId);
        await query(`
      INSERT INTO teams (id, user_id, team_name, character_slot_1, character_slot_2, character_slot_3, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [testTeamId, user_id, 'Audit Team', testCharIds[0], testCharIds[1], testCharIds[2], true]);
        console.log(`✅ Created test team: ${testTeamId}`);
        auditResults['Setup'] = true;

        // -------------------------------------------------------------------------
        // 2. Initialize Battle Service
        // -------------------------------------------------------------------------
        console.log('\n⚔️ Step 2: Initializing Battle Service...');
        const io = new Server();
        const battleManager = new BattleManager(io);

        // Mock Queue Entry
        const teamCharacters = [];
        for (const id of testCharIds) {
            const char = await db_adapter.user_characters.find_by_id(id);
            if (char) {
                (char as any).base_action_points = 3; // Mock AP
                (char as any).equipped_powers = [];
                (char as any).equipped_spells = [];
                teamCharacters.push(char);
            }
        }

        const userEntry = {
            user_id: user_id,
            team_characters: teamCharacters,
            mode: 'pve',
            rating: 1000,
            timestamp: Date.now(),
            user_team_id: testTeamId
        };

        const aiOpponentId = uuidv4();
        // Create AI Coach
        await query(`
            INSERT INTO ai_coaches (id, name, difficulty_tier, personality_profile)
            VALUES ($1, 'AI_Opponent', 'easy', 'aggressive')
            ON CONFLICT (id) DO NOTHING
        `, [aiOpponentId]);

        const aiUserCheck = await query('SELECT id FROM ai_coaches WHERE id = $1', [aiOpponentId]);
        if (aiUserCheck.rows.length === 0) {
            throw new Error('Failed to insert AI coach');
        }
        console.log('✅ AI Coach created:', aiOpponentId);

        const opponentEntry: any = {
            user_id: aiOpponentId,
            team_characters: [
                { id: 'ai_char_1', name: 'AI Grunt 1', current_health: 100, max_health: 100, attack: 10, defense: 5, speed: 10, base_action_points: 3, user_id: aiOpponentId, equipped_powers: [], equipped_spells: [] },
                { id: 'ai_char_2', name: 'AI Grunt 2', current_health: 100, max_health: 100, attack: 10, defense: 5, speed: 10, base_action_points: 3, user_id: aiOpponentId, equipped_powers: [], equipped_spells: [] },
                { id: 'ai_char_3', name: 'AI Grunt 3', current_health: 100, max_health: 100, attack: 10, defense: 5, speed: 10, base_action_points: 3, user_id: aiOpponentId, equipped_powers: [], equipped_spells: [] }
            ],
            mode: 'pve',
            rating: 1000,
            timestamp: Date.now()
        };

        // -------------------------------------------------------------------------
        // 3. Create Battle & Verify Persistence
        // -------------------------------------------------------------------------
        console.log('\n🔥 Step 3: Creating Battle...');
        const battleState = await (battleManager as any).create_battle(userEntry, opponentEntry);

        if (!battleState) throw new Error('Battle creation failed');
        console.log(`✅ Battle created: ${battleState.id}`);

        // Check battle_participants
        const participants = await query('SELECT * FROM battle_participants WHERE battle_id = $1', [battleState.id]);
        console.log(`📊 Participants in DB: ${participants.rows.length}`);

        if (participants.rows.length === 6) { // 3 user + 3 opponent
            console.log('✅ Persistence Verification: PASSED (6 participants found)');
            auditResults['Persistence_Creation'] = true;
        } else {
            console.error(`❌ Persistence Verification: FAILED (Expected 6, found ${participants.rows.length})`);
            auditResults['Persistence_Creation'] = false;
        }

        // Check Initial AP
        const initialAP = participants.rows[0].current_ap;
        console.log(`Initial AP in DB: ${initialAP}`);
        if (initialAP !== null && initialAP !== undefined) {
            auditResults['AP_Initialization'] = true;
        }

        // -------------------------------------------------------------------------
        // 4. Simulate Turn & Verify Update
        // -------------------------------------------------------------------------
        console.log('\n🔄 Step 4: Simulating Turn...');
        // We can't easily simulate a full socket turn without a real client, 
        // but we can manually invoke the update persistence method if we modify state.

        // Let's modify the in-memory state manually to simulate a turn
        const firstCharId = testCharIds[0];
        const actionState = battleState.hex_grid_state.action_states.get(firstCharId);

        if (actionState) {
            console.log(`Original AP: ${actionState.action_points}`);
            actionState.action_points -= 1; // Simulate using 1 AP
            console.log(`New AP: ${actionState.action_points}`);

            // Manually trigger persistence update (private method)
            await (battleManager as any).update_battle_participants_persistence(battleState);

            // Verify DB update
            const updatedParticipant = await query('SELECT current_ap FROM battle_participants WHERE battle_id = $1 AND character_id = $2', [battleState.id, firstCharId]);
            const dbAP = updatedParticipant.rows[0]?.current_ap;
            console.log(`DB AP after update: ${dbAP}`);

            if (dbAP === actionState.action_points) {
                console.log('✅ AP Update Verification: PASSED');
                auditResults['AP_Update'] = true;
            } else {
                console.error(`❌ AP Update Verification: FAILED (Expected ${actionState.action_points}, got ${dbAP})`);
                auditResults['AP_Update'] = false;
            }
        } else {
            console.warn('⚠️ Could not find action state for test character');
        }

        // -------------------------------------------------------------------------
        // 5. Cleanup
        // -------------------------------------------------------------------------
        console.log('\n🧹 Step 5: Cleanup...');
        await query('DELETE FROM battle_participants WHERE battle_id = $1', [battleState.id]);
        await query('DELETE FROM battles WHERE id = $1', [battleState.id]);
        await query('DELETE FROM teams WHERE id = $1', [testTeamId]);
        for (const id of testCharIds) {
            await query('DELETE FROM user_characters WHERE id = $1', [id]);
        }
        console.log('✅ Cleanup complete.');

    } catch (error) {
        console.error('❌ Audit Failed:', error);
        auditResults['Overall_Success'] = false;
    } finally {
        console.log('\n📊 Final Audit Results:', auditResults);
        process.exit(0);
    }
}

auditBattleSystem();
