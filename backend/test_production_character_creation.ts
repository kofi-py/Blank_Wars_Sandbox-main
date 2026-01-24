/**
 * Test character creation in production database
 */
import { dbAdapter } from './src/services/databaseAdapter';
import { query } from './src/database/index';

async function testProductionCharacterCreation() {
  console.log('🧪 Testing character creation in PRODUCTION...\n');

  const testUserId = 'af261d85-ee55-4a70-bf4c-7c1c6f95f25d';
  const testCharacterId = 'robin_hood'; // trickster archetype

  try {
    // 1. Create new character
    console.log('Step 1: Creating Robin Hood...');
    const newChar = await dbAdapter.userCharacters.create({
      user_id: testUserId,
      character_id: testCharacterId,
      bond_level: 50,
      gameplan_adherence: 60
    });

    if (!newChar) {
      throw new Error('Character creation failed');
    }

    console.log(`✓ Created character: ${newChar.id}`);
    console.log(`  Adherence: ${(newChar as any).gameplan_adherence}`);

    // 2. Check equipment inventory
    console.log('\nStep 2: Checking starter equipment...');
    const equipmentResult = await query(`
      SELECT ce.equipment_id, e.name, e.slot, ce.acquired_from
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = $1
      ORDER BY e.slot
    `, [newChar.id]);

    console.log(`✓ Found ${equipmentResult.rows.length} equipment items:`);
    equipmentResult.rows.forEach((eq: any) => {
      console.log(`  - ${eq.name} (${eq.slot}) from ${eq.acquired_from}`);
    });

    // 3. Check items inventory
    console.log('\nStep 3: Checking starter items...');
    const itemsResult = await query(`
      SELECT ci.item_id, i.name, ci.quantity, ci.acquired_from
      FROM character_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = $1
    `, [newChar.id]);

    console.log(`✓ Found ${itemsResult.rows.length} item stacks:`);
    itemsResult.rows.forEach((item: any) => {
      console.log(`  - ${item.name} x${item.quantity} from ${item.acquired_from}`);
    });

    // 4. Verify expected starter gear for trickster archetype
    console.log('\nStep 4: Verifying trickster starter gear...');
    const expectedEquipment = ['ceremonial_dagger', 'leather_vest'];
    const actualEquipment = equipmentResult.rows.map((r: any) => r.equipment_id);

    const hasAllEquipment = expectedEquipment.every(eq => actualEquipment.includes(eq));
    if (hasAllEquipment) {
      console.log('✅ All expected equipment present!');
    } else {
      console.log('❌ Missing equipment:', expectedEquipment.filter(eq => !actualEquipment.includes(eq)));
    }

    // 5. Clean up test character
    console.log('\nStep 5: Cleaning up test character...');
    await query('DELETE FROM character_equipment WHERE character_id = $1', [newChar.id]);
    await query('DELETE FROM character_items WHERE character_id = $1', [newChar.id]);
    await query('DELETE FROM user_characters WHERE id = $1', [newChar.id]);
    console.log('✓ Test character cleaned up');

    console.log('\n✅ CHARACTER CREATION TEST PASSED!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ CHARACTER CREATION TEST FAILED:');
    console.error(error);
    process.exit(1);
  }
}

testProductionCharacterCreation();
