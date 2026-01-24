// Comprehensive test of all domain assemblers
import { query } from './src/database/postgres';

async function testAllAssemblers() {
  console.log('🧪 Testing All Domain Assemblers...\n');
  
  const testParams = {
    agent_key: 'dracula',
    roommates: ['frankenstein_monster', 'tesla', 'cleopatra'],
    memory: 'I trained with Tesla yesterday and learned about electricity',
    conversation_history: 'Coach: Ready for today?\nMe: I am always ready for battle!',
    user_message: 'What do you think about this strategy?',
    session_stage: 'active',
    wallet: 2500,
    debt: 500,
    user_id: 'test-user-123'
  };

  const assemblers = [
    'assembleEquipmentPromptInLocalAGI',
    'assembleSkillsPromptInLocalAGI',
    'assembleKitchenTablePromptInLocalAGI',
    'assembleConfessionalPromptInLocalAGI',
    'assembleRealEstatePromptInLocalAGI',
    'assembleTrainingPromptInLocalAGI',
    'assembleSocialLoungePromptInLocalAGI',
    'assembleMessageBoardPromptInLocalAGI',
    'assembleGroupActivitiesPromptInLocalAGI'
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const assemblerName of assemblers) {
    try {
      console.log(`Testing ${assemblerName}...`);
      const { [assemblerName]: assembler } = await import('./src/services/localAGIService');
      
      const prompt = await assembler(
        testParams.agentKey,
        testParams.roommates,
        testParams.memory,
        testParams.conversationHistory,
        testParams.userMessage,
        testParams.sessionStage,
        testParams.wallet,
        testParams.debt,
        testParams.userId
      );
      
      if (prompt && prompt.includes('Dracula') && prompt.includes('Matt Berry')) {
        console.log(`✅ ${assemblerName} - SUCCESS`);
        console.log(`   Preview: ${prompt.substring(0, 150)}...`);
        successCount++;
      } else {
        console.log(`❌ ${assemblerName} - Generated prompt but missing expected content`);
        failureCount++;
      }
    } catch (error) {
      console.log(`❌ ${assemblerName} - ERROR:`, error.message);
      failureCount++;
    }
    console.log(''); // Add spacing
  }

  // Test scene triggers functionality
  try {
    console.log('Testing scene triggers from database...');
    const chaosResult = await query(
      "SELECT trigger_text FROM scene_triggers WHERE scene_type = 'chaos' LIMIT 3", 
      []
    );
    
    if (chaosResult.rows.length > 0) {
      console.log('✅ Scene triggers working:');
      chaosResult.rows.forEach(row => {
        console.log(`   - ${row.trigger_text}`);
      });
    } else {
      console.log('❌ No scene triggers found');
      failureCount++;
    }
  } catch (error) {
    console.log('❌ Error testing scene triggers:', error.message);
    failureCount++;
  }

  console.log('\n🏁 COMPREHENSIVE TEST RESULTS:');
  console.log(`✅ Successful assemblers: ${successCount}`);
  console.log(`❌ Failed assemblers: ${failureCount}`);
  console.log(`📊 Success rate: ${Math.round((successCount / (successCount + failureCount)) * 100)}%`);
  
  if (failureCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The universal template system is working perfectly!');
  } else {
    console.log(`\n⚠️  ${failureCount} tests failed. System needs fixes.`);
  }

  process.exit(0);
}

// Run comprehensive test
testAllAssemblers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});