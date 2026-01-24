/**
 * Test autonomous rebellion system in production
 */
import { checkAdherenceAndEquip } from './src/services/autonomousDecisionService';
import { dbAdapter } from './src/services/databaseAdapter';
import { query } from './src/database/index';

async function testProductionRebellion() {
  console.log('🧪 Testing autonomous rebellion in PRODUCTION...\n');

  const testUserId = 'af261d85-ee55-4a70-bf4c-7c1c6f95f25d';
  const testCharacterId = 'robin_hood';
  let createdCharId: string | null = null;

  try {
    // 1. Create test character with LOW adherence
    console.log('Step 1: Creating test character with low adherence (30)...');
    const newChar = await dbAdapter.userCharacters.create({
      user_id: testUserId,
      character_id: testCharacterId,
      bond_level: 40,
      gameplan_adherence: 30 // Low adherence to trigger rebellion
    });

    if (!newChar) {
      throw new Error('Character creation failed');
    }
    createdCharId = newChar.id;

    console.log(`✓ Created: ${newChar.id}`);
    console.log(`  Adherence: ${(newChar as any).gameplan_adherence}/100`);
    console.log(`  Bond: ${(newChar as any).bond_level}/100`);

    // 2. Get character's equipment
    console.log('\nStep 2: Checking character inventory...');
    const inventory = await dbAdapter.characterEquipment.findByCharacterId(createdCharId);
    console.log(`✓ Character has ${inventory.length} equipment items:`);
    inventory.forEach((eq: any) => {
      console.log(`  - ${eq.name} (${eq.slot})`);
    });

    if (inventory.length < 2) {
      throw new Error('Character needs at least 2 equipment items to test rebellion');
    }

    // 3. Find a weapon to use as coach's choice
    const weapons = inventory.filter((eq: any) => eq.slot === 'weapon');
    if (weapons.length < 1) {
      throw new Error('Character needs at least 1 weapon');
    }

    const coachChoice = weapons[0].equipment_id;
    console.log(`\n✓ Coach will choose: ${weapons[0].name}`);

    // 4. Test adherence check (should fail and trigger rebellion)
    console.log('\nStep 3: Testing adherence check and rebellion...');
    console.log('  With adherence=30 and randomness, rebellion MAY occur...\n');

    const result = await checkAdherenceAndEquip({
      user_id: testUserId,
      character_id: createdCharId,
      coach_equipment_choice: coachChoice
    });

    console.log('✅ Adherence check completed!');
    console.log(`  Adhered: ${result.adhered}`);
    console.log(`  Final choice: ${result.finalChoice}`);
    console.log(`  Reason: ${result.reason}`);

    if (!result.adhered && result.finalChoice !== coachChoice) {
      console.log('\n🎉 REBELLION OCCURRED! Character chose different equipment.');
    } else if (result.adhered) {
      console.log('\n✓ Character followed coach (adherence check passed).');
    } else {
      console.log('\n✓ Character wanted to rebel but had no alternatives (reluctant compliance).');
    }

    // 5. Verify equipment was actually equipped
    console.log('\nStep 4: Verifying equipment was equipped...');
    const equippedResult = await query(`
      SELECT ce.equipment_id, e.name, ce.is_equipped
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = $1 AND ce.is_equipped = true
    `, [createdCharId]);

    if (equippedResult.rows.length > 0) {
      console.log(`✓ Equipped: ${equippedResult.rows[0].name}`);
      console.log(`  Equipment ID: ${equippedResult.rows[0].equipment_id}`);
      console.log(`  Matches final choice: ${equippedResult.rows[0].equipment_id === result.finalChoice ? '✅' : '❌'}`);
    } else {
      console.log('❌ No equipment is equipped!');
    }

    // 6. Clean up
    console.log('\nStep 5: Cleaning up test character...');
    await query('DELETE FROM character_equipment WHERE character_id = $1', [createdCharId]);
    await query('DELETE FROM character_items WHERE character_id = $1', [createdCharId]);
    await query('DELETE FROM user_characters WHERE id = $1', [createdCharId]);
    console.log('✓ Test character cleaned up');

    console.log('\n✅ REBELLION TEST PASSED!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ REBELLION TEST FAILED:');
    console.error(error);

    // Clean up on error
    if (createdCharId) {
      try {
        await query('DELETE FROM character_equipment WHERE character_id = $1', [createdCharId]);
        await query('DELETE FROM character_items WHERE character_id = $1', [createdCharId]);
        await query('DELETE FROM user_characters WHERE id = $1', [createdCharId]);
        console.log('✓ Cleaned up test character after error');
      } catch (cleanupError) {
        console.error('Failed to clean up:', cleanupError);
      }
    }

    process.exit(1);
  }
}

testProductionRebellion();
