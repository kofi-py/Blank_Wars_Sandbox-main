import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const api_limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased for demo - Limit each IP to 2000 requests per window_ms
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Configure for Railway deployment with trust proxy
  keyGenerator: (req) => {
    // Use x-forwarded-for header for Railway deployment
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retry_after: (req as any).rateLimit?.reset_time
    });
  }
});

// Strict rate limiter for authentication endpoints
export const auth_limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window_ms
  message: 'Too many authentication attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the authentication rate limit. Please try again later.',
      retry_after: (req as any).rateLimit?.reset_time
    });
  }
});

// Rate limiter for password reset
export const password_reset_limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for battle creation
export const battle_limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 battle creations per 5 minutes
  message: 'Too many battle creation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for WebSocket connections
export const ws_limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Increased for demo - Limit each IP to 200 WebSocket connection attempts per minute
  message: 'Too many WebSocket connection attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Dynamic rate limiter based on user subscription tier
export const create_dynamic_limiter = (tier: string) => {
  const limits: Record<string, number> = {
    free: 50,
    bronze: 100,
    silver: 200,
    gold: 500,
    platinum: 1000
  };

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: limits[tier] || limits.free,
    message: `Rate limit exceeded for ${tier} tier. Please upgrade your subscription for higher limits.`,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return (req as any).user?.id || req.ip;
    }
  });
};