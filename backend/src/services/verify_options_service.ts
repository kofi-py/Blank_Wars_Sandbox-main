
import { generateActionOptions, BattleActionOption } from './battleActionOptionsService';
import { BattleContext } from './battleActionExecutor';
import { BattleCharacterData } from './battleCharacterLoader';
import { CharacterActionState, HexBattleGrid } from '@blankwars/hex-engine';

// Mock data
const mockCharacterId = 'char_123';
const mockCharacter: BattleCharacterData = {
    id: mockCharacterId,
    character_id: 'base_char_1',
    name: 'Test Warrior',
    level: 5,
    current_class_id: 'warrior',
    stats: {
        health: 100,
        max_health: 100,
        attack: 10,
        defense: 5,
        speed: 5,
        magic_attack: 0,
        magic_defense: 0,
        dexterity: 5,
        intelligence: 0,
        wisdom: 0,
        spirit: 0,
        initiative: 0
    },
    equipped_powers: [],
    equipped_spells: [],
    equipped_items: [],
    current_max_health: 100
} as any; // Cast to any to avoid filling all fields

const mockActionState: CharacterActionState = {
    character_id: mockCharacterId,
    action_points_remaining: 10, // Plenty of AP
    max_action_points: 10,
    actions_this_turn: [],
    can_move: true,
    can_attack: true,
    can_defend: true,
    can_use_item: true,
    can_use_power: true,
    can_use_spell: true,
    movement_remaining: 5
} as any;

const mockContext: BattleContext = {
    battle_id: 'battle_123',
    grid: {} as HexBattleGrid,
    characters: new Map([[mockCharacterId, mockCharacter]]),
    character_battle_state: new Map(),
    action_states: new Map([[mockCharacterId, mockActionState]]),
    cooldowns: new Map(),
    current_turn_character_id: mockCharacterId
};

async function verifyOptions() {
    console.error('🔍 Verifying Battle Action Options...');

    try {
        const options = await generateActionOptions(mockCharacterId, mockContext);

        console.error(`✅ Generated ${options.length} options`);

        // Check Heavy Attack
        const heavy = options.find(o => o.metadata?.attack_type_id === 'heavy');
        if (heavy) {
            console.error('✅ Found Heavy Attack');
            console.error(`   - Damage Multiplier: ${heavy.metadata.damage_multiplier} (Type: ${typeof heavy.metadata.damage_multiplier})`);
            console.error(`   - Accuracy Modifier: ${heavy.metadata.accuracy_modifier} (Type: ${typeof heavy.metadata.accuracy_modifier})`);

            if (Number(heavy.metadata.damage_multiplier) !== 2.5) console.error('❌ Heavy Damage Multiplier Mismatch!');
            if (Number(heavy.metadata.accuracy_modifier) !== 10) console.error('❌ Heavy Accuracy Modifier Mismatch!');
        } else {
            console.error('❌ Heavy Attack NOT found');
        }

        // Check Quick Attack (jab)
        const quick = options.find(o => o.metadata?.attack_type_id === 'jab');
        if (quick) {
            console.error('✅ Found Quick Attack (jab)');
            console.error(`   - Label: ${quick.label} (Expected: Quick Attack)`);
            console.error(`   - Damage Multiplier: ${quick.metadata.damage_multiplier} (Expected: 0.75)`);
            console.error(`   - Accuracy Modifier: ${quick.metadata.accuracy_modifier} (Expected: -10)`);

            if (quick.label !== 'Quick Attack') console.error('❌ Quick Attack Label Mismatch!');
            if (quick.metadata.damage_multiplier !== 0.75) console.error('❌ Quick Damage Multiplier Mismatch!');
            if (quick.metadata.accuracy_modifier !== -10) console.error('❌ Quick Accuracy Modifier Mismatch!');
        } else {
            console.error('❌ Quick Attack NOT found');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        console.error('🏁 Verification complete, exiting...');
        process.exit(0);
    }
}

verifyOptions();
