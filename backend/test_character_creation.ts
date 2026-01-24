/**
 * Test character creation with starter inventory
 */

import { dbAdapter } from './src/services/databaseAdapter';
import { query } from './src/database/index';

async function testCharacterCreation() {
  console.log('🧪 Testing character creation with starter inventory...\n');

  const testUserId = '38f886d5-47af-48a3-a7a6-45bc7441a69d'; // Existing user
  const testCharacterId = 'cleopatra'; // Base character

  try {
    // 1. Create new character
    console.log('Step 1: Creating new character...');
    const newChar = await dbAdapter.userCharacters.create({
      character_id: testCharacterId,
      user_id: testUserId
    });

    if (!newChar) {
      throw new Error('Character creation returned null');
    }

    console.log(`✓ Created character: ${newChar.id}`);
    console.log(`  Name: Cleopatra VII`);
    console.log(`  Adherence: ${(newChar as any).gameplan_adherence}`);

    // 2. Check equipment inventory
    console.log('\nStep 2: Checking starter equipment...');
    const equipmentResult = await query(`
      SELECT ue.equipment_id, e.name, e.slot, e.equipment_type
      FROM user_equipment ue
      JOIN equipment e ON ue.equipment_id = e.id
      WHERE ue.equipped_to_character_id = $1
    `, [newChar.id]);

    console.log(`✓ Found ${equipmentResult.rows.length} equipment items:`);
    equipmentResult.rows.forEach((item: any) => {
      console.log(`  - ${item.name} (${item.equipment_type}, slot: ${item.slot})`);
    });

    if (equipmentResult.rows.length === 0) {
      console.log('⚠️  WARNING: No starter equipment found!');
      console.log('   This may indicate the starter equipment system is not configured.');
    } else {
      console.log('\n✅ Character creation with starter inventory PASSED!');
    }

    // 3. Cleanup - delete test character
    console.log('\nStep 3: Cleaning up test character...');
    await query('DELETE FROM user_equipment WHERE equipped_to_character_id = $1', [newChar.id]);
    await query('DELETE FROM user_characters WHERE id = $1', [newChar.id]);
    console.log('✓ Test character cleaned up');

    console.log('\n🎉 Test completed successfully');
    return newChar.id;

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCharacterCreation().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
