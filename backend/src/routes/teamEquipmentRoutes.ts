import express from 'express';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types/index';
import db_adapter from '../services/databaseAdapter';

const router = express.Router();

// Get team equipment pool (authenticated)
router.get('/pool', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🏆 [/api/team-equipment/pool] Getting team equipment pool');
  try {
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const team_equipment = await db_adapter.team_equipment_pool.find_by_user_id(user_id);

    return res.json({
      success: true,
      team_equipment
    });

  } catch (error: any) {
    console.error('❌ Error getting team equipment pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get team equipment pool',
      details: error.message
    });
  }
});

// Get available team equipment (authenticated)
router.get('/available', authenticate_token, async (req: AuthRequest, res) => {
  console.log('✅ [/api/team-equipment/available] Getting available team equipment');
  try {
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const available_equipment = await db_adapter.team_equipment_pool.get_available_equipment(user_id);
    
    return res.json({
      success: true,
      equipment: available_equipment
    });

  } catch (error: any) {
    console.error('❌ Error getting available team equipment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get available team equipment',
      details: error.message
    });
  }
});

// Get loaned team equipment (authenticated)
router.get('/loaned', authenticate_token, async (req: AuthRequest, res) => {
  console.log('📤 [/api/team-equipment/loaned] Getting loaned team equipment');
  try {
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const loaned_equipment = await db_adapter.team_equipment_pool.get_loaned_equipment(user_id);
    
    return res.json({
      success: true,
      equipment: loaned_equipment
    });

  } catch (error: any) {
    console.error('❌ Error getting loaned team equipment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get loaned team equipment',
      details: error.message
    });
  }
});

// Add equipment to team pool (authenticated)
router.post('/add', authenticate_token, async (req: AuthRequest, res) => {
  console.log('➕ [/api/team-equipment/add] Adding equipment to team pool');
  try {
    const user_id = req.user?.id;
    const { equipment_id, acquired_from } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!equipment_id) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID is required'
      });
    }

    const success = await db_adapter.team_equipment_pool.add(user_id, equipment_id, acquired_from || 'coach_purchase');
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to add equipment to team pool'
      });
    }

    return res.json({
      success: true,
      message: 'Equipment added to team pool successfully'
    });

  } catch (error: any) {
    console.error('❌ Error adding equipment to team pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add equipment to team pool',
      details: error.message
    });
  }
});

// Move equipment from coach inventory to team pool (authenticated)
router.post('/move-from-coach', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🔄 [/api/team-equipment/move-from-coach] Moving equipment from coach inventory to team pool');
  try {
    const user_id = req.user?.id;
    const { equipment_id } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!equipment_id) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID is required'
      });
    }

    const success = await db_adapter.team_equipment_pool.move_from_coach_inventory(user_id, equipment_id);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to move equipment - equipment may not be in coach inventory'
      });
    }

    return res.json({
      success: true,
      message: 'Equipment moved to team pool successfully'
    });

  } catch (error: any) {
    console.error('❌ Error moving equipment to team pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to move equipment to team pool',
      details: error.message
    });
  }
});

// Lend equipment to character (authenticated)
router.post('/lend', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🤝 [/api/team-equipment/lend] Lending equipment to character');
  try {
    const user_id = req.user?.id;
    const { equipment_id, character_id } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!equipment_id || !character_id) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID and Character ID are required'
      });
    }

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found or not owned by user'
      });
    }

    const success = await db_adapter.team_equipment_pool.lend_to_character(user_id, equipment_id, character_id);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to lend equipment - equipment may not be available'
      });
    }

    return res.json({
      success: true,
      message: 'Equipment lent to character successfully'
    });

  } catch (error: any) {
    console.error('❌ Error lending equipment to character:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to lend equipment to character',
      details: error.message
    });
  }
});

// Return equipment from character (authenticated)
router.post('/return', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🔄 [/api/team-equipment/return] Returning equipment from character');
  try {
    const user_id = req.user?.id;
    const { equipment_id, character_id } = req.body;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!equipment_id || !character_id) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID and Character ID are required'
      });
    }

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found or not owned by user'
      });
    }

    const success = await db_adapter.team_equipment_pool.return_from_character(user_id, equipment_id, character_id);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to return equipment from character'
      });
    }

    return res.json({
      success: true,
      message: 'Equipment returned to team pool successfully'
    });

  } catch (error: any) {
    console.error('❌ Error returning equipment from character:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to return equipment from character',
      details: error.message
    });
  }
});

export default router;