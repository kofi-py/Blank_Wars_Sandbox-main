import { Router } from 'express';
import { UserService } from '../services/userService';
import { authenticate_token } from '../services/auth';
import { db_adapter } from '../services/databaseAdapter';
import { AuthRequest, UserCharacter } from '../types';

// Row type for system character query
interface SystemCharacterRow {
  id: string;
  character_id: string;
  name: string;
  role: string;
  species: string;
  archetype: string;
}

const router = Router();
const user_service = new UserService();

// Get user profile by ID
router.get('/:id/profile', async (req, res) => {
  const profile = await user_service.findUserProfile(req.params.id);
  if (profile) {
    res.json(profile);
  } else {
    res.status(404).send('Profile not found');
  }
});

// Update user profile (requires authentication)
router.put('/profile', authenticate_token, async (req: any, res) => {
  const user_id = req.user.id; // Assuming user_id is attached by authenticate_token middleware
  const updates = req.body;
  try {
    const updated_profile = await user_service.updateUserProfile(user_id, updates);
    if (updated_profile) {
      res.json(updated_profile);
    } else {
      res.status(404).send('User profile not found');
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send friend request (requires authentication)
router.post('/friends/add', authenticate_token, async (req: any, res) => {
  const { target_user_id } = req.body;
  const user_id1 = req.user.id; // Sender
  try {
    const friendship = await user_service.addFriend(user_id1, target_user_id);
    if (friendship) {
      res.status(201).json(friendship);
    } else {
      res.status(400).send('Could not send friend request');
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept friend request (requires authentication)
router.post('/friends/accept/:friendship_id', authenticate_token, async (req: any, res) => {
  const { friendship_id } = req.params;
  // In a real app, verify req.user.id matches user_id2 of the friendship
  try {
    const friendship = await user_service.acceptFriendRequest(friendship_id);
    if (friendship) {
      res.json(friendship);
    } else {
      res.status(404).send('Friend request not found or not pending');
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject friend request (requires authentication)
router.post('/friends/reject/:friendship_id', authenticate_token, async (req: any, res) => {
  const { friendship_id } = req.params;
  // In a real app, verify req.user.id matches user_id2 of the friendship
  try {
    const friendship = await user_service.rejectFriendRequest(friendship_id);
    if (friendship) {
      res.json(friendship);
    } else {
      res.status(404).send('Friend request not found or not pending');
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's friends (requires authentication)
router.get('/friends', authenticate_token, async (req: any, res) => {
  try {
    const friends = await user_service.getFriends(req.user.id);
    res.json(friends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's pending friend requests (requires authentication)
router.get('/friends/pending', authenticate_token, async (req: any, res) => {
  try {
    const pending_requests = await user_service.getPendingFriendRequests(req.user.id);
    res.json(pending_requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate username exists (for mail system, etc.)
router.get('/validate-username', authenticate_token, async (req, res) => {
  const username = req.query.username as string;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const user = await user_service.findUserByUsername(username);
    if (user) {
      res.json({
        exists: true,
        username: user.username
      });
    } else {
      res.json({
        exists: false
      });
    }
  } catch (error: any) {
    console.error('Error validating username:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users (returns usernames for autocomplete)
router.get('/search', authenticate_token, async (req, res) => {
  const search_query = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!search_query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const { query } = require('../database/index');

    // Search for usernames that start with or contain the query (case-insensitive)
    const result = await query(
      `SELECT username FROM users
       WHERE LOWER(username) LIKE LOWER($1)
       ORDER BY username
       LIMIT $2`,
      [`%${search_query}%`, limit]
    );

    const usernames = result.rows.map((row: any) => row.username);
    res.json({ usernames });
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
router.get('/test', async (req: any, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

// DEBUG: Check characters without auth - POST to avoid URL encoding
router.post('/debug-chars', async (req, res) => {
  try {
    const { user_id } = req.body;
    console.log('🔍 DEBUG: Checking characters for user:', user_id);

    const user_characters = await db_adapter.user_characters.find_by_user_id(user_id);
    console.log('🔍 DEBUG: Raw user_characters count:', user_characters.length);

    // Also check raw database
    const { query } = require('../database/postgres');
    const raw_check = await query('SELECT COUNT(*) as count FROM user_characters WHERE user_id = $1', [user_id]);
    console.log('🔍 DEBUG: Raw database count:', raw_check.rows[0].count);

    // Check what character IDs are in user_characters
    const user_char_ids = await query('SELECT character_id FROM user_characters WHERE user_id = $1', [user_id]);
    const user_character_ids = user_char_ids.rows.map((row: any) => row.character_id);

    // Check what character IDs exist in characters table
    const all_char_ids = await query('SELECT id FROM characters LIMIT 5');
    const all_character_ids = all_char_ids.rows.map((row: any) => row.id);

    console.log('🔍 DEBUG: User character IDs:', user_character_ids);
    console.log('🔍 DEBUG: Available character IDs:', all_character_ids);

    res.json({
      success: true,
      user_id,
      characters_from_join: user_characters.length,
      characters_from_raw: raw_check.rows[0].count,
      user_character_ids,
      all_character_ids,
      characters: user_characters
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Check characters without auth for specific user
router.get('/debug-characters/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log('🔍 DEBUG: Checking characters for user:', user_id);

    const user_characters = await db_adapter.user_characters.find_by_user_id(user_id);
    console.log('🔍 DEBUG: Raw user_characters count:', user_characters.length);

    // Also check raw database
    const { query } = require('../database/postgres');
    const raw_check = await query('SELECT COUNT(*) as count FROM user_characters WHERE user_id = $1', [user_id]);
    console.log('🔍 DEBUG: Raw database count:', raw_check.rows[0].count);

    res.json({
      success: true,
      user_id,
      characters_from_join: user_characters.length,
      characters_from_raw: raw_check.rows[0].count,
      characters: user_characters
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's characters
router.get('/characters', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user_id = req.user.id;

    // Get user's actual characters from database
    const user_characters = await db_adapter.user_characters.find_by_user_id(user_id);

    if (user_characters.length === 0) {
      // User has no characters yet - they need to open packs to get characters
      return res.json({
        success: true,
        characters: [],
        message: 'No characters owned. Open packs to get characters!'
      });
    }

    if (process.env.DEBUG_CHARACTERS) {
      console.log('🔍 [/characters] Getting characters for user:', user_id);
      console.log('📊 [/characters] Found characters:', user_characters.length);
      console.log('🔍 [/characters] First character sample:', user_characters[0] ? JSON.stringify(user_characters[0], null, 2) : 'None');
    }

    // Return characters directly - no serialization needed
    return res.json({
      success: true,
      characters: user_characters
    });
  } catch (error: any) {
    console.error('❌ Error getting user characters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system characters (therapists, judges, etc.) with their userchar_ids
// These are personal instances of system characters for the current user
router.get('/system-characters', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const role = req.query.role as string;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'STRICT MODE: role query parameter is required (e.g., ?role=therapist)'
      });
    }

    const valid_roles = ['therapist', 'judge', 'host', 'real_estate_agent', 'trainer', 'mascot'];
    if (!valid_roles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `STRICT MODE: Invalid role "${role}". Valid roles: ${valid_roles.join(', ')}`
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user_id = req.user.id;

    // Query system characters by role for current user (DISTINCT ON to handle duplicate userchar entries)
    const result = await db_adapter.query(
      `SELECT DISTINCT ON (uc.character_id) uc.id, uc.character_id, c.name, c.role, c.species, c.archetype, c.rarity
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.user_id = $1 AND c.role = $2
       ORDER BY uc.character_id, uc.id`,
      [user_id, role]
    );

    // For therapists, also fetch their bonuses
    if (role === 'therapist') {
      const bonuses_result = await db_adapter.query(
        `SELECT character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
         FROM therapist_bonuses
         ORDER BY character_id`
      );

      // Group bonuses by character_id
      const bonuses_by_character: Record<string, Array<{
        bonus_type: string;
        easy_bonus: number;
        easy_penalty: number;
        medium_bonus: number;
        medium_penalty: number;
        hard_bonus: number;
        hard_penalty: number;
      }>> = {};
      for (const row of bonuses_result.rows) {
        if (!bonuses_by_character[row.character_id]) {
          bonuses_by_character[row.character_id] = [];
        }
        bonuses_by_character[row.character_id].push({
          bonus_type: row.bonus_type,
          easy_bonus: parseFloat(row.easy_bonus),
          easy_penalty: parseFloat(row.easy_penalty),
          medium_bonus: parseFloat(row.medium_bonus),
          medium_penalty: parseFloat(row.medium_penalty),
          hard_bonus: parseFloat(row.hard_bonus),
          hard_penalty: parseFloat(row.hard_penalty)
        });
      }

      // Attach bonuses to each therapist
      const characters_with_bonuses = (result.rows as SystemCharacterRow[]).map(char => ({
        ...char,
        bonuses: bonuses_by_character[char.character_id] || []
      }));

      return res.json({
        success: true,
        characters: characters_with_bonuses
      });
    }

    return res.json({
      success: true,
      characters: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error getting system characters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/team-stats', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const team_stats = await user_service.getTeamStats(user_id);
    res.json(team_stats);
  } catch (error: any) {
    console.error('Failed to fetch team stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect Cardano wallet
router.post('/connect-wallet', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { walletAddress, walletName } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Authentication required' });
    }

    if (!walletAddress) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: 'walletAddress is required'
      });
    }

    // Validate wallet address format
    if (walletAddress.length < 50) {
      return res.status(400).json({
        error: 'INVALID_WALLET_ADDRESS',
        message: `Wallet address too short: ${walletAddress.length} characters`
      });
    }

    if (!walletAddress.startsWith('addr')) {
      return res.status(400).json({
        error: 'INVALID_WALLET_PREFIX',
        message: 'Cardano wallet addresses must start with "addr"'
      });
    }

    // Update user record
    const result = await db_adapter.query(
      `UPDATE users 
       SET cardano_wallet_address = $1, cardano_wallet_connected_at = NOW()
       WHERE id = $2
       RETURNING cardano_wallet_address`,
      [walletAddress, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      walletAddress: result.rows[0].cardano_wallet_address,
      walletName: walletName || 'Unknown'
    });
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message
    });
  }
});

export default router;