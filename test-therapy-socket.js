// Test script to trigger therapy prompt generation via socket
const io = require('socket.io-client');

// Connect to the backend socket
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('✅ Connected to backend socket');
  
  // Simulate a therapy chat message that would trigger the large prompt
  const therapyMessage = {
    message: "What brings you to therapy today?",
    character: "userchar_1755186393464_1ue2kacyj", // Robin Hood character ID
    characterData: {
      name: 'Robin Hood',
      personality: {
        traits: ['Mischievous', 'Loyal', 'Conflicted'],
        speechStyle: 'Roguish but heartfelt',
        motivations: ['Justice', 'Freedom'],
        fears: ['Vulnerability', 'Judgment']
      },
      bondLevel: 1
    },
    promptOverride: "THERAPY_PROMPT_PLACEHOLDER", // This will be replaced by the frontend
    sessionType: 'therapy_patient',
    sessionId: 'therapy_individual_test_' + Date.now(),
    messageId: 'therapy_patient_test_' + Date.now(),
    therapistId: 'carl-jung',
    sessionStage: 'initial',
    previousMessages: []
  };
  
  console.log('📤 Sending therapy chat message...');
  socket.emit('chat_message', therapyMessage);
});

socket.on('chat_response', (response) => {
  console.log('✅ Received chat response:', {
    characterLength: response.message.length,
    bondIncrease: response.bondIncrease
  });
  console.log('📝 Message preview:', response.message.substring(0, 200) + '...');
  socket.disconnect();
});

socket.on('chat_error', (error) => {
  console.log('❌ Chat error:', error);
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
});

setTimeout(() => {
  console.log('⏰ Timeout - disconnecting');
  socket.disconnect();
}, 10000);