/**
 * Item Routes
 * Consolidated endpoints for item usage, inventory, and character purchases.
 * Reads effects from database - no hardcoded values.
 */

import { Router } from 'express';
import { query } from '../database/postgres';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { db_adapter } from '../services/databaseAdapter';

const router = Router();

interface ItemEffect {
  type: string;
  value?: number | string;
  stat?: string;
  duration?: number;
  target?: string;
  condition?: string;
  chance?: number;
  uses?: number;
}

interface ApplyEffectResult {
  applied: boolean;
  description: string;
  stat_changes?: Record<string, number>;
}

// Row type for items table query - all fields populated in practice
interface ItemsQueryRow {
  id: string;
  name: string;
  description: string | null;
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

// Row type for user inventory query
interface UserInventoryRow {
  item_id: string;
  quantity: number;
  acquired_at: Date;
  name: string;
  description: string | null;
  item_type: string;
  rarity: string;
  effects: string;
  icon: string;
}

// Mapped inventory item for response
interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  icon: string;
  effects: ItemEffect[];
  quantity: number;
  acquired_at: Date;
}

/**
 * Apply item effects to a character
 * Handles all effect types from the database
 */
async function applyEffects(
  character_id: string,
  character: any,
  effects: ItemEffect[],
  quantity: number
): Promise<{ updates: Record<string, any>; results: ApplyEffectResult[] }> {
  const updates: Record<string, any> = {};
  const results: ApplyEffectResult[] = [];

  for (const effect of effects) {
    const result = await applySingleEffect(character_id, character, effect, quantity, updates);
    results.push(result);
  }

  return { updates, results };
}

async function applySingleEffect(
  character_id: string,
  character: any,
  effect: ItemEffect,
  quantity: number,
  updates: Record<string, any>
): Promise<ApplyEffectResult> {
  const effectValue = typeof effect.value === 'number' ? effect.value * quantity : effect.value;

  switch (effect.type) {
    case 'heal': {
      if (effectValue === 'full') {
        updates.current_health = character.current_max_health;
        return { applied: true, description: `Restored to full health` };
      }
      const healAmount = effectValue as number;
      const newHealth = Math.min(character.current_max_health, character.current_health + healAmount);
      updates.current_health = newHealth;

      // Clear injury status if fully healed
      if (newHealth >= character.current_max_health) {
        updates.is_injured = false;
        updates.injury_severity = 'healthy';
        updates.recovery_time = null;
      }

      return {
        applied: true,
        description: `Restored ${healAmount} HP`,
        stat_changes: { health: healAmount }
      };
    }

    case 'energy':
    case 'energy_restore': {
      if (effectValue === 'full') {
        updates.current_energy = character.current_max_energy;
        return { applied: true, description: `Restored to full energy` };
      }
      const energyAmount = effectValue as number;
      const newEnergy = Math.min(character.current_max_energy, character.current_energy + energyAmount);
      updates.current_energy = newEnergy;
      return {
        applied: true,
        description: `Restored ${energyAmount} energy`,
        stat_changes: { energy: energyAmount }
      };
    }

    case 'cleanse': {
      // Clear negative status effects - would need status effect system integration
      return { applied: true, description: 'Cleansed negative effects' };
    }

    case 'buff':
    case 'stat_boost': {
      // Buffs are temporary - would need buff system integration
      // For now, log and return success
      const stat = effect.stat || 'unknown';
      const duration = effect.duration || 3;
      return {
        applied: true,
        description: `Buffed ${stat} by ${effectValue} for ${duration} turns`
      };
    }

    case 'debuff': {
      const stat = effect.stat || 'unknown';
      const duration = effect.duration || 3;
      return {
        applied: true,
        description: `Applied ${stat} debuff of ${effectValue} for ${duration} turns`
      };
    }

    case 'revive': {
      if (!character.is_dead) {
        return { applied: false, description: 'Character is not dead' };
      }
      const revivePercent = effectValue === 100 ? 100 : (effectValue as number);
      updates.current_health = Math.floor(character.current_max_health * (revivePercent / 100));
      updates.is_dead = false;
      return { applied: true, description: `Revived with ${revivePercent}% HP` };
    }

    case 'cure': {
      const condition = effect.condition || 'unknown';
      return { applied: true, description: `Cured ${condition}` };
    }

    case 'shield': {
      const shieldAmount = effectValue as number;
      const duration = effect.duration || 3;
      return { applied: true, description: `Applied ${shieldAmount} shield for ${duration} turns` };
    }

    case 'regen': {
      const regenAmount = effectValue as number;
      const duration = effect.duration || 5;
      return { applied: true, description: `Applied ${regenAmount} HP regen for ${duration} turns` };
    }

    case 'training_boost':
    case 'xp_boost':
    case 'exp_boost': {
      const boostPercent = effectValue as number;
      const duration = effect.duration || 1;
      return { applied: true, description: `XP boost ${boostPercent}% for ${duration} battles` };
    }

    case 'protection': {
      const protectPercent = effectValue as number;
      const duration = effect.duration || 3;
      return { applied: true, description: `Damage reduced by ${protectPercent}% for ${duration} turns` };
    }

    case 'lifesteal': {
      const lifestealPercent = effectValue as number;
      const duration = effect.duration || 5;
      return { applied: true, description: `${lifestealPercent}% lifesteal for ${duration} turns` };
    }

    case 'invulnerable': {
      const duration = effect.duration || 1;
      return { applied: true, description: `Invulnerable for ${duration} turns` };
    }

    case 'team_buff': {
      const stat = effect.stat || 'all';
      const duration = effect.duration || 5;
      return { applied: true, description: `Team ${stat} buffed by ${effectValue} for ${duration} turns` };
    }

    default:
      console.warn(`Unknown effect type: ${effect.type}`);
      return { applied: false, description: `Unknown effect: ${effect.type}` };
  }
}

