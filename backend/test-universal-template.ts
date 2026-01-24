// Test script to verify the universal template system works
import { query } from './src/database/postgres';

// Test the buildUniversalTemplate function
async function testUniversalTemplate() {
  console.log('🧪 Testing Universal Template System...\n');
  
  // Test character data fetch
  try {
    console.log('1. Testing character data fetch...');
    const result = await query(
      'SELECT comedian_name, comedy_style, name, origin_era FROM characters WHERE id = $1', 
      ['frankenstein_monster']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Character data found:', result.rows[0]);
    } else {
      console.log('❌ No character data found for frankenstein_monster');
    }
  } catch (error) {
    console.log('❌ Error fetching character data:', error);
  }

  // Test team context table exists
  try {
    console.log('\n2. Testing team_context table...');
    const result = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_context'", 
      []
    );
    
    if (result.rows.length > 0) {
      console.log('✅ team_context table exists with columns:', result.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('❌ team_context table does not exist');
    }
  } catch (error) {
    console.log('❌ Error checking team_context table:', error);
  }

  // Test character_living_context table exists
  try {
    console.log('\n3. Testing character_living_context table...');
    const result = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'character_living_context'", 
      []
    );
    
    if (result.rows.length > 0) {
      console.log('✅ character_living_context table exists with columns:', result.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('❌ character_living_context table does not exist');
    }
  } catch (error) {
    console.log('❌ Error checking character_living_context table:', error);
  }

  // Test scene_triggers table and data
  try {
    console.log('\n4. Testing scene_triggers table and data...');
    const result = await query(
      "SELECT COUNT(*) as count FROM scene_triggers WHERE scene_type = 'mundane'", 
      []
    );
    
    if (result.rows[0].count > 0) {
      console.log(`✅ scene_triggers table has ${result.rows[0].count} mundane triggers`);
    } else {
      console.log('❌ No scene triggers found');
    }
  } catch (error) {
    console.log('❌ Error checking scene_triggers:', error);
  }

  // Test a simple domain assembler call
  try {
    console.log('\n5. Testing Equipment assembler...');
    const { assembleEquipmentPromptInLocalAGI } = await import('./src/services/localAGIService');
    
    const prompt = await assembleEquipmentPromptInLocalAGI(
      'frankenstein_monster',
      ['dracula', 'cleopatra', 'tesla'],
      'I remember training yesterday',
      'Coach: How are you feeling?\nMe: Ready to fight!',
      'What weapon would you like to use?',
      'active',
      1000,
      0,
      'test-user-123'
    );
    
    if (prompt && prompt.includes('Frankenstein')) {
      console.log('✅ Equipment assembler generated prompt successfully');
      console.log('   Preview:', prompt.substring(0, 200) + '...');
    } else {
      console.log('❌ Equipment assembler failed to generate proper prompt');
    }
  } catch (error) {
    console.log('❌ Error testing Equipment assembler:', error);
  }

  console.log('\n🏁 Test complete!');
  process.exit(0);
}

// Run the test
testUniversalTemplate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});