// Item Image Constants - Based on Actual Database Item Names
// Maps specific item names to their image paths

export interface ItemImageConfig {
  image_path: string;
  fallback_icon: string;
  alt_text: string;
}

// ACTUAL ITEMS FROM DATABASE
export const ITEM_IMAGES: Record<string, ItemImageConfig> = {
  // HEALING ITEMS
  'ambrosia': {
    image_path: '/images/Items/ambrosia.png',
    fallback_icon: '🍯',
    alt_text: 'Ambrosia - Food of the gods'
  },
  'phoenix_feather': {
    image_path: '/images/Items/phoenix_feather.png',
    fallback_icon: '🪶',
    alt_text: 'Phoenix Feather'
  },
  'small_health_potion': {
    image_path: '/images/Items/small_health_potion.png',
    fallback_icon: '🧪',
    alt_text: 'Small Health Potion'
  },
  'health_potion': {
    image_path: '/images/Items/health_potion.png',
    fallback_icon: '🧪',
    alt_text: 'Health Potion'
  },
  'first_aid_kit': {
    image_path: '/images/Items/first_aid_kit.png',
    fallback_icon: '🩹',
    alt_text: 'First Aid Kit'
  },
  'nano_repair_bots': {
    image_path: '/images/Items/nano_repair_bots.png',
    fallback_icon: '🤖',
    alt_text: 'Nano Repair Bots'
  },
  'blessed_holy_water': {
    image_path: '/images/Items/blessed_holy_water.png',
    fallback_icon: '💧',
    alt_text: 'Blessed Holy Water'
  },
  'crimson_blood_vial': {
    image_path: '/images/Items/crimson_blood_vial.png',
    fallback_icon: '🩸',
    alt_text: 'Crimson Blood Vial'
  },
  'estus_flask': {
    image_path: '/images/Items/estus_flask.png',
    fallback_icon: '🍶',
    alt_text: 'Estus Flask'
  },

  // ENERGY/ENHANCEMENT ITEMS
  'mana_crystal': {
    image_path: '/images/Items/mana_crystal.png',
    fallback_icon: '💎',
    alt_text: 'Mana Crystal'
  },
  'extreme_energy_drink': {
    image_path: '/images/Items/extreme_energy_drink.png',
    fallback_icon: '🥤',
    alt_text: 'Extreme Energy Drink'
  },
  'protein_power_shake': {
    image_path: '/images/Items/protein_power_shake.png',
    fallback_icon: '🥛',
    alt_text: 'Protein Power Shake'
  },
  'quantum_energy_cell': {
    image_path: '/images/Items/quantum_energy_cell.png',
    fallback_icon: '🔋',
    alt_text: 'Quantum Energy Cell'
  },
  'cybernetic_enhancement_chip': {
    image_path: '/images/Items/cybernetic_enhancement_chip.png',
    fallback_icon: '🔲',
    alt_text: 'Cybernetic Enhancement Chip'
  },
  'senzu_bean': {
    image_path: '/images/Items/senzu_bean.png',
    fallback_icon: '🫘',
    alt_text: 'Senzu Bean'
  },
  'chakra_enhancement_pill': {
    image_path: '/images/Items/chakra_enhancement_pill.png',
    fallback_icon: '💊',
    alt_text: 'Chakra Enhancement Pill'
  },
  'super_soldier_serum': {
    image_path: '/images/Items/super_soldier_serum.png',
    fallback_icon: '💉',
    alt_text: 'Super Soldier Serum'
  },

  // BEVERAGES
  'matcha_green_tea': {
    image_path: '/images/Items/matcha_green_tea.png',
    fallback_icon: '🍵',
    alt_text: 'Matcha Green Tea'
  },
  'double_espresso': {
    image_path: '/images/Items/double_espresso.png',
    fallback_icon: '☕',
    alt_text: 'Double Espresso'
  },
  'viking_honey_mead': {
    image_path: '/images/Items/viking_honey_mead.png',
    fallback_icon: '🍺',
    alt_text: 'Viking Honey Mead'
  },

  // SPECIAL ITEMS
  'kryptonite_shard': {
    image_path: '/images/Items/kryptonite_shard.png',
    fallback_icon: '💚',
    alt_text: 'Kryptonite Shard'
  },
  '1_up_mushroom': {
    image_path: '/images/Items/1_up_mushroom.png',
    fallback_icon: '🍄',
    alt_text: '1-UP Mushroom'
  },
  'tactical_smartphone': {
    image_path: '/images/Items/tactical_smartphone.png',
    fallback_icon: '📱',
    alt_text: 'Tactical Smartphone'
  },
  'portable_power_bank': {
    image_path: '/images/Items/portable_power_bank.png',
    fallback_icon: '🔌',
    alt_text: 'Portable Power Bank'
  },
  'temporal_crystal': {
    image_path: '/images/Items/temporal_crystal.png',
    fallback_icon: '⏰',
    alt_text: 'Temporal Crystal'
  },

  // DEFAULT FALLBACK
  'unknown': {
    image_path: '/images/Items/unknown.png',
    fallback_icon: '❓',
    alt_text: 'Unknown item'
  }
};

// Helper function to get item image configuration
export const getItemImage = (itemName: string): ItemImageConfig => {
  // Normalize the item name (lowercase, replace spaces and special chars with underscores)
  const normalizedName = itemName
    .toLowerCase()
    .replace(/[\s\-'()]/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  return ITEM_IMAGES[normalizedName] || ITEM_IMAGES.unknown;
};

// Item Rarity Frame Images (similar to equipment)
export const ITEM_RARITY_FRAMES: Record<string, string> = {
  common: '/images/Items/frames/common_frame.png',
  uncommon: '/images/Items/frames/uncommon_frame.png',
  rare: '/images/Items/frames/rare_frame.png',
  epic: '/images/Items/frames/epic_frame.png',
  legendary: '/images/Items/frames/legendary_frame.png'
};

export const getItemRarityFrame = (rarity: string): string => {
  return ITEM_RARITY_FRAMES[rarity.toLowerCase()] || ITEM_RARITY_FRAMES.common;
};