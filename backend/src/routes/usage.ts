import express from 'express';
import { usage_tracking_service } from '../services/usageTrackingService';
import { AuthRequest } from '../types/index';
import { authenticate_token } from '../services/auth';
import { db } from '../database/index';

const router = express.Router();

// Get user's current usage status
router.get('/status', async (req: AuthRequest, res) => {
  try {
    // Check if user is authenticated
    const auth_header = req.headers.authorization;
    let user = null;

    if (auth_header && auth_header.startsWith('Bearer ')) {
      const token = auth_header.substring(7);
      try {
        // Try to authenticate but don't fail if it doesn't work
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        user = decoded;
      } catch (err) {
        // Token invalid, continue as guest
      }
    }

    if (user) {
      // Return actual usage status for authenticated user
      const usage_status = usage_tracking_service.getUserUsageStatus(user);
      res.json(usage_status);
    } else {
      // Return default usage status for guest users
      res.json({
        can_chat: true,
        can_generate_image: true,
        can_battle: true,
        remaining_chats: 5,
        remaining_images: 1,
        remaining_battles: 3,
        reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  } catch (error) {
    console.error('Error getting usage status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tier limits for all subscription tiers
router.get('/limits', async (req, res) => {
  try {
    const limits = usage_tracking_service.getTierLimits();
    res.json(limits);
  } catch (error) {
    console.error('Error getting tier limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track image generation usage
router.post('/track-image', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Use imported database connection
    
    const success = await usage_tracking_service.trackImageUsage(user.id, db);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(429).json({ error: 'Daily image generation limit reached' });
    }
  } catch (error) {
    console.error('Error tracking image usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;