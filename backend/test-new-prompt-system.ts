/**
 * Test script to verify the new centralized prompt assembly system.
 * Tests with Frankenstein's Monster character.
 *
 * Run: npx ts-node test-new-prompt-system.ts
 */
import { assemblePrompt } from './src/services/prompts';
import { query } from './src/database/postgres';
import dotenv from 'dotenv';

dotenv.config();

async function testNewPromptSystem() {
  console.log('🧪 Testing New Prompt Assembly System...\n');

  // 1. First get a valid userchar_id for frankenstein_monster
  console.log('1. Finding Frankenstein\'s Monster user_character...');
  let usercharId: string;

  try {
    const result = await query(
      `SELECT uc.id, uc.character_id, c.name
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.character_id = 'frankenstein_monster'
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      usercharId = result.rows[0].id;
      console.log(`✅ Found user_character: ${usercharId}`);
    } else {
      // Try any character as fallback
      const fallback = await query(
        `SELECT uc.id, uc.character_id, c.name
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         LIMIT 1`
      );

      if (fallback.rows.length === 0) {
        throw new Error('No user_characters found in database');
      }

      usercharId = fallback.rows[0].id;
      console.log(`⚠️  Using fallback character: ${fallback.rows[0].name} (${usercharId})`);
    }
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }

  // 2. Test therapy domain with patient role
  console.log('\n2. Testing therapy domain (patient role)...');
  try {
    const result = await assemblePrompt({
      character_id: 'frankenstein_monster',
      userchar_id: usercharId,
      domain: 'therapy',
      role: 'patient',
      role_type: 'contestant',
      conversation_history: 'Therapist: How are you feeling today?\nMe: Confused. Angry.',
      options: {
        therapist_name: 'Dr. Sigmund Freud',
      },
    });

    console.log('✅ Therapy prompt assembled successfully!');
    console.log(`   Domain: ${result.domain}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Prompt length: ${result.system_prompt.length} chars`);
    console.log(`   Data packages: IDENTITY(${Object.keys(result.data.IDENTITY).length} fields), COMBAT(${Object.keys(result.data.COMBAT).length} fields), PSYCHOLOGICAL(${Object.keys(result.data.PSYCHOLOGICAL).length} fields)`);

    // Verify structure
    const prompt = result.system_prompt;
    const hasOpening = prompt.includes('Welcome to BlankWars');
    const hasIdentity = prompt.includes('CHARACTER IDENTITY:');
    const hasExistential = prompt.includes('EXISTENTIAL SITUATION:');
    const hasScene = prompt.includes('CURRENT SCENE:');
    const hasRole = prompt.includes('YOUR ROLE:');
    const hasData = prompt.includes('IDENTITY:') && prompt.includes('COMBAT:') && prompt.includes('PSYCHOLOGICAL:');
    const hasInterpretation = prompt.includes('HOW TO USE YOUR CHARACTER DATA');
    const hasHistory = prompt.includes('CONVERSATION HISTORY:');
    const hasFinal = prompt.includes('RESPONSE RULES:');

    console.log('\n   Structure verification:');
    console.log(`   - Opening: ${hasOpening ? '✅' : '❌'}`);
    console.log(`   - Character Identity: ${hasIdentity ? '✅' : '❌'}`);
    console.log(`   - Existential Situation: ${hasExistential ? '✅' : '❌'}`);
    console.log(`   - Scene Context: ${hasScene ? '✅' : '❌'}`);
    console.log(`   - Role Context: ${hasRole ? '✅' : '❌'}`);
    console.log(`   - Data Packages: ${hasData ? '✅' : '❌'}`);
    console.log(`   - Interpretation Guide: ${hasInterpretation ? '✅' : '❌'}`);
    console.log(`   - Conversation History: ${hasHistory ? '✅' : '❌'}`);
    console.log(`   - Final Instructions: ${hasFinal ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Therapy prompt failed:', error);
  }

  // 3. Test battle domain with combatant role
  console.log('\n3. Testing battle domain (combatant role)...');
  try {
    const result = await assemblePrompt({
      character_id: 'frankenstein_monster',
      userchar_id: usercharId,
      domain: 'battle',
      role: 'combatant',
      role_type: 'contestant',
      conversation_history: '',
    });

    console.log('✅ Battle prompt assembled successfully!');
    console.log(`   Domain: ${result.domain}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Prompt length: ${result.system_prompt.length} chars`);

  } catch (error) {
    console.error('❌ Battle prompt failed:', error);
  }

  // 4. Test realEstate domain with agent role (system character)
  console.log('\n4. Testing realEstate domain (agent role - system character)...');
  try {
    const result = await assemblePrompt({
      character_id: 'frankenstein_monster',
      userchar_id: usercharId,
      domain: 'realEstate',
      role: 'agent',
      role_type: 'system',
      conversation_history: 'Coach: I need to upgrade my team housing.',
    });

    console.log('✅ Real Estate prompt assembled successfully!');
    console.log(`   Domain: ${result.domain}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Has system context: ${result.system_prompt.includes('As a system character') ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Real Estate prompt failed:', error);
  }

  console.log('\n🏁 Test complete!');
  process.exit(0);
}

testNewPromptSystem().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
