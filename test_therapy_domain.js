// Simple test for therapy domain detection and systemFor function
const axios = require('axios');

async function testTherapyDomainDetection() {
  console.log('🧪 Testing Therapy Domain Detection...\n');
  
  // Test 1: Check if server responds
  try {
    const healthCheck = await axios.get('http://localhost:4000/api/ai/test');
    console.log('✅ Server health check:', healthCheck.data.message);
  } catch (error) {
    console.error('❌ Server not responding:', error.message);
    return;
  }
  
  // Test 2: Test domain detection with debug logs
  console.log('\n📊 Testing therapy domain detection...');
  
  const testPayloads = [
    {
      name: 'Explicit therapy domain',
      payload: { domain: 'therapy', chatType: 'therapy' }
    },
    {
      name: 'ChatType therapy hint',
      payload: { chatType: 'therapy' }
    },
    {
      name: 'Meta domain hint',
      payload: { meta: { domain: 'therapy' } }
    },
    {
      name: 'Generic (should fallback)',
      payload: { chatType: 'random' }
    }
  ];
  
  for (const test of testPayloads) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   Payload: ${JSON.stringify(test.payload)}`);
    
    // Since the API requires auth, we'll use a different approach
    // We can see the domain detection in the server logs when we make the request
    try {
      const response = await axios.post('http://localhost:4000/api/ai/chat', {
        message: 'Test therapy session',
        session_id: 'test_therapy_123',
        character: 'achilles',
        meta: {
          usercharId: 'test_user_123',
          ...test.payload.meta
        },
        ...test.payload
      });
      console.log('   Response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   Expected auth error - check server logs for domain detection');
      } else {
        console.log('   Error:', error.response?.data || error.message);
      }
    }
  }
  
  console.log('\n🔍 Check the server logs above to see domain detection results');
  console.log('Look for lines with: [DOMAIN-DETECT] and [THERAPY-SYSTEM-START]');
}

// Run the test
testTherapyDomainDetection().catch(console.error);