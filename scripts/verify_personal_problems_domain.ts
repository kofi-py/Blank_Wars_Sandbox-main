
import { personalProblemsHandler } from '../backend/src/services/prompts/domains/personalProblems';
import { buildPersonalProblemsContext } from '../backend/src/services/prompts/domains/personalProblems/personalProblemsContext';
import { FullCharacterData } from '../backend/src/services/prompts/universalTemplate';

// Mock Character Data
const mockCharacter: FullCharacterData = {
    id: 'char_123',
    userchar_id: 'user_char_123',
    name: 'Achilles',
    title: 'The Hero',
    origin_era: 'Ancient Greece',
    species: 'Human',
    archetype: 'warrior',
    personality_traits: ['Proud', 'Brave', 'Impulsive'],
    conversation_style: 'Direct and bold',
    conversation_topics: ['War', 'Glory'],
    comedian_name: 'George Carlin',
    comedy_style: 'Cynical observationalism',
    backstory: 'A legendary warrior seeking glory.',

    // Combat Stats
    current_attack: 100,
    current_defense: 80,
    current_speed: 90,
    current_max_health: 100,
    current_special: 50,
    current_magic_attack: 20,
    current_magic_defense: 30,
    current_dexterity: 85,
    current_intelligence: 60,
    current_wisdom: 50,
    current_spirit: 70,
    current_initiative: 88,
    current_physical_resistance: 10,
    current_magical_resistance: 5,
    current_elemental_resistance: 5,

    // Current State
    level: 10,
    experience: 5000,
    bond_level: 5,
    total_battles: 12,
    total_wins: 10,
    total_losses: 2,
    win_percentage: 83,
    current_health: 100,
    current_energy: 100,
    max_energy: 100,
    current_mana: 50,
    max_mana: 50,
    energy_regen_rate: 5,
    mana_regen_rate: 2,
    wallet: 1000,
    debt: 0,

    // Psychology State
    current_mental_health: 80,
    current_stress: 20,
    current_morale: 90,
    current_fatigue: 10,
    current_confidence: 95,
    current_ego: 90,
    current_team_player: 50,
    coach_trust_level: 60,
    gameplan_adherence: 50,

    // Financial State
    monthly_earnings: 200,
    financial_stress: 10,

    // Living Situation
    sleeping_arrangement: 'bed',
    hq_tier: 'basic_house',
    roommates: [{
        id: 'rm_1',
        character_id: 'patroclus',
        name: 'Patroclus',
        sleeping_arrangement: 'bed'
    }],
    teammates: [{
        id: 'tm_1',
        character_id: 'odysseus',
        name: 'Odysseus',
        level: 10,
        current_health: 100,
        current_max_health: 100,
        archetype: 'trickster'
    }],

    // Scene Context
    scene_type: 'mundane',
    time_of_day: 'evening',

    // Abilities
    powers: [],
    spells: [],
    equipment: [],
    items: [],
    inventory: [],

    // Equipment Preferences
    equipment_prefs: {
        weapon_profs: ['Sword'],
        preferred_weapons: ['Sword'],
        armor_prof: 'Heavy',
        preferred_armor: 'Plate',
        notes: null
    },

    // Relationships
    relationships: [],

    // Memories
    recent_memories: [],

    // Decisions
    recent_decisions: [],

    // Team Context
    team_id: 'team_alpha',
    team_name: 'The Argonauts'
};

async function testPersonalProblemsHandler() {
    console.log('🧪 Testing Personal Problems Domain Handler...\n');

    // Test 1: Context Generation (Ported Logic)
    console.log('1. Testing Context Generation (Achilles)...');
    const context = buildPersonalProblemsContext(mockCharacter);
    console.log('   Generated Problem:', context);

    if (context.includes('Achilles') || context.includes('pride') || context.includes('warrior')) {
        console.log('   ✅ Character-specific logic working (Achilles/Warrior detected)');
    } else {
        console.log('   ⚠️  Generic problem generated (might be random, but check logic)');
    }

    // Test 2: Full Prompt Assembly
    console.log('\n2. Testing Full Prompt Assembly...');
    const prompt = await personalProblemsHandler.buildPrompt(mockCharacter, {
        personal_problem: {
            problem: 'test_problem',
            intro: 'Coach, I am testing the system.'
        }
    });

    console.log('   Domain:', prompt.domain);
    console.log('   Estimated Tokens:', prompt.estimated_tokens);

    if (prompt.system_prompt.includes('## IMMEDIATE SITUATION - PERSONAL PROBLEM') &&
        prompt.system_prompt.includes('Coach, I am testing the system.')) {
        console.log('   ✅ Prompt contains correct domain context');
    } else {
        console.error('   ❌ Prompt missing domain context');
    }

    if (prompt.system_prompt.includes('## LIVING SITUATION') &&
        prompt.system_prompt.includes('## FINANCIAL STATUS')) {
        console.log('   ✅ Prompt contains universal template sections');
    } else {
        console.error('   ❌ Prompt missing universal sections');
    }

    console.log('\n✅ Verification Complete.');
}

testPersonalProblemsHandler().catch(console.error);
