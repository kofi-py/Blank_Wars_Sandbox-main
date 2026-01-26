console.log('🔵 Starting server.ts execution...');

// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('🔵 Loaded .env file for local development');
}

console.log('🔵 Environment loaded, starting imports...');

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { deliverMessage } from './services/agiInbox';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Open_ai from 'openai';
import { initialize_database, query, cache, db } from './database/index';
import { initializeTokenizer } from './services/tokenizer';
import { BattleManager } from './services/battleService';
import { db_adapter } from './services/databaseAdapter';
import { AuthService, authenticate_token } from './services/auth';
import { ai_chat_service } from './services/aiChatService';
import { UserService } from './services/userService';
import { payment_service } from './services/PaymentService';
import { LobbyService } from './services/lobbyService';
import runSchemaGuard from './utils/schemaGuard';
import { register, chat_latency } from './metrics';
import { resolveAgentId } from './services/agentResolver';

// Import route modules
import authRouter from './routes/auth';
import userRouter from './routes/userRoutes';
import characterRouter from './routes/characterRoutes';
import equipmentRouter from './routes/equipmentRoutes';
import powersRouter from './routes/powers';
import attributesRouter from './routes/attributes';
import resourcesRouter from './routes/resources';
import spellsRouter from './routes/spells';
import { create_battle_router } from './routes/battleRoutes';
import usageRouter from './routes/usage';
import echoRouter from './routes/echoRoutes';
import trainingRouter from './routes/trainingRoutes';
import socialRouter from './routes/socialRoutes';
import guildRouter from './routes/guildRoutes';
import headquartersRouter from './routes/headquartersRoutes';
import coachingRouter from './routes/coachingRoutes';
import coachProgressionRouter from './routes/coachProgressionRoutes';
import characterProgressionRouter from './routes/characterProgressionRoutes';
import healingRouter from './routes/healingRoutes';
import eventsRouter from './routes/eventsRoutes';
import memoriesRouter from './routes/memoriesRoutes';
import shopRouter from './routes/shopRoutes';
import itemRouter from './routes/itemRoutes';
import teamEquipmentRouter from './routes/teamEquipmentRoutes';
import teamRouter from './routes/teamRoutes';
import aiRouter from './routes/ai';
import testRouter from './routes/testRoutes';
import financialsRouter from './routes/financials';
import eventsRoutes from './routes/eventsRoutes';
import devSessionRouter from './routes/devSession';
import cardPackRouter from './routes/cardPackRoutes';
import challengeRouter from './routes/challengeRoutes';
import { webhooks } from './routes/webhooks';
import ticketRouter from './routes/ticketRoutes';
import internalMailRouter from './routes/internalMailRoutes';
import lostAndFoundRouter from './routes/lostAndFoundRoutes';
import stakingRouter from './routes/stakingRoutes';
import interopRouter from './routes/interopRoutes';
import cardanoRouter from './routes/cardanoRoutes';
import leaderboardRouter from './routes/leaderboardRoutes';
import therapyRouter from './routes/therapyRoutes';
import minigameRouter from './routes/minigameRoutes';
// import levelUpRouter from './routes/levelUpRoutes'; // ADMIN TESTING - Commented out for production
import { healing_scheduler } from './services/healingScheduler';
import { startAutonomousTrashTalkScheduler } from './services/aiTrashTalkService';
import { initializeHealingFacilities } from './services/healingFacilitiesData';
import { ticket_cron_service } from './services/ticketCronService';
import { initializeBondEventSubscriptions } from './services/bondEventSubscriber';
import jwt from 'jsonwebtoken';
import { api_limiter, auth_limiter, battle_limiter, ws_limiter } from './middleware/rateLimiter';
import cookie_parser from 'cookie-parser';
import { skip_csrf, get_csrf_token, csrf_error_handler } from './middleware/csrf';
import path from 'path';


// Initialize services
const auth_service = new AuthService();
const user_service = new UserService();
const lobby_service = new LobbyService();

// Initialize Bond Event Subscriptions
initializeBondEventSubscriptions();

// Create Express app
const app = express();
const http_server = createServer(app);

// Initialize Open_ai client
const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Socket.io with CORS
let allowed_origins: string[];

if (process.env.NODE_ENV === 'production') {
  if (!process.env.CORS_ORIGINS) {
    throw new Error('CORS_ORIGINS environment variable is required in production');
  }
  allowed_origins = process.env.CORS_ORIGINS.split(",").map(s => s.trim());
} else {
  // Local development origins
  allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3007',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3007'
  ];
}

