import { Router, Request, Response } from 'express';
import { InternalMailService } from '../services/internalMailService';
import { authenticate_token, AuthRequest } from '../services/auth';
import { UserService } from '../services/userService';

const router = Router();
const mail_service = new InternalMailService();
const user_service = new UserService();

// All routes require authentication
router.use(authenticate_token);

/**
 * GET /api/mail
 * Get user's mailbox with optional filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const { category, unread_only, limit, offset } = req.query;

    const filters = {
      category: category as string,
      unread_only: unread_only === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const result = await mail_service.getUserMail(user_id, filters);

    res.json({
      success: true,
      messages: result.messages,
      total: result.total,
      unread_count: result.unread_count,
      pagination: {
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        total: result.total
      }
    });
  } catch (error: any) {
    console.error('Error fetching mail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mail'
    });
  }
});

/**
 * PATCH /api/mail/:id/read
 * Mark a message as read
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const message_id = req.params.id;

    const success = await mail_service.markAsRead(message_id, user_id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

/**
 * DELETE /api/mail/:id
 * Delete a message (soft delete)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const message_id = req.params.id;

    const success = await mail_service.deleteMessage(message_id, user_id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

/**
 * POST /api/mail/:id/claim
 * Claim rewards from a message attachment
 */
router.post('/:id/claim', async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    const message_id = req.params.id;

    const result = await mail_service.claimAttachment(message_id, user_id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or attachment already claimed'
      });
    }

    res.json({
      success: true,
      message: 'Attachment claimed successfully',
      rewards: result.rewards
    });
  } catch (error: any) {
    console.error('Error claiming attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim attachment'
    });
  }
});

/**
 * POST /api/mail/send
 * Send a message to another user
 */
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const sender_id = req.user!.id;
    const sender_username = req.user!.username;
    const { recipient_username, subject, content, signature, reply_to_mail_id } = req.body;

    // Validate input
    if (!recipient_username || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Recipient username, subject, and content are required'
      });
    }

    // Look up recipient user ID by username
    const recipient_user = await user_service.findUserByUsername(recipient_username);
    if (!recipient_user) {
      return res.status(404).json({
        success: false,
        error: 'Recipient user not found'
      });
    }

    const recipient_user_id = recipient_user.id;

    const message = await mail_service.sendUserMail(
      sender_id,
      sender_username,
      recipient_user_id,
      { subject, content, signature, reply_to_mail_id }
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      message_id: message.id
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * GET /api/mail/demo
 * Initialize demo data for testing (development only)
 */
router.get('/demo', async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user!.id;
    
    await mail_service.initializeDemoData(user_id);

    res.json({
      success: true,
      message: 'Demo mail data initialized'
    });
  } catch (error: any) {
    console.error('Error initializing demo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize demo data'
    });
  }
});

export default router;