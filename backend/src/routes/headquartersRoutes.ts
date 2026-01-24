import { Router, Request, Response } from 'express';
import { authenticate_token } from '../services/auth';
import { require_ticket } from '../middleware/ticketMiddleware';
import { HeadquartersService } from '../services/headquartersService';
import { AuthRequest } from '../types';

const router = Router();
const headquarters_service = new HeadquartersService();

router.post('/upgrade-character-slots', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { cost } = req.body; // Cost would be determined by frontend or config

    const updated_user = await headquarters_service.upgradeCharacterSlotCapacity(user_id, cost);

    return res.json({ success: true, user: updated_user });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Get user headquarters
router.get('/', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const headquarters = await headquarters_service.getHeadquarters(user_id);

    return res.json({ success: true, headquarters });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Save user headquarters
router.post('/', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { headquarters } = req.body;

    await headquarters_service.saveHeadquarters(user_id, headquarters);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Purchase bed
router.post('/purchase-bed', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { room_id, bed_data } = req.body;

    await headquarters_service.purchaseBed(user_id, room_id, bed_data);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/real-estate-chat', authenticate_token, require_ticket('headquarters_realestate'), async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { selected_agent, competing_agents, user_message, current_team_stats, conversation_history } = req.body;

    const response = await headquarters_service.handle_real_estate_chat(user_id, {
      selected_agent,
      competing_agents,
      user_message,
      current_team_stats,
      conversation_history,
    });

    return res.json({ success: true, messages: response });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-assign characters to beds based on hierarchy
router.post('/auto-assign', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await headquarters_service.autoAssignCharacters(user_id);

    return res.json({ success: true, message: 'Characters auto-assigned' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