const io = new Server(http_server, {
  path: '/socket.io',
  cors: {
    origin: (origin, cb) => {
      // Allow requests with no origin
      if (!origin) return cb(null, true);
      // Allow explicit allowlist
      if (allowed_origins.includes(origin)) return cb(null, true);
      // Allow Vercel preview deployments
      if (origin.endsWith('.vercel.app')) return cb(null, true);
      // Reject others
      return cb(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'], // 🚫 disable polling server-side too
  pingInterval: 25_000,
  pingTimeout: 60_000,
});

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Middleware
app.use(helmet());

// === CORS (place BEFORE any routes) ===
if (!process.env.CORS_ORIGINS) {
  throw new Error('CORS_ORIGINS environment variable is required');
}
const allowed = process.env.CORS_ORIGINS.split(",").map(s => s.trim());

console.log('🌐 CORS allowed origins:', allowed);
console.log('🌐 CORS_ORIGINS env var:', process.env.CORS_ORIGINS);

const cors_opts: cors.CorsOptions = {
  origin(origin, cb) {
    // Log the origin for debugging
    console.log('🌐 CORS request from origin:', origin);

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);

    // Check if origin is in the explicit allowlist
    if (allowed.includes(origin)) return cb(null, true);

    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      console.log('✅ CORS allowed Vercel preview:', origin);
      return cb(null, true);
    }

    // Reject all others
    console.warn('❌ CORS rejected origin:', origin);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-csrf-token"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204, // preflight status
};

app.use(cors(cors_opts));
app.options("*", cors(cors_opts)); // ensure preflight returns the headers
// === end CORS ===
app.use(morgan('dev'));
app.use(compression());
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await payment_service.handleWebhook(req.body, req.headers['stripe-signature'] as string);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// JSON body parser (must be after raw body for webhooks)
app.use(express.json());
app.use(cookie_parser());

// Dev session routes (before auth middleware)
app.use('/dev-session', devSessionRouter);
app.use('/api/dev-session', devSessionRouter);
app.use('/auth/dev-session', devSessionRouter);
app.use('/api/auth/dev-session', devSessionRouter);

// Apply rate limiting to all routes
app.use('/api/', api_limiter);

// Apply CSRF protection to state-changing routes (skip in development)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', skip_csrf(['/health', '/auth/refresh', '/auth/login', '/auth/register', '/auth/logout', '/auth/test-login', '/webhooks/stripe', '/ai/', '/coaching/']));
} else {
  console.log('🔓 CSRF protection disabled in development mode');
}

// CSRF token endpoint
app.get('/api/csrf-token', get_csrf_token);

// Serve static files from the public directory
const public_path = path.join(__dirname, '..', '..', 'public');
console.log('📁 Serving static files from:', public_path);
app.use(express.static(public_path));

// Route modules
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/characters', characterRouter);
app.use('/api/events', eventsRoutes);
app.use('/api/equipment', equipmentRouter);
app.use('/api/powers', powersRouter);
app.use('/api/attributes', attributesRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/spells', spellsRouter);
app.use('/api/usage', usageRouter);
app.use('/api/packs', (req, res, next) => {
  console.log('REQUEST TO /api/packs:', req.method, req.path);
  next();
}, cardPackRouter);

// TEMPORARY: Direct pack test endpoint to bypass router issues
app.post('/api/direct-pack-test', async (req, res) => {
  console.log('🧪 Direct pack test endpoint called');
  try {
    res.json({
      success: true,
      message: 'Direct pack test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Direct pack test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Simple pack purchase endpoint to bypass cardPackRouter issues
app.post('/api/packs/purchase', authenticate_token, async (req: any, res) => {
  console.log('🛒 Direct pack purchase endpoint called');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { pack_type = 'demo' } = req.body;
    const user_id = req.user.id;

    console.log(`🎁 User ${user_id} purchasing ${pack_type} pack`);

    // Use real PackService instead of mock data
    const { PackService } = await import('./services/packService');
    const pack_service = new PackService();

    // Generate and claim pack
    const pack_id = await pack_service.generate_pack(pack_type, user_id);
    const result = await pack_service.claim_pack(user_id, pack_id);

    console.log(`✅ Pack opened successfully: ${result.granted_characters.length} characters, ${result.echoes_gained.length} echoes`);

    res.json({
      success: true,
      granted_characters: result.granted_characters,
      echoes_gained: result.echoes_gained
    });

  } catch (error: any) {
    console.error('Error in direct pack purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Card redemption endpoint
app.post('/api/cards/redeem', authenticate_token, async (req: any, res) => {
  console.log('🎫 /api/cards/redeem endpoint called');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { serial_number } = req.body;
    if (!serial_number) {
      return res.status(400).json({ error: 'Serial number is required' });
    }

    // Placeholder for card redemption logic
    res.json({
      success: true,
      message: 'Card redemption feature coming soon',
      serial_number
    });
  } catch (error: any) {
    console.error('Error redeeming card:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/echoes', echoRouter);
app.use('/api/training', trainingRouter);
app.use('/api/social', socialRouter);
app.use('/api/guilds', guildRouter);
app.use('/api/leaderboards', leaderboardRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/headquarters', headquartersRouter);
app.use('/api/coaching', coachingRouter);
app.use('/api/coach-progression', coachProgressionRouter);
app.use('/api/character-progression', characterProgressionRouter);
app.use('/api/healing', healingRouter);
app.use('/api/therapy', therapyRouter);
app.use('/api/events', eventsRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/shop', shopRouter);
app.use('/api/items', itemRouter);
app.use('/api/team-equipment', teamEquipmentRouter);
app.use('/api/team', teamRouter);
app.use('/api/ai', aiRouter);
app.use('/api', financialsRouter);
app.use('/api/lost-and-found', lostAndFoundRouter);
app.use('/api/staking', stakingRouter);
app.use('/api/v1/interop', interopRouter);
app.use('/api/cardano', cardanoRouter);
app.use('/api/minigames', minigameRouter);

// --- Webhook endpoint for LocalAGI (absolute path expected by .env) ---
app.post('/api/webhook/response', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const message_id = b.message_id || b.id || b.message_id;
    const text =
      b.text ??
      b.output ??
      b.content ??
      b.choices?.[0]?.message?.content ??
      null;
    if (!message_id || !text) {
      return res.status(400).json({ error: 'missing message_id or text' });
    }
    console.log('[webhook] deliver', message_id, (String(text).slice(0, 80) + '…'));
    deliverMessage(String(message_id), String(text));
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[webhook] error', e?.message || e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.use('/api/test', testRouter);
app.use('/api', webhooks);
app.use('/api/tickets', ticketRouter);
app.use('/api/mail', internalMailRouter);
// app.use('/api/level-up', levelUpRouter); // ADMIN TESTING - Commented out for production

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});


// New Card Pack Routes (These are now handled by cardPackRouter)
// app.post('/api/packs/purchase', authenticate_token, async (req, res) => {
//   try {
//     // @ts-ignore
//     const user_id = req.user.id;
//     const { pack_type, quantity } = req.body;
//     const session = await paymentService.createCheckoutSession(user_id, pack_type, quantity);
//     res.json(session);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/cards/redeem', authenticate_token, async (req, res) => {
//   try {
//     // @ts-ignore
//     const user_id = req.user.id;
//     const { serial_number } = req.body;
//     const character = await cardPackService.redeemDigitalCard(user_id, serial_number);
//     res.json(character);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    localai: {
      base_url: process.env.LOCALAI_URL || 'http://localhost:11435',
      webhook_enabled: process.env.USE_AGI_WEBHOOK === 'true',
      webhook_path: process.env.AGI_WEBHOOK_PATH || '/api/webhook/agi-response',
      public_base_url: process.env.PUBLIC_BACKEND_BASE_URL || `http://localhost:${PORT}`,
      long_term_memory: !!process.env.LOCAL_RAG_URL
    },
    message: 'BlankWars API Server - LocalAGI with webhooks enabled'
  });
});


// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Blank Wars API Server',
    version: '1.0.0',
    status: 'running',
  });
});










// Initialize Battle Manager
const battle_manager = new BattleManager(io);

// Battle routes (requires battle_manager instance)
app.use('/api/battles', create_battle_router(battle_manager));

// Helper function to authenticate user from token
async function authenticateSocket(token: string): Promise<{ id: string; username: string; rating: number } | null> {
  try {
    // Use real JWT verification only
    const jwt_secret = process.env.JWT_ACCESS_SECRET!;
    const decoded = jwt.verify(token, jwt_secret) as any;

    if (decoded.type !== 'access') {
      return null;
    }

    const user = await auth_service.get_profile(decoded.user_id);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      rating: user.rating || 1000
    };
  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

// Apply rate limiting middleware to WebSocket connections
// TEMPORARILY DISABLED FOR DEMO - Re-enable for production
/*
io.use((socket, next) => {
  const req = socket.request as any;
  req.ip = socket.handshake.address;
  
  ws_limiter(req, {} as any, (err?: any) => {
    if (err) {
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });
});
*/

// Socket.io handlers with battle system integration
io.on('connection', async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  console.log(`📡 Total connected clients: ${io.sockets.sockets.size}`);

  // Send immediate connection confirmation
  socket.emit('connection_established', {
    message: 'Connected to Blank Wars server',
    socket_id: socket.id
  });

  let authenticated_user: { id: string; username: string } | null = null;

  // Per-socket rate limiting for events
  const event_rate_limits = new Map<string, number[]>();
  const check_event_rate_limit = (event_name: string, limit_per_minute: number = 30): boolean => {
    const key = `${socket.id}:${event_name}`;
    const now = Date.now();
    const window_start = now - 60000; // 1 minute window

    // Get existing events for this key
    let events = event_rate_limits.get(key) || [];

    // Remove events older than 1 minute
    events = events.filter(time => time > window_start);

    // Check if we've exceeded the limit
    if (events.length >= limit_per_minute) {
      return false; // Rate limited
    }

    // Add this event and update the map
    events.push(now);
    event_rate_limits.set(key, events);

    // Clean up old entries to prevent memory leak
    if (event_rate_limits.size > 1000) {
      for (const [k, events] of event_rate_limits.entries()) {
        const recent_events = events.filter(time => now - time <= 300000); // Keep events from last 5 minutes
        if (recent_events.length === 0) {
          event_rate_limits.delete(k);
        } else {
          event_rate_limits.set(k, recent_events);
        }
      }
    }

    return true;
  };

  // Helper function to authenticate from cookies or token
  const authenticate_user = async (token_or_socket: string | any): Promise<{ id: string; username: string; rating: number } | null> => {
    try {
      let token: string | null = null;

      if (typeof token_or_socket === 'string') {
        // Direct token provided
        token = token_or_socket;
      } else {
        // Extract from socket cookies
        const cookies = token_or_socket.request?.headers?.cookie;
        if (cookies) {
          const cookie_parser = require('cookie-parser');
          const parsed_cookies: any = {};
          cookies.split(';').forEach((cookie: string) => {
            const [key, value] = cookie.trim().split('=');
            parsed_cookies[key] = decodeURIComponent(value);
          });
          token = parsed_cookies.access_token;
        }
      }

      if (!token) {
        return null;
      }

      return await authenticateSocket(token);
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  };

  // Try automatic authentication from cookies on connection
  const try_auto_auth = async () => {
    try {
      const user = await authenticate_user(socket);
      if (user) {
        authenticated_user = user;
        (socket as any).user_id = user.id;
        socket.data = socket.data || {};
        socket.data.user_id = user.id;
        battle_manager.set_user_socket(user.id, socket.id);
        socket.emit('auth_success', { user_id: user.id, username: user.username });
        console.log(`👤 User auto-authenticated from cookies: ${user.username} (${user.id})`);
        // Send current user profile to the client
        const user_profile = await user_service.findUserProfile(user.id);
        if (user_profile) {
          socket.emit('user_profile_update', user_profile);
        }
        return true;
      }
    } catch (error) {
      console.log('Auto-authentication failed, waiting for manual auth');
    }
    return false;
  };

  // Try auto-authentication first
  await try_auto_auth();

  // Manual authentication (for explicit token-based auth)
  socket.on('auth', async (token: string) => {
    try {
      const user = await authenticate_user(token);
      if (user) {
        authenticated_user = user;
        (socket as any).user_id = user.id;
        battle_manager.set_user_socket(user.id, socket.id);
        socket.emit('auth_success', { user_id: user.id, username: user.username });
        console.log(`👤 User manually authenticated: ${user.username} (${user.id})`);
        // Send current user profile to the client
        const user_profile = await user_service.findUserProfile(user.id);
        if (user_profile) {
          socket.emit('user_profile_update', user_profile);
        }
      } else {
        socket.emit('auth_error', { error: 'Invalid token' });
        socket.disconnect();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
      socket.disconnect();
    }
  });

  // Lobby management
  socket.on('create_lobby', async (data) => {
    if (!authenticated_user) {
      socket.emit('lobby_error', { error: 'Not authenticated' });
      return;
    }
    try {
      const user_profile = await user_service.findUserProfile(authenticated_user.id);
      if (!user_profile) {
        socket.emit('lobby_error', { error: 'User profile not found' });
        return;
      }
      const lobby = lobby_service.createLobby(data.name, user_profile, data.max_members, data.is_private);
      socket.join(lobby.id);
      io.to(lobby.id).emit('lobby_update', lobby);
      console.log(`🛋️ Lobby created: ${lobby.name} by ${authenticated_user.username}`);
    } catch (error) {
      console.error('Create lobby error:', error);
      socket.emit('lobby_error', { error: (error as Error).message });
    }
  });

  socket.on('join_lobby', async (data) => {
    if (!authenticated_user) {
      socket.emit('lobby_error', { error: 'Not authenticated' });
      return;
    }
    try {
      const user_profile = await user_service.findUserProfile(authenticated_user.id);
      if (!user_profile) {
        socket.emit('lobby_error', { error: 'User profile not found' });
        return;
      }
      const lobby = lobby_service.joinLobby(data.lobby_id, user_profile);
      if (lobby) {
        socket.join(lobby.id);
        io.to(lobby.id).emit('lobby_update', lobby);
        console.log(`🚪 ${authenticated_user.username} joined lobby ${lobby.name}`);
      } else {
        socket.emit('lobby_error', { error: 'Lobby not found or full' });
      }
    } catch (error) {
      console.error('Join lobby error:', error);
      socket.emit('lobby_error', { error: (error as Error).message });
    }
  });

  socket.on('leave_lobby', async (lobby_id: string) => {
    if (!authenticated_user) return;
    try {
      const lobby = lobby_service.leaveLobby(lobby_id, authenticated_user.id);
      socket.leave(lobby_id);
      if (lobby) {
        io.to(lobby.id).emit('lobby_update', lobby);
      } else {
        // Lobby was closed
        io.to(lobby_id).emit('lobby_closed', { lobby_id });
      }
      console.log(`🚶 ${authenticated_user.username} left lobby ${lobby_id}`);
    } catch (error) {
      console.error('Leave lobby error:', error);
      socket.emit('lobby_error', { error: (error as Error).message });
    }
  });

  socket.on('set_ready', async (data: { lobby_id: string; is_ready: boolean }) => {
    if (!authenticated_user) return;
    try {
      const lobby = lobby_service.setMemberReady(data.lobby_id, authenticated_user.id, data.is_ready);
      if (lobby) {
        io.to(lobby.id).emit('lobby_update', lobby);
      }
    } catch (error) {
      console.error('Set ready error:', error);
      socket.emit('lobby_error', { error: (error as Error).message });
    }
  });

  socket.on('start_battle', async (lobby_id: string) => {
    if (!authenticated_user) return;
    try {
      if (!lobby_service.canStartBattle(lobby_id, authenticated_user.id)) {
        socket.emit('lobby_error', { error: 'Cannot start battle: not host or not all members ready' });
        return;
      }
      const lobby = lobby_service.getLobbyById(lobby_id);
      if (!lobby) {
        socket.emit('lobby_error', { error: 'Lobby not found' });
        return;
      }

      // Placeholder for actual battle initiation
      // In a real scenario, you'd pass lobby members to battle_manager
      console.log(`🚀 Battle starting from lobby ${lobby.name}!`);
      io.to(lobby.id).emit('battle_starting', { lobby_id });

      // For now, just signal that battle is starting
      // TODO: Implement proper lobby-to-battle flow
      io.to(lobby.id).emit('battle_started', {
        message: 'Battle system integration pending',
        lobby_id: lobby.id
      });
      // Remove lobby after battle starts
      lobby_service.leaveLobby(lobby_id, lobby.host_id); // Host leaves, which closes the lobby

    } catch (error) {
      console.error('Start battle error:', error);
      socket.emit('lobby_error', { error: (error as Error).message });
    }
  });

  socket.on('list_public_lobbies', () => {
    const public_lobbies = lobby_service.listPublicLobbies();
    socket.emit('public_lobbies_list', public_lobbies);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    if (authenticated_user) {
      battle_manager.remove_user_socket(authenticated_user.id);
      console.log(`👤 User ${authenticated_user.username} disconnected`);
    }

    // Clean up rate limit entries for this socket
    for (const key of event_rate_limits.keys()) {
      if (key.startsWith(`${socket.id}:`)) {
        event_rate_limits.delete(key);
      }
    }
  });

  // Legacy authenticate event removed for security
  socket.on('authenticate', async (data) => {
    console.log(`🚫 Legacy authentication attempt blocked: ${data.username}`);
    socket.emit('authenticated', {
      success: false,
      error: 'Legacy authentication disabled. Please use proper JWT authentication.'
    });
  });

  // Matchmaking with rate limiting
  socket.on('find_match', async (data) => {
    if (!authenticated_user) {
      socket.emit('match_error', { error: 'Not authenticated' });
      return;
    }

    // Rate limit matchmaking requests (max 10 per minute)
    if (!check_event_rate_limit('find_match', 10)) {
      socket.emit('match_error', { error: 'Rate limit exceeded. Please wait before searching again.' });
      return;
    }

    try {
      console.log(`⚔️ Matchmaking request from ${authenticated_user.username}:`, data);

      const result = await battle_manager.find_match(
        authenticated_user.id,
        data.character_id,
        data.mode || 'ranked'
      );

      socket.emit('match_result', result);
    } catch (error) {
      console.error('Matchmaking error:', error);
      socket.emit('match_error', { error: (error as Error).message });
    }
  });

  // Legacy find_battle event
  socket.on('find_battle', async (data) => {
    if (!authenticated_user) {
      socket.emit('battle_error', { error: 'Not authenticated' });
      return;
    }

    try {
      console.log(`⚔️ Legacy battle request from ${authenticated_user.username}`);

      // Try to find user's characters
      const user_characters = await db_adapter.user_characters.find_by_user_id(authenticated_user.id);

      if (user_characters.length === 0) {
        socket.emit('battle_found', {
          error: 'No characters found. Please acquire a character first.',
          battle_id: null
        });
        return;
      }

      // Use first available character
      const result = await battle_manager.find_match(
        authenticated_user.id,
        user_characters[0].id,
        'pvp'
      );

      socket.emit('battle_found', {
        battle_id: result.status === 'found' ? result.battle_id : null,
        status: result.status
      });
    } catch (error) {
      console.error('Legacy battle error:', error);
      socket.emit('battle_found', {
        error: (error as Error).message,
        battle_id: null
      });
    }
  });

  // Join battle
  socket.on('join_battle', async (battle_id: string) => {
    if (!authenticated_user) {
      socket.emit('battle_error', { error: 'Not authenticated' });
      return;
    }

    // Rate limit battle joins (max 20 per minute)
    if (!check_event_rate_limit('join_battle', 20)) {
      socket.emit('battle_error', { error: 'Rate limit exceeded. Please wait before joining another battle.' });
      return;
    }

    try {
      console.log(`🎮 ${authenticated_user.username} joining battle ${battle_id}`);
      await battle_manager.connect_to_battle(socket, battle_id, authenticated_user.id);
    } catch (error) {
      console.error('Join battle error:', error);
      socket.emit('battle_error', { error: (error as Error).message });
    }
  });

  // Chat message with dynamic AI responses
  socket.on('chat_message', async (data) => {
    console.log('🎯 CHAT MESSAGE RECEIVED:', JSON.stringify(data, null, 2));

    // Authentication required for chat
    if (!authenticated_user) {
      socket.emit('chat_error', { error: 'Not authenticated. Please log in to chat.' });
      return;
    }

    // Rate limit chat messages (max 60 per minute)
    if (!check_event_rate_limit('chat_message', 60)) {
      console.log('❌ Chat rate limited');
      socket.emit('chat_error', { error: 'Rate limit exceeded. Please slow down your messages.' });
      return;
    }

    console.log(`💬 Chat message from ${authenticated_user.username}:`, data.message);

    try {
      // Extract character data from request
      const { message, character, character_data, previous_messages, battle_context, promptOverride, chat_id } = data;

      // Prepare chat context for AI service - resolve agent ID properly
      let mapped_character_id = character_data?.agent_key || character;
      let extracted_name: string | undefined;

      // For therapy sessions, extract character name from prompt and resolve to agent ID
      if (promptOverride && promptOverride.includes('You are ')) {
        const name_match = promptOverride.match(/You are\s+[""]?([^,"""]+)[""]?/i);
        if (name_match && name_match[1]) {
          const matched_name = name_match[1].trim();
          extracted_name = matched_name;
          const { id: resolvedId } = resolveAgentId(matched_name);
          mapped_character_id = resolvedId;
        }
      } else if (!character_data?.agent_key) {
        // If no agent_key and no prompt, try to resolve the character directly
        const { id: resolvedId } = resolveAgentId(character);
        mapped_character_id = resolvedId;
      }

      if (process.env.AGI_DEBUG) {
        console.log('🧭 agent resolution:', {
          original: character,
          agent_key: character_data?.agent_key,
          extracted_name,
          mapped_character_id
        });
      }

      // Extract human name from prompt or use provided name  
      const human_name = extracted_name || character_data?.name || mapped_character_id;

      if (process.env.AGI_DEBUG) {
        console.log('👤 human_name resolution:', {
          'character_data?.name': character_data?.name,
          extracted_name,
          mapped_character_id,
          final_human_name: human_name
        });
      }

      const chat_context = {
        character_id: mapped_character_id,    // agent key for persona lookup
        character_name: human_name,          // human name for display/style
        personality: character_data?.personality || {
          traits: ['Mysterious', 'Wise'],
          speech_style: 'Thoughtful and measured',
          motivations: ['Knowledge', 'Victory'],
          fears: ['Defeat', 'Ignorance']
        },
        historical_period: character_data?.historical_period,
        mythology: character_data?.mythology,
        current_bond_level: character_data?.bond_level,
        conversation_context: character_data?.conversation_context, // This contains the real character stats and context
        living_context: character_data?.living_context, // Kitchen table conflict awareness
        event_context: character_data?.event_context, // Centralized event system context
        previous_messages
      };

      // Log living context if present
      if (character_data?.living_context) {
        console.log('🏠 Living context detected:', {
          housing_tier: character_data.living_context.housing_tier,
          occupancy: `${character_data.living_context.current_occupancy}/${character_data.living_context.room_capacity}`,
          conflicts: character_data.living_context.active_conflicts?.length || 0,
          roommates: character_data.living_context.roommates?.length || 0
        });
      }

      // Log event context if present
      if (character_data?.event_context) {
        console.log('📅 Event context detected:', {
          has_recent_events: !!character_data.event_context.recent_events,
          has_relationships: !!character_data.event_context.relationships,
          has_emotional_state: !!character_data.event_context.emotional_state,
          has_domain_specific: !!character_data.event_context.domain_specific
        });
      }

      // Generate AI response
      console.log('🤖 Calling AI Chat Service with context:', {
        character_id: chat_context.character_id,
        character_name: chat_context.character_name,
        message_length: message.length,
        api_key_present: !!process.env.OPENAI_API_KEY,
        has_prompt_override: !!promptOverride,
        prompt_override_length: promptOverride ? promptOverride.length : 0
      });

      if (promptOverride) {
        console.log('💰 FINANCIAL PROMPT OVERRIDE DETECTED:', promptOverride.substring(0, 200) + '...');
      }

      // Compute calibrated provider cap for therapy sessions
      let provider_cap: number | undefined;
      if (promptOverride && process.env.MAX_COMPLETION_TOKENS) {
        const { getTokenizerService } = require('./services/tokenizer');
        const tokenizer = getTokenizerService();
        const effective_cap = parseInt(process.env.MAX_COMPLETION_TOKENS) || 100;
        provider_cap = tokenizer.getProviderCapFromGPTCap(effective_cap);

        console.log('🧮 Using calibrated provider cap:', {
          effective_cap,
          provider_cap,
          ratio: tokenizer.getRatio()
        });
      }

      const response = await ai_chat_service.generate_character_response(
        chat_context,
        message,
        authenticated_user.id,
        db,
        { ...battle_context, chat_id },
        promptOverride, // Pass the custom prompt for therapy sessions
        { max_tokens: provider_cap } // Pass calibrated token limit
      );

      // No token enforcement - relying on prompt instruction for brevity

      console.log('✅ AI Service Response:', {
        message_length: response.message.length,
        bond_increase: response.bond_increase,
        is_template_response: response.message.includes('template') || response.message.includes('fallback')
      });

      // Add realistic typing delay
      setTimeout(() => {
        socket.emit('chat_response', {
          character: character,
          message: response.message,
          bond_increase: response.bond_increase,
        });
      }, 500 + Math.random() * 1500);

    } catch (error) {
      console.error('Chat error:', error);
      // Send error back to client instead of fake response
      socket.emit('chat_error', {
        character: data.character,
        error: 'AI service unavailable. Please try again.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Kitchen chat AI conversations
  socket.on('kitchen_chat_request', async (data, callback) => {
    console.log('🍽️ KITCHEN CHAT REQUEST:', data.conversationId, 'from socket:', socket.id);

    // Rate limit kitchen chat (max 60 per minute - increased for multiple character conversations)
    if (!check_event_rate_limit('kitchen_chat', 60)) {
      socket.emit('kitchen_conversation_response', {
        conversationId: data.conversationId,
        error: 'Rate limit exceeded for kitchen chat.'
      });
      return;
    }

    try {
      const { conversationId: conversation_id, character_id, userchar_id, trigger } = data;
      const messages = Array.isArray(data?.messages) ? data.messages : [];

      console.log('🤖 Kitchen AI Request:', {
        character_id,
        userchar_id,
        trigger: trigger.substring(0, 50) + '...'
      });

      // Validate that userchar_id is provided
      if (!userchar_id) {
        throw new Error('STRICT MODE: userchar_id is required for kitchen chat');
      }
      if (!character_id) {
        throw new Error('STRICT MODE: character_id is required for kitchen chat');
      }
      if (!trigger || !String(trigger).trim()) {
        throw new Error('STRICT MODE: trigger is required for kitchen chat immediate situation');
      }

      // Load ECS memory context for kitchen table
      const EventContextService = await import('./services/eventContextService');
      const ecs = EventContextService.default.get_instance();

      const memory_result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id, // Self-focused for kitchen table
          domains: ['kitchen', 'social', 'conflict', 'therapy', 'battle'],
          max_items: 20,
          max_bytes: 2500,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        ),
      ]);
      const kitchen_memory_section = (memory_result as any)?.text || '';
      console.log(`🔍 [KITCHEN-MEMORY-DEBUG] buildMemoryContext returned ${kitchen_memory_section.length} chars`);

      // Fetch ALL required data from database using userchar_id - NO FALLBACKS
      try {
        // Get wallet, debt, user_id for this specific user_character instance
        const char_data_result = await query(
          `SELECT uc.wallet,
                  uc.debt,
                  uc.user_id,
                  c.mood_modifier,
                  uc.gameplay_mood_modifiers,
                  uc.current_energy,
                  uc.sleeping_arrangement,
                  COALESCE(sst.mood_modifier, 0) as sleeping_mood_modifier
           FROM user_characters uc
           JOIN characters c ON uc.character_id = c.id
           LEFT JOIN sleeping_spot_types sst ON uc.sleeping_arrangement = sst.id
           WHERE uc.id = $1`,
          [userchar_id]
        );

        if (!char_data_result.rows[0]) {
          throw new Error(`STRICT MODE: No user_character found for userchar_id: ${userchar_id}`);
        }

        const row = char_data_result.rows[0];
        const wallet = row.wallet;
        const debt = row.debt;
        const user_id = row.user_id;
        const base_mood_modifier = row.mood_modifier || 0;
        const sleeping_mood_modifier = row.sleeping_mood_modifier || 0;
        const gameplay_modifiers = row.gameplay_mood_modifiers?.modifiers || [];
        const gameplay_modifier_sum = gameplay_modifiers.reduce((sum: number, mod: any) => sum + (mod.value || 0), 0);
        const mood = base_mood_modifier + sleeping_mood_modifier + gameplay_modifier_sum;
        const energy_level = row.current_energy;

        if (mood === null || mood === undefined) {
          throw new Error(`STRICT MODE: mood missing for character ${character_id}`);
        }
        if (energy_level === null || energy_level === undefined || Number.isNaN(energy_level)) {
          throw new Error(`STRICT MODE: current_energy missing for character ${character_id}`);
        }

        // Get user's active team (following working chat pattern)
        const team_result = await query(
          'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
          [user_id]
        );
        const team_id = team_result.rows[0]?.id;

        if (!team_id) {
          throw new Error(`STRICT MODE: No active team set for user: ${user_id}`);
        }

        let teammates: string[] = [];
        const team_slots_result = await query(
          'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
          [team_id]
        );
        if (team_slots_result.rows.length > 0) {
          const teammate_ids = [
            team_slots_result.rows[0].character_slot_1,
            team_slots_result.rows[0].character_slot_2,
            team_slots_result.rows[0].character_slot_3
          ].filter((id: string | null) => id && id !== userchar_id);
          if (teammate_ids.length > 0) {
            const teammate_result = await query(
              'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
              [teammate_ids]
            );
            teammates = teammate_result.rows.map((row: any) => row.name);
          }
        }

        // Fetch roommates from headquarters
        const roommates_result = await query(
          `SELECT c.name
           FROM user_characters uc
           JOIN characters c ON uc.character_id = c.id
           WHERE uc.headquarters_id = (
             SELECT headquarters_id FROM user_characters WHERE id = $1
           ) AND uc.id != $1`,
          [userchar_id]
        );
        const roommates = roommates_result.rows.map((row: any) => row.name);

        // Fetch hq_tier from team_context
        const team_context_result = await query(
          'SELECT hq_tier FROM team_context WHERE team_id = $1',
          [team_id]
        );

        if (!team_context_result.rows[0]) {
          throw new Error(`STRICT MODE: No team_context found for team ${team_id}`);
        }

        const hq_tier = team_context_result.rows[0].hq_tier;

        if (!hq_tier) {
          throw new Error(`STRICT MODE: Missing hq_tier for team ${team_id}`);
        }

        // Calculate dynamic time_of_day and scene_type
        const { calculateTimeOfDay, calculateSceneType } = await import('./services/sceneCalculationService');
        const time_of_day = await calculateTimeOfDay(user_id);
        const scene_type = await calculateSceneType(team_id);

        // Fetch sleeping arrangement
        const sleeping_result = await query(
          'SELECT sleeping_arrangement FROM user_characters WHERE id = $1',
          [userchar_id]
        );

        if (!sleeping_result.rows[0]) {
          throw new Error(`STRICT MODE: No sleeping_arrangement found for ${userchar_id}`);
        }

        const sleeping_arrangement = sleeping_result.rows[0].sleeping_arrangement;

        const sleeping_context = {
          sleeps_on_floor: sleeping_arrangement === 'floor',
          sleeps_on_couch: sleeping_arrangement === 'couch',
          sleeps_under_table: sleeping_arrangement === 'under_table' || sleeping_arrangement === 'coffin',
          room_overcrowded: roommates.length > 4,
          floor_sleeper_count: 0,
          roommate_count: roommates.length
        };

        console.log('✅ [KITCHEN-DB-FETCH]:', {
          userchar_id,
          wallet,
          debt,
          user_id,
          team_id,
          roommates: roommates.length,
          hq_tier,
          scene_type,
          time_of_day,
          sleeping_arrangement
        });

        // Use the new modular prompt assembler
        const { assemblePrompt } = await import('./services/prompts');

        const buildConversationHistory = (historyMessages: Array<{ message: string; speaker_name: string; speaker_id: string }>): string => {
          if (!historyMessages || historyMessages.length === 0) {
            return '';
          }

          for (const msg of historyMessages) {
            if (!msg.message) {
              throw new Error(`STRICT MODE: Message missing message field: ${JSON.stringify(msg)}`);
            }
            if (!msg.speaker_name) {
              throw new Error(`STRICT MODE: Message missing speaker_name field: ${JSON.stringify(msg)}`);
            }
            if (!msg.speaker_id) {
              throw new Error(`STRICT MODE: Message missing speaker_id field: ${JSON.stringify(msg)}`);
            }
          }

          const last = historyMessages.slice(-4);
          const lines = last.map(m => `${m.speaker_name}: ${m.message.trim()}`);
          return 'RECENT CONVERSATION:\n' + lines.join('\n');
        };

        const conversation_history = buildConversationHistory(messages);

        const relationship_context = await (async () => {
          const present_names = Array.from(new Set([...roommates, ...teammates]));
          if (present_names.length === 0) {
            return '';
          }

          const present_ids = await query(
            'SELECT id, name FROM characters WHERE name = ANY($1)',
            [present_names]
          );
          const idMap = new Map<string, string>();
          present_ids.rows.forEach((row: any) => {
            idMap.set(row.name, row.id);
          });

          const relationship_data: Array<{
            target_name: string;
            total_score: number;
            trust: number;
            respect: number;
            affection: number;
            rivalry: number;
            status: string;
            trajectory: string;
            progress: number;
            species_modifier: number;
            species_reason: string;
            archetype_modifier: number;
            archetype_reason: string;
            base_disposition: number;
          }> = [];

          for (const target_name of present_names) {
            const target_id = idMap.get(target_name);
            if (!target_id) {
              throw new Error(`STRICT MODE: Character ID not found for ${target_name}`);
            }

            const rel_result = await query(
              `SELECT
                cr.current_trust,
                cr.current_respect,
                cr.current_affection,
                cr.current_rivalry,
                cr.relationship_status,
                cr.trajectory,
                cr.progress_score,
                cr.species_modifier,
                cr.archetype_modifier,
                cr.base_disposition,
                sr.description as species_reason,
                ar.description as archetype_reason,
                c1.species as char1_species,
                c1.archetype as char1_archetype,
                c2.species as char2_species,
                c2.archetype as char2_archetype
              FROM character_relationships cr
              LEFT JOIN characters c1 ON cr.character1_id = c1.id
              LEFT JOIN characters c2 ON cr.character2_id = c2.id
              LEFT JOIN species_relationships sr ON c1.species = sr.species1 AND c2.species = sr.species2
              LEFT JOIN archetype_relationships ar ON c1.archetype = ar.archetype1 AND c2.archetype = ar.archetype2
              WHERE cr.character1_id = $1 AND cr.character2_id = $2`,
              [character_id, target_id]
            );

            if (rel_result.rows.length > 0) {
              const rel = rel_result.rows[0];
              const total_score = (rel.current_trust || 0) + (rel.current_affection || 0);
              relationship_data.push({
                target_name,
                total_score,
                trust: rel.current_trust || 0,
                respect: rel.current_respect || 0,
                affection: rel.current_affection || 0,
                rivalry: rel.current_rivalry || 0,
                status: rel.relationship_status || 'unknown',
                trajectory: rel.trajectory || 'stable',
                progress: rel.progress_score || 0,
                species_modifier: rel.species_modifier || 0,
                species_reason: rel.species_reason || 'No species prejudice defined',
                archetype_modifier: rel.archetype_modifier || 0,
                archetype_reason: rel.archetype_reason || 'No archetype compatibility defined',
                base_disposition: rel.base_disposition || 0,
              });
            }
          }

          if (relationship_data.length === 0) {
            return 'RELATIONSHIP DYNAMICS: No established relationships with present characters yet. First impressions will be influenced by species/archetype compatibility and personality.';
          }

          let context = 'RELATIONSHIP DYNAMICS WITH PRESENT CHARACTERS:\n';
          context += '(These pre-existing dispositions influence how you naturally interact. Your relationships evolve through shared experiences.)\n\n';

          relationship_data.forEach(rel => {
            const progress_indicator = rel.progress > 0
              ? ` [+${rel.progress} growth from baseline]`
              : rel.progress < 0
                ? ` [${rel.progress} decline from baseline]`
                : '';

            context += `${rel.target_name}: ${rel.status.toUpperCase()} (${rel.trajectory})${progress_indicator}\n`;
            context += `  Current: Trust ${rel.trust}, Respect ${rel.respect}, Affection ${rel.affection}`;
            if (rel.rivalry > 0) context += `, Rivalry ${rel.rivalry}`;
            context += `\n`;

            context += `  Started at: ${rel.base_disposition} (species: ${rel.species_modifier}, archetype: ${rel.archetype_modifier})\n`;

            const reasons = [];
            if (rel.species_modifier !== 0) reasons.push(rel.species_reason);
            if (rel.archetype_modifier !== 0) reasons.push(rel.archetype_reason);
            if (reasons.length > 0) {
              context += `  Why: ${reasons.join('; ')}\n`;
            }
            context += '\n';
          });

          context += 'NOTE: These scores reflect your natural disposition and shared history. They should INFLUENCE your tone and attitude, but you can still choose how to express yourself in each moment.';
          return context;
        })();

        const prompt_result = await assemblePrompt({
          userchar_id,
          domain: 'kitchenTable',
          role: 'contestant',
          role_type: 'contestant',
          conversation_history,
          kitchen_options: {
            immediate_situation: String(trigger),
            memory: kitchen_memory_section,
            relationship_context,
            mood,
            energy_level,
          },
        });
        const kitchen_prompt = prompt_result.system_prompt;

        // Build stop tokens to prevent excessive generation
        const char_data = prompt_result.data as { IDENTITY: { name: string } };
        if (!char_data.IDENTITY) {
          throw new Error('STRICT MODE: Missing IDENTITY in prompt_result.data');
        }
        if (!char_data.IDENTITY.name) {
          throw new Error('STRICT MODE: Missing character name in IDENTITY');
        }
        const character_name = char_data.IDENTITY.name;

        // Call Open_ai API
        console.log('[KITCHEN_TABLE_SOCKET] Calling Open_ai API');
        console.log('[KITCHEN_TABLE_SOCKET] Prompt length:', kitchen_prompt.length);
        console.log('[KITCHEN_TABLE_SOCKET] Character:', character_name);

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: kitchen_prompt }],
          temperature: 0.7,
          frequency_penalty: 0.4
        });

        let response_message = completion.choices[0]?.message?.content?.trim() || '';
        console.log('[KITCHEN_TABLE_SOCKET] Open_ai response length:', response_message.length);

        // Post-process to catch any repetitive starters that slipped through
        const forbidden_starters = ['Ah,', 'Ugh,', 'Well,', 'Oh,', 'Hmm,', 'Ah, the', 'Well, the', 'Oh, the', '*sighs*', '*groans*'];
        let processed_message = response_message;
        for (const forbidden of forbidden_starters) {
          if (processed_message.startsWith(forbidden)) {
            // Remove the forbidden starter and capitalize the next word
            processed_message = processed_message.substring(forbidden.length).trim();
            processed_message = processed_message.charAt(0).toUpperCase() + processed_message.slice(1);
            console.log(`🔧 Removed repetitive starter: "${forbidden}" from response`);
            break;
          }
        }

        console.log('🤖 AI Response received:', processed_message.substring(0, 50) + '...');

        // Emit response immediately
        console.log('📤 Emitting response for:', conversation_id);
        socket.emit('kitchen_conversation_response', {
          conversationId: conversation_id,
          character_id,
          message: processed_message,
          trigger,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Kitchen chat error:', error);
        socket.emit('kitchen_conversation_response', {
          conversationId: data.conversationId,
          character_id: data.character_id,
          message: `Open_ai service error: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
          details: error instanceof Error ? error.stack : undefined
        });
      }
    } catch (outerError) {
      console.error('Fatal kitchen chat error:', outerError);
    }
  });

  // Team Chat AI Handler - CRITICAL FOR BATTLE CHAT
  socket.on('team_chat_message', async (data) => {
    console.log('🎯 TEAM CHAT MESSAGE RECEIVED:', JSON.stringify(data, null, 2));

    // Authentication required for team chat
    if (!authenticated_user) {
      socket.emit('team_chat_error', { error: 'Not authenticated. Please log in to use team chat.' });
      return;
    }

    // Rate limit team chat messages (max 60 per minute)
    if (!check_event_rate_limit('team_chat_message', 60)) {
      console.log('❌ Team chat rate limited');
      socket.emit('team_chat_error', { error: 'Rate limit exceeded. Please slow down your messages.' });
      return;
    }

    try {
      // Extract character data from request
      const { message, character, character_id, character_data, previous_messages, battle_context } = data;

      console.log('🤖 Processing team chat for character:', character_id, 'Message:', message);

      // Prepare chat context for AI service
      const chat_context = {
        character_id: character_id || character,
        character_name: character_data?.name || character,
        personality: character_data?.personality || {
          traits: [character_data?.archetype || 'Mysterious'],
          speech_style: character_data?.personality?.speech_style || 'Thoughtful and measured',
          motivations: ['Victory', 'Team success'],
          fears: ['Defeat', 'Letting the team down']
        },
        historical_period: character_data?.historical_period,
        mythology: character_data?.mythology,
        current_bond_level: character_data?.bond_level || 50,
        previous_messages: previous_messages || []
      };

      // Generate AI response using the existing AI chat service
      console.log('🤖 Calling AI Chat Service for team chat:', {
        character_id: chat_context.character_id,
        character_name: chat_context.character_name,
        message_length: message.length,
        api_key_present: !!process.env.OPENAI_API_KEY
      });

      const response = await ai_chat_service.generate_character_response(
        chat_context,
        message,
        authenticated_user.id,
        db,
        battle_context || { is_in_battle: true }
      );

      // Check if usage limit was reached
      if (response.usage_limit_reached) {
        socket.emit('team_chat_error', {
          error: response.message,
          usage_limit_reached: true
        });
        return;
      }

      console.log('✅ AI Team Chat Response:', {
        character_id,
        message_length: response.message.length,
        bond_increase: response.bond_increase
      });

      // Send response back to the frontend
      socket.emit('team_chat_response', {
        character: character,
        character_id: character_id,
        message: response.message,
        bond_increase: response.bond_increase,
      });

    } catch (error) {
      console.error('❌ Team chat error:', error);
      // Send proper error response
      socket.emit('team_chat_error', {
        character: data.character,
        character_id: data.character_id,
        error: `Open_ai service error: ${error instanceof Error ? error.message : String(error)}`,
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Facilities chat with Real Estate Agents
  socket.on('facilities_chat_message', async (data) => {
    console.log('🏢 FACILITIES CHAT MESSAGE:', data.agent_id, 'from socket:', socket.id);

    // Authentication required for facilities chat
    if (!authenticated_user) {
      socket.emit('facilities_chat_response', { error: 'Not authenticated. Please log in to use facilities chat.' });
      return;
    }

    // Rate limit facilities chat (max 30 per minute)
    if (!check_event_rate_limit('facilities_chat_message', 30)) {
      console.log('❌ Facilities chat rate limited');
      socket.emit('facilities_chat_response', {
        error: 'Rate limit exceeded. Please slow down your messages.'
      });
      return;
    }

    try {
      const { message, agent_id, agentData, facilities_context, previous_messages } = data;

      console.log('🤖 Processing facilities chat for agent:', agent_id, 'Message:', message);

      // Prepare chat context for AI service
      const chat_context = {
        character_id: agent_id,
        character_name: agentData?.name || agent_id,
        personality: agentData?.personality || {
          traits: ['Professional', 'Helpful'],
          speech_style: 'Formal',
          motivations: ['Client satisfaction'],
          fears: ['Unsatisfied customers']
        },
        conversation_context: agentData?.conversation_context,
        previous_messages: previous_messages || []
      };

      const response = await ai_chat_service.generate_character_response(
        chat_context,
        message,
        authenticated_user.id,
        db,
        { is_in_battle: false, facilities_context: facilities_context, is_combat_chat: true }
      );

      // Check if usage limit was reached
      if (response.usage_limit_reached) {
        socket.emit('facilities_chat_response', {
          message: response.message,
          error: true,
          usage_limit_reached: true
        });
        return;
      }

      console.log('✅ AI Facilities Chat Response:', {
        agent_id,
        message_length: response.message.length,
      });

      // Send response back to the frontend
      socket.emit('facilities_chat_response', {
        agent_id: agent_id,
        message: response.message,
      });

    } catch (error) {
      console.error('❌ Facilities chat error:', error);
      socket.emit('facilities_chat_response', {
        agent_id: data.agent_id,
        error: `AI service error: ${error instanceof Error ? error.message : String(error)}`,
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // =====================================================
  // ARCHIVED: Legacy Multi-Agent Argock Training System
  // Archived on: 2026-01-19
  // Reason: Replaced by domain-based training in src/services/prompts/domains/training/
  // The domain-based version uses dynamic trainer characters (Athena, Popeye) from the database
  // =====================================================
  /*
  // Multi-Agent Training Chat Helper Functions

  // Determine which agents should participate in the conversation
  function determineActiveAgents(user_message: string, training_phase: string, is_character_selection: boolean): string[] {
    const active_agents: string[] = [];

    // Character selection auto-triggers Argock analysis
    if (is_character_selection) {
      active_agents.push('argock');
      return active_agents;
    }

    // Planning phase: Both agents can participate
    if (training_phase === 'planning') {
      // Determine based on message content or random for dynamic interaction
      if (user_message.toLowerCase().includes('argock') || user_message.toLowerCase().includes('trainer')) {
        active_agents.push('argock');
      } else if (Math.random() < 0.3) { // 30% chance Argock interjects
        active_agents.push('argock');
      }
      active_agents.push('contestant'); // Character always responds
    }

    // Active phase: Both agents participate for dynamic motivation
    else if (training_phase === 'active') {
      if (Math.random() < 0.4) { // 40% chance both respond during training
        active_agents.push('argock');
      }
      active_agents.push('contestant');
    }

    // Recovery phase: Character leads, Argock gives advice
    else if (training_phase === 'recovery') {
      active_agents.push('contestant');
      if (Math.random() < 0.5) { // 50% chance Argock gives recovery advice
        active_agents.push('argock');
      }
    }

    // Default/undefined phase: Both agents respond (50% chance for Argock, character always)
    else {
      console.log('⚠️ No training phase specified, using default agent selection');
      if (Math.random() < 0.5) { // 50% chance Argock responds
        active_agents.push('argock');
      }
      active_agents.push('contestant'); // Character always responds
    }

    return active_agents;
  }

  // Generate responses from multiple agents with live AI calls
  async function generateMultiAgentResponses(params: {
    active_agents: string[];
    character_name: string;
    character_id: string;
    user_message: string;
    training_phase: string;
    current_activity?: string;
    energy_level: number;
    training_progress: number;
    session_duration: number;
    is_character_selection: boolean;
    user_id: string;
  }): Promise<Array<{ agent_type: string; agent_name: string; message: string; timestamp: string }>> {

    const responses: Array<{ agent_type: string; agent_name: string; message: string; timestamp: string }> = [];

    // Generate Argock response if active
    if (params.active_agents.includes('argock')) {
      try {
        console.log('🏋️ Generating Argock response...');
        const argock_response = await generateArgockResponse(params);
        console.log('✅ Argock response generated:', argock_response.substring(0, 50) + '...');
        responses.push({
          agent_type: 'argock',
          agent_name: 'Argock',
          message: argock_response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Argock response error:', error);
      }
    }

    // Generate Character response if active
    if (params.active_agents.includes('contestant')) {
      try {
        console.log('🏋️ Generating Character response...');
        const character_response = await generate_character_response(params, responses);
        console.log('✅ Character response generated:', character_response.substring(0, 50) + '...');
        responses.push({
          agent_type: 'contestant',
          agent_name: params.character_name,
          message: character_response,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Character response error:', error);
      }
    }

    return responses;
  }

  // Generate Argock (Personal Trainer) response with live AI call
  async function generateArgockResponse(params: {
    character_name: string;
    user_message: string;
    training_phase: string;
    current_activity?: string;
    energy_level: number;
    training_progress: number;
    is_character_selection: boolean;
    user_id: string;
  }): Promise<string> {

    let argock_prompt = '';

    if (params.is_character_selection) {
      // Auto-analysis when character is selected
      const time_of_day = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
      const random_training_focus = ['strength', 'cardio', 'agility', 'combat technique', 'endurance', 'flexibility'][Math.floor(Math.random() * 6)];
      const session_id = Math.random().toString(36).substr(2, 8);

      argock_prompt = `You are ARGOCK, a gruff, no-nonsense personal trainer. It's ${time_of_day} and ${params.character_name} just walked into your gym.

ARGOCK'S PERSONALITY:
- Gruff, direct, brutally honest
- Experienced trainer who's seen everything
- Calls out weaknesses immediately
- Gives specific, actionable advice
- Uses gym slang and tough-love motivation
- Always addresses the COACH directly

CHARACTER ANALYSIS: ${params.character_name}
Think about what you know about ${params.character_name} historically/mythologically and assess their likely:
- Physical strengths and weaknesses
- Combat background and training needs
- Personality traits that affect training
- Specific areas for improvement

SESSION CONTEXT:
- Time: ${time_of_day} training session
- Focus suggestion: ${random_training_focus}
- Session ID: ${session_id}
- Your mood: Randomly choose between skeptical, motivated, or brutally honest

Generate a UNIQUE assessment for the Coach. Consider ${params.character_name}'s background and give specific training advice. Be gruff but helpful. Keep under 2 sentences.

Examples of your style:
- "Coach! This one looks soft - needs serious conditioning work!"
- "Finally, someone with potential! Let's work on their weak spots!"
- "Coach, I've seen tougher fighters, but we can make something of them!"

Make YOUR assessment completely different and specific to ${params.character_name}.`;

    } else {
      // Regular training conversation
      const phase_context: { [key: string]: string } = {
        planning: `You're helping plan ${params.character_name}'s workout. Give specific exercise recommendations to the Coach.`,
        active: `${params.character_name} is training RIGHT NOW (${params.training_progress}% complete). Give motivational coaching advice to push them harder!`,
        recovery: `${params.character_name} just finished training and is exhausted (${params.energy_level}% energy). Give recovery advice and assessment of the workout.`,
        default: `You're talking to the Coach about ${params.character_name}'s training. Give them specific advice and motivation.`
      };

      const conversation_id = Math.random().toString(36).substr(2, 9);
      const phase = params.training_phase || 'default';
      const phase_description = phase_context[phase] || phase_context['default'];

      argock_prompt = `You are ARGOCK, the gruff personal trainer. The Coach said: "${params.user_message}"

CURRENT SITUATION:
- Training Phase: ${phase}
- ${phase_description}
- Current Activity: ${params.current_activity || 'General Training'}
- ${params.character_name}'s Energy: ${params.energy_level}%
- Conversation ID: ${conversation_id} (make each response unique)
- Time: ${new Date().toLocaleTimeString()}

ARGOCK'S RESPONSE STYLE:
- Always address the COACH directly
- Be gruff but helpful
- Give specific training advice
- Use tough-love motivation
- Keep responses under 2 sentences
- Reference the character in third person
- Generate fresh, dynamic responses each time

Respond as Argock talking to the Coach:`;
    }

    const argock_context = {
      character_id: 'argock',
      character_name: 'Argock',
      personality: {
        traits: ['Gruff', 'Experienced', 'No-nonsense', 'Motivational'],
        speech_style: 'Direct, tough-love, gym trainer slang',
        motivations: ['Getting results', 'Proper training form', 'Building champions'],
        fears: ['Wasted potential', 'Poor training habits', 'Quitters']
      },
      historical_period: 'Modern gym trainer',
      mythology: 'Fighting league personal trainer',
      current_bond_level: 3,
      previous_messages: []
    };

    const response = await ai_chat_service.generate_character_response(
      argock_context,
      argock_prompt,
      params.user_id,
      db,
      { is_in_battle: false }
    );

    return response.message;
  }

  // Generate Character response with live AI call (aware of other agents)
  async function generate_character_response(params: {
    character_name: string;
    character_id: string;
    user_message: string;
    training_phase: string;
    current_activity?: string;
    energy_level: number;
    training_progress: number;
    session_duration: number;
    user_id: string;
  }, previous_responses: Array<{ agent_type: string; agent_name: string; message: string }>): Promise<string> {

    // Phase-specific prompts for the character
    const phase_prompts = {
      planning: `You are ${params.character_name}, planning your workout. You're excited and ready to train hard.

CONTEXT:
- Energy Level: ${params.energy_level}% (fresh and ready)
- Planned Activity: ${params.current_activity || 'Workout planning'}
- You're discussing training plans with your Coach

Show enthusiasm for training and ask about specific exercises or goals.`,

      active: `You are ${params.character_name}, actively training RIGHT NOW! You're sweating and working hard.

CONTEXT:
- Training Progress: ${params.training_progress}% complete
- Current Exercise: ${params.current_activity || 'Intense workout'}
- Session Duration: ${params.session_duration} minutes
- Energy Level: ${params.energy_level}% (working hard!)

You're breathing hard but pushing through. Keep responses shorter due to exertion.`,

      recovery: `You are ${params.character_name}, just finished an intense training session. You're winded but accomplished.

CONTEXT:
- Completed Activity: ${params.current_activity || 'Training session'}
- Energy Level: ${params.energy_level}% (exhausted but satisfied)
- Session Duration: ${params.session_duration} minutes

You're tired but proud of the work. Reflect on the training session.`
    };

    // Add context about other agents' responses for AI-to-AI interaction
    let agent_context = '';
    if (previous_responses.length > 0) {
      const argock_response = previous_responses.find(r => r.agent_type === 'argock');
      if (argock_response) {
        agent_context = `\n\nARGOCK JUST SAID: "${argock_response.message}"\nYou can respond to Argock's comment or training advice if relevant.`;
      }
    }

    const character_conversation_id = Math.random().toString(36).substr(2, 9);

    const character_prompt = `${phase_prompts[params.training_phase as keyof typeof phase_prompts]}

COACH MESSAGE: "${params.user_message}"${agent_context}

DYNAMIC CONTEXT:
- Conversation ID: ${character_conversation_id} (ensure unique response)
- Current time: ${new Date().toLocaleTimeString()}
- Generate fresh, authentic responses as ${params.character_name}

Respond as ${params.character_name} in this training situation. Keep it conversational and under 2 sentences. Make each response unique and true to your character.`;

    const character_context = {
      character_id: params.character_id,
      character_name: params.character_name,
      personality: {
        traits: ['Physically focused', 'Determined', 'Training-motivated'],
        speech_style: 'Direct, motivational, warrior-like',
        motivations: ['Physical improvement', 'Combat readiness', 'Glory'],
        fears: ['Poor performance', 'Weakness', 'Defeat']
      },
      historical_period: 'Historical warrior in modern gym',
      mythology: 'Fighting league',
      current_bond_level: 5,
      previous_messages: []
    };

    const response = await ai_chat_service.generate_character_response(
      character_context,
      character_prompt,
      params.user_id,
      db,
      { is_in_battle: false }
    );

    return response.message;
  }

  // Multi-Agent Training Chat System - Live AI-to-AI Interactions
  socket.on('training_chat_request', async (data) => {
    console.log('🏋️🏋️🏋️ NEW MULTI-AGENT HANDLER TRIGGERED 🏋️🏋️🏋️');
    console.log('🏋️ MULTI-AGENT TRAINING CHAT REQUEST RECEIVED:', {
      conversation_id: data.conversation_id,
      socket_id: socket.id,
      character_name: data.character_name,
      is_character_selection: data.is_character_selection,
      training_phase: data.training_phase
    });

    // Authentication required for training chat
    if (!authenticated_user) {
      socket.emit('training_chat_response', {
        conversationId: data.conversationId,
        error: 'Not authenticated. Please log in to use training chat.'
      });
      return;
    }

    // Rate limit training chat (max 30 per minute)
    if (!check_event_rate_limit('training_chat', 30)) {
      socket.emit('training_chat_response', {
        conversationId: data.conversationId,
        error: 'Rate limit exceeded for training chat.'
      });
      return;
    }

    try {
      const {
        conversationId: conversation_id,
        character_id,
        character_name,
        user_message,
        training_phase = 'planning',
        current_activity,
        energy_level = 100,
        training_progress = 0,
        session_duration = 0,
        is_character_selection = false
      } = data;

      console.log('🤖 Multi-Agent Training Request:', {
        character_id,
        character_name,
        training_phase,
        is_character_selection,
        user_message: user_message ? user_message.substring(0, 50) + '...' : 'No message'
      });

      console.log('🔍 Character selection status:', is_character_selection, typeof is_character_selection);

      // Determine which agents should respond
      const active_agents = determineActiveAgents(user_message, training_phase, is_character_selection);
      console.log('🎯 Active agents determined:', active_agents);

      // Generate responses from multiple agents with live AI calls
      console.log('🤖 Starting multi-agent response generation...');
      const agent_responses = await generateMultiAgentResponses({
        active_agents,
        character_name,
        character_id,
        user_message,
        training_phase,
        current_activity,
        energy_level,
        training_progress,
        session_duration,
        is_character_selection,
        user_id: authenticated_user.id
      });

      console.log('✅ Multi-agent responses generated:', agent_responses.length, 'responses');

      // Send multi-agent response
      socket.emit('training_chat_response', {
        conversationId: conversation_id,
        multiAgentResponse: {
          agents: agent_responses,
          timestamp: new Date().toISOString(),
          training_phase
        }
      });

      console.log('📤 Multi-agent response sent to frontend');

    } catch (error) {
      console.error('🏋️ Multi-agent training chat error:', error);
      socket.emit('training_chat_response', {
        conversationId: data.conversationId,
        error: `Training chat service error: ${error instanceof Error ? error.message : String(error)}`,
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });
  */
  // =====================================================
  // END ARCHIVED: Legacy Multi-Agent Argock Training System
  // =====================================================

  // Real Estate Agent Chat Endpoints
  socket.on('generate_real_estate_agent_response', async (data) => {
    console.log('🏡 REAL ESTATE AGENT REQUEST:', data.agent_id, 'from socket:', socket.id);

    // Authentication required for real estate chat
    if (!authenticated_user) {
      socket.emit('real_estate_agent_response', { error: 'Not authenticated. Please log in to chat with agents.' });
      return;
    }

    // Rate limit real estate chat (max 30 per minute)
    if (!check_event_rate_limit('real_estate_chat', 30)) {
      socket.emit('real_estate_agent_response', {
        error: 'Rate limit exceeded for real estate chat.'
      });
      return;
    }

    try {
      const { agent_id, user_message, context } = data;

      console.log('🤖 Real Estate AI Request:', {
        agent_id,
        user_message: user_message ? user_message.substring(0, 50) + '...' : 'No message'
      });

      // Use existing AI chat service with real estate context
      const real_estate_context = {
        character_id: agent_id,
        character_name: context?.selectedAgent?.name || 'Real Estate Agent',
        personality: {
          traits: ['Professional', 'Persuasive', 'Detail-oriented', 'Competitive'],
          speech_style: 'Professional yet personable',
          motivations: ['Making sales', 'Client satisfaction', 'Property expertise'],
          fears: ['Losing deals', 'Client dissatisfaction', 'Market downturns']
        },
        historical_period: 'Modern real estate market',
        mythology: 'Professional services',
        current_bond_level: context?.bond_level || 3,
        previous_messages: context?.conversation_history || []
      };

      console.log('🔄 Calling ai_chat_service.generate_character_response with context:', real_estate_context);
      const response = await ai_chat_service.generate_character_response(
        real_estate_context,
        user_message,
        authenticated_user.id,
        db,
        { is_in_battle: false }
      );
      console.log('✅ AI Response generated successfully:', response.message.substring(0, 100) + '...');

      socket.emit('real_estate_agent_response', {
        agent_id,
        agent_name: context?.selectedAgent?.name || 'Real Estate Agent',
        message: response.message,
        timestamp: new Date(),
        is_competitor_interruption: false
      });

      // 30% chance of competitor interruption if there are competing agents
      if (context?.competing_agents?.length > 0 && Math.random() < 0.3) {
        setTimeout(() => {
          const competing_agent = context.competing_agents[Math.floor(Math.random() * context.competing_agents.length)];
          socket.emit('competitor_interruption', {
            agent_id: competing_agent.id,
            agent_name: competing_agent.name,
            message: `Actually, I think I can offer you a better deal on that property...`,
            timestamp: new Date(),
            is_competitor_interruption: true
          });
        }, 2000 + Math.random() * 3000); // Random delay 2-5 seconds
      }

    } catch (error) {
      console.error('❌ Real Estate Chat Error:', error);
      console.error('❌ Error details:', (error as Error).message);
      console.error('❌ Error stack:', (error as Error).stack);
      socket.emit('real_estate_agent_response', {
        error: 'Failed to generate response. Please try again.'
      });
    }
  });

  socket.on('competitor_interruption', async (data) => {
    console.log('🏡 COMPETITOR INTERRUPTION REQUEST:', data.agent_id);

    try {
      const { agent_id, context } = data;
      const competing_agent = context?.competing_agents?.find((agent: any) => agent.id === agent_id);

      if (competing_agent) {
        const interruption_messages = [
          `Wait! I have a much better property that would suit your team perfectly.`,
          `Before you decide, you should know about the exclusive deal I can offer.`,
          `That agent is overcharging you - I can get you 20% off that facility.`,
          `I represent the premium properties in this area, let me show you something special.`,
          `Hold on - I've got insider information about an upcoming development nearby.`
        ];

        const random_message = interruption_messages[Math.floor(Math.random() * interruption_messages.length)];

        socket.emit('competitor_interruption', {
          agent_id: competing_agent.id,
          agent_name: competing_agent.name,
          message: random_message,
          timestamp: new Date(),
          is_competitor_interruption: true
        });
      }
    } catch (error) {
      console.error('❌ Competitor Interruption Error:', error);
    }
  });

  // Battle system events are handled by BattleManager.setupSocketHandlers()
  // when a user joins a battle
});

// 404 handler
app.use('*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// CSRF error handler
app.use(csrf_error_handler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);

  return res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Server startup  
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    console.log('🟡 Starting server initialization...');
    console.log('🟡 PORT:', PORT);
    console.log('🟡 NODE_ENV:', process.env.NODE_ENV);
    console.log('🟡 DATABASE_URL exists:', !!process.env.DATABASE_URL);

    // Initialize database
    console.log('🟡 Initializing database...');
    await initialize_database();
    console.log('✅ Database initialized successfully');

    // Initialize tokenizer for provider calibration
    console.log('🟡 Calibrating tokenizer...');
    await initializeTokenizer();
    console.log('✅ Tokenizer calibrated');

    // --- Lightweight DB schema guard (log-only; no mutations) ---
    try {
      await runSchemaGuard();
    } catch (err) { console.warn('[schemaGuard] skipped:', err); }

    // Initialize healing facilities
    await initializeHealingFacilities();
    console.log('✅ Healing facilities initialized');

    // Start healing scheduler
    healing_scheduler.start(5); // Check every 5 minutes
    console.log('✅ Healing scheduler started');

    // Start ticket cron jobs
    ticket_cron_service.start();
    console.log('✅ Ticket cron service started');

    // Start temporary buff cleanup (runs hourly)
    const { scheduleBuffCleanup } = await import('./cron/cleanupExpiredBuffs');
    scheduleBuffCleanup();
    console.log('✅ Temporary buff cleanup scheduled');

    // Start AI autonomous trash talk scheduler
    startAutonomousTrashTalkScheduler();
    console.log('✅ AI trash talk scheduler started');
    // Start the server
    console.log('🟡 Starting HTTP server...');
    http_server.listen(PORT, async () => {
      console.log(`🚀 Blank Wars API Server running!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`💾 Database: PostgreSQL (${process.env.NODE_ENV || 'production'} mode)`);
      console.log(`🎮 Ready to serve battles and chats!`);

      // Optional pre-warm on boot
      // Prewarming retired - agents are created on-demand
      if (false) {
        try {
          // prewarmAllAgents() - retired
          console.log('[server] prewarm complete');
        } catch (err) {
          console.warn('[server] prewarm failed (non-blocking)', err);
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  http_server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  http_server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, io };
