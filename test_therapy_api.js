// Direct API test for therapy chat
const axios = require('axios');

async function testTherapyAPI() {
  console.log('🧪 Testing Therapy API directly...\n');
  
  // First, need to get auth token - using the test token from previous sessions
  const testPayload = {
    message: "I'm struggling with my feelings about this competition",
    chatType: 'therapy',
    domain: 'therapy',
    character: 'holmes',
    agentKey: 'holmes',
    characterId: 'holmes',
    session_id: 'therapy_test_' + Date.now(),
    sessionId: 'therapy_test_' + Date.now(),
    meta: {
      usercharId: 'holmes_test_user',
      characterDisplayName: 'Sherlock Holmes',
      characterIdCanonical: 'holmes',
      role: 'patient',
      userMessage: "I'm struggling with my feelings",
      domain: 'therapy',
      domainSpecific: 'therapy'
    },
    messages: [
      {
        role: 'user',
        content: 'Hello, I need help with my emotional walls'
      }
    ],
    userId: 'test_user_123'
  };
  
  try {
    console.log('📤 Sending therapy request to backend...');
    console.log('   Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(
      'http://localhost:4000/api/ai/chat',
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          // Add a fake auth token to bypass auth (if in dev mode)
          'Cookie': 'accessToken=dev_test_token'
        }
      }
    );
    
    console.log('✅ Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Server responded with error:', error.response.status, error.response.data);
      console.log('\n🔍 CHECK BACKEND LOGS for FULL PROMPT output!');
    } else {
      console.error('❌ Request failed:', error.message);
    }
  }
  
  console.log('\n📊 Look in backend terminal for:');
  console.log('   🚨🚨🚨 FULL PROMPT FOR holmes START 🚨🚨🚨');
  console.log('   🔴🔴🔴 FINAL PROMPT FOR holmes 🔴🔴🔴');
}

testTherapyAPI();