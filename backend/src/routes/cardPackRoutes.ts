
import { Router } from 'express';
import { PackService } from '../services/packService';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';

const router = Router();
const pack_service = new PackService();

// Check production schema (debug route)
router.get('/check-schema', async (req, res) => {
  try {
    const { query } = require('../database');
    
    // Check users table structure
    const users_schema = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    // Check if user_character_echoes exists
    const echoes_exists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_character_echoes'
      )
    `);
    
    res.json({ 
      success: true, 
      users_schema: users_schema.rows,
      echoes_table_exists: echoes_exists.rows[0].exists
    });
  } catch (error) {
    console.error('Schema check error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create missing user_character_echoes table
router.post('/create-echoes-table', async (req, res) => {
  try {
    const { query } = require('../database');
    console.log('🛠️ Creating user_character_echoes table with correct schema...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS user_character_echoes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_user ON user_character_echoes (user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_character ON user_character_echoes (character_template_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_character_echoes_count ON user_character_echoes (echo_count)');
    
    console.log('✅ user_character_echoes table created successfully');
    
    res.json({ success: true, message: 'user_character_echoes table created successfully' });
  } catch (error) {
    console.error('Create echoes table error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DISABLED: Dangerous fix-contents route that randomly assigns characters to users
// This route was causing users to get 15+ random characters instead of 3 starters
// router.post('/fix-contents', async (req, res) => {
//   try {
//     await pack_service.fixPackContents();
//     res.json({ success: true, message: 'Pack contents fixed' });
//   } catch (error) {
//     console.error('Fix pack contents error:', error);
//     res.status(500).json({ success: false, error: 'Failed to fix pack contents' });
//   }
// });

router.get('/minted-cards', authenticate_token, async (req: AuthRequest, res) => {
  console.log('PACK ENDPOINT HIT - WORKING ON FIX');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user_id = req.user.id;
    console.log('User ID:', user_id);

    // Generate and claim a new pack using the working PackService
    const claim_token = await pack_service.generate_pack('standard_starter');
    const result = await pack_service.claim_pack(user_id, claim_token);

    // Convert to the format expected by the frontend
    const minted_cards = result.granted_characters.map(charId => ({
      character_id: charId,
      character_name: charId, // You may want to fetch actual names
      character_rarity: 'random', // You may want to fetch actual rarities
      serial_number: `mock-${Date.now()}-${charId}`
    }));

    res.json(minted_cards);
  } catch (error: any) {
    console.error('Error generating pack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate a new pack (for purchases or gifts)
router.post('/generate', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🟡 /generate endpoint called');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { pack_type } = req.body;
    if (!pack_type) {
      return res.status(400).json({ error: 'Pack type is required' });
    }

    const claim_token = await pack_service.generate_pack(pack_type);
    res.json({ claim_token });
  } catch (error: any) {
    console.error('Error generating pack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claim a pack for the current user
router.post('/claim', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🟢 /claim endpoint called');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { claim_token } = req.body;
    if (!claim_token) {
      return res.status(400).json({ error: 'Claim token is required' });
    }

    const result = await pack_service.claim_pack(req.user.id, claim_token);
    res.json(result);
  } catch (error: any) {
    console.error('Error claiming pack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a gift pack (admin or special endpoint)
router.post('/gift', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { character_ids } = req.body;
    if (!character_ids || !Array.isArray(character_ids)) {
      return res.status(400).json({ error: 'Character IDs array is required' });
    }

    const claim_token = await pack_service.create_gift_pack(character_ids);
    res.json({ claim_token });
  } catch (error: any) {
    console.error('Error creating gift pack:', error);
    res.status(500).json({ error: error.message });
  }
});

// Purchase endpoint (for Stripe checkout or direct pack generation)
router.post('/purchase', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🛒 /purchase endpoint called');
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { pack_type, quantity = 1 } = req.body;
    if (!pack_type) {
      return res.status(400).json({ error: 'Pack type is required' });
    }

    // For now, directly generate and claim the pack (free starter packs)
    // In the future, this could integrate with Stripe for paid packs
    const claim_token = await pack_service.generate_pack(pack_type);
    const result = await pack_service.claim_pack(req.user.id, claim_token);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error purchasing pack:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
