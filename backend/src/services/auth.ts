import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { query, cache } from '../database';
import { User, AuthRequest } from '../types';

// Re-export AuthRequest for other modules
export { AuthRequest };
import { PackService } from './packService';
import { InternalMailService } from './internalMailService';
import { DailyLoginService } from './dailyLoginService';
import { headquarters_service } from './headquartersService';
import { applyHqTierEffects } from './psychologyService';

// Load environment variables
config();

const ACCESS_TOKEN_EXPIRY = '4h';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

export class AuthService {
  private access_secret: string;
  private refresh_secret: string;
  private pack_service: PackService;
  private mail_service: InternalMailService;
  private daily_login_service: DailyLoginService;

  constructor() {
    // SECURITY: Never use default JWT secrets
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
    }

    this.access_secret = process.env.JWT_ACCESS_SECRET;
    this.refresh_secret = process.env.JWT_REFRESH_SECRET;
    this.pack_service = new PackService();
    this.mail_service = new InternalMailService();
    this.daily_login_service = new DailyLoginService();

    // Ensure secrets are strong enough
    if (this.access_secret.length < 32 || this.refresh_secret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters long');
    }
  }

  // Generate tokens
  private generate_tokens(user_id: string) {
    const access_token = jwt.sign({ user_id, type: 'access' }, this.access_secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refresh_token = jwt.sign({ user_id, type: 'refresh' }, this.refresh_secret, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { access_token, refresh_token };
  }

  // Hash password
  private async hash_password(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  private async verify_password(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Register new user
  async register(user_data: {
    username: string;
    email: string;
    password: string;
    claim_token?: string; // Optional claim token for gifted packs
  }): Promise<{ user: User; tokens: { access_token: string; refresh_token: string } }> {
    const { username, email, password, claim_token } = user_data;

    console.log('🔄 Starting registration for:', username, email);

    // Validate input
    if (!username || !email || !password) {
      throw new Error('Missing required fields');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    console.log('✅ Input validation passed');

    // Check if user exists
    console.log('🔍 Checking for existing user...');
    const existing_user = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing_user.rows.length > 0) {
      throw new Error('User already exists');
    }

    console.log('✅ User doesn\'t exist, proceeding with registration');

    // Hash password
    console.log('🔐 Hashing password...');
    const password_hash = await this.hash_password(password);
    console.log('✅ Password hashed successfully');

    // Create user
    console.log('👤 Creating user in database...');
    const user_id = uuidv4();
    await query(
      `INSERT INTO users (id, username, email, password_hash, subscription_tier, level, experience, total_battles, total_wins, rating, character_slot_capacity, coach_name)
       VALUES ($1, $2, $3, $4, 'free', 1, 0, 0, 0, 1000, 12, $5)`,
      [user_id, username, email, password_hash, username]
    );

    console.log('✅ User created successfully');

    // Get the created user
    console.log('📋 Fetching created user data...');
    const result = await query(
      'SELECT id, username, email, subscription_tier, level, experience, total_battles, total_wins, rating, created_at, updated_at, coach_name FROM users WHERE id = $1',
      [user_id]
    );

    const user = result.rows[0];
    console.log('✅ User data fetched successfully');

    console.log('🔑 Generating tokens...');
    const tokens = this.generate_tokens(user_id);
    console.log('✅ Tokens generated successfully');

    // --- CREATE INITIAL HEADQUARTERS ---
    console.log('🏠 Creating initial headquarters for new user...');
    const hq = await headquarters_service.createInitialHeadquarters(user_id);
    const hq_id = hq.id;
    const hq_tier = hq.tier_id;
    console.log(`✅ Headquarters created with ID: ${hq_id} and Tier: ${hq_tier}`);
    // --- END INITIAL HEADQUARTERS ---

    // --- NEW USER STARTER PACK LOGIC ---
    console.log('🎁 Generating starter pack for new user...');

    // 🔍 ZOMBIE HUNT: Check if user already has characters (should be ZERO for new user!)
    const existing_chars_check = await query(
      'SELECT character_id FROM user_characters WHERE user_id = $1',
      [user_id]
    );
    if (existing_chars_check.rows.length > 0) {
      console.error(`🧟 ZOMBIE ALERT: New user ${user_id} already has ${existing_chars_check.rows.length} characters:`,
        existing_chars_check.rows.map((r: { character_id: string }) => r.character_id));
    } else {
      console.log(`✅ New user ${user_id} has 0 characters (correct)`);
    }

    // Generate a standard starter pack for new users
    const starter_pack_token = await this.pack_service.generate_pack('standard_starter', user_id);
    console.log(`✅ Starter pack generated with token: ${starter_pack_token}`);

    // Log what's in the pack BEFORE claiming
    const pack_contents = await query(
      'SELECT character_id FROM claimable_pack_contents WHERE claimable_pack_id = $1',
      [starter_pack_token]
    );
    console.log(`📦 Pack contents BEFORE claim:`, pack_contents.rows.map((r: { character_id: string }) => r.character_id));

    // Auto-claim the starter pack for the new user
    const pack_result = await this.pack_service.claim_pack(user_id, starter_pack_token);
    console.log(`✅ Starter pack claimed! Granted characters: ${pack_result.granted_characters.length}, Echoes: ${pack_result.echoes_gained.length}`);
    console.log(`📦 Actually granted characters:`, pack_result.granted_characters);

    // Handle claim token if provided (additional gift pack)
    if (claim_token) {
      console.log(`🎁 Processing additional claim token: ${claim_token}`);
      const additional_pack_result = await this.pack_service.claim_pack(user_id, claim_token);
      console.log(`✅ Additional pack claimed! Granted characters: ${additional_pack_result.granted_characters.length}, Echoes: ${additional_pack_result.echoes_gained.length}`);
    }
    // --- END NEW USER STARTER PACK LOGIC ---

    // --- CREATE DEFAULT TEAM FROM STARTER CHARACTERS ---
    console.log('👥 Creating default team from starter characters...');

    // Get the user's characters (should be 3 from starter pack)
    const user_chars_result = await query(
      'SELECT id FROM user_characters WHERE user_id = $1 LIMIT 3',
      [user_id]
    );

    const char_ids = user_chars_result.rows.map((r: { id: string }) => r.id);

    if (char_ids.length === 0) {
      throw new Error('No characters found for new user - cannot create team');
    }

    console.log(`📋 Found ${char_ids.length} characters for team creation:`, char_ids);

    // Create team record
    const team_result = await query(
      `INSERT INTO teams (
        user_id,
        team_name,
        character_slot_1,
        character_slot_2,
        character_slot_3,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id`,
      [
        user_id,
        'Default Team',
        char_ids[0] || null,
        char_ids[1] || null,
        char_ids[2] || null
      ]
    );

    const team_id = team_result.rows[0]?.id;
    if (!team_id) {
      throw new Error('Failed to create team - no ID returned');
    }
    console.log(`✅ Team created with ID: ${team_id}`);


    // Create team_context for this team
    console.log(`👥 [TEAM-CONTEXT-DEBUG] About to INSERT team_context for team_id: ${team_id}`);
    const team_context_result = await query(
      `INSERT INTO team_context (
        team_id,
        hq_tier,
        current_scene_type,
        current_time_of_day,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id`,
      [team_id, hq_tier, 'mundane', 'afternoon']
    );
    const team_context_id = team_context_result.rows[0]?.id;
    if (!team_context_id) {
      throw new Error(`CRITICAL: Failed to create team_context for team ${team_id} - registration cannot continue`);
    }
    console.log(`✅ Team context created with ID: ${team_context_id} for team: ${team_id}`);
    // --- END CREATE DEFAULT TEAM ---

    // --- CREATE SYSTEM CHARACTER ENTRIES (1 random from each role) ---
    console.log('🧑‍⚕️ Creating system character entries for new user...');
    try {
      const system_chars_result = await query(
        `INSERT INTO user_characters (user_id, character_id, nickname, current_health, level, experience)
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'therapist' ORDER BY RANDOM() LIMIT 1)
        UNION ALL
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'judge' ORDER BY RANDOM() LIMIT 1)
        UNION ALL
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'host' ORDER BY RANDOM() LIMIT 1)
        UNION ALL
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'real_estate_agent' ORDER BY RANDOM() LIMIT 1)
        UNION ALL
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'trainer' ORDER BY RANDOM() LIMIT 1)
        UNION ALL
        (SELECT $1::uuid, c.id, c.name, 100, 1, 0 FROM characters c WHERE c.role = 'mascot' ORDER BY RANDOM() LIMIT 1)
        RETURNING id`,
        [user_id]
      );
      console.log(`✅ Created ${system_chars_result.rowCount} system character entries for user`);
    } catch (sys_char_error) {
      console.error('❌ Failed to create system character entries:', sys_char_error);
      // Don't fail registration if system chars fail - they can be created later
    }
    // --- END SYSTEM CHARACTER ENTRIES ---

    // --- ASSIGN CONTESTANT CHARACTERS TO HEADQUARTERS ---
    // System characters (therapists, judges, trainers, etc.) do NOT get assigned to headquarters
    console.log('🛏️ Assigning contestant characters to headquarters beds...');
    const contestant_chars_result = await query(
      `SELECT uc.id FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.user_id = $1 AND c.role = 'contestant'
       ORDER BY uc.id ASC`,
      [user_id]
    );

    // Set headquarters_id only on contestant characters
    await query(
      `UPDATE user_characters uc
       SET headquarters_id = $1
       FROM characters c
       WHERE uc.character_id = c.id AND uc.user_id = $2 AND c.role = 'contestant'`,
      [hq_id, user_id]
    );

    // Assign each contestant to best available bed in creation order
    // Also apply HQ tier psychological effects (stress, morale, fatigue from living conditions)
    for (const char of contestant_chars_result.rows) {
      await headquarters_service.assignSleepingSpot(char.id, user_id);
      await applyHqTierEffects(char.id, hq_tier);
    }
    console.log(`✅ Assigned ${contestant_chars_result.rowCount} contestant characters to headquarters with tier effects`);
    // --- END ASSIGN CONTESTANT CHARACTERS TO HEADQUARTERS ---

    // --- ASSIGN HOST TO ALL CONTESTANT CHARACTERS ---
    // Get the user's assigned host character and set host_id on all contestants
    console.log('🎭 Assigning host to contestant characters...');
    const user_host_result = await query(
      `SELECT uc.character_id FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.user_id = $1 AND c.role = 'host'
       LIMIT 1`,
      [user_id]
    );
    const assigned_host_id = user_host_result.rows[0]?.character_id;
    if (!assigned_host_id) {
      throw new Error(`CRITICAL: No host character found for user ${user_id} - registration cannot continue`);
    }

    await query(
      `UPDATE user_characters uc
       SET host_id = $1
       FROM characters c
       WHERE uc.character_id = c.id AND uc.user_id = $2 AND c.role = 'contestant'`,
      [assigned_host_id, user_id]
    );
    console.log(`✅ Assigned host '${assigned_host_id}' to all contestant characters`);
    // --- END ASSIGN HOST TO CONTESTANT CHARACTERS ---

    // --- NEW USER WELCOME MAIL ---
    try {
      console.log('📧 Sending welcome mail to new user...');
      await this.mail_service.sendWelcomeMail(user_id);
      console.log('✅ Welcome mail sent successfully');
    } catch (mail_error) {
      console.error('❌ Failed to send welcome mail:', mail_error);
      // Don't fail registration if mail fails
    }
    // --- END WELCOME MAIL ---

    // Cache user session - skip caching to avoid timeout
    // await cache.set(`user:${user_id}`, JSON.stringify(user), 900); // 15 minutes
    // Temporarily disabled to test if cache is causing timeout

    console.log('🎉 Registration completed successfully for:', username);

    return { user, tokens };
  }

  // Login user
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: User; tokens: { access_token: string; refresh_token: string } }> {
    const { email, password } = credentials;

    // Find user
    const result = await query(
      `SELECT id, username, email, password_hash, subscription_tier, subscription_expires_at,
              level, experience, total_battles, total_wins, rating, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const is_valid_password = await this.verify_password(password, user.password_hash);
    if (!is_valid_password) {
      throw new Error('Invalid credentials');
    }

    // Remove password hash from user object
    delete user.password_hash;

    const tokens = this.generate_tokens(user.id);

    // Check and award daily login rewards (async, don't wait)
    this.daily_login_service.checkAndAwardDailyLogin(user.id).catch(error => {
      console.error('Error checking daily login:', error);
      // Don't fail login if daily reward fails
    });

    // Cache user session
    // await cache.set(`user:${user.id}`, JSON.stringify(user), 900); // 15 minutes
    // Temporarily disabled to test if cache is causing timeout

    return { user, tokens };
  }

  // Refresh tokens
  async refresh_tokens(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const decoded = jwt.verify(refresh_token, this.refresh_secret) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if user still exists
      const result = await query('SELECT id FROM users WHERE id = $1', [decoded.user_id]);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return this.generate_tokens(decoded.user_id);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Get user profile
  async get_profile(user_id: string): Promise<User> {
    // Try cache first
    // const cached = await cache.get(`user:${user_id}`);
    // if (cached) {
    //   return JSON.parse(cached);
    // }

    // Fetch from database
    const result = await query(
      `SELECT id, username, email, subscription_tier, subscription_expires_at,
              level, experience, total_battles, total_wins, rating, created_at, updated_at
       FROM users WHERE id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Cache for future requests
    // await cache.set(`user:${user_id}`, JSON.stringify(user), 900);

    return user;
  }

  // Logout (invalidate tokens)
  async logout(user_id: string): Promise<void> {
    // await cache.del(`user:${user_id}`);
    // Temporarily disabled to test if cache is causing timeout
  }
}

// Middleware to authenticate requests
export const authenticate_token = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // SECURITY: Read token from http_only cookie instead of Authorization header
    const token = req.cookies.access_token;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

    if (decoded.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Get user from cache or database
    const auth_service = new AuthService();
    const user = await auth_service.get_profile(decoded.user_id);

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication failed:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional authentication (doesn't fail if no token)
export const optional_auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth_header = req.headers.authorization;
    const token = auth_header && auth_header.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
      if (decoded.type === 'access') {
        const auth_service = new AuthService();
        req.user = await auth_service.get_profile(decoded.user_id);
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
};
