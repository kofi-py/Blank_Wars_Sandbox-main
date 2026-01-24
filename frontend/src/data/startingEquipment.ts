// Starting Equipment Assignment System
// Uses actual database equipment and items

export interface StartingEquipmentMapping {
  weapon?: string;
  armor?: string;
  consumables?: { item_id: string; quantity: number }[];
}

// Character-specific starting equipment (level 1 from database)
export const characterStartingEquipment: Record<string, StartingEquipmentMapping> = {
  'achilles': {
    weapon: 'trojan_war_sword_achilles',
    armor: 'leather_vest_generic',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  },
  'merlin': {
    weapon: 'apprentice_staff_merlin',
    armor: 'leather_vest_generic',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  },
  'billy_the_kid': {
    weapon: 'rusty_sword_generic',
    armor: 'leather_vest_generic',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  },
  'robin_hood': {
    weapon: 'wooden_club_generic',
    armor: 'leather_vest_generic',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  },
  'tesla': {
    weapon: 'wooden_staff_generic',
    armor: 'laboratory_coat_tesla',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  },
  'frankenstein_monster': {
    weapon: 'wooden_club_generic',
    armor: 'arctic_gear_frankenstein',
    consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
  }
};

// Generic fallback equipment for characters not specified above
export const defaultStartingEquipment: StartingEquipmentMapping = {
  weapon: 'rusty_sword_generic',
  armor: 'leather_vest_generic', 
  consumables: [{ item_id: 'small_health_potion', quantity: 2 }]
};

/**
 * Get starting equipment IDs for a character
 */
export function getStartingEquipmentIds(character_id: string): StartingEquipmentMapping {
  if (characterStartingEquipment[character_id]) {
    return characterStartingEquipment[character_id];
  }
  
  return defaultStartingEquipment;
}

/**
 * Create starting inventory items for a character
 */
export function createStartingInventoryItems(character_id: string): any[] {
  const equipment = getStartingEquipmentIds(character_id);
  const inventory: any[] = [];
  
  if (equipment.weapon) {
    inventory.push({
      id: `${character_id}_starting_weapon`,
      item_id: equipment.weapon,
      quantity: 1,
      acquired_date: new Date(),
      is_equipped: true,
      equipment_slot: 'weapon'
    });
  }
  
  if (equipment.armor) {
    inventory.push({
      id: `${character_id}_starting_armor`,
      item_id: equipment.armor,
      quantity: 1,
      acquired_date: new Date(),
      is_equipped: true,
      equipment_slot: 'armor'
    });
  }
  
  if (equipment.consumables) {
    equipment.consumables.forEach((consumable, index) => {
      inventory.push({
        id: `${character_id}_starting_consumable_${index}`,
        item_id: consumable.item_id,
        quantity: consumable.quantity,
        acquired_date: new Date(),
        is_equipped: false
      });
    });
  }
  
  return inventory;
}