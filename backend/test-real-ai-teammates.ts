// Test actual AI response with teammates vs roommates
import { getTransport } from './src/services/chatTransport';
import { assembleEquipmentPromptInLocalAGI } from './src/services/localAGIService';

// Set the correct LocalAGI URL
process.env.LOCALAGI_URL = 'http://localhost:4000';

async function testRealAIResponse() {
  console.log('🤖 TESTING REAL AI RESPONSE WITH TEAMMATES...\n');
  
  const transport = getTransport();
  
  // Generate prompt with teammates vs roommates
  const prompt = await assembleEquipmentPromptInLocalAGI(
    'dracula',
    ['tesla', 'frankenstein_monster'], // roommates
    ['achilles', 'joan_of_arc'], // teammates
    'Tesla kept me awake with his electrical experiments last night.',
    'Equipment advisor: "Your team needs better coordination."',
    'How should I coordinate my combat style with Achilles and Joan of Arc?',
    'equipment_consultation',
    75, 0, 'test-user', 'team_mansion', 'conflict', 'evening', 'focused', 90
  );
  
  try {
    const response = await transport.sendMessage({
      agent_key: 'dracula',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'How should I coordinate my combat style with Achilles and Joan of Arc?' }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    
    console.log('=== AI RESPONSE ===');
    console.log(response.text);
    
    // Check if response differentiates contexts
    const mentionsRoommates = response.text.toLowerCase().includes('tesla') || response.text.toLowerCase().includes('frankenstein');
    const mentionsTeammates = response.text.toLowerCase().includes('achilles') || response.text.toLowerCase().includes('joan');
    
    console.log('\n📊 ANALYSIS:');
    console.log(`- References roommates: ${mentionsRoommates}`);
    console.log(`- References teammates: ${mentionsTeammates}`);
    
    if (mentionsTeammates) {
      console.log('✅ SUCCESS: AI response shows teammate awareness');
    }
    
  } catch (error) {
    console.error('❌ AI call failed:', error);
  }
  
  process.exit(0);
}

testRealAIResponse().catch(console.error);