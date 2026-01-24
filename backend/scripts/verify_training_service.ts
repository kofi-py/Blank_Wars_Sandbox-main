import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';
import { TrainingService } from '../src/services/trainingService';
import { CharacterProgressionService } from '../src/services/characterProgressionService';
import { v4 as uuidv4 } from 'uuid';

async function verifyTrainingService() {
  console.log('🔍 Verifying Training Service...');

  const test_user_id = 'test_user_' + uuidv4();
  const test_char_id = uuidv4();

  try {
    // 1. Create Test Character
    console.log('Creating test character...');
    await query(`
      INSERT INTO users (id, username, email, password_hash)
      VALUES ($1, $2, $3, 'hash')
      ON CONFLICT (id) DO NOTHING
    `, [test_user_id, 'test_trainer_' + uuidv4(), 'trainer_' + uuidv4() + '@test.com']);

    // 1. Get Existing User Character
    const char_result = await query('SELECT id, character_id, user_id FROM user_characters LIMIT 1');
    if (char_result.rows.length === 0) {
      throw new Error('No user_characters found in database. Please seed data first.');
    }
    const test_char_id = char_result.rows[0].id;
    const real_character_id = char_result.rows[0].character_id;
    const real_user_id = char_result.rows[0].user_id;

    console.log(`Using existing user_character ID: ${test_char_id}`);

    // No need to insert characters or user_characters anymore


    // 2. Train Character
    console.log('🏋️ Training Character (Strength)...');
    const training_service = new TrainingService();
    const result = await training_service.completeTraining(
      'dummy_session_id', // session_id
      test_char_id,
      100, // xp_gain
      'strength', // stat_type
      5, // stat_bonus
      0 // training_points_gain
    );

    console.log('Training Result:', result);

    // 3. Verify XP Gain
    const char_check = await query('SELECT * FROM user_characters WHERE id = $1', [test_char_id]);
    const character = char_check.rows[0];

    console.log(`Character XP: ${character.experience}`);
    console.log(`Character Strength (Attack): ${character.current_attack}`);

    if (parseInt(character.experience) === 100) {
      console.log('✅ XP awarded correctly.');
    } else {
      console.error(`❌ XP mismatch! Expected 100, got ${character.experience}`);
    }

    if (character.current_attack === 15) { // 10 base + 5 bonus
      console.log('✅ Stats updated correctly.');
    } else {
      console.error(`❌ Stat mismatch! Expected 15, got ${character.current_attack}`);
    }

    // 4. Verify XP Log (Source = 'training')
    const log_check = await query(`
      SELECT * FROM character_experience_log 
      WHERE character_id = $1 AND source = 'training'
    `, [test_char_id]);

    if (log_check.rows.length > 0) {
      console.log('✅ XP Log entry found with source "training".');
    } else {
      console.error('❌ No XP Log entry found!');
    }

    console.log('\n✨ Verification Complete!');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
  } finally {
    // Cleanup - Disabled to protect existing data
    // await query('DELETE FROM user_characters WHERE id = $1', [test_char_id]);
    // await query('DELETE FROM users WHERE id = $1', [test_user_id]);
    // await query('DELETE FROM character_experience_log WHERE character_id = $1', [test_char_id]);
  }
}

verifyTrainingService();
