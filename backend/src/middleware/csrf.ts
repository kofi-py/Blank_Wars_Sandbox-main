import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';

// Configure CSRF protection with minimal configuration
const csrf_protection = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  },
  getSessionIdentifier: (req: Request) => req.ip || 'anonymous',
});

// Export middleware
export const csrf_middleware = csrf_protection.doubleCsrfProtection;

// Export error for comparison
export const invalid_csrf_token_error = csrf_protection.invalidCsrfTokenError;

// Endpoint to get CSRF token
export const get_csrf_token = (req: Request, res: Response) => {
  try {
    const csrf_token = csrf_protection.generateCsrfToken(req, res);
    res.json({ csrfToken: csrf_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
};

// Skip CSRF for certain routes (e.g., public endpoints)
export const skip_csrf = (paths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 CSRF Check - Path:', req.path, 'Skip paths:', paths);
    if (paths.some(path => req.path.startsWith(path))) {
      console.log('✅ CSRF Skipped for:', req.path);
      return next();
    }
    console.log('🚫 CSRF Required for:', req.path);
    return csrf_middleware(req, res, next);
  };
};

// Error handler for CSRF failures
export const csrf_error_handler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err === invalid_csrf_token_error || err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Your request was rejected due to invalid security token. Please refresh and try again.'
    });
  } else {
    next(err);
  }
};