import { Router } from 'express';
import { webhook_response_store } from '../services/webhookResponseStore';
// import { primerAwaitService } from '../services/primerAwaitService'; // REMOVED: Dead code

export const webhooks = Router();

// LocalAGI webhook receiver
const webhook_path = '/webhook/agi-response';
webhooks.post(webhook_path, async (req, res) => {
  const { message_id, content, status, error, sid, applied, digest_injected, ...rest } = req.body || {};
  if (!message_id) return res.status(400).json({ ok: false, error: 'message_id required' });

  // Check if this webhook indicates primer was applied
  // REMOVED: Primer service deleted as dead code
  // if (sid && (applied === true || digest_injected === true)) {
  //   await primerAwaitService.markPrimerApplied(sid);
  // }

  // Deliver using the new direct method - this will resolve waiting promises immediately
  webhook_response_store.deliver(message_id, { content, status, error, ...rest });
  return res.json({ ok: true });
});

// Get message response by ID (for API access)
webhooks.get('/messages/:id', (req, res) => {
  try {
    const message_id = req.params.id;
    const response = webhook_response_store.getResponse(message_id);
    
    if (!response) {
      return res.status(404).json({ 
        error: 'Message not found',
        message_id: message_id 
      });
    }

    res.json({
      message_id: response.message_id,
      status: response.status,
      content: response.content || response.text,
      timestamp: response.timestamp,
      received_at: response.received_at
    });
  } catch (error) {
    console.error('[AGI webhook][BlankWars] Error getting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for webhook system
webhooks.get('/webhook/health', (req, res) => {
  const stats = {
    status: 'healthy',
    service: 'LocalAGI Webhook Receiver',
    timestamp: new Date().toISOString(),
    webhook_path: process.env.AGI_WEBHOOK_PATH || '/webhook/agi-response',
    webhook_enabled: process.env.USE_AGI_WEBHOOK === 'true',
    stored_responses: webhook_response_store.getAllResponses().length,
    pending_requests: webhook_response_store.getPendingCount(),
    localai_base_url: process.env.LOCALAI_URL || 'http://localhost:11435'
  };

  res.json(stats);
});