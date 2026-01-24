// Character Inventory and Equipment Management System
// Complete item storage, equipment slots, and stat management

export interface InventoryItem {
  id: string;
  item_id: string; // References Item or Equipment ID
  quantity: number;
  acquired_date: Date;
  is_equipped?: boolean;
  equipment_slot?: 'weapon' | 'armor' | 'accessory';
  enhancement_level?: number;
  custom_stats?: Record<string, number>;
  is_locked?: boolean; // Prevents accidental sale/deletion
  is_favorite?: boolean;
  equipment?: any; // Full equipment data
  item?: any; // Full item data
}

export interface EquippedItems {
  weapon?: InventoryItem;
  armor?: InventoryItem;
  accessory?: InventoryItem;
}

export interface QuickAccessSlots {
  slot1?: InventoryItem; // Consumable quick-use
  slot2?: InventoryItem;
  slot3?: InventoryItem;
  slot4?: InventoryItem;
}

export interface CharacterInventory {
  character_id: string;
  items: InventoryItem[];
  equipped: EquippedItems;
  quick_access: QuickAccessSlots;
  max_slots: number;
  sort_preference: 'type' | 'rarity' | 'level' | 'name' | 'recent';
  auto_sort: boolean;
  last_updated: Date;
}

export interface InventoryFilter {
  type?: 'all' | 'equipment' | 'consumables' | 'enhancers' | 'crafting' | 'special' | 'weapon' | 'armor' | 'accessory';
  rarity?: 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  equipped?: 'all' | 'equipped' | 'unequipped';
  search?: string;
  min_level?: number;
  max_level?: number;
}

export interface StatComparison {
  current: Record<string, number>;
  preview: Record<string, number>;
  changes: Record<string, number>;
}

export interface EquipmentLoadout {
  id: string;
  name: string;
  description?: string;
  equipment: EquippedItems;
  quick_access: QuickAccessSlots;
  created_date: Date;
  last_used?: Date;
  is_active: boolean;
  tags: string[];
}

// Inventory management functions
export function createCharacterInventory(character_id: string, max_slots: number = 50): CharacterInventory {
  return {
    character_id,
    items: [],
    equipped: {},
    quick_access: {},
    max_slots,
    sort_preference: 'type',
    auto_sort: true,
    last_updated: new Date()
  };
}

export function addItemToInventory(
  inventory: CharacterInventory,
  item_id: string,
  quantity: number = 1
): { success: boolean; updated_inventory: CharacterInventory; error?: string } {
  // Check if inventory has space
  const currentItems = inventory.items.reduce((sum, item) => sum + item.quantity, 0);
  if (currentItems + quantity > inventory.max_slots) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Inventory full'
    };
  }

  // Check if item already exists (for stackable items)
  const existingItem = inventory.items.find(item => item.item_id === item_id);

  const updated_inventory = { ...inventory };

  if (existingItem) {
    // Update existing item quantity
    updated_inventory.items = inventory.items.map(item =>
      item.item_id === item_id
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  } else {
    // Add new item
    const newItem: InventoryItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      item_id,
      quantity,
      acquired_date: new Date(),
      is_equipped: false
    };
    updated_inventory.items = [...inventory.items, newItem];
  }

  updated_inventory.last_updated = new Date();

  // Auto-sort if enabled
  if (updated_inventory.auto_sort) {
    updated_inventory.items = sortInventoryItems(updated_inventory.items, inventory.sort_preference);
  }

  return {
    success: true,
    updated_inventory
  };
}

export function removeItemFromInventory(
  inventory: CharacterInventory,
  inventory_item_id: string,
  quantity: number = 1
): { success: boolean; updated_inventory: CharacterInventory; error?: string } {
  const item = inventory.items.find(item => item.id === inventory_item_id);

  if (!item) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Item not found'
    };
  }

  if (item.is_locked) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Item is locked'
    };
  }

  if (item.is_equipped) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Cannot remove equipped item'
    };
  }

  if (quantity >= item.quantity) {
    // Remove item completely
    const updated_inventory = {
      ...inventory,
      items: inventory.items.filter(i => i.id !== inventory_item_id),
      last_updated: new Date()
    };
    return { success: true, updated_inventory };
  } else {
    // Reduce quantity
    const updated_inventory = {
      ...inventory,
      items: inventory.items.map(i =>
        i.id === inventory_item_id
          ? { ...i, quantity: i.quantity - quantity }
          : i
      ),
      last_updated: new Date()
    };
    return { success: true, updated_inventory };
  }
}

