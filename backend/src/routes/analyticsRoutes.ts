import express from 'express';
import { authenticate_token } from '../services/auth';
import { ChatAnalyticsService } from '../services/chatAnalyticsService';

const router = express.Router();

// GET /api/analytics/chat/performance - Get comprehensive chat performance stats
router.get('/chat/performance', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const stats = await ChatAnalyticsService.getChatPerformanceStats(user_id);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat performance stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve chat performance statistics' 
    });
  }
});

// GET /api/analytics/chat/trend - Get chat performance trend over time
router.get('/chat/trend', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const days = parseInt(req.query.days as string) || 30;
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days parameter must be between 1 and 365'
      });
    }
    
    const trend = await ChatAnalyticsService.getChatPerformanceTrend(user_id, days);
    
    res.json({
      success: true,
      data: trend,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat performance trend:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve chat performance trend' 
    });
  }
});

// GET /api/analytics/chat/summary - Get quick chat summary for dashboard
router.get('/chat/summary', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const stats = await ChatAnalyticsService.getChatPerformanceStats(user_id);
    
    // Return just the key metrics for dashboard widgets
    const summary = {
      total_chats: stats.total_chats,
      success_rate: stats.success_rate,
      total_xp_gained: stats.total_xpGained,
      avg_xp_per_chat: stats.avg_xp_per_chat,
      last_chat_at: stats.last_chat_at,
      top_characters: Object.entries(stats.character_breakdown)
        .sort(([,a], [,b]) => b.total_xp - a.total_xp)
        .slice(0, 3)
        .map(([id, data]) => ({
          character_id: id,
          name: data.name,
          total_xp: data.total_xp,
          success_rate: data.success_rate,
          chats: data.chats
        }))
    };
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting chat summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve chat summary' 
    });
  }
});

// GET /api/analytics/chat/character/:character_id - Get analytics for specific character
router.get('/chat/character/:character_id', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const character_id = req.params.character_id;
    
    if (!character_id) {
      return res.status(400).json({
        success: false,
        error: 'Character ID is required'
      });
    }
    
    const stats = await ChatAnalyticsService.getChatPerformanceStats(user_id);
    const character_stats = stats.character_breakdown[character_id];

    if (!character_stats) {
      return res.status(404).json({
        success: false,
        error: 'No chat data found for this character'
      });
    }

    res.json({
      success: true,
      data: {
        character_id,
        ...character_stats,
        last_chat_at: stats.last_chat_at // Overall last chat time
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting character chat analytics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve character chat analytics' 
    });
  }
});

export default router;