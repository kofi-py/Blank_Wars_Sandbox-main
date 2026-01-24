import { Router, Request, Response } from 'express';
import { AuthService, authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { db_adapter } from '../services/databaseAdapter';
import { auth_limiter } from '../middleware/rateLimiter';
import { headquarters_service } from '../services/headquartersService';

const router = Router();
const auth_service = new AuthService();

// Force production settings for Railway deployment - Railway is always HTTPS
const is_secure_environment = process.env.NODE_ENV === 'production';

// Helper function to create cookie options
function get_cookie_options(max_age: number): any {
  const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';
  const options: any = {
    httpOnly: true,
    secure: is_secure_environment,
    sameSite: same_site,
    maxAge: max_age
  };

  // Only set domain in production
  if (is_secure_environment) {
    options.domain = '.blankwars.com';
  }

  return options;
}

// Register new user - matches server.ts exactly
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, claim_token } = req.body;

    // Use real authentication service
    const { user, tokens } = await auth_service.register({ username, email, password, claim_token });

    // SECURITY: Clear any existing auth cookies before setting new ones
    const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';
    const is_local_dev = process.env.NODE_ENV === 'development';
    
    // Clear existing cookies to prevent authentication conflicts
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      path: '/',
      ...(is_local_dev ? {} : { domain: '.blankwars.com' }), // Must match original cookie domain
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      path: '/',
      ...(is_local_dev ? {} : { domain: '.blankwars.com' }), // Must match original cookie domain
    });

    // SECURITY: Set http_only cookies instead of returning tokens in response

    console.log('🍪 COOKIE DEBUG: is_secure_environment =', is_secure_environment);
    console.log('🍪 COOKIE DEBUG: is_local_dev =', is_local_dev);
    console.log('🍪 COOKIE DEBUG: NODE_ENV =', process.env.NODE_ENV);

    res.cookie('access_token', tokens.access_token, get_cookie_options(4 * 60 * 60 * 1000)); // 4 hours
    res.cookie('refresh_token', tokens.refresh_token, get_cookie_options(7 * 24 * 60 * 60 * 1000)); // 7 days

    console.log('🍪 COOKIE DEBUG: Cookies set successfully');

    // For cross-origin requests (like Vercel frontend), also return tokens in response
    // since http_only cookies won't be accessible across different domains
    const response_data: any = {
      success: true,
      user
    };
    
    // If this is a cross-origin request from the frontend, include tokens
    const origin = req.headers.origin;
    if (origin && origin.includes('blankwars.com')) {
      response_data.tokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      };
      console.log('🌐 CROSS-ORIGIN: Including tokens in response for frontend access');
    }

    return res.status(201).json(response_data);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Login user - matches server.ts exactly
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Use real authentication service
    const { user, tokens } = await auth_service.login({ email, password });

    // SECURITY: Set http_only cookies instead of returning tokens in response
    const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';
    const is_local_dev = process.env.NODE_ENV === 'development';

    res.cookie('access_token', tokens.access_token, get_cookie_options(4 * 60 * 60 * 1000)); // 4 hours
    res.cookie('refresh_token', tokens.refresh_token, get_cookie_options(7 * 24 * 60 * 60 * 1000)); // 7 days

    // For cross-origin requests (like Vercel frontend), also return tokens in response
    // since http_only cookies won't be accessible across different domains
    const response_data: any = {
      success: true,
      user
    };
    
    // If this is a cross-origin request from the frontend, include tokens
    const origin = req.headers.origin;
    if (origin && origin.includes('blankwars.com')) {
      response_data.tokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      };
      console.log('🌐 CROSS-ORIGIN LOGIN: Including tokens in response for frontend access');
    }

    return res.json(response_data);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Refresh tokens endpoint - supports both cookie and cross-origin refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Try multiple sources for refresh token: cookies, headers, body
    let refresh_token = req.cookies?.refresh_token;
    
    // Fallback 1: Check Authorization header
    if (!refresh_token && req.headers.authorization) {
      const auth_header = req.headers.authorization;
      if (auth_header.startsWith('Bearer ')) {
        refresh_token = auth_header.substring(7);
        console.log('🔄 REFRESH: Using refresh token from Authorization header');
      }
    }
    
    // Fallback 2: Check request body for cross-origin requests
    if (!refresh_token && req.body?.refresh_token) {
      refresh_token = req.body.refresh_token;
      console.log('🌐 CROSS-ORIGIN REFRESH: Using refresh token from request body');
    }

    if (!refresh_token) {
      console.log('❌ REFRESH: No refresh token found in cookies, headers, or body');
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const tokens = await auth_service.refresh_tokens(refresh_token);

    // Set cookies for same-origin requests
    const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';
    const is_local_dev = process.env.NODE_ENV === 'development';
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      path: '/',
      ...(is_local_dev ? {} : { domain: '.blankwars.com' }), // Only set domain for production
      maxAge: 4 * 60 * 60 * 1000 // 4 hours
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      path: '/',
      ...(is_local_dev ? {} : { domain: '.blankwars.com' }), // Only set domain for production
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // For cross-origin requests, also return tokens in response
    const response_data: any = {
      success: true
    };
    
    const origin = req.headers.origin;
    if (origin && origin.includes('blankwars.com')) {
      response_data.tokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      };
      console.log('🌐 CROSS-ORIGIN REFRESH: Including new tokens in response');
    }

    return res.json(response_data);
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Logout endpoint - matches server.ts exactly
router.post('/logout', async (req: any, res: Response) => {
  try {
    // Clear server-side session if user is authenticated
    if (req.user?.id) {
      await auth_service.logout(req.user.id);
    }
    // Always clear cookies regardless of authentication state

    // SECURITY: Clear http_only cookies
    const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';
    const is_local_dev = process.env.NODE_ENV === 'development';

    // For localhost (development), don't set domain at all to match cookie creation
    const clear_cookie_options = {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      path: '/',
      ...(is_local_dev ? {} : { domain: '.blankwars.com' }), // Only set domain in production
    };

    res.clearCookie('access_token', clear_cookie_options);
    res.clearCookie('refresh_token', clear_cookie_options);

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile endpoint - matches server.ts exactly
router.get('/profile', authenticate_token, async (req: any, res: Response) => {
  try {
    return res.json({
      success: true,
      user: req.user
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear all auth cookies - useful for debugging
router.post('/clear-cookies', async (req: Request, res: Response) => {
  const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';

  res.clearCookie('access_token', {
    httpOnly: true,
    secure: is_secure_environment,
    sameSite: same_site,
    path: '/'
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: is_secure_environment,
    sameSite: same_site,
    path: '/'
  });
  
  return res.json({
    success: true,
    message: 'All auth cookies cleared'
  });
});

// GET version for easy browser access - aggressive clearing
router.get('/clear-cookies', async (req: Request, res: Response) => {
  const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';

  // Clear cookies with multiple path/domain combinations to catch stale cookies
  const cookie_names = ['access_token', 'refresh_token'];
  const paths = ['/', '/api', '/api/auth'];
  const domains = [undefined, '.blankwars.com', '.up.railway.app', 'blank-wars-clean-production.up.railway.app'];

  cookie_names.forEach(cookie_name => {
    paths.forEach(path => {
      domains.forEach(domain => {
        const clear_options: any = {
          httpOnly: true,
          secure: is_secure_environment,
          sameSite: same_site,
          path
        };

        if (domain) {
          clear_options.domain = domain;
        }

        res.clearCookie(cookie_name, clear_options);
      });
    });
  });
  
  // Also try clearing without http_only flag (for any non-http_only cookies)
  cookie_names.forEach(cookie_name => {
    res.clearCookie(cookie_name, { path: '/' });
    res.clearCookie(cookie_name, { path: '/', domain: '.blankwars.com' });
  });
  
  return res.json({
    success: true,
    message: 'All auth cookies aggressively cleared from all domains/paths - close this tab and refresh your game',
    cleared_paths: paths,
    cleared_domains: domains.filter(d => d)
  });
});

// TEMPORARY: Test login endpoint for debugging
router.post('/test-login', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test login endpoint called');

    // Get a known user from database directly
    const { query } = require('../database');
    const result = await query(
      'SELECT id, username, email, coach_name FROM users WHERE email = $1 LIMIT 1',
      ['test@example.com']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test user not found' });
    }

    const user = result.rows[0];

    // Create simple tokens without using AuthService (to bypass hanging)
    const jwt = require('jsonwebtoken');
    const access_token = jwt.sign(
      { user_id: user.id, type: 'access' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '4h' }
    );

    const refresh_token = jwt.sign(
      { user_id: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    const same_site: 'none' | 'lax' = is_secure_environment ? 'none' : 'lax';

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      maxAge: 4 * 60 * 60 * 1000 // 4 hours
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: is_secure_environment,
      sameSite: same_site,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user,
      message: 'Test login successful'
    });

  } catch (error: any) {
    console.error('Test login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Setup dev account with all characters
router.post('/setup-dev-account', async (req: Request, res: Response) => {
  try {
    console.log('🛠️ Setting up dev account with all characters...');
    
    const { query } = require('../database');
    
    // Get dev account
    const dev_user = await query(
      'SELECT id FROM users WHERE email = $1',
      ['dev@test.com']
    );
    
    if (dev_user.rows.length === 0) {
      return res.status(404).json({ error: 'Dev account not found' });
    }
    
    const user_id = dev_user.rows[0].id;
    
    // Get all characters
    const characters = await query('SELECT id, name FROM characters');
    console.log(`Found ${characters.rows.length} characters to grant`);
    
    let granted = 0;
    let already_had = 0;

    for (const char of characters.rows) {
      // Check if user already has this character
      const has_char = await query(
        'SELECT id FROM user_characters WHERE user_id = $1 AND character_id = $2',
        [user_id, char.id]
      );

      if (has_char.rows.length === 0) {
        // Grant character at high level
        const { v4: uuidv4 } = require('uuid');
        const user_char_id = uuidv4();
        const serial_number = `DEV-${char.id.toUpperCase()}-${Date.now()}`;

        // Dev characters get moderate starting financial values (not calculated, just reasonable for testing)
        // wallet: 0, debt: 0, monthly_earnings: 0 (logical starting values)
        // financial_stress: 50 (moderate), coach_trust_level: 50 (neutral)
        await query(`
          INSERT INTO user_characters (
            id, user_id, character_id, serial_number,
            level, experience, bond_level,
            current_health, max_health,
            total_battles, total_wins,
            wallet, debt, monthly_earnings, financial_stress, coach_trust_level
          ) VALUES ($1, $2, $3, $4, 50, 99999, 100, 9999, 9999, 0, 0, 0, 0, 0, 50, 50)
        `, [user_char_id, user_id, char.id, serial_number]);

        // Assign sleeping spot
        try {
          await headquarters_service.assignSleepingSpot(user_char_id, user_id);
        } catch (e) {
          // Non-fatal for dev grants
        }

        granted++;
        console.log(`✅ Granted character: ${char.name}`);
      } else {
        already_had++;
      }
    }

    // Update account with premium features
    await query(`
      UPDATE users
      SET
        subscription_tier = 'legendary',
        subscription_expires_at = NOW() + INTERVAL '365 days',
        level = 100,
        experience = 999999,
        rating = 2500,
        character_slot_capacity = 50
      WHERE id = $1
    `, [user_id]);

    // Add currency (removed ridiculous debug values - let character wallets handle starting money)
    await query(`
      INSERT INTO user_currency (user_id, battle_tokens, premium_currency)
      VALUES ($1, 0, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        battle_tokens = 0,
        premium_currency = 0,
        last_updated = CURRENT_TIMESTAMP
    `, [user_id]);

    res.json({
      success: true,
      message: 'Dev account setup complete',
      characters_granted: granted,
      characters_already_had: already_had,
      total_characters: characters.rows.length
    });
    
  } catch (error: any) {
    console.error('❌ Dev account setup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Test what frontend auth flow sees
router.get('/debug-frontend-auth', async (req: Request, res: Response) => {
  try {
    console.log('🔍 DEBUG: Frontend auth simulation');
    console.log('Headers:', req.headers);
    console.log('Cookies:', req.cookies);
    console.log('Origin:', req.headers.origin);
    
    // Try to get profile like frontend does
    const { authenticate_token } = require('../services/auth');
    const auth_req = req as any;

    // Manually run auth middleware
    const auth_result = new Promise((resolve, reject) => {
      authenticate_token(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(auth_req.user);
      });
    });

    try {
      const user = await auth_result;
      res.json({
        success: true,
        message: 'Frontend auth simulation successful',
        user,
        cookies: req.cookies,
        headers: {
          origin: req.headers.origin,
          user_agent: req.headers['user-agent']
        }
      });
    } catch (auth_error) {
      res.json({
        success: false,
        message: 'Frontend auth simulation failed',
        error: auth_error,
        cookies: req.cookies,
        headers: {
          origin: req.headers.origin,
          user_agent: req.headers['user-agent']
        }
      });
    }
  } catch (error: any) {
    console.error('Frontend auth debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Check what cookies browser is sending
router.get('/debug-cookies', async (req: Request, res: Response) => {
  try {
    console.log('🔍 COOKIE DEBUG: Request received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Cookies:', JSON.stringify(req.cookies, null, 2));
    console.log('Raw Cookie Header:', req.headers.cookie);
    
    res.json({
      success: true,
      cookies: req.cookies,
      raw_cookie_header: req.headers.cookie,
      origin: req.headers.origin,
      user_agent: req.headers['user-agent'],
      has_access_token: !!req.cookies.access_token,
      has_refresh_token: !!req.cookies.refresh_token
    });
  } catch (error: any) {
    console.error('Cookie debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Test pack generation manually
router.get('/debug-pack-generation', async (req: Request, res: Response) => {
  try {
    console.log('🔍 PACK DEBUG: Testing pack generation manually');

    const test_user_id = 'test-' + Date.now();

    // Test 1: Check pack templates
    const pack_templates_result = await db_adapter.query(
      'SELECT id, pack_type, created_at FROM claimable_packs WHERE pack_type = $1 LIMIT 1',
      ['standard_starter']
    );

    // Test 2: Check characters
    const characters_result = await db_adapter.query(
      'SELECT id, rarity FROM characters LIMIT 10',
      []
    );

    // Test 3: Try to generate a pack
    let pack_generation_result = null;
    let pack_generation_error = null;

    try {
      const { PackService } = require('../services/packService');
      const pack_service = new PackService();
      console.log('🔍 PACK DEBUG: About to call generatePack');
      const pack_token = await pack_service.generatePack('standard_starter', test_user_id);
      console.log('🔍 PACK DEBUG: generatePack succeeded, token:', pack_token);
      pack_generation_result = { pack_token, success: true };
    } catch (error: any) {
      console.error('🔍 PACK DEBUG: generatePack failed:', error);
      console.error('🔍 PACK DEBUG: Error stack:', error.stack);
      pack_generation_error = error.message;
    }

    res.json({
      success: true,
      pack_templates: pack_templates_result.rows,
      pack_template_count: pack_templates_result.rows.length,
      sample_characters: characters_result.rows,
      character_count: characters_result.rows.length,
      pack_generation: pack_generation_result,
      pack_generation_error
    });
  } catch (error: any) {
    console.error('Pack debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// FORCE CLEAR ALL COOKIES - debug endpoint
router.post('/force-clear-cookies', async (req: Request, res: Response) => {
  try {
    console.log('🧹 FORCE CLEARING ALL COOKIES');
    
    // Clear with multiple domain/path combinations to ensure complete clearing
    const cookie_options = [
      { path: '/', domain: undefined },
      { path: '/', domain: '.up.railway.app' },
      { path: '/', domain: 'blank-wars-clean-production.up.railway.app' },
    ];
    
    for (const options of cookie_options) {
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        ...options
      });
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        ...options
      });
    }
    
    res.json({
      success: true,
      message: 'All cookies cleared forcefully'
    });
  } catch (error: any) {
    console.error('Force clear cookies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Create missing user_character_echoes table
router.post('/create-echoes-table', async (req: Request, res: Response) => {
  try {
    console.log('🛠️ Creating missing user_character_echoes table...');
    
    const { query } = require('../database');
    
    // Create the table with the correct column name (character_template_id, not character_id)
    await query(`
      CREATE TABLE IF NOT EXISTS user_character_echoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        character_template_id VARCHAR(50) NOT NULL,
        echo_count INTEGER DEFAULT 0 CHECK (echo_count >= 0),
        total_echoes_ever INTEGER DEFAULT 0,
        last_conversion_at TIMESTAMP,
        total_converted_to_currency INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, character_template_id)
      )
    `);
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_user ON user_character_echoes (user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_character ON user_character_echoes (character_template_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_count ON user_character_echoes (echo_count)');
    
    console.log('✅ user_character_echoes table created successfully');
    
    res.json({
      success: true,
      message: 'user_character_echoes table created successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Failed to create user_character_echoes table:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Recreate missing card_packs table and restore template data
router.post('/recreate-card-packs-table', async (req: Request, res: Response) => {
  try {
    console.log('🛠️ Recreating missing card_packs table...');
    
    const { query } = require('../database');
    
    // Create the card_packs table with proper schema
    await query(`
      CREATE TABLE IF NOT EXISTS card_packs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        pack_type VARCHAR(50) NOT NULL,
        
        -- Contents and probabilities
        guaranteed_contents JSONB DEFAULT '[]'::jsonb,
        possible_contents JSONB DEFAULT '[]'::jsonb,
        total_cards INTEGER DEFAULT 5,
        
        -- Rarity distribution
        rarity_weights JSONB DEFAULT '{}'::jsonb,
        
        -- Pricing and availability
        cost_credits INTEGER DEFAULT 0,
        cost_real_money DECIMAL(10,2) DEFAULT 0.00,
        is_purchasable BOOLEAN DEFAULT TRUE,
        requires_level INTEGER DEFAULT 1,
        
        -- Time-limited availability
        available_from TIMESTAMP,
        available_until TIMESTAMP,
        max_purchases_per_user INTEGER,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    console.log('✅ card_packs table created');
    
    // Create a standard_starter pack template
    const starter_pack_result = await query(`
      INSERT INTO card_packs (
        name, description, pack_type, total_cards,
        rarity_weights, is_purchasable, is_active
      ) VALUES (
        'Standard Starter Pack',
        'Contains 3 random characters to get you started',
        'standard_starter',
        3,
        '{"common": 50, "uncommon": 30, "rare": 15, "epic": 4, "legendary": 1}',
        false,
        true
      ) RETURNING id
    `);

    const pack_template_id = starter_pack_result.rows[0].id;
    console.log('✅ Created standard_starter pack template:', pack_template_id);
    
    res.json({
      success: true,
      message: 'card_packs table recreated successfully',
      pack_template_id: pack_template_id
    });
    
  } catch (error: any) {
    console.error('❌ Failed to recreate card_packs table:', error);
    res.status(500).json({ error: error.message });
  }
});


// DEBUG: Check actual table structure before fixing
router.get('/debug-table-structure', async (req: Request, res: Response) => {
  try {
    const { query } = require('../database');

    // Get claimable_packs table structure
    const claimable_packs_structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'claimable_packs'
      ORDER BY ordinal_position;
    `);

    // Get card_packs table structure
    const card_packs_structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'card_packs'
      ORDER BY ordinal_position;
    `);

    res.json({
      success: true,
      claimable_packs: claimable_packs_structure.rows,
      card_packs: card_packs_structure.rows
    });
    
  } catch (error: any) {
    console.error('❌ Failed to get table structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Fix claimable_packs table missing user_id column
router.post('/fix-claimable-packs-table', async (req: Request, res: Response) => {
  try {
    console.log('🛠️ Fixing claimable_packs table schema...');
    
    const { query } = require('../database');
    
    // Add missing user_id column to claimable_packs table
    await query(`
      ALTER TABLE claimable_packs 
      ADD COLUMN IF NOT EXISTS user_id UUID;
    `);
    
    // Add foreign key constraint if it doesn't exist
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'claimable_packs_user_id_fkey'
        ) THEN
          ALTER TABLE claimable_packs 
          ADD CONSTRAINT claimable_packs_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;
    `);
    
    console.log('✅ claimable_packs table schema fixed');
    
    res.json({
      success: true,
      message: 'claimable_packs table schema fixed successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fix claimable_packs table:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
