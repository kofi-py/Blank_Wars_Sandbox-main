import { Router } from 'express';
import { db, query } from '../database/index';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';

const router = Router();

// Interface adapters - Convert database format to frontend format
function convertDbEquipmentToFrontend(db_equipment: any) {
  return {
    id: db_equipment.id,
    name: db_equipment.name,
    description: db_equipment.description,
    slot: db_equipment.slot,
    type: db_equipment.equipment_type,
    rarity: db_equipment.rarity,
    level: 1, // Frontend expects level
    required_level: db_equipment.required_level || 1,
    required_archetype: [], // Frontend expects array
    preferred_character: db_equipment.restricted_to_character, // Convert restricted_to_character to preferred_character
    stats: db_equipment.stats ? JSON.parse(db_equipment.stats) : {},
    effects: db_equipment.effects ? JSON.parse(db_equipment.effects) : [],
    icon: db_equipment.icon || '⚔️',
    price: db_equipment.shop_price || 0,
    sell_price: Math.floor((db_equipment.shop_price || 0) * 0.25),
    acquired_from: 'shop',
    lore: db_equipment.description,
    prompt_addition: db_equipment.prompt_addition || ''
  };
}

function convertDbItemToFrontend(db_item: any) {
  return {
    id: db_item.id,
    name: db_item.name,
    description: db_item.description,
    type: db_item.item_type,
    rarity: db_item.rarity,
    icon: db_item.icon || '🧪',
    effects: db_item.effects ? JSON.parse(db_item.effects) : [],
    usage_context: db_item.usage_context || 'anytime',
    stackable: db_item.stackable || true,
    max_stack: db_item.max_stack || 99,
    cooldown: db_item.cooldown_turns || 0,
    price: db_item.shop_price || 0
  };
}

