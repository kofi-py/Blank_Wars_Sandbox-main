import { query } from './src/database';

async function fixProductionVega() {
  console.log('🚀 Fixing Vega-X to Space Cyborg in production...');
  
  try {
    // Start transaction
    await query('BEGIN');
    
    console.log('\n📊 Current state:');
    const currentChar = await query(`
      SELECT id, name, title FROM characters WHERE id = 'space_cyborg'
    `);
    console.log('Current character:', currentChar.rows);
    
    // Check pack contents
    const packContents = await query(`
      SELECT character_id, COUNT(*) as count 
      FROM claimable_pack_contents 
      WHERE character_id = 'space_cyborg'
      GROUP BY character_id
    `);
    console.log('Pack contents:', packContents.rows);
    
    // Update the character name from "Vega-X" to "Space Cyborg"
    console.log('\n🔄 Updating character name...');
    const updateResult = await query(`
      UPDATE characters 
      SET name = 'Space Cyborg', title = 'Space Cyborg'
      WHERE id = 'space_cyborg' AND name = 'Vega-X'
    `);
    console.log(`Updated ${updateResult.rowCount} character records`);
    
    // Verify the update
    console.log('\n✅ Verification:');
    const updatedChar = await query(`
      SELECT id, name, title FROM characters WHERE id = 'space_cyborg'
    `);
    console.log('Updated character:', updatedChar.rows);
    
    // Commit transaction
    await query('COMMIT');
    console.log('\n🎉 Production fix completed successfully!');
    console.log('Card packs should now show "Space Cyborg" instead of "Vega-X"');
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('❌ Fix failed:', error);
    throw error;
  }
}

// Run the fix
fixProductionVega()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));