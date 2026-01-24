// Direct test to see therapy prompt output
const io = require('socket.io-client');

const socket = io('http://localhost:3007'); // Connect to frontend

socket.on('connect', () => {
  console.log('✅ Connected to frontend, requesting therapy conversation');
  
  // Request a therapy conversation
  socket.emit('therapy_chat_request', {
    conversationId: 'therapy_test_' + Date.now(),
    characterId: 'sherlock_holmes', 
    prompt: 'I need to talk about my struggles',
    sessionType: 'individual',
    therapistId: 'carl_jung',
    trigger: 'player_initiated',
    context: {
      teammates: [], // No hardcoded zombie characters - let system determine actual teammates
      coach: 'Coach Seraphina'
    }
  });
});

socket.on('therapy_conversation_response', (data) => {
  console.log('\n📝 THERAPY RESPONSE:');
  console.log('=================');
  console.log(data.response || data);
  console.log('=================\n');
  process.exit(0);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏰ Timeout - check backend logs for FULL PROMPT output');
  process.exit(1);
}, 15000);