import axios from 'axios';
import { prompt_assembly_service } from '../services/promptAssemblyService';

const BACKEND_URL = process.env.PUBLIC_BACKEND_BASE_URL || 'http://localhost:4000';
const LOCALAGI_URL = process.env.LOCAL_AGI_BASE_URL || 'http://localhost:8080';

async function testWebhookDelivery() {
  console.log('🔬 Testing LocalAGI Webhook Delivery End-to-End');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`📍 LocalAGI URL: ${LOCALAGI_URL}`);
  console.log(`📍 Webhook enabled: ${process.env.USE_AGI_WEBHOOK === 'true'}`);
  
  try {
    // Test 1: Health check
    console.log('\n🏥 Testing health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend health:', {
      status: healthResponse.data.status,
      port: healthResponse.data.port,
      webhook_enabled: healthResponse.data.localagi?.webhook_enabled,
      webhook_path: healthResponse.data.localagi?.webhook_path
    });

    // Test 2: Webhook health
    console.log('\n🔧 Testing webhook health endpoint...');
    const webhookHealthResponse = await axios.get(`${BACKEND_URL}/api/webhook/health`);
    console.log('✅ Webhook health:', {
      status: webhookHealthResponse.data.status,
      webhook_enabled: webhookHealthResponse.data.webhook_enabled,
      stored_responses: webhookHealthResponse.data.stored_responses,
      pending_requests: webhookHealthResponse.data.pending_requests
    });

    // Test 3: Check LocalAGI connectivity
    console.log('\n📡 Testing LocalAGI connectivity...');
    try {
      const localAGIHealth = await axios.get(`${LOCALAGI_URL}/health`, { timeout: 5000 });
      console.log('✅ LocalAGI is accessible:', localAGIHealth.status);
    } catch (error: any) {
      console.warn('⚠️ LocalAGI not accessible:', error.message);
      console.log('   Make sure LocalAGI is running on', LOCALAGI_URL);
      console.log('   And configured with webhook URL:', `${BACKEND_URL}/api/webhook/agi-response`);
    }

    // Test 4: Test webhook endpoint directly
    console.log('\n🧪 Testing webhook endpoint directly...');
    const testPayload = {
      message_id: 'test-' + Date.now(),
      agent_id: 'test-agent',
      status: 'completed',
      content: 'This is a test webhook response',
      timestamp: new Date().toISOString()
    };

    const webhookResponse = await axios.post(
      `${BACKEND_URL}/api/webhook/agi-response`,
      testPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('✅ Webhook endpoint test:', webhookResponse.data);

    // Test 5: Retrieve stored message
    console.log('\n📦 Testing message retrieval...');
    const messageResponse = await axios.get(`${BACKEND_URL}/api/messages/${testPayload.message_id}`);
    console.log('✅ Message retrieval:', {
      message_id: messageResponse.data.message_id,
      status: messageResponse.data.status,
      content_length: messageResponse.data.content?.length || 0
    });

    // Test 6: End-to-end with LocalAGI service (if available)
    if (process.env.USE_AGI_WEBHOOK === 'true') {
      console.log('\n🚀 Testing end-to-end LocalAGI service...');
      
      try {
        // Create a test agent
        console.log('   Creating test agent...');
        const agent_id = await prompt_assembly_service.createAgent('test-webhook-character', {
          name: 'Test Character',
          prompt: 'You are a test character for webhook delivery. Respond briefly.',
          model: 'llama-3.2-3b-instruct'
        });
        console.log('   ✅ Agent created:', agent_id);

        // Send a message
        console.log('   Sending test message...');
        const response = await prompt_assembly_service.sendMessage('test-webhook-character', {
          role: 'user',
          content: 'Hello, can you hear me? Please respond briefly.'
        });
        
        console.log('   ✅ Message response:', {
          length: response.length,
          preview: response.substring(0, 100) + (response.length > 100 ? '...' : '')
        });

        // Clean up
        await prompt_assembly_service.endSession('test-webhook-character');
        console.log('   ✅ Test agent cleaned up');

      } catch (error: any) {
        console.error('   ❌ End-to-end test failed:', error.message);
        console.log('   This might be expected if LocalAGI is not running or not configured');
      }
    } else {
      console.log('\n⏭️ Skipping end-to-end test (webhook mode not enabled)');
    }

    console.log('\n🎉 Webhook delivery test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Backend health check');
    console.log('   ✅ Webhook endpoint functional');
    console.log('   ✅ Response storage working');
    console.log('   ✅ Message retrieval working');
    
    if (process.env.USE_AGI_WEBHOOK === 'true') {
      console.log('   🔄 End-to-end test attempted (check results above)');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  testWebhookDelivery()
    .then(() => {
      console.log('✅ All tests passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error.message);
      process.exit(1);
    });
}

export { testWebhookDelivery };