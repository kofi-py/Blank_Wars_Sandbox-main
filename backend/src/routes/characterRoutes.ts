import { Router } from 'express';
import { db_adapter } from '../services/databaseAdapter';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { query } from '../database/postgres';
import { check_adherence_and_equip } from '../services/autonomousDecisionService';

// Row type for character equipment query (e.* from equipment + is_equipped from character_equipment)
interface CharacterEquipmentRow {
  id: string;
  name: string;
  description: string;
  slot: string;
  equipment_type: string;
  rarity: string;
  required_level: number | null;
  restricted_to_character: string | null;
  stats: string | null;
  effects: string | null;
  icon: string | null;
  prompt_addition: string | null;
  shop_price: number | null;
  is_equipped: boolean;
}

const router = Router();

// Get user's characters (authenticated)
router.get('/', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [/api/characters] Getting user characters');
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get only the user's characters, not all characters
    const user_characters = await db_adapter.user_characters.find_by_user_id(user_id);
    console.log(`📊 Found ${user_characters.length} characters for user ${user_id}`);

    // Get user's consumable items inventory
    let user_inventory = await db_adapter.user_items.find_by_user_id(user_id);
    console.log(`📦 Found ${user_inventory.length} consumable items in user inventory`);

    // Build characters with their equipment
    const characters_with_starter_gear = await Promise.all(user_characters.map(async (character) => {
      // Get character-specific equipment
      const character_equipment_result = await db_adapter.query(`
        SELECT e.*, ce.is_equipped
        FROM character_equipment ce
        JOIN equipment e ON ce.equipment_id = e.id
        WHERE ce.character_id = $1
      `, [character.id]);

      // GOVERNANCE: No fallbacks - fail loudly if query failed
      if (!character_equipment_result || !character_equipment_result.rows) {
        throw new Error(`Equipment query failed for character ${character.id}`);
      }
      const raw_equipment = character_equipment_result.rows;
      console.log(`⚔️ Found ${raw_equipment.length} equipment items for character ${character.id}`);

      // Convert equipment to frontend format
      const character_equipment = (raw_equipment as CharacterEquipmentRow[]).map(eq => ({
        id: eq.id,
        name: eq.name,
        description: eq.description,
        slot: eq.slot,
        type: eq.equipment_type,
        rarity: eq.rarity,
        level: 1,
        required_level: eq.required_level || 1,
        required_archetype: [],
        preferred_character: eq.restricted_to_character,
        stats: eq.stats ? JSON.parse(eq.stats) : {},
        effects: eq.effects ? JSON.parse(eq.effects) : [],
        icon: eq.icon || '⚔️',
        price: eq.shop_price || 0,
        sell_price: Math.floor((eq.shop_price || 0) * 0.25),
        prompt_addition: eq.prompt_addition || '',
        is_equipped: eq.is_equipped
      }));

      return {
        ...character,
        inventory: [...user_inventory, ...character_equipment]
      };
    }));

    return res.json({
      success: true,
      characters: characters_with_starter_gear
    });
  } catch (error: any) {
    console.error('❌ Error fetching user characters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get character bond history
router.get('/:id/bond-history', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [GET /api/characters/:id/bond-history] Fetching bond history');
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Verify ownership
    const character = await db_adapter.user_characters.find_by_id(id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found or access denied'
      });
    }

    // Import service dynamically to avoid circular deps if any
    const { getBondActivityHistory } = await import('../services/bondTrackingService');

    const history = await getBondActivityHistory(id);

    return res.json({
      success: true,
      history
    });

  } catch (error: any) {
    console.error('❌ Error fetching bond history:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update character financial data
router.put('/:id/financials', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [PUT /api/characters/:id/financials] Updating character financial data');
  try {
    const { id } = req.params;
    const { wallet, debt, financial_stress, coach_financial_trust, monthly_earnings, equipment_budget, consumables_budget } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Verify the character belongs to the authenticated user
    const user_character = await db_adapter.user_characters.find_by_id(id);
    if (!user_character) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }

    if (user_character.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - character does not belong to user'
      });
    }

    // Reject snake_case fields - frontend must use camel_case
    if ('financial_stress' in req.body || 'coach_trust_level' in req.body || 'monthly_earnings' in req.body) {
      return res.status(400).json({
        success: false,
        error: 'Use camel_case: financial_stress, coach_financial_trust, monthly_earnings (not snake_case)'
      });
    }

    // Validate financial data
    const financial_data: any = {};
    if (wallet !== undefined) {
      if (typeof wallet !== 'number' || !Number.isInteger(wallet) || wallet < 0) {
        return res.status(400).json({
          success: false,
          error: 'wallet must be a non-negative integer'
        });
      }
      financial_data.wallet = wallet;
    }

    if (debt !== undefined) {
      if (typeof debt !== 'number' || !Number.isInteger(debt) || debt < 0) {
        return res.status(400).json({
          success: false,
          error: 'debt must be a non-negative integer'
        });
      }
      financial_data.debt = debt;
    }

    if (financial_stress !== undefined) {
      if (typeof financial_stress !== 'number' || financial_stress < 0 || financial_stress > 100) {
        return res.status(400).json({
          success: false,
          error: 'financial_stress must be 0..100'
        });
      }
      financial_data.financial_stress = financial_stress;
    }

    if (coach_financial_trust !== undefined) {
      if (typeof coach_financial_trust !== 'number' || coach_financial_trust < 0 || coach_financial_trust > 100) {
        return res.status(400).json({
          success: false,
          error: 'coach_financial_trust must be 0..100'
        });
      }
      financial_data.coach_trust_level = coach_financial_trust;
    }

    if (monthly_earnings !== undefined) {
      if (typeof monthly_earnings !== 'number' || !Number.isInteger(monthly_earnings) || monthly_earnings < 0) {
        return res.status(400).json({
          success: false,
          error: 'monthly_earnings must be a non-negative integer'
        });
      }
      financial_data.monthly_earnings = monthly_earnings;
    }

    if (equipment_budget !== undefined) {
      if (typeof equipment_budget !== 'number' || equipment_budget < 0) {
        return res.status(400).json({
          success: false,
          error: 'Equipment budget must be a non-negative number'
        });
      }
      financial_data.equipment_budget = equipment_budget;
    }

    if (consumables_budget !== undefined) {
      if (typeof consumables_budget !== 'number' || consumables_budget < 0) {
        return res.status(400).json({
          success: false,
          error: 'Consumables budget must be a non-negative number'
        });
      }
      financial_data.consumables_budget = consumables_budget;
    }

    if (Object.keys(financial_data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid financial data provided'
      });
    }

    // Update the character's financial data
    const success = await db_adapter.user_characters.update(id, financial_data);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update character financial data'
      });
    }

    // Return updated character data with full stats from JOIN
    const updated_character = await db_adapter.user_characters.find_by_user_id_and_character_id(user_id, user_character.character_id);
    return res.json({
      success: true,
      character: updated_character
    });

  } catch (error: any) {
    console.error('Error updating character financials:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update character equipment
router.put('/:id/equipment', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [PUT /api/characters/:id/equipment] Updating character equipment');
  try {
    const { id } = req.params;
    const { equipment } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!equipment || !Array.isArray(equipment)) {
      return res.status(400).json({
        success: false,
        error: 'Equipment must be an array'
      });
    }

    // Verify the character belongs to the user
    const character = await db_adapter.user_characters.find_by_id(id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found or not owned by user'
      });
    }

    // Update the character's equipment
    const success = await db_adapter.user_characters.update(id, {
      equipment: equipment
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update character equipment'
      });
    }

    // Return updated character data
    const updated_character = await db_adapter.user_characters.find_by_id(id);
    return res.json({
      success: true,
      character: updated_character
    });

  } catch (error: any) {
    console.error('Error updating character equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Equip equipment to character
router.post('/:id/equip', authenticate_token, async (req: AuthRequest, res) => {
  console.log('⚔️ [POST /api/characters/:id/equip] Equipping equipment to character');
  try {
    const { id: character_id } = req.params;
    const { equipment_id } = req.body;
    const user_id = req.user?.id;

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

    // Check adherence and execute equipment decision
    // Character may follow coach's choice or rebel based on adherence score
    const result = await check_adherence_and_equip({
      user_id,
      character_id,
      coach_equipment_choice: equipment_id
    });

    // Get updated equipped items for response
    const equipped_items = await db_adapter.character_equipment.get_equipped_for_character(character_id);

    console.log(`✅ Equipment decision complete for ${character_id}: ${result.adhered ? 'followed coach' : 'rebelled'}`);

    res.json({
      success: true,
      message: result.message,
      adhered: result.adhered,
      equipped_choice: result.final_choice,
      coach_choice: equipment_id,
      ai_response: result.ai_response, // Character's dialogue
      equipped_items
    });

  } catch (error: any) {
    console.error('Error equipping equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Let character autonomously decide equipment (bypasses adherence check)
router.post('/:id/equip/autonomous', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🤖 [POST /api/characters/:id/equip/autonomous] Autonomous equipment decision');
  try {
    const { id: character_id } = req.params;
    const { slot, coach_choice_id, adherence_score, bond_level } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    console.log(`📊 Adherence check: ${adherence_score}%, Bond: ${bond_level}%`);
    console.log(`🎯 Coach wanted: ${coach_choice_id} for slot: ${slot}`);

    // Use check_adherence_and_equip which handles the adherence check and autonomous decision
    const result = await check_adherence_and_equip({
      user_id,
      character_id,
      coach_equipment_choice: coach_choice_id
    });

    console.log(`✅ Autonomous decision result:`, {
      adhered: result.adhered,
      final_choice: result.final_choice,
      message: result.message
    });

    // Get updated equipped items for response
    const equipped_items = await db_adapter.character_equipment.get_equipped_for_character(character_id);

    res.json({
      success: true,
      adhered: result.adhered,
      ai_choice: result.final_choice,
      reasoning: result.ai_response,
      message: result.message,
      equipped_items
    });

  } catch (error: any) {
    console.error('❌ Error with autonomous equipment decision:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Unequip equipment from character
router.post('/:id/unequip', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🗡️ [POST /api/characters/:id/unequip] Unequipping equipment from character');
  try {
    const { id: character_id } = req.params;
    const { equipment_id } = req.body;
    const user_id = req.user?.id;

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

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }

    // Unequip the equipment from character's personal inventory
    const success = await db_adapter.character_equipment.unequip(character_id, equipment_id);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to unequip equipment'
      });
    }

    // Get updated equipped items for response
    const equipped_items = await db_adapter.character_equipment.get_equipped_for_character(character_id);

    console.log(`✅ Successfully unequipped ${equipment_id} from character ${character_id}`);

    res.json({
      success: true,
      message: 'Equipment unequipped successfully',
      equipped_items
    });

  } catch (error: any) {
    console.error('Error unequipping equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get character's equipped equipment
router.get('/:id/equipped', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [GET /api/characters/:id/equipped] Getting character equipped items');
  try {
    const { id: character_id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }

    // Get equipped items from character's personal inventory
    const equipped_items = await db_adapter.character_equipment.get_equipped_for_character(character_id);

    res.json({
      success: true,
      equipped_items,
      character: {
        id: character.id,
        name: character.name
      }
    });

  } catch (error: any) {
    console.error('Error getting equipped items:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Therapy rewards moved to /api/therapy/:character_id/rewards in therapyRoutes.ts

export default router;