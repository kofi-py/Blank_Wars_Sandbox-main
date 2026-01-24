/**
 * Test: Verify personality_traits parsing fix
 *
 * This tests that personality_traits can be parsed from TEXT JSON strings
 * for playable characters (not system characters)
 */

import { query } from './src/database/index';

async function testPersonalityTraitsParsing() {
  console.log('🧪 Testing personality_traits parsing fix\n');

  try {
    // Get a playable character with personality_traits (not system character)
    const result = await query(`
      SELECT c.id, c.name, c.archetype, c.personality_traits
      FROM characters c
      WHERE c.archetype != 'system'
        AND c.personality_traits IS NOT NULL
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No playable characters found with personality_traits');
      process.exit(1);
    }

    const character = result.rows[0];
    console.log(`Testing with: ${character.name} (${character.archetype})`);
    console.log(`Raw data from DB: ${character.personality_traits}`);
    console.log(`Type: ${typeof character.personality_traits}\n`);

    // This is what the powerRebellionService does
    const personalityTraits = JSON.parse(character.personality_traits);

    console.log(`✅ Successfully parsed to array: ${JSON.stringify(personalityTraits)}`);
    console.log(`Array length: ${personalityTraits.length}`);

    // Test the .join() that was failing before
    const joined = personalityTraits.join(', ');
    console.log(`✅ .join() works: "${joined}"\n`);

    console.log('✅ ALL TESTS PASSED - personality_traits parsing works correctly');
    process.exit(0);

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testPersonalityTraitsParsing();