export function equipItem(
  inventory: CharacterInventory,
  inventory_item_id: string,
  slot: 'weapon' | 'armor' | 'accessory'
): { success: boolean; updated_inventory: CharacterInventory; error?: string; unequippedItem?: InventoryItem } {
  const item = inventory.items.find(item => item.id === inventory_item_id);

  if (!item) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Item not found'
    };
  }

  // Check if item is already equipped
  if (item.is_equipped) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Item is already equipped'
    };
  }

  const updated_inventory = { ...inventory };
  let unequippedItem: InventoryItem | undefined;

  // Unequip current item in slot if exists
  if (updated_inventory.equipped[slot]) {
    const currentEquipped = updated_inventory.equipped[slot]!;
    unequippedItem = currentEquipped;

    // Mark as unequipped
    updated_inventory.items = updated_inventory.items.map(i =>
      i.id === currentEquipped.id
        ? { ...i, is_equipped: false, equipment_slot: undefined }
        : i
    );
  }

  // Equip new item
  updated_inventory.items = updated_inventory.items.map(i =>
    i.id === inventory_item_id
      ? { ...i, is_equipped: true, equipment_slot: slot }
      : i
  );

  updated_inventory.equipped[slot] = updated_inventory.items.find(i => i.id === inventory_item_id)!;
  updated_inventory.last_updated = new Date();

  return {
    success: true,
    updated_inventory,
    unequippedItem
  };
}

export function unequipItem(
  inventory: CharacterInventory,
  slot: 'weapon' | 'armor' | 'accessory'
): { success: boolean; updated_inventory: CharacterInventory; error?: string } {
  const equippedItem = inventory.equipped[slot];

  if (!equippedItem) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'No item equipped in this slot'
    };
  }

  const updated_inventory = {
    ...inventory,
    items: inventory.items.map(item =>
      item.id === equippedItem.id
        ? { ...item, is_equipped: false, equipment_slot: undefined }
        : item
    ),
    equipped: {
      ...inventory.equipped,
      [slot]: undefined
    },
    last_updated: new Date()
  };

  return {
    success: true,
    updated_inventory
  };
}

export function setQuickAccessSlot(
  inventory: CharacterInventory,
  slot_number: 1 | 2 | 3 | 4,
  inventory_item_id?: string
): { success: boolean; updated_inventory: CharacterInventory; error?: string } {
  const slotKey = `slot${slot_number}` as keyof QuickAccessSlots;

  if (!inventory_item_id) {
    // Clear slot
    const updated_inventory = {
      ...inventory,
      quick_access: {
        ...inventory.quick_access,
        [slotKey]: undefined
      },
      last_updated: new Date()
    };
    return { success: true, updated_inventory };
  }

  const item = inventory.items.find(item => item.id === inventory_item_id);

  if (!item) {
    return {
      success: false,
      updated_inventory: inventory,
      error: 'Item not found'
    };
  }

  const updated_inventory = {
    ...inventory,
    quick_access: {
      ...inventory.quick_access,
      [slotKey]: item
    },
    last_updated: new Date()
  };

  return {
    success: true,
    updated_inventory
  };
}

export function filterInventoryItems(items: InventoryItem[], filter: InventoryFilter): InventoryItem[] {
  return items.filter(item => {
    // Type filter
    if (filter.type && filter.type !== 'all') {
      // This would need to check against the actual item data
      // For now, we'll assume the filter passes
    }

    // Rarity filter
    if (filter.rarity && filter.rarity !== 'all') {
      // This would need to check against the actual item data
    }

    // Equipped filter
    if (filter.equipped && filter.equipped !== 'all') {
      if (filter.equipped === 'equipped' && !item.is_equipped) return false;
      if (filter.equipped === 'unequipped' && item.is_equipped) return false;
    }

    // Search filter
    if (filter.search) {
      // This would need to check against item names/descriptions
    }

    return true;
  });
}

export function sortInventoryItems(items: InventoryItem[], sort_by: CharacterInventory['sort_preference']): InventoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort_by) {
      case 'recent':
        return new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime();
      case 'name':
        return a.item_id.localeCompare(b.item_id);
      case 'type':
      case 'rarity':
      case 'level':
      default:
        // These would need actual item data to sort properly
        return a.item_id.localeCompare(b.item_id);
    }
  });
}

