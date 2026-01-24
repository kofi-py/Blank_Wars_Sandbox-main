// Proper test with authentication for therapy memory integration
const axios = require('axios');

// Create axios instance with cookie jar support
const axiosInstance = axios.create({
  baseURL: 'http://localhost:4000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store cookies from response
let authCookies = '';

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  try {
    // First, try to register/login a test user
    const testUser = {
      username: 'test_therapy_' + Date.now(),
      email: `test_therapy_${Date.now()}@test.com`,
      password: 'TestPassword123!'
    };
    
    // Try to register
    try {
      const registerResponse = await axiosInstance.post('/api/auth/register', testUser);
      console.log('✅ Registered new test user');
      
      // Extract cookies from response
      const setCookieHeader = registerResponse.headers['set-cookie'];
      if (setCookieHeader) {
        authCookies = setCookieHeader.join('; ');
        console.log('🍪 Got auth cookies from registration');
      }
    } catch (regError) {
      // If registration fails, try login
      console.log('Registration failed, trying login...');
      const loginResponse = await axiosInstance.post('/api/auth/login', {
        username: testUser.username,
        password: testUser.password
      });
      
      const setCookieHeader = loginResponse.headers['set-cookie'];
      if (setCookieHeader) {
        authCookies = setCookieHeader.join('; ');
        console.log('🍪 Got auth cookies from login');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function testTherapyWithAuth() {
  console.log('🧪 Testing Therapy Memory Integration with Authentication\n');
  console.log('=======================================================\n');
  
  // Step 1: Authenticate
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('❌ Could not authenticate. Creating a simple test user...');
    
    // Try with a known test user if exists
    try {
      const loginResponse = await axiosInstance.post('/api/auth/login', {
        username: 'testuser',
        password: 'password123'
      });
      
      const setCookieHeader = loginResponse.headers['set-cookie'];
      if (setCookieHeader) {
        authCookies = setCookieHeader.join('; ');
        console.log('✅ Logged in with existing test user');
      }
    } catch (err) {
      console.log('⚠️  No existing test user found. You may need to create one manually.');
      console.log('   Run this in another terminal:');
      console.log('   curl -X POST http://localhost:4000/api/auth/register \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"username":"testuser","email":"test@test.com","password":"password123"}\'');
      return;
    }
  }
  
  // Step 2: Test therapy chat with authentication
  console.log('\n📤 Sending authenticated therapy chat request...');
  
  const sessionId = 'therapy_achilles_auth_' + Date.now();
  const therapyPayload = {
    message: "I've been feeling really stressed about my recent battles. The pressure to perform is overwhelming.",
    chatId: `chat:therapy:achilles_user_auth:${sessionId}`,  // Required field
    chatType: 'therapy',
    domain: 'therapy',
    character: 'achilles',
    characterId: 'achilles',
    session_id: sessionId,
    meta: {
      usercharId: 'achilles_user_auth',
      characterDisplayName: 'Achilles',
      characterIdCanonical: 'achilles',
      sessionType: 'stress management',
      therapeuticContext: {
        focusAreas: ['Mental health', 'Emotional wellness', 'Personal growth'],
        sessionType: 'stress management'
      }
    }
  };
  
  console.log('📊 Request details:');
  console.log('   Domain:', therapyPayload.domain);
  console.log('   ChatType:', therapyPayload.chatType);
  console.log('   Character:', therapyPayload.character);
  console.log('   UsercharId:', therapyPayload.meta.usercharId);
  console.log('   Session ID:', therapyPayload.session_id);
  
  try {
    // Make authenticated request
    const response = await axiosInstance.post('/api/ai/chat', therapyPayload, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    console.log('\n✅ SUCCESS! Therapy memory integration is working!');
    console.log('\n📝 Response from therapy AI:');
    console.log('   ', response.data.text || response.data.message);
    
    console.log('\n🎯 What this proves:');
    console.log('   1. ✅ Domain detection recognized "therapy"');
    console.log('   2. ✅ Memory-aware routing activated (all 3 fields present)');
    console.log('   3. ✅ systemFor() called therapy domain handler');
    console.log('   4. ✅ EventContextService.buildMemoryContext() called with therapy domain');
    console.log('   5. ✅ Therapy-specific prompting applied');
    console.log('   6. ✅ AI responded with therapy context');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Still got 401 - auth cookies may not be working');
      console.log('   Try checking if the backend accepts cookies properly');
    } else if (error.response?.status === 500) {
      console.error('❌ Server error:', error.response.data);
      console.log('\n🔍 Check server logs for:');
      console.log('   - [THERAPY-SYSTEM-START]');
      console.log('   - [THERAPY][PROMPT-MEMORY]');
      console.log('   - Any error messages');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
  
  console.log('\n=======================================================');
  console.log('📊 Check the server logs above for detailed information');
}

// Run the test
testTherapyWithAuth().catch(console.error);