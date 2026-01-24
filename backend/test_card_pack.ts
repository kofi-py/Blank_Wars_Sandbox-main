import { query } from './src/database';
import { PackService } from './src/services/packService';

async function testCardPack() {
  console.log('🎲 Testing card pack generation...');
  
  try {
    const packService = new PackService();
    
    // Generate a pack
    console.log('\n📦 Generating standard starter pack...');
    const packId = await packService.generatePack('standard_starter');
    console.log(`Generated pack ID: ${packId}`);
    
    // Check what's in the pack
    console.log('\n🔍 Checking pack contents...');
    const contents = await query(`
      SELECT character_id FROM claimable_pack_contents WHERE pack_id = $1
    `, [packId]);
    
    console.log('Pack contains character IDs:', contents.rows.map(r => r.character_id));
    
    // Get character names for those IDs
    console.log('\n👥 Looking up character names...');
    for (const row of contents.rows) {
      const char = await query(`
        SELECT id, name, title FROM characters WHERE id = $1
      `, [row.character_id]);
      
      if (char.rows.length > 0) {
        console.log(`  ${char.rows[0].id} → "${char.rows[0].name}"`);
      } else {
        console.log(`  ${row.character_id} → NOT FOUND`);
      }
    }
    
    // Test claiming the pack (simulate with a fake user)
    console.log('\n🎁 Testing pack claim simulation...');
    const fakeUserId = 'test-user-' + Date.now();
    
    try {
      const claimResult = await packService.claimPack(fakeUserId, packId);
      console.log('Claimed characters:', claimResult.grantedCharacters);
      console.log('Echoes gained:', claimResult.echoesGained);
      
      // Clean up the test user
      await query('DELETE FROM user_characters WHERE user_id = $1', [fakeUserId]);
      console.log('✅ Test cleanup completed');
      
    } catch (error) {
      console.log('⚠️  Claim simulation failed (expected - no real user):', error.message);
    }
    
    // Clean up the test pack
    await query('DELETE FROM claimable_pack_contents WHERE pack_id = $1', [packId]);
    await query('DELETE FROM claimable_packs WHERE id = $1', [packId]);
    console.log('🧹 Test pack cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCardPack()
  .then(() => {
    console.log('\n✅ Card pack test completed!');
    process.exit(0);
  })
  .catch(() => process.exit(1));