import { Router } from 'express';
import { query } from '../database/postgres';

// Row types for shop queries
interface ShopItemRow {
  id: string;
  name: string;
  description: string;
  item_type: string;
  rarity: string;
  effects: string;
  usage_context: string;
  shop_price: number;
  icon: string;
  flavor_text: string | null;
  stackable: boolean;
  max_stack: number;
}

interface ShopEquipmentRow {
  id: string;
  name: string;
  description: string;
  equipment_type: string;
  rarity: string;
  stats: string;
  restricted_to_character: string | null;
  shop_price: number;
  icon: string;
  prompt_addition: string | null;
  required_level: number | null;
}

const router = Router();

// POST /buy-item and /use-item moved to itemRoutes.ts at /api/items

// Get shop items (items with shop_price in database)
router.get('/items', async (req, res) => {
  console.log('🏪 [/api/shop/items] Getting shop items');

  try {
    const result = await query(`
      SELECT id, name, description, item_type, rarity,
             effects, usage_context, shop_price, icon, flavor_text,
             stackable, max_stack
      FROM items
      WHERE shop_price IS NOT NULL AND shop_price > 0
      ORDER BY rarity, shop_price ASC
    `);

    const items = (result.rows as ShopItemRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.item_type,
      rarity: row.rarity,
      icon: row.icon,
      effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : (row.effects || []),
      usage_context: row.usage_context,
      stackable: row.stackable,
      max_stack: row.max_stack,
      price: row.shop_price,
      flavor: row.flavor_text
    }));

    console.log(`🏪 Found ${items.length} items available in shop`);

    res.json({ success: true, items });

  } catch (error: any) {
    console.error('❌ Error fetching shop items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shop items',
      details: error.message
    });
  }
});

// Get shop equipment (equipment with shop_price in database)
router.get('/equipment', async (req, res) => {
  console.log('⚔️ [/api/shop/equipment] Getting shop equipment');

  try {
    const result = await query(`
      SELECT id, name, description, equipment_type, rarity,
             stats, restricted_to_character, shop_price,
             icon, prompt_addition, required_level
      FROM equipment
      WHERE shop_price IS NOT NULL AND shop_price > 0
      ORDER BY rarity, shop_price ASC
    `);

    const equipment = (result.rows as ShopEquipmentRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.equipment_type,
      rarity: row.rarity,
      icon: row.icon,
      price: row.shop_price,
      stat_bonuses: typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {}),
      restricted_to_character: row.restricted_to_character,
      required_level: row.required_level,
      flavor: row.prompt_addition
    }));

    console.log(`⚔️ Found ${equipment.length} equipment items available in shop`);

    res.json({ success: true, equipment });

  } catch (error: any) {
    console.error('❌ Error fetching shop equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shop equipment',
      details: error.message
    });
  }
});

export default router;
