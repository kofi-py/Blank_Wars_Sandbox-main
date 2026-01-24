/**
 * Test script to assemble and print complete Employee Lounge prompts
 * Usage: npx ts-node scripts/test-employee-lounge-prompt.ts <character_id>
 * Example: npx ts-node scripts/test-employee-lounge-prompt.ts honey_badger
 */

import { Pool } from 'pg';
import * as employeeLoungeDomain from '../src/services/prompts/domains/employeeLounge';
import type { SystemCharacterData, EmployeeLoungeBuildOptions, EmployeeLoungeRole, ContestantSummary } from '../src/services/prompts/types';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh@hopper.proxy.rlwy.net:53805/railway',
});

// Mock data for testing
const MOCK_CONTESTANTS: ContestantSummary[] = [
  {
    userchar_id: 'uc_achilles_1',
    name: 'Achilles',
    species: 'demigod',
    archetype: 'warrior',
    level: 12,
    wins: 8,
    losses: 3,
    current_mental_health: 75,
    current_stress: 20,
    current_morale: 85,
    is_active: true,
    roommates: [],
  },
  {
    userchar_id: 'uc_cleopatra_1',
    name: 'Cleopatra VII',
    species: 'human',
    archetype: 'strategist',
    level: 10,
    wins: 5,
    losses: 4,
    current_mental_health: 60,
    current_stress: 45,
    current_morale: 55,
    is_active: true,
    roommates: [],
  },
  {
    userchar_id: 'uc_tesla_1',
    name: 'Nikola Tesla',
    species: 'human',
    archetype: 'inventor',
    level: 8,
    wins: 2,
    losses: 1,
    current_mental_health: 40,
    current_stress: 75,
    current_morale: 35,
    is_active: true,
    roommates: ['Achilles'],
  },
];

const MOCK_STAFF: Array<{ userchar_id: string; character_id: string; name: string; role: EmployeeLoungeRole; species: string; archetype: string }> = [
  { userchar_id: 'uc_hb_1', character_id: 'honey_badger', name: 'Honey Badger', role: 'mascot', species: 'honey_badger', archetype: 'system' },
  { userchar_id: 'uc_anubis_1', character_id: 'anubis', name: 'Anubis', role: 'judge', species: 'deity', archetype: 'system' },
  { userchar_id: 'uc_jung_1', character_id: 'carl_jung', name: 'Carl Jung', role: 'therapist', species: 'human', archetype: 'system' },
  { userchar_id: 'uc_argock_1', character_id: 'argock', name: 'Argock', role: 'trainer', species: 'human', archetype: 'system' },
  { userchar_id: 'uc_groucho_1', character_id: 'groucho_marx', name: 'Groucho Marx', role: 'host', species: 'human', archetype: 'system' },
  { userchar_id: 'uc_barry_1', character_id: 'barry_the_closer_thompson', name: 'Barry "The Closer" Thompson', role: 'real_estate_agent', species: 'human', archetype: 'system' },
];

async function fetchCharacterData(characterId: string): Promise<SystemCharacterData> {
  const result = await pool.query(`
    SELECT
      id,
      name,
      role,
      species,
      archetype,
      origin_era,
      backstory,
      personality_traits,
      comedy_style,
      conversation_style,
      conversation_topics,
      title
    FROM characters
    WHERE id = $1
  `, [characterId]);

  if (result.rows.length === 0) {
    throw new Error(`STRICT MODE: Character not found: ${characterId}`);
  }

  const row = result.rows[0];

  // Validate required fields - NO FALLBACKS
  const missing: string[] = [];
  if (!row.id) missing.push('id');
  if (!row.name) missing.push('name');
  if (!row.role) missing.push('role');
  if (!row.species) missing.push('species');
  if (!row.archetype) missing.push('archetype');
  if (!row.origin_era) missing.push('origin_era');
  if (!row.backstory) missing.push('backstory');
  if (!row.personality_traits || row.personality_traits.length === 0) missing.push('personality_traits');
  if (!row.comedy_style) missing.push('comedy_style');

  if (missing.length > 0) {
    console.error(`\n❌ MISSING REQUIRED FIELDS FOR ${characterId}:`);
    missing.forEach(field => console.error(`   - ${field}`));
    console.error('\n');
    throw new Error(`Character ${characterId} is missing required fields: ${missing.join(', ')}`);
  }

  // Build SystemCharacterData structure - NO FALLBACKS
  const data: SystemCharacterData = {
    IDENTITY: {
      id: row.id,
      userchar_id: `uc_${row.id}_test`,
      name: row.name,
      title: row.title,
      role: row.role,
      species: row.species,
      archetype: row.archetype,
      origin_era: row.origin_era,
      backstory: row.backstory,
      personality_traits: row.personality_traits,
      comedy_style: row.comedy_style,
      comedian_name: '',
      comedian_category: '',
      conversation_style: row.conversation_style,
      conversation_topics: row.conversation_topics,
      recent_memories: [],
      recent_decisions: [],
    },
  };

  return data;
}

