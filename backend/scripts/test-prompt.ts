/**
 * Test script to output full kitchen table prompt for a character
 * Run with: npx ts-node scripts/test-prompt.ts <userchar_id>
 */

import { assemblePrompt } from '../src/services/prompts';
import { Pool } from 'pg';

// Connect directly to production DB
const pool = new Pool({
  host: 'hopper.proxy.rlwy.net',
  port: 53805,
  user: 'postgres',
  password: 'zRCVwnCFrivnAjHDQzUXHOyplJSkwUwh',
  database: 'railway',
});

const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

async function main() {
  const userchar_id = process.argv[2];

  if (!userchar_id) {
    console.error('Usage: npx ts-node scripts/test-prompt.ts <userchar_id>');
    console.error('Example: npx ts-node scripts/test-prompt.ts d936fe08-fe3c-4b23-8255-5bbb375bb674');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('TESTING PROMPT FOR USERCHAR_ID:', userchar_id);
  console.log('='.repeat(80));

  try {
    // Get character info first
    const charResult = await query(
      `SELECT uc.id, uc.character_id, c.name, c.backstory
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [userchar_id]
    );

    if (!charResult.rows[0]) {
      console.error('Character not found for userchar_id:', userchar_id);
      process.exit(1);
    }

    const char = charResult.rows[0];
    console.log('\nCHARACTER INFO:');
    console.log('  Name:', char.name);
    console.log('  Character ID:', char.character_id);
    console.log('  Backstory:', char.backstory);
    console.log('');

    // Assemble the prompt
    const result = await assemblePrompt({
      userchar_id,
      domain: 'kitchenTable',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history: '',
      kitchen_options: {
        immediate_situation: 'You and your roommate are sitting at the kitchen table having a casual conversation.',
        memory: '',
        relationship_context: '',
        mood: '50',
        energy_level: 100,
      },
    });

    console.log('='.repeat(80));
    console.log('FULL PROMPT START');
    console.log('='.repeat(80));
    console.log(result.system_prompt);
    console.log('='.repeat(80));
    console.log('FULL PROMPT END');
    console.log('='.repeat(80));
    console.log('\nPrompt length:', result.system_prompt.length, 'characters');

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

main();
