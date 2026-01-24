import express from 'express';
// DEPRECATED: prompt_assembly_service removed - LocalAGI/LocalAI no longer used
// import { prompt_assembly_service } from '../services/promptAssemblyService';

const router = express.Router();

// DEPRECATED: LocalAGI/LocalAI test endpoints - commented out as service no longer exists
// Test persistent memory with simulated responses
/* router.post('/persistent-memory-demo', async (req, res) => {
  try {
    const { character_id, messages } = req.body;
    
    if (!character_id || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Missing character_id or messages array'
      });
    }

    const results = [];
    
    console.log(`🎭 Testing persistent memory for ${character_id}`);
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`📤 Message ${i + 1}: ${message.substring(0, 50)}...`);
      
      try {
        // This will auto-create the agent on first call, then reuse it
        const response = await prompt_assembly_service.send_message(character_id, {
          role: 'user',
          content: message
        });
        
        console.log(`📥 Response ${i + 1}: ${response.substring(0, 100)}...`);
        
        results.push({
          message_index: i + 1,
          user_message: message,
          agent_response: response,
          timestamp: new Date()
        });
        
        // Brief pause between messages to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error on message ${i + 1}:`, error);
        results.push({
          message_index: i + 1,
          user_message: message,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
    }
    
    // Show agent status
    const is_active = await prompt_assembly_service.get_agent_status(character_id);
    const all_agents = await prompt_assembly_service.list_agents();

    res.json({
      success: true,
      character_id,
      conversation_results: results,
      agent_status: {
        is_active,
        all_active_agents: all_agents.length,
        agent_still_exists: all_agents.includes(character_id)
      },
      summary: {
        total_messages: messages.length,
        successful_responses: results.filter(r => !r.error).length,
        errors: results.filter(r => r.error).length,
        persistent_memory_working: results.length > 1 && results.filter(r => !r.error).length > 1
      }
    });
    
  } catch (error) {
    console.error('Demo error:', error);
    res.status(500).json({
      error: 'Demo failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Test session ending
router.post('/test-session-end', async (req, res) => {
  try {
    const { character_id } = req.body;
    
    if (!character_id) {
      return res.status(400).json({ error: 'Missing character_id' });
    }
    
    console.log(`🏁 Testing session end for ${character_id}`);
    
    // Get agent status before ending
    const before_status = await prompt_assembly_service.get_agent_status(character_id);
    const before_agents = await prompt_assembly_service.list_agents();

    // End the session (this should save memory and clean up)
    await prompt_assembly_service.end_session(character_id);

    // Check status after ending
    const after_status = await prompt_assembly_service.get_agent_status(character_id);
    const after_agents = await prompt_assembly_service.list_agents();

    res.json({
      success: true,
      character_id,
      before: {
        agent_active: before_status,
        total_agents: before_agents.length,
        agent_exists: before_agents.includes(character_id)
      },
      after: {
        agent_active: after_status,
        total_agents: after_agents.length,
        agent_exists: after_agents.includes(character_id)
      },
      session_end_successful: before_status && !after_status
    });
    
  } catch (error) {
    console.error('Session end test error:', error);
    res.status(500).json({
      error: 'Session end test failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});
*/

export default router;