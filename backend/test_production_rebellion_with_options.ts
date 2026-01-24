/**
 * Test autonomous rebellion with multiple equipment options
 */
import { checkAdherenceAndEquip } from './src/services/autonomousDecisionService';
import { dbAdapter } from './src/services/databaseAdapter';
import { query } from './src/database/index';

async function testRebellionWithOptions() {
  console.log('🧪 Testing rebellion with multiple weapon options...\n');

  const testUserId = 'af261d85-ee55-4a70-bf4c-7c1c6f95f25d';
  const testCharacterId = 'robin_hood';
  let createdCharId: string | null = null;

  try {
    // 1. Create character
    console.log('Step 1: Creating character with low adherence...');
    const newChar = await dbAdapter.userCharacters.create({
      user_id: testUserId,
      character_id: testCharacterId,
      bond_level: 30,
      gameplan_adherence: 20 // Very low to ensure rebellion
    });

    if (!newChar) {
      throw new Error('Character creation failed');
    }
    createdCharId = newChar.id;
    console.log(`✓ Created: ${createdCharId}`);

    // 2. Add multiple weapon options
    console.log('\nStep 2: Adding multiple weapons to inventory...');
    const weaponsToAdd = ['iron_sword', 'rusty_sword_generic', 'steel_sword_generic'];

    for (const weaponId of weaponsToAdd) {
      await query(`
        INSERT INTO character_equipment (character_id, equipment_id, acquired_from)
        VALUES ($1, $2, 'test')
        ON CONFLICT (character_id, equipment_id) DO NOTHING
      `, [createdCharId, weaponId]);
    }

    const inventory = await dbAdapter.characterEquipment.findByCharacterId(createdCharId);
    const weapons = inventory.filter((eq: any) => eq.slot === 'weapon');

    console.log(`✓ Character now has ${weapons.length} weapons:`);
    weapons.forEach((w: any) => console.log(`  - ${w.name}`));

    // 3. Test rebellion with coach choosing first weapon
    const coachChoice = weapons[0].equipment_id;
    console.log(`\nStep 3: Coach chooses: ${weapons[0].name}`);
    console.log('  Character has alternatives and should rebel...\n');

    const result = await checkAdherenceAndEquip({
      user_id: testUserId,
      character_id: createdCharId,
      coach_equipment_choice: coachChoice
    });

    console.log('✅ Result:');
    console.log(`  Adhered: ${result.adhered}`);
    console.log(`  Final choice: ${result.finalChoice}`);
    console.log(`  Reason: ${result.reason}\n`);

    if (!result.adhered && result.finalChoice !== coachChoice) {
      console.log('🎉 SUCCESS! Character rebelled and chose different equipment!');

      // Find which weapon they chose
      const chosenWeapon = weapons.find((w: any) => w.equipment_id === result.finalChoice);
      if (chosenWeapon) {
        console.log(`   Character chose: ${chosenWeapon.name} instead of ${weapons[0].name}`);
      }
    } else if (result.adhered) {
      console.log('⚠️  Character followed coach despite low adherence (random chance)');
    } else {
      console.log('⚠️  Reluctant compliance occurred');
    }

    // 4. Clean up
    console.log('\nStep 4: Cleaning up...');
    await query('DELETE FROM character_equipment WHERE character_id = $1', [createdCharId]);
    await query('DELETE FROM character_items WHERE character_id = $1', [createdCharId]);
    await query('DELETE FROM user_characters WHERE id = $1', [createdCharId]);
    console.log('✓ Cleaned up\n');

    console.log('✅ TEST COMPLETE!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);

    if (createdCharId) {
      try {
        await query('DELETE FROM character_equipment WHERE character_id = $1', [createdCharId]);
        await query('DELETE FROM character_items WHERE character_id = $1', [createdCharId]);
        await query('DELETE FROM user_characters WHERE id = $1', [createdCharId]);
      } catch (e) { /* ignore */ }
    }

    process.exit(1);
  }
}

testRebellionWithOptions();
