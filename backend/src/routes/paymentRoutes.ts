
import { Router } from 'express';
import { payment_service } from '../services/PaymentService';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';

const router = Router();

// Note: Changed to use AuthRequest to satisfy type checking for req.user
router.post('/create-checkout-session', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // pack_type instead of priceId to match the service
    const { pack_type, quantity } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user_id = req.user.id;

    const session = await payment_service.createCheckoutSession(user_id, pack_type, quantity);

    // Return the full URL for easier frontend redirection
    res.json({ url: session?.url }); 
  } catch (error: any) {
    console.error('Error in create-checkout-session route:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
