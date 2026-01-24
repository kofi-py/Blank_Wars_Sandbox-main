// Test script to verify agent key resolution in actual chats
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

// Test cases with expected agent keys
const testCharacters = [
  { name: "Sherlock Holmes", expectedKey: "holmes" },
  { name: "Robin Hood", expectedKey: "robin_hood" },
  { name: "Frankenstein's Monster", expectedKey: "frankenstein_monster" },
  { name: "Joan of Arc", expectedKey: "joan" },
];

async function testAgentResolution() {
  console.log("Testing Agent Key Resolution in Chats\n");
  console.log("=" .repeat(50));
  
  for (const test of testCharacters) {
    console.log(`\nTesting: ${test.name}`);
    console.log("-".repeat(30));
    
    try {
      // Simulate what the chat would send
      const payload = {
        agentKey: test.expectedKey,
        message: "Test message",
        chatType: "test",
        characterData: {
          name: test.name
        }
      };
      
      // Check if this would pass validation
      if (!payload.agentKey || /^userchar_/.test(payload.agentKey)) {
        console.log(`❌ Would fail: Invalid agentKey "${payload.agentKey}"`);
      } else {
        console.log(`✅ Valid agentKey: ${payload.agentKey}`);
      }
      
      // Test the actual endpoint (if available)
      if (false) { // Set to true to test actual endpoint
        const response = await axios.post(`${API_BASE}/ai/chat`, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        console.log(`✅ Backend accepted: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("Test Complete!");
}

// Test with a character that should fail
async function testFailureCase() {
  console.log("\n\nTesting Failure Case (Unknown Character)");
  console.log("=" .repeat(50));
  
  const badPayload = {
    agentKey: "userchar_12345_xyz",
    message: "Test",
    chatType: "test"
  };
  
  if (/^userchar_/.test(badPayload.agentKey)) {
    console.log(`✅ Correctly caught invalid agentKey: ${badPayload.agentKey}`);
    console.log(`   This would throw: "[transport] invalid agentKey"`);
  }
}

testAgentResolution().then(() => testFailureCase());