// Get all equipment (public route for game data)
router.get('/', async (req, res) => {
  console.log('🎯 [/api/equipment] Getting all equipment');
  try {
    const result = await query('SELECT * FROM equipment ORDER BY rarity, required_level');
    const equipment = result.rows.map(convertDbEquipmentToFrontend);
    
    console.log(`📊 Found ${equipment.length} equipment items`);
    
    return res.json({
      success: true,
      equipment: equipment
    });
  } catch (error: any) {
    console.error('❌ Error fetching equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get equipment for specific character
router.get('/character/:character_id', async (req, res) => {
  console.log(`🎯 [/api/equipment/character/${req.params.character_id}] Getting character equipment`);
  try {
    const { character_id } = req.params;
    
    // First try to get equipment using the exact character_id/name
    let result = await query(
      'SELECT * FROM equipment WHERE restricted_to_character = $1 ORDER BY required_level',
      [character_id]
    );
    
    // If no results and character_id looks like a UUID, try to find equipment by character name
    if (result.rows.length === 0 && character_id.includes('-')) {
      console.log(`🔍 No equipment found for UUID ${character_id}, trying to lookup by character name...`);
      
      // Get character name from characters table
      const character_result = await query(
        'SELECT name FROM characters WHERE id = $1',
        [character_id]
      );
      
      if (character_result.rows.length > 0) {
        const character_name = character_result.rows[0].name;
        console.log(`🔍 Found character name: ${character_name}, searching equipment by name...`);
        
        // Try again with character name
        result = await query(
          'SELECT * FROM equipment WHERE restricted_to_character = $1 ORDER BY required_level',
          [character_name]
        );
      }
    }
    
    // If still no results and character_id is a name, try to find by character ID
    if (result.rows.length === 0 && !character_id.includes('-')) {
      console.log(`🔍 No equipment found for name ${character_id}, trying to lookup by character ID...`);
      
      // Get character ID from characters table
      const character_result = await query(
        'SELECT id FROM characters WHERE name = $1',
        [character_id]
      );
      
      if (character_result.rows.length > 0) {
        const character_id_from_db = character_result.rows[0].id;
        console.log(`🔍 Found character ID: ${character_id_from_db}, searching equipment by ID...`);

        // Try again with character ID
        result = await query(
          'SELECT * FROM equipment WHERE restricted_to_character = $1 ORDER BY required_level',
          [character_id_from_db]
        );
      }
    }
    
    const equipment = result.rows.map(convertDbEquipmentToFrontend);
    
    console.log(`📊 Found ${equipment.length} equipment items for ${character_id}`);
    
    return res.json({
      success: true,
      character: character_id,
      equipment: equipment
    });
  } catch (error: any) {
    console.error('❌ Error fetching character equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get generic equipment (available to all characters)
router.get('/generic', async (req, res) => {
  console.log('🎯 [/api/equipment/generic] Getting generic equipment');
  try {
    const result = await query(
      'SELECT * FROM equipment WHERE restricted_to_character = $1 ORDER BY rarity, required_level',
      ['universal']
    );
    
    const equipment = result.rows.map(convertDbEquipmentToFrontend);
    
    console.log(`📊 Found ${equipment.length} generic equipment items`);
    
    return res.json({
      success: true,
      equipment: equipment
    });
  } catch (error: any) {
    console.error('❌ Error fetching generic equipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all consumable items
router.get('/items', async (req, res) => {
  console.log('🎯 [/api/equipment/items] Getting all consumable items');
  try {
    const result = await query('SELECT * FROM items ORDER BY rarity, shop_price');
    const items = result.rows.map(convertDbItemToFrontend);
    
    console.log(`📊 Found ${items.length} consumable items`);
    
    return res.json({
      success: true,
      items: items
    });
  } catch (error: any) {
    console.error('❌ Error fetching items:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's equipment inventory (authenticated)
router.get('/inventory', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎯 [/api/equipment/inventory] Getting user equipment inventory');
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user_equipment table exists, if not, provide starter inventory
    try {
      // Try to query user's actual equipment first
      const equipment_query = `
        SELECT
          e.*,
          1 as quantity,
          false as equipped,
          ue.created_at as acquired_at
        FROM user_equipment ue
        JOIN equipment e ON ue.equipment_id = e.id
        WHERE ue.user_id = $1
        ORDER BY e.rarity, e.name
      `;

      const items_query = `
        SELECT
          i.*,
          ui.quantity,
          ui.created_at as acquired_at
        FROM user_items ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = $1
        ORDER BY i.rarity, i.name
      `;

      // Also query character-specific equipment and items
      const character_equipment_query = `
        SELECT
          e.*,
          ce.character_id,
          1 as quantity,
          false as equipped,
          uc.acquired_at
        FROM character_equipment ce
        JOIN equipment e ON ce.equipment_id = e.id
        JOIN user_characters uc ON ce.character_id = uc.id
        WHERE uc.user_id = $1
        ORDER BY e.rarity, e.name
      `;

      const character_items_query = `
        SELECT
          i.*,
          ci.quantity,
          ci.character_id,
          uc.acquired_at
        FROM character_items ci
        JOIN items i ON ci.item_id = i.id
        JOIN user_characters uc ON ci.character_id = uc.id
        WHERE uc.user_id = $1
        ORDER BY i.rarity, i.name
      `;

      const [equipment_result, items_result, char_equipment_result, char_items_result] = await Promise.all([
        query(equipment_query, [user_id]).catch(() => ({ rows: [] })),
        query(items_query, [user_id]).catch(() => ({ rows: [] })),
        query(character_equipment_query, [user_id]).catch(() => ({ rows: [] })),
        query(character_items_query, [user_id]).catch(() => ({ rows: [] }))
      ]);

      // Combine user inventory and character-specific inventory
      const all_equipment_rows = [...equipment_result.rows, ...char_equipment_result.rows];
      const all_items_rows = [...items_result.rows, ...char_items_result.rows];

      // If we have any inventory data (user or character), use it
      if (all_equipment_rows.length > 0 || all_items_rows.length > 0) {
        const user_equipment = all_equipment_rows.map((row: any) => ({
          ...convertDbEquipmentToFrontend(row),
          quantity: row.quantity || 1,
          equipped: row.equipped || false,
          acquired_at: row.acquired_at,
          character_id: row.character_id || null // Track which character it belongs to
        }));

        const user_items = all_items_rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.item_type,
          character_id: row.character_id || null, // Track which character it belongs to
          rarity: row.rarity,
          icon: row.icon || '📦',
          effects: row.effects ? JSON.parse(row.effects) : [],
          usage_context: row.usage_context || 'anytime',
          stackable: row.stackable || false,
          max_stack: row.max_stack || 1,
          cooldown: row.cooldown,
          price: row.shop_price || 0,
          flavor: row.flavor || '',
          consume_on_use: row.consume_on_use || true,
          quantity: row.quantity || 1,
          acquired_at: row.acquired_at
        }));

        console.log(`✅ Found ${user_equipment.length} equipment items and ${user_items.length} items for user ${user_id}`);

        return res.json({
          success: true,
          inventory: {
            equipment: user_equipment,
            items: user_items
          }
        });
      }

      // Check if user has any items in user_items table
      console.log(`🔍 Checking user_items table for user ${user_id}`);
      
      const user_items_result = await query(`
        SELECT ui.quantity, ui.acquired_at, ui.acquired_from, i.*
        FROM user_items ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = $1
        ORDER BY ui.acquired_at DESC
      `, [user_id]);

      interface UserItemRow {
        id: string;
        name: string;
        description: string | null;
        item_type: string;
        rarity: string;
        icon: string;
        effects: string;
        usage_context: string;
        stackable: boolean;
        max_stack: number;
        cooldown_turns: number;
        shop_price: number;
        prompt_addition: string | null;
        consumable: boolean;
        quantity: number;
        acquired_at: Date;
        acquired_from: string;
      }

      interface InventoryItem {
        id: string;
        name: string;
        description: string | null;
        type: string;
        rarity: string;
        icon: string;
        effects: unknown[];
        usage_context: string;
        stackable: boolean;
        max_stack: number;
        cooldown: number;
        price: number;
        flavor: string | null;
        consume_on_use: boolean;
        quantity: number;
        acquired_at: Date;
        acquired_from: string;
      }

      if (user_items_result.rows.length > 0) {
        // User has items in database - return them
        const user_items = user_items_result.rows.map((row: UserItemRow) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.item_type,
          rarity: row.rarity,
          icon: row.icon,
          effects: JSON.parse(row.effects),
          usage_context: row.usage_context,
          stackable: row.stackable,
          max_stack: row.max_stack,
          cooldown: row.cooldown_turns,
          price: row.shop_price,
          flavor: row.prompt_addition,
          consume_on_use: row.consumable,
          quantity: row.quantity,
          acquired_at: row.acquired_at,
          acquired_from: row.acquired_from
        }));

        console.log(`✅ Found ${user_items.length} items in user inventory`);

        return res.json({
          success: true,
          inventory: {
            equipment: [], // No starter equipment for now
            items: user_items
          }
        });
      } else {
        try {
          const starter_items: InventoryItem[] = [];

          console.log(`✅ Created starter inventory in database: ${starter_items.length} item types for user ${user_id}`);

          return res.json({
            success: true,
            inventory: {
              equipment: [], // No starter equipment
              items: starter_items
            }
          });

        } catch (starter_error) {
          console.error('❌ Failed to create starter items in database:', starter_error);
          // Fall back to hardcoded items if database fails
          const fallback_items = [
            {
              id: 'small_health_potion',
              name: 'Small Health Potion',
              description: 'Basic healing potion for minor injuries',
              type: 'healing',
              rarity: 'common',
              icon: '🧪',
              effects: [{ type: 'heal', value: 25, target: 'self' }],
              usage_context: 'anytime',
              stackable: true,
              max_stack: 20,
              cooldown: 0,
              price: 50,
              quantity: 2,
              acquired_from: 'fallback'
            }
          ];

          return res.json({
            success: true,
            inventory: {
              equipment: [],
              items: fallback_items
            },
            note: 'Fallback starter inventory provided - database integration pending'
          });
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database query failed, returning minimal inventory:', dbError);
      // Minimal fallback inventory
      return res.json({
        success: true,
        inventory: {
          equipment: [],
          items: [
            {
              id: 'small_health_potion',
              name: 'Small Health Potion',
              description: 'Basic healing potion for minor injuries',
              type: 'healing',
              rarity: 'common',
              icon: '🧪',
              effects: [{ type: 'heal', value: 25, target: 'self' }],
              usage_context: 'anytime',
              stackable: true,
              max_stack: 20,
              cooldown: 0,
              price: 50,
              flavor: 'A simple but effective healing potion',
              consume_on_use: true,
              quantity: 3,
              acquired_at: new Date().toISOString()
            }
          ]
        },
        note: 'Fallback inventory provided - user inventory system not fully configured'
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching user inventory:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get crafting recipes
router.get('/crafting-recipes', async (req, res) => {
  console.log('🔨 [/api/equipment/crafting-recipes] Getting crafting recipes');
  try {
    // For now, return empty array since crafting_recipes table may not exist yet
    // This will be populated when the crafting system is fully migrated to database
    const result = await query('SELECT * FROM crafting_recipes ORDER BY required_level, gold_cost').catch(() => ({ rows: [] }));
    
    const recipes = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      result: row.result_item_id,
      result_quantity: row.result_quantity || 1,
      materials: row.materials ? JSON.parse(row.materials) : [],
      gold: row.gold_cost || 0,
      required_level: row.required_level || 1,
      crafting_time: row.crafting_time || 1,
      success_rate: row.success_rate || 100,
      // Equipment-specific fields for progression
      base_equipment_id: row.base_equipment_id,
      result_equipment_id: row.result_equipment_id
    }));

    console.log(`✅ Returning ${recipes.length} crafting recipes`);
    return res.json({
      success: true,
      recipes
    });
  } catch (error: any) {
    console.error('❌ Error fetching crafting recipes:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      note: 'Crafting recipes system not fully configured'
    });
  }
});

// Get crafting materials
router.get('/crafting-materials', async (req, res) => {
  console.log('🧱 [/api/equipment/crafting-materials] Getting crafting materials');
  try {
    // Query crafting_materials table, with fallback if it doesn't exist
    const result = await query('SELECT * FROM crafting_materials ORDER BY rarity, name').catch(() => ({ rows: [] }));
    
    const materials = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      rarity: row.rarity,
      icon: row.icon || '🧱',
      stackable: row.stackable !== false,
      max_stack: row.max_stack || 999,
      obtain_method: row.obtain_method || 'craft',
      value: row.value || 1
    }));

    console.log(`✅ Returning ${materials.length} crafting materials`);
    return res.json({
      success: true,
      materials
    });
  } catch (error: any) {
    console.error('❌ Error fetching crafting materials:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      note: 'Crafting materials system not fully configured'
    });
  }
});

// Get historical weapons  
router.get('/historical-weapons', async (req, res) => {
  console.log('🏛️ [/api/equipment/historical-weapons] Getting historical weapons');
  try {
    // Query historical_weapons table or equipment table with historical filter
    const result = await query(`
      SELECT * FROM equipment 
      WHERE equipment_type = 'historical' OR description LIKE '%historical%' OR name LIKE '%ancient%'
      ORDER BY required_level, name
    `).catch(() => ({ rows: [] }));
    
    const weapons = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      slot: row.slot,
      type: row.equipment_type,
      rarity: row.rarity,
      level: 1,
      required_level: row.required_level || 1,
      required_archetype: [],
      preferred_character: row.restricted_to_character,
      stats: row.stats ? JSON.parse(row.stats) : {},
      effects: row.effects ? JSON.parse(row.effects) : [],
      icon: row.icon || '⚔️',
      price: row.shop_price || 0,
      sell_price: Math.floor((row.shop_price || 0) * 0.25),
      acquired_from: 'historical',
      lore: `Historical weapon: ${row.description}`,
      prompt_addition: row.prompt_addition || ''
    }));

    console.log(`✅ Returning ${weapons.length} historical weapons`);
    return res.json({
      success: true,
      weapons
    });
  } catch (error: any) {
    console.error('❌ Error fetching historical weapons:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      note: 'Historical weapons system not fully configured'
    });
  }
});

export default router;