async function assemblePrompt(characterId: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ASSEMBLING PROMPT FOR: ${characterId.toUpperCase()}`);
  console.log(`${'='.repeat(80)}\n`);

  // Fetch character data from database
  const data = await fetchCharacterData(characterId);
  const role = data.IDENTITY.role as EmployeeLoungeRole;

  console.log('--- RAW DATABASE DATA ---');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');

  // Find the staff member
  const staffMember = MOCK_STAFF.find(s => s.character_id === characterId);
  if (!staffMember) {
    // Add this character to mock staff
    MOCK_STAFF[0] = {
      userchar_id: `uc_${characterId}_1`,
      character_id: characterId,
      name: data.IDENTITY.name,
      role: role,
      species: data.IDENTITY.species,
      archetype: data.IDENTITY.archetype,
    };
  }

  // Build options
  const options: EmployeeLoungeBuildOptions = {
    coach_name: 'Gabriel',
    coach_message: 'How\'s everyone doing today? Any updates on the team?',
    memory_context: '',
    speaking_character_role: role,
    all_staff: MOCK_STAFF,
    contestants: MOCK_CONTESTANTS,
    recent_messages: [],
    team_context: {
      team_name: 'The Unstoppables',
      total_wins: 15,
      total_losses: 8,
      monthly_earnings: 12500,
      hq_tier: 'Silver',
    },
  };

  // Build prose components
  try {
    const prose = employeeLoungeDomain.buildAllProse(data, options);

    console.log('--- SCENE ---');
    console.log(prose.scene);
    console.log('\n');

    console.log('--- ROLE ---');
    console.log(prose.role);
    console.log('\n');

    console.log('--- PERSONA ---');
    console.log(prose.persona);
    console.log('\n');

    console.log('--- COMPLETE SYSTEM PROMPT ---');
    const systemPrompt = `${prose.scene}\n\n${prose.role}\n\n${prose.persona}`;
    console.log(systemPrompt);
    console.log('\n');

    console.log('--- TOKEN ESTIMATE ---');
    const tokenEstimate = Math.ceil(systemPrompt.length / 4);
    console.log(`Approximate tokens: ${tokenEstimate}`);
    console.log('\n');

  } catch (error: any) {
    console.error('--- ERROR DURING ASSEMBLY ---');
    console.error(error.message);
    console.error('\n');
  }
}

async function main(): Promise<void> {
  const characterId = process.argv[2];

  if (!characterId) {
    console.log('Usage: npx ts-node scripts/test-employee-lounge-prompt.ts <character_id>');
    console.log('');
    console.log('Available characters:');
    console.log('  Mascots: honey_badger, sphinx, orca, platypus, locusts, streptococcus_a, wraith, porcupine, phoenix, elephant, goldfish, emu, cupcake');
    console.log('  Judges: anubis, eleanor_roosevelt, king_solomon');
    console.log('  Therapists: carl_jung, seraphina, zxk14bw_7');
    console.log('  Trainers: argock, athena, popeye');
    console.log('  Hosts: groucho_marx, mad_hatter, betty_boop');
    console.log('  Real Estate: barry_the_closer_thompson, lmb_3000_lady_macbeth, zyxthala_the_reptilian');
    process.exit(1);
  }

  try {
    await assemblePrompt(characterId);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
