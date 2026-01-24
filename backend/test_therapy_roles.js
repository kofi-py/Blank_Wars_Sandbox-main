// Test therapy role detection and role-specific prompts
const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'http://localhost:4000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testTherapyRoleSystem() {
  console.log('🧪 Testing Therapy Role Detection & Split Prompting\n');
  console.log('=================================================\n');

  try {
    // Step 1: Register and authenticate
    console.log('📝 Registering test user...');
    await axiosInstance.post('/auth/register', {
      username: 'therapy_role_test_user',
      email: 'therapy_role_test@test.com',
      password: 'testpass123'
    });
    
    console.log('🔑 Logging in...');
    await axiosInstance.post('/auth/login', {
      username: 'therapy_role_test_user',
      password: 'testpass123'
    });
    
    console.log('✅ Authenticated successfully\n');

    // Step 2: Test therapist role (Carl Jung)
    console.log('👨‍⚕️ Testing THERAPIST role (Carl Jung)...');
    const therapistPayload = {
      message: "I'm here to help you work through your challenges today.",
      chatId: `chat:therapy:carl_jung_test:${Date.now()}`,
      chatType: 'therapy',
      domain: 'therapy',
      character: 'carl_jung',
      characterId: 'carl_jung',
      session_id: 'therapy_carl_jung_' + Date.now(),
      meta: {
        role: 'therapist', // Explicitly set therapist role
        characterDisplayName: 'Carl Jung',
        characterIdCanonical: 'carl_jung',
        domain: 'therapy'
      }
    };

    const therapistResponse = await axiosInstance.post('/api/ai/chat', therapistPayload);
    console.log('💬 Carl Jung (Therapist) Response:');
    console.log(`"${therapistResponse.data.response}"`);
    console.log('');

    // Step 3: Test patient role (Frankenstein)
    console.log('🧟‍♂️ Testing PATIENT role (Frankenstein)...');
    const patientPayload = {
      message: "I'm struggling with feelings of isolation and being misunderstood by society.",
      chatId: `chat:therapy:frankenstein_patient_test:${Date.now()}`,
      chatType: 'therapy', 
      domain: 'therapy',
      character: 'frankenstein_monster',
      characterId: 'frankenstein_monster',
      session_id: 'therapy_frankenstein_' + Date.now(),
      meta: {
        role: 'patient', // Explicitly set patient role
        usercharId: 'frankenstein_user_test',
        characterDisplayName: 'Frankenstein',
        characterIdCanonical: 'frankenstein_monster',
        domain: 'therapy'
      }
    };

    const patientResponse = await axiosInstance.post('/api/ai/chat', patientPayload);
    console.log('💬 Frankenstein (Patient) Response:');
    console.log(`"${patientResponse.data.response}"`);
    console.log('');

    // Step 4: Test inferred role (Seraphina should be detected as therapist)
    console.log('🔍 Testing INFERRED role detection (Seraphina)...');
    const inferredPayload = {
      message: "How are you feeling about your recent experiences?",
      chatId: `chat:therapy:seraphina_inferred_test:${Date.now()}`,
      chatType: 'therapy',
      domain: 'therapy', 
      character: 'seraphina',
      characterId: 'seraphina',
      session_id: 'therapy_seraphina_' + Date.now(),
      meta: {
        // No explicit role - should be inferred as therapist from registry
        characterDisplayName: 'Seraphina',
        characterIdCanonical: 'seraphina',
        domain: 'therapy'
      }
    };

    const inferredResponse = await axiosInstance.post('/api/ai/chat', inferredPayload);
    console.log('💬 Seraphina (Auto-detected Therapist) Response:');
    console.log(`"${inferredResponse.data.response}"`);
    console.log('');

    // Step 5: Test character that should be inferred as patient (Achilles)
    console.log('⚔️ Testing INFERRED patient (Achilles)...');
    const inferredPatientPayload = {
      message: "I've been struggling with the pressure of expectations and my destiny.",
      chatId: `chat:therapy:achilles_patient_inferred:${Date.now()}`,
      chatType: 'therapy',
      domain: 'therapy',
      character: 'achilles', 
      characterId: 'achilles',
      session_id: 'therapy_achilles_' + Date.now(),
      meta: {
        // No explicit role - should be inferred as patient
        usercharId: 'achilles_user_test',
        characterDisplayName: 'Achilles',
        characterIdCanonical: 'achilles',
        domain: 'therapy'
      }
    };

    const inferredPatientResponse = await axiosInstance.post('/api/ai/chat', inferredPatientPayload);
    console.log('💬 Achilles (Auto-detected Patient) Response:');
    console.log(`"${inferredPatientResponse.data.response}"`);
    console.log('');

    console.log('🎉 All role tests completed successfully!');
    console.log('');
    console.log('🔍 Analysis:');
    console.log('- Therapist responses should be empathic questions/guidance (1-3 sentences)');
    console.log('- Patient responses should be personal feelings/experiences (1-3 sentences)');
    console.log('- No quotation marks around dialogue');
    console.log('- No melodramatic or overly poetic language');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTherapyRoleSystem();