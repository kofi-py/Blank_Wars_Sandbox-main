import { Request, Response, NextFunction } from 'express';
import { ticket_service } from '../services/ticketService';
import { AuthRequest } from '../types';

/**
 * Middleware to check and consume tickets for chat interactions
 * This should be applied to all chat endpoints that consume API resources
 */
export const require_ticket = (source: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user_id = req.user?.id;
      
      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Try to consume a ticket atomically (skip separate availability check for performance)
      const consumed = await ticket_service.consumeTicket(
        user_id, 
        source, 
        `Chat interaction via ${source}`,
        { 
          endpoint: req.originalUrl,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      );

      if (!consumed) {
        // Either insufficient tickets or race condition - get current balance for error message
        const balance = await ticket_service.getTicketBalance(user_id);
        return res.status(402).json({
          success: false,
          error: 'Insufficient tickets for chat interaction',
          code: 'INSUFFICIENT_TICKETS',
          current_tickets: balance?.current_tickets || 0,
          message: 'You need tickets to chat. Upgrade your membership or earn tickets through gameplay!'
        });
      }

      // Add ticket info to request for logging purposes
      req.ticket_info = {
        consumed: true,
        source,
        timestamp: new Date()
      };

      // Continue to the actual chat endpoint
      next();

    } catch (error) {
      console.error('Ticket middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal error processing ticket',
        code: 'TICKET_ERROR'
      });
    }
  };
};

/**
 * Middleware to refresh user's tickets (hourly refresh) before checking balance
 * This should run before require_ticket to ensure users get their hourly tickets
 */
export const refresh_tickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    
    if (user_id) {
      // Perform hourly refresh (this is safe to call frequently)
      await ticket_service.performHourlyRefresh(user_id);
      
      // Check if daily reset is needed (using UTC for consistency)
      const balance = await ticket_service.getTicketBalance(user_id);
      if (balance) {
        const now = new Date();
        const last_reset = new Date(balance.last_daily_reset);
        const days_since_reset = Math.floor((now.getTime() - last_reset.getTime()) / (1000 * 60 * 60 * 24));

        if (days_since_reset >= 1) {
          await ticket_service.performDailyReset(user_id);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Refresh tickets middleware error:', error);
    // Don't block the request if refresh fails
    next();
  }
};

/**
 * Combined middleware that refreshes tickets then requires one
 * Most convenient for chat endpoints
 */
export const chat_ticket_middleware = (source: string) => {
  return [refresh_tickets, require_ticket(source)];
};

// Extend AuthRequest interface to include ticket info
declare global {
  namespace Express {
    interface Request {
      ticket_info?: {
        consumed: boolean;
        source: string;
        timestamp: Date;
      };
    }
  }
}