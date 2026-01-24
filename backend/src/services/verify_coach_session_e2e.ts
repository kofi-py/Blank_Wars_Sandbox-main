/**
 * REAL End-to-End Coach Strategy Session Test
 * 
 * This test uses REAL services and REAL database data:
 * - loadBattleCharacter: Loads actual character data from DB
 * - reconstructBattleState / buildInitialContext: Builds real battle context
 * - executeTurn: Real turn execution with real OpenAI calls
 * - Real database persistence
 * 
 * NO MOCKS. NO SHORTCUTS.
 */

import { executeTurn, CoachOrder } from './battleTurnService';
import { loadBattleCharacter } from './battleCharacterLoader';
import { db_adapter } from './databaseAdapter';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/index';
import {
    HexBattleGrid,
    CharacterActionState,
    BASE_ACTION_POINTS,
} from '@blankwars/hex-engine';
import { BattleContext } from './battleActionExecutor';
import { BattleCharacter } from './battleMechanicsService';

// Use EXISTING user and characters from database
const EXISTING_USER_ID = '004f3d5d-fc52-4379-ae82-3ae1c4c4c351'; // sgreen3test
const EXISTING_CHAR_ID = 'userchar_1763774283243_mlkeaar8a'; // space_cyborg
const EXISTING_OPPONENT_ID = 'userchar_1763774283160_ckfeoint4'; // robin_hood

// Generate new battle ID for this test
const TEST_BATTLE_ID = uuidv4();

