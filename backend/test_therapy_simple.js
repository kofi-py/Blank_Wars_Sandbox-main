// Simple therapy role test without authentication  
const axios = require('axios');

async function testTherapyRoles() {
  console.log('🧪 Testing Therapy Role Detection (Simple)\n');
  
  // Test data: therapist vs patient with same prompt
  const testMessage = "I've been feeling overwhelmed lately";
  const sessionId = `test_${Date.now()}`;

  try {
    console.log('👨‍⚕️ Testing THERAPIST role (Carl Jung)...');
    const therapistPayload = {
      message: testMessage,
      chatId: `chat:therapy:carl_jung:${sessionId}`,
      chatType: 'therapy',
      domain: 'therapy',
      character: 'carl_jung',
      session_id: `therapy_carl_jung_${sessionId}`,
      meta: {
        role: 'therapist',
        characterDisplayName: 'Carl Jung',
        characterIdCanonical: 'carl_jung',
        domain: 'therapy'
      }
    };

    const therapistResult = await axios.post('http://localhost:4000/api/ai/chat', therapistPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('💬 Carl Jung (Therapist):');
    console.log(`   "${therapistResult.data.response || therapistResult.data.text}"`);
    console.log('');

    console.log('🧟‍♂️ Testing PATIENT role (Frankenstein)...');  
    const patientPayload = {
      message: testMessage,
      chatId: `chat:therapy:frankenstein:${sessionId}`,
      chatType: 'therapy',
      domain: 'therapy', 
      character: 'frankenstein_monster',
      session_id: `therapy_frankenstein_${sessionId}`,
      meta: {
        role: 'patient',
        usercharId: 'frankenstein_test',
        characterDisplayName: 'Frankenstein Monster',
        characterIdCanonical: 'frankenstein_monster',
        domain: 'therapy'
      }
    };

    const patientResult = await axios.post('http://localhost:4000/api/ai/chat', patientPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('💬 Frankenstein (Patient):');
    console.log(`   "${patientResult.data.response || patientResult.data.text}"`);
    console.log('');

    console.log('✅ Test completed!');
    console.log('');
    console.log('🔍 Check if:');
    console.log('- Therapist asks questions/offers guidance');
    console.log('- Patient shares feelings/experiences');
    console.log('- No quotation marks in responses');
    console.log('- Responses are 1-3 sentences');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTherapyRoles();