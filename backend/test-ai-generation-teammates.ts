// Test actual AI generation with teammates vs roommates psychology
import { assembleEquipmentPromptInLocalAGI } from './src/services/localAGIService';

async function testAIGenerationWithTeammates() {
  console.log('🤖 TESTING ACTUAL AI GENERATION WITH TEAMMATES...\n');
  
  try {
    // Scenario: Dracula discussing equipment needs
    // Lives with Tesla & Frankenstein (roommates)
    // Fighting with Achilles & Joan of Arc (teammates)
    
    const roommates = ['tesla', 'frankenstein_monster'];
    const teammates = ['achilles', 'joan_of_arc']; 
    
    console.log('TESTING SCENARIO:');
    console.log(`- Dracula lives with: ${roommates.join(', ')}`);
    console.log(`- Dracula fights alongside: ${teammates.join(', ')}`);
    console.log('- Equipment consultation about team coordination\n');
    
    // Generate the prompt
    const prompt = await assembleEquipmentPromptInLocalAGI(
      'dracula',
      roommates,
      teammates,
      'Tesla kept me awake with his electrical experiments last night.',
      'Equipment advisor: "Your current team needs better coordination."',
      'How should I coordinate my combat style with Achilles and Joan of Arc?',
      'equipment_consultation',
      75, // wallet
      0,  // debt  
      'test-user',
      'team_mansion',
      'conflict', 
      'evening',
      'focused',
      90
    );
    
    console.log('=== GENERATED PROMPT ===');
    console.log(prompt);
    
    console.log('\n🔍 ANALYSIS:');
    console.log('✅ Check if prompt mentions roommate living situation (Tesla experiments)');
    console.log('✅ Check if prompt mentions teammate coordination needs (Achilles & Joan)');
    console.log('✅ Check if both psychological contexts are present');
    
    // Verify key elements
    const mentionsRoommateIssues = prompt.toLowerCase().includes('tesla') && prompt.toLowerCase().includes('frankenstein');
    const mentionsTeammates = prompt.toLowerCase().includes('achilles') && prompt.toLowerCase().includes('joan');
    const hasLivingContext = prompt.includes('CURRENT HOUSEMATES');
    const hasBattleContext = prompt.includes('CURRENT BATTLE TEAMMATES');
    
    console.log(`\n📊 VERIFICATION:`);
    console.log(`- Mentions roommates: ${mentionsRoommateIssues}`);
    console.log(`- Mentions teammates: ${mentionsTeammates}`);
    console.log(`- Has living context: ${hasLivingContext}`);
    console.log(`- Has battle context: ${hasBattleContext}`);
    
    if (mentionsRoommateIssues && mentionsTeammates && hasLivingContext && hasBattleContext) {
      console.log('\n🎉 SUCCESS: AI prompt includes both roommate and teammate psychology!');
    } else {
      console.log('\n❌ ISSUE: Missing some psychological contexts');
    }
    
  } catch (error) {
    console.error('❌ AI generation test failed:', error);
  }
  
  process.exit(0);
}

testAIGenerationWithTeammates().catch(console.error);