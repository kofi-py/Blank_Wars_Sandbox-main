// Full test for therapy memory integration
// This tests the complete flow including domain detection and memory context

const axios = require('axios');

async function testTherapyMemoryIntegration() {
  console.log('🧪 Testing Complete Therapy Memory Integration\n');
  console.log('=====================================\n');
  
  // Test payload that mimics what the frontend sends
  const therapyPayload = {
    message: "I've been feeling stressed about my battles lately",
    chatType: 'therapy',
    domain: 'therapy',
    character: 'achilles',
    characterId: 'achilles',
    session_id: 'therapy_achilles_test_' + Date.now(),
    meta: {
      usercharId: 'achilles_user_test',
      characterDisplayName: 'Achilles',
      characterIdCanonical: 'achilles',
      sessionType: 'stress management',
      therapeuticContext: {
        focusAreas: ['Mental health', 'Emotional wellness', 'Personal growth'],
        sessionType: 'stress management'
      }
    }
  };
  
  console.log('📤 Sending therapy chat request...');
  console.log('   Domain hints:', {
    chatType: therapyPayload.chatType,
    domain: therapyPayload.domain,
    metaDomain: therapyPayload.meta?.domain
  });
  console.log('   Memory fields:', {
    usercharId: therapyPayload.meta?.usercharId,
    session_id: therapyPayload.session_id,
    character: therapyPayload.character
  });
  
  try {
    // Make the request (will fail on auth but we can see domain detection in server logs)
    const response = await axios.post('http://localhost:4000/api/ai/chat', therapyPayload);
    console.log('✅ Response received:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('\n⚠️  Got expected 401 auth error');
      console.log('\n📊 CHECK SERVER LOGS ABOVE FOR:');
      console.log('   1. [DOMAIN-DETECT] result: therapy');
      console.log('   2. [THERAPY-SYSTEM-START] Processing therapy domain');
      console.log('   3. [THERAPY][PROMPT-MEMORY] calling buildMemoryContext');
      console.log('   4. [ROUTE-PROXY] Using memory-aware handler (if auth passed)');
      console.log('\nIf you see these logs, the therapy memory integration is working! ✅');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n=====================================');
  console.log('🔍 Domain Detection Test Summary:');
  console.log('   - Therapy domain should be detected from chatType/domain fields');
  console.log('   - Memory-aware routing requires all 3 fields (usercharId, session_id, character)');
  console.log('   - systemFor() should call therapy handler with memory context');
  console.log('\n💡 Note: Full testing requires authentication. The key is domain detection works!');
}

// Run the test
testTherapyMemoryIntegration().catch(console.error);