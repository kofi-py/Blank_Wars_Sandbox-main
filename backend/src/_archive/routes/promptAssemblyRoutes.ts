import express from 'express';
import { prompt_assembly_service } from '../services/promptAssemblyService';
import response_store from '../services/responseStore';
import local_agi_poller from '../services/localAGIPoller';

const router = express.Router();

// Create a character agent with persistent memory
router.post('/agent/create', async (req, res) => {
  try {
    const { name, prompt, model = 'llama-3.2-3b-instruct' } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields: name, prompt'
      });
    }

    const agent_id = await prompt_assembly_service.create_agent(name, prompt);
    
    res.json({
      status: 'ok',
      agent_id: agent_id,
      message: `Agent ${name} created successfully`
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    res.status(500).json({
      error: 'Failed to create agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send message to agent
router.post('/chat/:agent', async (req, res) => {
  try {
    const { agent } = req.params;
    const { input, message, session_id, user, chat_id } = req.body;

    const message_text = input || message;

    if (!message_text) {
      return res.status(400).json({
        error: 'Missing required field: input or message'
      });
    }

    if (!chat_id) {
      return res.status(400).json({
        error: 'chat_id required for character chats'
      });
    }

    // This endpoint just accepts the message and returns a message_id
    // The actual response comes through SSE
    const message_id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Send message in background - response will come via SSE
    prompt_assembly_service.send_message(agent, {
      role: 'user',
      content: message_text
    }, { chat_id }).catch(error => {
      console.error(`Error processing message for agent ${agent}:`, error);
    });
    
    res.json({
      message_id: message_id,
      status: 'message_received'
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// SSE endpoint for agent responses
router.get('/sse/:agent', async (req, res) => {
  try {
    const { agent } = req.params;
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ 
      type: 'connection', 
      status: 'connected',
      agent: agent 
    })}\n\n`);
    
    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 30000);
    
    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      console.log(`🔌 SSE client disconnected for agent: ${agent}`);
    });
    
    req.on('end', () => {
      clearInterval(heartbeat);
      console.log(`🔌 SSE connection ended for agent: ${agent}`);
    });
    
    // TODO: Integrate with actual LocalAGI SSE response mechanism
    // For now, this endpoint provides the SSE infrastructure
    console.log(`📡 SSE connection established for agent: ${agent}`);
    
  } catch (error) {
    console.error('SSE setup error:', error);
    res.status(500).json({
      error: 'Failed to establish SSE connection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List all active agents
router.get('/agents', async (req, res) => {
  try {
    const agents = await prompt_assembly_service.list_agents();
    
    res.json({
      agents: agents,
      statuses: agents.reduce((acc, agent) => {
        acc[agent] = true; // Assume all returned agents are active
        return acc;
      }, {} as Record<string, boolean>)
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({
      error: 'Failed to list agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get agent status
router.get('/agent/:agent/status', async (req, res) => {
  try {
    const { agent } = req.params;
    const is_active = await prompt_assembly_service.get_agent_status(agent);
    
    res.json({
      agent: agent,
      active: is_active,
      status: is_active ? 'running' : 'inactive'
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({
      error: 'Failed to get agent status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create character agent with predefined personality (convenience endpoint)
router.post('/character/:character_id/create', async (req, res) => {
  try {
    const { character_id } = req.params;
    
    // Use the send_message method to create agent if it doesn't exist
    // This will auto-create the agent with proper personality
    const agent_id = await prompt_assembly_service.send_message(character_id, {
      role: 'system',
      content: 'Hello, I am ready to chat.'
    });
    
    res.json({
      status: 'ok',
      agent_id: character_id,
      character_id: character_id,
      message: `Character agent ${character_id} created successfully`
    });
  } catch (error) {
    console.error('Character agent creation error:', error);
    res.status(500).json({
      error: 'Failed to create character agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send message to character agent (convenience endpoint)
router.post('/character/:character_id/chat', async (req, res) => {
  try {
    const { character_id } = req.params;
    const { message, input, chat_id } = req.body;

    const message_text = input || message;

    if (!message_text) {
      return res.status(400).json({
        error: 'Missing required field: input or message'
      });
    }

    if (!chat_id || typeof chat_id !== 'string' || !chat_id.trim()) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    // send_message will compute a proper SID internally using character_id+chat_id
    const response = await prompt_assembly_service.send_message(character_id, {
      role: 'user',
      content: message_text
    }, { chat_id });
    
    // Check if response was already sent (due to timeout)
    if (res.headersSent) {
      console.log('Response already sent, skipping success response');
      return;
    }
    return res.json({
      status: 'ok',
      character_id: character_id,
      response: response,
      message: 'Response generated successfully'
    });
  } catch (error) {
    console.error('Character chat error:', error);
    // Check if response was already sent (due to timeout)
    if (res.headersSent) {
      console.log('Response already sent, skipping error response');
      return;
    }
    return res.status(500).json({
      error: 'Failed to send message to character',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook endpoint for LocalAGI to send responses
router.post('/webhook/response', async (req, res) => {
  try {
    const { agent_id, message_id, content, response, text } = req.body;

    let final_agent_id = agent_id || agent_id;
    const final_message_id = message_id || message_id;
    const final_content = content || response || text;

    // Handle known agent name corruption from LocalAGI
    // If we get "rsation/c", treat it as "cleopatra"
    if (final_agent_id === 'rsation/c') {
      final_agent_id = 'cleopatra';
      console.log(`🔧 Fixed corrupted agent name: rsation/c -> cleopatra`);
    }

    if (!final_message_id || !final_content) {
      return res.status(400).json({
        error: 'Missing required fields: message_id, content'
      });
    }

    // Default agent_id if not provided
    final_agent_id = final_agent_id || 'localagi';

    // Store the response in BOTH stores for compatibility
    response_store.storeResponse(final_agent_id, final_message_id, final_content);

    // ALSO store in webhook_response_store to resolve waiting requests
    const { webhook_response_store } = require('../services/webhookResponseStore');
    webhook_response_store.storeResponse({
      message_id: final_message_id,
      agent_id: final_agent_id,
      status: 'completed',
      content: final_content,
      text: final_content
    });

    console.log(`🎭 Webhook received response from ${final_agent_id}`);
    
    res.json({
      status: 'ok',
      message: 'Response stored successfully'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get agent messages (stored responses)
router.get('/agent/:agent/messages', async (req, res) => {
  try {
    const { agent } = req.params;
    const messages = response_store.getAgentMessages(agent);
    
    res.json({
      agent: agent,
      messages: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get unread messages for an agent
router.get('/agent/:agent/unread', async (req, res) => {
  try {
    const { agent } = req.params;
    const messages = response_store.getUnreadMessages(agent);
    
    res.json({
      agent: agent,
      unread: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({
      error: 'Failed to get unread messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get response store stats
router.get('/stats', async (req, res) => {
  try {
    const store_stats = response_store.getStats();
    const poller_stats = local_agi_poller.getStats();

    res.json({
      response_store: store_stats,
      poller: poller_stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manual trigger to simulate a response (for testing)
router.post('/test/simulate-response', async (req, res) => {
  try {
    const { agent_id, message_id, content } = req.body;
    
    if (!agent_id || !message_id || !content) {
      return res.status(400).json({
        error: 'Missing required fields: agent_id, message_id, content'
      });
    }
    
    response_store.storeResponse(agent_id, message_id, content);
    
    res.json({
      status: 'ok',
      message: 'Test response stored successfully'
    });
  } catch (error) {
    console.error('Simulate response error:', error);
    res.status(500).json({
      error: 'Failed to simulate response',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;