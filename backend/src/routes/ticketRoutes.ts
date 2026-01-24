import { Router } from 'express';
import { authenticate_token } from '../services/auth';
import { ticket_service } from '../services/ticketService';
import { ticket_cron_service } from '../services/ticketCronService';
import { AuthRequest } from '../types';

const router = Router();

// Get user's current ticket balance
router.get('/balance', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Refresh tickets before returning balance
    await ticket_service.performHourlyRefresh(user_id);
    
    // Check if daily reset is needed
    const balance = await ticket_service.getTicketBalance(user_id);
    if (balance) {
      const today = new Date().toISOString().split('T')[0];
      const last_reset = balance.last_daily_reset.toISOString().split('T')[0];

      if (last_reset < today) {
        await ticket_service.performDailyReset(user_id);
      }
    }

    // Get fresh balance after potential refresh/reset
    const fresh_balance = await ticket_service.getTicketBalance(user_id);

    if (!fresh_balance) {
      return res.status(404).json({
        success: false,
        error: 'Ticket balance not found'
      });
    }

    const daily_allowance = await ticket_service.getUserDailyAllowance(user_id);

    return res.json({
      success: true,
      data: {
        current_tickets: fresh_balance.current_tickets,
        daily_allowance: daily_allowance,
        total_earned: fresh_balance.total_earned,
        total_purchased: fresh_balance.total_purchased,
        total_spent: fresh_balance.total_spent,
        last_refresh: fresh_balance.last_hourly_refresh,
        last_reset: fresh_balance.last_daily_reset
      }
    });
  } catch (error) {
    console.error('Error getting ticket balance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket balance'
    });
  }
});

// Get user's ticket transaction history
router.get('/history', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const history = await ticket_service.getTransactionHistory(user_id, limit);
    
    return res.json({
      success: true,
      data: {
        transactions: history,
        total_count: history.length
      }
    });
  } catch (error) {
    console.error('Error getting ticket history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get ticket history'
    });
  }
});

// Purchase tickets (placeholder for future implementation)
router.post('/purchase', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { package_id, amount } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // TODO: Implement actual purchase logic with payment processing
    // For now, just add tickets for testing purposes
    if (process.env.NODE_ENV === 'development') {
      const success = await ticket_service.addTickets(
        user_id,
        amount || 10,
        'purchased',
        'dev_purchase',
        `Development purchase: ${package_id}`,
        { package_id, dev_mode: true }
      );

      if (success) {
        return res.json({
          success: true,
          message: 'Tickets purchased successfully (development mode)',
          data: { tickets_added: amount || 10 }
        });
      }
    }

    return res.status(501).json({
      success: false,
      error: 'Purchase system not yet implemented'
    });
  } catch (error) {
    console.error('Error purchasing tickets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to purchase tickets'
    });
  }
});

// Award tickets for gameplay achievements (protected endpoint)
router.post('/award', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { amount, source, description } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticket amount'
      });
    }

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required'
      });
    }

    const success = await ticket_service.addTickets(
      user_id,
      amount,
      'earned',
      source,
      description,
      { 
        awarded_via: 'api',
        timestamp: new Date().toISOString()
      }
    );

    if (success) {
      return res.json({
        success: true,
        message: 'Tickets awarded successfully',
        data: { 
          tickets_awarded: amount,
          source 
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to award tickets'
      });
    }
  } catch (error) {
    console.error('Error awarding tickets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to award tickets'
    });
  }
});

// ============================================================================
// ADMIN/TESTING ENDPOINTS FOR CRON JOBS
// ============================================================================

// Manual trigger for daily reset (admin/testing only)
router.post('/admin/trigger-daily-reset', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // TODO: Add admin user check in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Admin endpoint not available in production'
      });
    }

    const result = await ticket_cron_service.triggerDailyReset();
    
    return res.json({
      success: true,
      message: 'Daily reset completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error triggering daily reset:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger daily reset'
    });
  }
});

// Manual trigger for hourly refresh (admin/testing only)
router.post('/admin/trigger-hourly-refresh', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // TODO: Add admin user check in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Admin endpoint not available in production'
      });
    }

    const result = await ticket_cron_service.triggerHourlyRefresh();
    
    return res.json({
      success: true,
      message: 'Hourly refresh completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error triggering hourly refresh:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger hourly refresh'
    });
  }
});

// Get cron job status
router.get('/admin/cron-status', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // TODO: Add admin user check in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Admin endpoint not available in production'
      });
    }

    const status = ticket_cron_service.getStatus();
    
    return res.json({
      success: true,
      data: {
        cron_jobs: status,
        server_time: new Date().toISOString(),
        timezone: 'UTC'
      }
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cron status'
    });
  }
});

export default router;