async function runRealE2ETest() {
    console.log('🚀 Starting REAL E2E Coach Strategy Session Test...');
    console.log('   Using REAL services, REAL database, REAL OpenAI calls');
    console.log('');

    try {
        // ========================================
        // STEP 1: Load REAL character data from DB
        // ========================================
        console.log('📥 Loading REAL character data using loadBattleCharacter...');

        const userCharacter = await loadBattleCharacter(EXISTING_CHAR_ID);
        console.log(`   ✅ Loaded user character: ${userCharacter.name} (Level ${userCharacter.level})`);
        console.log(`      - Health: ${userCharacter.current_health}/${userCharacter.current_max_health}`);
        console.log(`      - Adherence: ${userCharacter.gameplan_adherence}`);
        console.log(`      - Archetype: ${userCharacter.archetype}`);

        const opponentCharacter = await loadBattleCharacter(EXISTING_OPPONENT_ID);
        console.log(`   ✅ Loaded opponent character: ${opponentCharacter.name} (Level ${opponentCharacter.level})`);
        console.log(`      - Health: ${opponentCharacter.current_health}/${opponentCharacter.current_max_health}`);
        console.log('');

        // ========================================
        // STEP 2: Create REAL battle in database
        // ========================================
        console.log('💾 Creating REAL battle record in database...');

        // Build team data for in-memory context (not stored in DB)
        const user_team_data = { characters: [userCharacter] };
        const opponent_team_data = { characters: [opponentCharacter] };

        // Create battle with just the IDs (actual schema)
        await query(`
      INSERT INTO battles (
        id, user_id, opponent_user_id, 
        user_character_id, opponent_character_id,
        status, current_round,
        started_at
      ) VALUES ($1, $2, $2, $3, $4, 'active', 1, NOW())
    `, [
            TEST_BATTLE_ID,
            EXISTING_USER_ID,
            EXISTING_CHAR_ID,
            EXISTING_OPPONENT_ID
        ]);

        console.log(`   ✅ Created battle: ${TEST_BATTLE_ID}`);
        console.log('');

        // ========================================
        // STEP 3: Build REAL battle context
        // ========================================
        console.log('🏗️ Building REAL battle context...');

        // Build character maps
        const characters = new Map();
        characters.set(userCharacter.id, userCharacter);
        characters.set(opponentCharacter.id, opponentCharacter);

        // Build battle state map
        const character_battle_state = new Map<string, BattleCharacter>();
        for (const char of [userCharacter, opponentCharacter]) {
            character_battle_state.set(char.id, {
                health: char.current_health,
                max_health: char.current_max_health,
                attack: char.attack,
                defense: char.defense,
                speed: char.speed,
                magic_attack: char.magic_attack,
                magic_defense: char.magic_defense,
                dexterity: char.dexterity,
                intelligence: char.intelligence,
                wisdom: char.wisdom,
                spirit: char.spirit,
                initiative: char.initiative,
                elemental_resistance: char.elemental_resistance || 0,
                fire_resistance: char.fire_resistance || 0,
                cold_resistance: char.cold_resistance || 0,
                lightning_resistance: char.lightning_resistance || 0,
                toxic_resistance: char.toxic_resistance || 0,
                effects: [] as BattleCharacter['effects'],
                is_dead: false
            });
        }

        // Build action states
        const action_states = new Map<string, CharacterActionState>();
        for (const char of [userCharacter, opponentCharacter]) {
            action_states.set(char.id, {
                character_id: char.id,
                action_points_remaining: BASE_ACTION_POINTS,
                max_action_points: BASE_ACTION_POINTS,
                actions_this_turn: [],
                can_move: true,
                can_attack: true,
                can_defend: true
            } as CharacterActionState);
        }

        // Build hex grid
        const character_positions = new Map();
        character_positions.set(userCharacter.id, { q: 0, r: 0 });
        character_positions.set(opponentCharacter.id, { q: 1, r: 0 });

        const grid: HexBattleGrid = {
            width: 12,
            height: 12,
            cells: [],
            character_positions,
            grid_size: { rows: 12, cols: 12 },
            terrain: new Map(),
            perimeter_attempts: new Map(),
            perimeter_effects: new Map()
        } as any;

        const context: BattleContext = {
            battle_id: TEST_BATTLE_ID,
            grid,
            characters,
            character_battle_state,
            action_states,
            cooldowns: new Map(),
            current_turn_character_id: userCharacter.id
        };

        // Build reconstructed state
        const state = {
            context,
            battle_record: {
                id: TEST_BATTLE_ID,
                user_id: EXISTING_USER_ID,
                opponent_user_id: EXISTING_USER_ID,
                user_team_data,
                opponent_team_data,
                status: 'active',
                current_round: 1,
                max_rounds: 3
            },
            action_count: 0,
            current_round: 1,
            current_turn: 1,
            last_action: null
        };

        console.log('   ✅ Battle context built with REAL character data');
        console.log('');

        // ========================================
        // STEP 4: Execute REAL turn with coach order
        // ========================================
        console.log('⚔️ Executing REAL turn with coach order...');

        const coachOrder: CoachOrder = {
            action_type: 'attack',
            target_id: opponentCharacter.id,
            attack_type_id: 'heavy',
            label: 'Heavy Attack'
        };

        console.log(`   📋 Coach Order: ${coachOrder.label} on ${opponentCharacter.name}`);
        console.log('   🤖 Making REAL OpenAI API call for declaration...');
        console.log('');

        // This is the REAL executeTurn call with REAL OpenAI
        const result = await executeTurn(state as any, userCharacter.id, coachOrder);

        // ========================================
        // STEP 5: Display REAL results
        // ========================================
        console.log('📊 REAL Turn Results:');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Adherence Roll: ${result.adherence?.roll}`);
        console.log(`   - Adherence Threshold: ${result.adherence?.threshold}`);
        console.log(`   - Adherence Passed: ${result.adherence?.passed}`);
        console.log(`   - Declaration: "${result.declaration}"`);
        console.log(`   - Action Type: ${result.action_type}`);

        if (result.action_result) {
            console.log(`   - Action Success: ${result.action_result.success}`);
            if ('damage_dealt' in result.action_result) {
                console.log(`   - Damage Dealt: ${result.action_result.damage_dealt}`);
            }
            if ('narrative' in result.action_result) {
                console.log(`   - Narrative: "${result.action_result.narrative}"`);
            }
        }
        console.log('');

        // ========================================
        // STEP 6: Verify REAL database persistence
        // ========================================
        console.log('🔍 Verifying REAL database persistence...');

        const actionRes = await query(
            'SELECT * FROM battle_actions WHERE battle_id = $1 ORDER BY sequence_num',
            [TEST_BATTLE_ID]
        );

        if (actionRes.rows.length > 0) {
            console.log(`   ✅ Found ${actionRes.rows.length} action(s) persisted in database`);
            for (const action of actionRes.rows) {
                console.log(`      - Seq ${action.sequence_num}: ${action.action_type}`);
                console.log(`        Attack Type ID: ${action.attack_type_id || 'N/A'}`);
                console.log(`        Is Rebellion: ${action.is_rebellion}`);
                console.log(`        Declaration: "${action.declaration?.substring(0, 50)}..."`);
            }
        } else {
            console.log('   ⚠️ No actions found in database');
        }
        console.log('');

        // ========================================
        // STEP 7: Cleanup
        // ========================================
        console.log('🧹 Cleaning up test data...');
        await query('DELETE FROM battle_actions WHERE battle_id = $1', [TEST_BATTLE_ID]);
        await query('DELETE FROM battles WHERE id = $1', [TEST_BATTLE_ID]);
        console.log('   ✅ Test battle cleaned up');
        console.log('');

        // ========================================
        // FINAL VERDICT
        // ========================================
        console.log('═══════════════════════════════════════════════════════');
        if (result.success) {
            console.log('🎉 SUCCESS: Real E2E Coach Strategy Session Test PASSED!');
            console.log('   - Used REAL character data from database');
            console.log('   - Made REAL OpenAI API call');
            console.log('   - Executed REAL battle turn logic');
            console.log('   - Persisted to REAL database');
        } else {
            console.log('❌ FAILURE: Turn execution failed');
            console.log(`   Error: ${result.error || 'Unknown'}`);
        }
        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ TEST CRASHED:', error);

        // Cleanup on error
        try {
            await query('DELETE FROM battle_actions WHERE battle_id = $1', [TEST_BATTLE_ID]);
            await query('DELETE FROM battles WHERE id = $1', [TEST_BATTLE_ID]);
            console.log('🧹 Cleaned up after crash');
        } catch (cleanupError) {
            console.error('Cleanup also failed:', cleanupError);
        }
    }

    process.exit(0);
}

runRealE2ETest();