export function calculateInventoryStats(inventory: CharacterInventory): {
  total_items: number;
  used_slots: number;
  available_slots: number;
  equipped_items: number;
  value_by_rarity: Record<string, number>;
} {
  const totalItems = inventory.items.reduce((sum, item) => sum + item.quantity, 0);
  const equipped_items = Object.values(inventory.equipped).filter(Boolean).length;

  return {
    total_items: totalItems,
    used_slots: totalItems,
    available_slots: inventory.max_slots - totalItems,
    equipped_items,
    value_by_rarity: {} // Would calculate based on actual item data
  };
}

export function createLoadout(
  name: string,
  description: string,
  equipment: EquippedItems,
  quick_access: QuickAccessSlots,
  tags: string[] = []
): EquipmentLoadout {
  return {
    id: `loadout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    equipment,
    quick_access,
    created_date: new Date(),
    is_active: false,
    tags
  };
}

export function applyLoadout(
  inventory: CharacterInventory,
  loadout: EquipmentLoadout
): { success: boolean; updated_inventory: CharacterInventory; errors: string[] } {
  let updated_inventory = { ...inventory };
  const errors: string[] = [];

  // Unequip all current items
  Object.keys(updated_inventory.equipped).forEach(slot => {
    const result = unequipItem(updated_inventory, slot as any);
    if (result.success) {
      updated_inventory = result.updated_inventory;
    }
  });

  // Equip loadout items
  Object.entries(loadout.equipment).forEach(([slot, item]) => {
    if (item) {
      // Find the item in inventory
      const inventoryItem = updated_inventory.items.find(i => i.item_id === item.item_id);
      if (inventoryItem) {
        const result = equipItem(updated_inventory, inventoryItem.id, slot as any);
        if (result.success) {
          updated_inventory = result.updated_inventory;
        } else {
          errors.push(`Failed to equip ${slot}: ${result.error}`);
        }
      } else {
        errors.push(`Item not found in inventory: ${item.item_id}`);
      }
    }
  });

  // Set quick access slots
  Object.entries(loadout.quick_access).forEach(([slotKey, item]) => {
    if (item) {
      const slotNumber = parseInt(slotKey.replace('slot', '')) as 1 | 2 | 3 | 4;
      const inventoryItem = updated_inventory.items.find(i => i.item_id === item.item_id);
      if (inventoryItem) {
        const result = setQuickAccessSlot(updated_inventory, slotNumber, inventoryItem.id);
        if (result.success) {
          updated_inventory = result.updated_inventory;
        } else {
          errors.push(`Failed to set quick access slot ${slotNumber}: ${result.error}`);
        }
      }
    }
  });

  return {
    success: errors.length === 0,
    updated_inventory,
    errors
  };
}

// Demo inventory data
export function createDemoInventory(character_id: string): CharacterInventory {
  const inventory = createCharacterInventory(character_id, 50);

  // Add some demo equipment items (using actual equipment IDs that assassins can use)
  const demoItems: { item_id: string; quantity: number }[] = [
    // Weapons - items that assassins can equip
    { item_id: 'ceremonial_dagger', quantity: 1 }, // assassin, mage
    { item_id: 'royal_khopesh', quantity: 1 }, // assassin, mage
    { item_id: 'walking_stick', quantity: 1 }, // assassin, support
    { item_id: 'iron_sword', quantity: 1 }, // warrior, leader (for testing requirements)
    { item_id: 'flame_blade', quantity: 1 }, // warrior (for testing requirements)
    // Armor - items that assassins can equip
    { item_id: 'assassin_garb', quantity: 1 }, // trickster (for testing requirements)
    { item_id: 'leather_vest', quantity: 1 }, // basic armor (check requirements)
    // Accessories
    { item_id: 'power_ring', quantity: 1 }, // check requirements
    { item_id: 'phoenix_feather', quantity: 1 }, // check requirements
    { item_id: 'scholars_pendant', quantity: 1 }, // check requirements
    // Items (actual IDs from items.ts)
    { item_id: 'health_potion', quantity: 5 },
    { item_id: 'mana_crystal', quantity: 3 },
    { item_id: 'energy_drink', quantity: 2 }
  ];

  let updated_inventory = inventory;

  demoItems.forEach(({ item_id, quantity }) => {
    const result = addItemToInventory(updated_inventory, item_id, quantity);
    if (result.success) {
      updated_inventory = result.updated_inventory;
    }
  });

  return updated_inventory;
}