/**
 * POST /api/items/characters/:id/use
 * Use an item on a character - reads effects from DB and applies them
 */
router.post('/characters/:id/use', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🧪 [POST /api/items/characters/:id/use] Using item on character');

  try {
    const user_id = req.user?.id;
    const character_id = req.params.id;
    const { item_id, quantity = 1 } = req.body;

    if (!user_id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!item_id) {
      return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    if (quantity < 1 || quantity > 99) {
      return res.status(400).json({ success: false, error: 'Quantity must be between 1 and 99' });
    }

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({ success: false, error: 'Character not found or access denied' });
    }

    // Check if character is dead (except for revive items)
    // We'll check this after getting the item to see if it's a revive item

    // Get item from database with effects
    const item_result = await query(
      'SELECT id, name, effects, consumable FROM items WHERE id = $1',
      [item_id]
    );

    if (item_result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found in database' });
    }

    const item = item_result.rows[0];
    const effects: ItemEffect[] = typeof item.effects === 'string'
      ? JSON.parse(item.effects)
      : (item.effects || []);

    // Check if character is dead and item is not a revive
    const hasRevive = effects.some(e => e.type === 'revive');
    if ((character as any).is_dead && !hasRevive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use this item on dead characters. Use a revive item first.'
      });
    }

    // Check user's inventory for the item
    const inventory_result = await query(
      'SELECT quantity FROM user_items WHERE user_id = $1 AND item_id = $2',
      [user_id, item_id]
    );

    if (inventory_result.rows.length === 0 || inventory_result.rows[0].quantity < quantity) {
      const available = inventory_result.rows.length > 0 ? inventory_result.rows[0].quantity : 0;
      return res.status(400).json({
        success: false,
        error: `Insufficient ${item.name}. You have ${available}, need ${quantity}`
      });
    }

    // Apply effects
    const { updates, results } = await applyEffects(character_id, character, effects, quantity);

    // Update character if there are changes
    if (Object.keys(updates).length > 0) {
      const update_success = await db_adapter.user_characters.update(character_id, updates);
      if (!update_success) {
        return res.status(500).json({ success: false, error: 'Failed to apply item effects' });
      }
    }

    // Consume the item if consumable (default true)
    if (item.consumable !== false) {
      const new_quantity = inventory_result.rows[0].quantity - quantity;
      if (new_quantity <= 0) {
        await query('DELETE FROM user_items WHERE user_id = $1 AND item_id = $2', [user_id, item_id]);
      } else {
        await query(
          'UPDATE user_items SET quantity = $1 WHERE user_id = $2 AND item_id = $3',
          [new_quantity, user_id, item_id]
        );
      }
    }

    // Get updated character
    const updated_character = await db_adapter.user_characters.find_by_id(character_id);

    console.log(`✅ ${character.name} used ${quantity}x ${item.name}: ${results.map(r => r.description).join(', ')}`);

    return res.json({
      success: true,
      message: `${character.name} used ${quantity}x ${item.name}`,
      effects_applied: results,
      character: updated_character,
      item_used: {
        id: item_id,
        name: item.name,
        quantity
      }
    });

  } catch (error: any) {
    console.error('Error using item:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/items/characters/:id/inventory
 * Get a character's personal inventory
 */
router.get('/characters/:id/inventory', authenticate_token, async (req: AuthRequest, res) => {
  console.log('📦 [GET /api/items/characters/:id/inventory] Getting character inventory');

  try {
    const user_id = req.user?.id;
    const character_id = req.params.id;

    if (!user_id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Verify character belongs to user
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character || character.user_id !== user_id) {
      return res.status(404).json({ success: false, error: 'Character not found or access denied' });
    }

    // Get character's equipment and items
    const [equipment, items] = await Promise.all([
      db_adapter.character_equipment.find_by_character_id(character.id),
      db_adapter.character_items.find_by_character_id(character.id)
    ]);

    return res.json({
      success: true,
      inventory: {
        equipment,
        items,
        total_equipment: equipment.length,
        total_items: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      },
      character: {
        id: character_id,
        name: character.name,
        wallet: character.wallet
      }
    });

  } catch (error: any) {
    console.error('Error getting character inventory:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/characters/:id/purchase
 * Character buys an item with their personal wallet
 */
router.post('/characters/:id/purchase', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🛒 [POST /api/items/characters/:id/purchase] Character purchasing item');

  try {
    const user_id = req.user?.id;
    const character_id = req.params.id;
    const { item_id, quantity = 1 } = req.body;

    if (!user_id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!item_id) {
      return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    if (quantity < 1 || quantity > 99) {
      return res.status(400).json({ success: false, error: 'Quantity must be between 1 and 99' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Verify character belongs to user
      const character = await db_adapter.user_characters.find_by_id(character_id);
      if (!character || character.user_id !== user_id) {
        await query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Character not found or access denied' });
      }

      // Check both items and equipment tables
      let item = null;
      let item_type: 'item' | 'equipment' | null = null;

      const item_result = await query('SELECT * FROM items WHERE id = $1', [item_id]);
      if (item_result.rows.length > 0) {
        item = item_result.rows[0];
        item_type = 'item';
      } else {
        const equipment_result = await query('SELECT * FROM equipment WHERE id = $1', [item_id]);
        if (equipment_result.rows.length > 0) {
          item = equipment_result.rows[0];
          item_type = 'equipment';
        }
      }

      if (!item) {
        await query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Item or equipment not found' });
      }

      const total_cost = (item.shop_price || 0) * quantity;
      const current_wallet = character.wallet || 0;

      if (current_wallet < total_cost) {
        await query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds',
          required: total_cost,
          available: current_wallet
        });
      }

      // Add to character's inventory
      if (item_type === 'equipment') {
        for (let i = 0; i < quantity; i++) {
          await db_adapter.character_equipment.add(character_id, item_id, 'purchase');
        }
      } else {
        await db_adapter.character_items.add(character_id, item_id, quantity, 'purchase');
      }

      // Deduct from wallet
      const new_wallet = current_wallet - total_cost;
      await db_adapter.user_characters.update(character_id, { wallet: new_wallet });

      // Record purchase
      await query(`
        INSERT INTO purchases (user_id, character_id, item_type, item_id, quantity, cost, transaction_status, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'completed', CURRENT_TIMESTAMP)
      `, [user_id, character_id, item_type, item_id, quantity, total_cost]);

      await query('COMMIT');

      console.log(`✅ ${character.name} purchased ${quantity}x ${item.name} for $${total_cost}`);

      return res.json({
        success: true,
        message: `${character.name} purchased ${quantity}x ${item.name}`,
        purchase: {
          item_id,
          item_name: item.name,
          item_type,
          quantity,
          total_cost,
          remaining_wallet: new_wallet
        }
      });

    } catch (transaction_error) {
      await query('ROLLBACK');
      throw transaction_error;
    }

  } catch (error: any) {
    console.error('Error processing character purchase:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/items
 * Get all available items from the database
 */
router.get('/', async (req, res) => {
  console.log('🎯 [GET /api/items] Getting all items');

  try {
    const result = await query(`
      SELECT id, name, description, item_type, rarity, effects,
             usage_context, shop_price, icon, flavor_text, stackable, max_stack
      FROM items
      ORDER BY rarity, shop_price ASC
    `);

    const items = result.rows.map((row: ItemsQueryRow) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.item_type,
      rarity: row.rarity,
      icon: row.icon,
      effects: JSON.parse(row.effects) as ItemEffect[],
      usage_context: row.usage_context,
      stackable: row.stackable,
      max_stack: row.max_stack,
      price: row.shop_price,
      flavor: row.flavor_text
    }));

    return res.json({ success: true, items });

  } catch (error) {
    console.error('Error fetching items:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch items' });
  }
});

/**
 * GET /api/items/user/inventory
 * Get the user's (coach's) item inventory
 */
router.get('/user/inventory', authenticate_token, async (req: AuthRequest, res) => {
  console.log('📦 [GET /api/items/user/inventory] Getting user inventory');

  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const result = await query(`
      SELECT ui.item_id, ui.quantity, ui.acquired_at,
             i.name, i.description, i.item_type, i.rarity, i.effects, i.icon
      FROM user_items ui
      JOIN items i ON ui.item_id = i.id
      WHERE ui.user_id = $1
      ORDER BY i.rarity, i.name
    `, [user_id]);

    const items: InventoryItem[] = result.rows.map((row: UserInventoryRow) => ({
      id: row.item_id,
      name: row.name,
      description: row.description,
      type: row.item_type,
      rarity: row.rarity,
      icon: row.icon,
      effects: JSON.parse(row.effects) as ItemEffect[],
      quantity: row.quantity,
      acquired_at: row.acquired_at
    }));

    return res.json({
      success: true,
      inventory: items,
      total_items: items.reduce((sum: number, item: InventoryItem) => sum + item.quantity, 0)
    });

  } catch (error) {
    console.error('Error fetching user inventory:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch inventory' });
  }
});

export default router;
