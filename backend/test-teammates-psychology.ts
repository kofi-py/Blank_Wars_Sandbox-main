// Test script to verify teammates vs roommates psychology works
import { assembleEquipmentPromptInLocalAGI } from './src/services/localAGIService';

async function testTeammatesPsychology() {
  console.log('🧠 TESTING TEAMMATES VS ROOMMATES PSYCHOLOGY...\n');
  
  try {
    // Test scenario: Dracula lives with Tesla and Frankenstein's Monster (roommates)
    // But is currently teamed up with Achilles and Joan of Arc (battle teammates)
    
    const roommates = ['tesla', 'frankenstein_monster'];
    const teammates = ['achilles', 'joan_of_arc'];
    
    console.log('SCENARIO:');
    console.log(`- Dracula LIVES WITH: ${roommates.join(', ')}`);  
    console.log(`- Dracula is currently FIGHTING ALONGSIDE: ${teammates.join(', ')}\n`);
    
    // Test the Equipment assembler which now distinguishes roommates from teammates
    const equipmentPrompt = await assembleEquipmentPromptInLocalAGI(
      'dracula',
      roommates,
      teammates, 
      'Had an awkward breakfast with my housemates this morning.',
      'Equipment advisor: "What weapon style suits your combat team?"',
      'I need advice on choosing weapons for coordinated battle tactics.',
      'equipment_consultation',
      50, // wallet
      0,  // debt
      'test-user-id',
      'basic_house',
      'conflict',
      'evening',
      'focused',
      85
    );
    
    console.log('=== EQUIPMENT PROMPT (check for both roommate AND teammate contexts) ===');
    
    // Extract the key sections to verify both contexts are present
    const hasRoommateContext = equipmentPrompt.includes('CURRENT HOUSEMATES:');
    const hasTeammateContext = equipmentPrompt.includes('CURRENT BATTLE TEAMMATES:');
    const mentionsRoommates = equipmentPrompt.includes('tesla, frankenstein_monster');
    const mentionsTeammates = equipmentPrompt.includes('achilles, joan_of_arc');
    
    console.log(`✅ Has roommate context: ${hasRoommateContext}`);
    console.log(`✅ Has teammate context: ${hasTeammateContext}`);
    console.log(`✅ Mentions roommates (tesla, frankenstein_monster): ${mentionsRoommates}`);
    console.log(`✅ Mentions teammates (achilles, joan_of_arc): ${mentionsTeammates}`);
    
    if (hasRoommateContext && hasTeammateContext && mentionsRoommates && mentionsTeammates) {
      console.log('\n🎉 SUCCESS: Both roommate and teammate psychology contexts are working!');
    } else {
      console.log('\n❌ ISSUE: Missing some context sections');
      console.log('\nFull prompt for debugging:');
      console.log(equipmentPrompt);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testTeammatesPsychology().catch(console.error);