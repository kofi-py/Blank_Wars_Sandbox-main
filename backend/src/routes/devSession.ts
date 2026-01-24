import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/', async (req, res) => {
  // Create a real JWT token for dev session
  const dev_user_id = '4177236a-aa09-417c-aab6-3bb62096e833'; // Use existing test user ID
  const access_secret = process.env.JWT_ACCESS_SECRET;

  if (!access_secret) {
    return res.status(500).json({
      success: false,
      error: 'JWT_ACCESS_SECRET not configured'
    });
  }

  const access_token = jwt.sign(
    { user_id: dev_user_id, type: 'access' },
    access_secret,
    { expiresIn: '4h' }
  );

  // Set the token as an http_only cookie (same as test-login)
  res.cookie('access_token', access_token, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  });

  return res.json({
    success: true,
    user: {
      id: dev_user_id,
      username: 'testuser',
      email: 'test@example.com'
    },
    message: 'Dev session created'
  });
});

export default router;