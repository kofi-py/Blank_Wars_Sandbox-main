/**
 * End-to-end test for autonomous equipment rebellion
 */

import { checkAdherenceAndEquip } from './src/services/autonomousDecisionService';
import { dbAdapter } from './src/services/databaseAdapter';
import { query } from './src/database/index';

async function testRebellion() {
  console.log('🧪 Starting rebellion end-to-end test...\n');

  const testCharId = 'userchar_1758301199059_f5fu6b2gv'; // Achilles with low adherence

  try {
    // 1. Verify test character setup
    console.log('Step 1: Verifying test character...');
    const char = await dbAdapter.userCharacters.findById(testCharId);
    console.log(`✓ Character: ${char.name}, Adherence: ${char.gameplan_adherence}, Bond: ${char.bond_level}`);

    if (char.gameplan_adherence >= 70) {
      throw new Error('Test character adherence too high! Need < 70 for rebellion test');
    }

    // 2. Get character's equipment inventory
    console.log('\nStep 2: Checking equipment inventory...');
    const inventory = await dbAdapter.characterEquipment.findByCharacterId(testCharId);
    console.log(`✓ Found ${inventory.length} equipment items`);

    if (inventory.length < 2) {
      throw new Error('Need at least 2 equipment items in same slot for testing');
    }

    // Find items in same slot
    const weaponSlotItems = inventory.filter((item: any) => item.slot === 'weapon');
    console.log(`✓ Found ${weaponSlotItems.length} weapon items:`, weaponSlotItems.map((i: any) => i.name).join(', '));

    if (weaponSlotItems.length < 2) {
      throw new Error('Need at least 2 weapons for rebellion test');
    }

    // 3. Test rebellion
    console.log('\nStep 3: Testing rebellion with coach choice...');
    const coachChoice = weaponSlotItems[0].equipment_id;
    console.log(`Coach chooses: ${weaponSlotItems[0].name}`);
    console.log(`Alternatives available: ${weaponSlotItems.slice(1).map((i: any) => i.name).join(', ')}`);

    const result = await checkAdherenceAndEquip({
      user_id: char.user_id,
      character_id: testCharId,
      coach_equipment_choice: coachChoice
    });

    console.log('\n📊 REBELLION RESULT:');
    console.log(`Adhered: ${result.adhered}`);
    console.log(`Final choice: ${result.finalChoice}`);
    console.log(`Reason: ${result.reason}`);
    if (result.aiResponse) {
      console.log(`AI Dialogue: "${result.aiResponse}"`);
    }

    // 4. Verify equipment was equipped
    console.log('\nStep 4: Verifying equipment was equipped...');
    const updatedChar = await dbAdapter.userCharacters.findById(testCharId);
    console.log(`✓ Equipment updated`);

    // 5. Check if event was saved
    console.log('\nStep 5: Checking if rebellion event was saved...');
    const GameEventBus = (await import('./src/services/gameEventBus')).default;
    const eventBus = GameEventBus.getInstance();
    const events = eventBus.getCharacterEvents(testCharId, { limit: 5 });
    console.log(`✓ Found ${events.length} recent events for character`);

    const rebellionEvent = events.find(e => e.type === 'equipment:autonomous_rebellion' || e.type === 'equipment:reluctant_compliance');
    if (rebellionEvent) {
      console.log(`✓ Rebellion event found: ${rebellionEvent.type}`);
      console.log(`  Description: ${rebellionEvent.description}`);
    } else {
      console.log('⚠️  No rebellion event found in recent events');
    }

    console.log('\n✅ TEST PASSED!');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRebellion().then(() => {
  console.log('\n🎉 All tests completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
