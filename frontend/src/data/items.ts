// Items System for _____ Wars
// ALL GENRES & TIME PERIODS - From Ancient Times to Future Sci-Fi
// Consumables, enhancers, and special items for battle and training

export type ItemType = 'healing' | 'enhancement' | 'training' | 'battle' | 'special' | 'material';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type UsageContext = 'battle' | 'training' | 'anytime' | 'specific';

export interface ItemEffect {
  type: 'heal' | 'stat_boost' | 'energy_restore' | 'xp_boost' | 'training_boost' | 'protection' | 'special';
  value: number;
  duration?: number; // in turns for battle, minutes for training
  target?: 'self' | 'enemy' | 'all_allies';
  stat?: 'atk' | 'def' | 'spd' | 'hp' | 'energy' | 'all';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  effects: ItemEffect[];
  usage_context: UsageContext;
  stackable: boolean;
  max_stack: number;
  cooldown?: number; // turns in battle
  price: number;
  crafting_cost?: { materials: { item: string; quantity: number }[]; gold: number };
  obtain_method: 'shop' | 'craft' | 'drop' | 'quest' | 'event' | 'premium';
  flavor: string;
  consume_on_use: boolean;
}

// Item rarity configuration
export const itemRarityConfig: Record<ItemRarity, {
  name: string;
  color: string;
  text_color: string;
  drop_rate: number;
  icon: string;
  value_multiplier: number;
}> = {
  common: {
    name: 'Common',
    color: 'from-gray-500 to-gray-600',
    text_color: 'text-gray-300',
    drop_rate: 0.7,
    icon: '⚪',
    value_multiplier: 1.0
  },
  uncommon: {
    name: 'Uncommon',
    color: 'from-green-500 to-green-600',
    text_color: 'text-green-300',
    drop_rate: 0.2,
    icon: '🟢',
    value_multiplier: 1.5
  },
  rare: {
    name: 'Rare',
    color: 'from-blue-500 to-blue-600',
    text_color: 'text-blue-300',
    drop_rate: 0.08,
    icon: '🔵',
    value_multiplier: 2.5
  },
  epic: {
    name: 'Epic',
    color: 'from-purple-500 to-purple-600',
    text_color: 'text-purple-300',
    drop_rate: 0.015,
    icon: '🟣',
    value_multiplier: 5.0
  },
  legendary: {
    name: 'Legendary',
    color: 'from-yellow-500 to-orange-500',
    text_color: 'text-yellow-300',
    drop_rate: 0.005,
    icon: '🟡',
    value_multiplier: 10.0
  }
};

// ALL GENRES & TIME PERIODS ITEMS
export const allItems: Item[] = [
  // ANCIENT MYTHOLOGY
  {
    id: 'ambrosia',
    name: 'Ambrosia',
    description: 'Food of the gods that grants divine healing',
    type: 'healing',
    rarity: 'legendary',
    icon: '🍯',
    effects: [{ type: 'heal', value: 100, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 5,
    price: 10000,
    obtain_method: 'quest',
    flavor: 'Sweet nectar that flows from Mount Olympus itself',
    consume_on_use: true
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Mystical feather that resurrects fallen allies',
    type: 'special',
    rarity: 'epic',
    icon: '🪶',
    effects: [{ type: 'heal', value: 50, target: 'self' }, { type: 'protection', value: 25, duration: 3 }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 3,
    price: 5000,
    obtain_method: 'drop',
    flavor: 'Burning with eternal flame, yet cool to the touch',
    consume_on_use: true
  },

  // MEDIEVAL FANTASY
  {
    id: 'small_health_potion',
    name: 'Small Health Potion',
    description: 'Basic healing potion for beginners',
    type: 'healing',
    rarity: 'common',
    icon: '🧪',
    effects: [{ type: 'heal', value: 15, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 25,
    price: 25,
    obtain_method: 'shop',
    flavor: 'Weak but reliable healing brew',
    consume_on_use: true
  },
  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Standard red healing potion',
    type: 'healing',
    rarity: 'common',
    icon: '🧪',
    effects: [{ type: 'heal', value: 25, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 20,
    price: 50,
    obtain_method: 'shop',
    flavor: 'Tastes like cherries and questionable alchemy',
    consume_on_use: true
  },
  {
    id: 'mana_crystal',
    name: 'Mana Crystal',
    description: 'Crystallized magical energy',
    type: 'enhancement',
    rarity: 'uncommon',
    icon: '💎',
    effects: [{ type: 'energy_restore', value: 30, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 15,
    price: 120,
    obtain_method: 'shop',
    flavor: 'Hums with arcane power',
    consume_on_use: true
  },

  // MODERN ERA
  {
    id: 'energy_drink',
    name: 'Extreme Energy Drink',
    description: 'High-caffeine energy drink for instant alertness',
    type: 'enhancement',
    rarity: 'common',
    icon: '🥤',
    effects: [{ type: 'stat_boost', value: 15, stat: 'spd', duration: 5, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 10,
    price: 25,
    obtain_method: 'shop',
    flavor: 'Warning: May cause jitters and superhuman reflexes',
    consume_on_use: true
  },
  {
    id: 'protein_shake',
    name: 'Protein Power Shake',
    description: 'Muscle-building protein drink',
    type: 'training',
    rarity: 'common',
    icon: '🥛',
    effects: [{ type: 'training_boost', value: 20, duration: 60, target: 'self' }],
    usage_context: 'training',
    stackable: true,
    max_stack: 25,
    price: 35,
    obtain_method: 'shop',
    flavor: 'Vanilla flavored gains in a bottle',
    consume_on_use: true
  },
  {
    id: 'first_aid_kit',
    name: 'First Aid Kit',
    description: 'Modern medical supplies for field treatment',
    type: 'healing',
    rarity: 'uncommon',
    icon: '🩹',
    effects: [{ type: 'heal', value: 40, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 8,
    price: 150,
    obtain_method: 'shop',
    flavor: 'Contains bandages, antiseptic, and hope',
    consume_on_use: true
  },

  // SCI-FI FUTURE
  {
    id: 'nano_repair_bot',
    name: 'Nano Repair Bots',
    description: 'Microscopic robots that repair cellular damage',
    type: 'healing',
    rarity: 'epic',
    icon: '🤖',
    effects: [{ type: 'heal', value: 80, target: 'self' }, { type: 'stat_boost', value: 10, stat: 'def', duration: 10 }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 5,
    price: 3500,
    obtain_method: 'craft',
    flavor: 'Self-replicating medical technology from the 31st century',
    consume_on_use: true
  },
  {
    id: 'quantum_battery',
    name: 'Quantum Energy Cell',
    description: 'Unlimited energy source from quantum fluctuations',
    type: 'enhancement',
    rarity: 'legendary',
    icon: '⚡',
    effects: [{ type: 'energy_restore', value: 100, target: 'self' }, { type: 'stat_boost', value: 25, stat: 'all', duration: 5 }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 2,
    price: 15000,
    obtain_method: 'premium',
    flavor: 'Harnesses the power of parallel dimensions',
    consume_on_use: true
  },
  {
    id: 'cybernetic_enhancer',
    name: 'Cybernetic Enhancement Chip',
    description: 'Neural implant that boosts cognitive function',
    type: 'enhancement',
    rarity: 'rare',
    icon: '🧠',
    effects: [{ type: 'stat_boost', value: 30, stat: 'atk', duration: 8, target: 'self' }],
    usage_context: 'battle',
    stackable: false,
    max_stack: 1,
    cooldown: 5,
    price: 2000,
    obtain_method: 'craft',
    flavor: 'Wetware meets hardware in perfect harmony',
    consume_on_use: false
  },

  // ANIME/MANGA
  {
    id: 'senzu_bean',
    name: 'Senzu Bean',
    description: 'Magical bean that fully restores health and energy',
    type: 'healing',
    rarity: 'epic',
    icon: '🫘',
    effects: [{ type: 'heal', value: 100, target: 'self' }, { type: 'energy_restore', value: 100, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 3,
    price: 8000,
    obtain_method: 'quest',
    flavor: 'Grown on sacred towers, one bean feeds you for 10 days',
    consume_on_use: true
  },
  {
    id: 'chakra_pill',
    name: 'Chakra Enhancement Pill',
    description: 'Dangerous pill that boosts chakra at great cost',
    type: 'enhancement',
    rarity: 'rare',
    icon: '💊',
    effects: [{ type: 'stat_boost', value: 50, stat: 'atk', duration: 3, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 5,
    price: 1500,
    obtain_method: 'shop',
    flavor: 'Power at a price - use with extreme caution',
    consume_on_use: true
  },

  // SUPERHERO COMICS
  {
    id: 'super_soldier_serum',
    name: 'Super Soldier Serum',
    description: 'Experimental serum that enhances human capabilities',
    type: 'enhancement',
    rarity: 'legendary',
    icon: '💉',
    effects: [{ type: 'stat_boost', value: 40, stat: 'all', duration: 12, target: 'self' }],
    usage_context: 'battle',
    stackable: false,
    max_stack: 1,
    cooldown: 10,
    price: 12000,
    obtain_method: 'event',
    flavor: 'With great power comes great responsibility',
    consume_on_use: true
  },
  {
    id: 'kryptonite_shard',
    name: 'Kryptonite Shard',
    description: 'Radioactive crystal that weakens certain enemies',
    type: 'battle',
    rarity: 'rare',
    icon: '💚',
    effects: [{ type: 'stat_boost', value: -30, stat: 'all', duration: 5, target: 'enemy' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 8,
    price: 2500,
    obtain_method: 'drop',
    flavor: 'Green death for those from distant worlds',
    consume_on_use: true
  },

  // HORROR/GOTHIC
  {
    id: 'holy_water',
    name: 'Blessed Holy Water',
    description: 'Sacred water blessed by ancient rituals',
    type: 'special',
    rarity: 'uncommon',
    icon: '💧',
    effects: [{ type: 'protection', value: 20, duration: 8, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 12,
    price: 200,
    obtain_method: 'shop',
    flavor: 'Effective against creatures of darkness',
    consume_on_use: true
  },
  {
    id: 'blood_vial',
    name: 'Crimson Blood Vial',
    description: 'Vampire blood with regenerative properties',
    type: 'healing',
    rarity: 'rare',
    icon: '🩸',
    effects: [{ type: 'heal', value: 60, target: 'self' }, { type: 'stat_boost', value: 15, stat: 'atk', duration: 5 }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 6,
    price: 1800,
    obtain_method: 'drop',
    flavor: 'The gift and curse of the undead',
    consume_on_use: true
  },

  // VIDEO GAME REFERENCES
  {
    id: 'mushroom_1up',
    name: '1-UP Mushroom',
    description: 'Green mushroom that grants an extra life',
    type: 'special',
    rarity: 'epic',
    icon: '🍄',
    effects: [{ type: 'special', value: 1, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 3,
    price: 5000,
    obtain_method: 'event',
    flavor: 'The sound of coins and extra lives',
    consume_on_use: true
  },
  {
    id: 'estus_flask',
    name: 'Estus Flask',
    description: 'Flask of golden liquid that heals the undead',
    type: 'healing',
    rarity: 'rare',
    icon: '🍯',
    effects: [{ type: 'heal', value: 75, target: 'self' }],
    usage_context: 'anytime',
    stackable: false,
    max_stack: 1,
    price: 3000,
    obtain_method: 'quest',
    flavor: 'Kindled from the first flame itself',
    consume_on_use: false
  },

  // FOOD & DRINK FROM ALL CULTURES
  {
    id: 'green_tea',
    name: 'Matcha Green Tea',
    description: 'Traditional Japanese tea that calms the mind',
    type: 'training',
    rarity: 'common',
    icon: '🍵',
    effects: [{ type: 'training_boost', value: 15, duration: 45, target: 'self' }],
    usage_context: 'training',
    stackable: true,
    max_stack: 20,
    price: 30,
    obtain_method: 'shop',
    flavor: 'Ceremony in a cup, wisdom in every sip',
    consume_on_use: true
  },
  {
    id: 'espresso_shot',
    name: 'Double Espresso',
    description: 'Italian coffee shot for instant alertness',
    type: 'enhancement',
    rarity: 'common',
    icon: '☕',
    effects: [{ type: 'stat_boost', value: 10, stat: 'spd', duration: 3, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 15,
    price: 20,
    obtain_method: 'shop',
    flavor: 'Concentrated awakening from the streets of Rome',
    consume_on_use: true
  },
  {
    id: 'honey_mead',
    name: 'Viking Honey Mead',
    description: 'Fermented honey drink that boosts courage',
    type: 'enhancement',
    rarity: 'uncommon',
    icon: '🍺',
    effects: [{ type: 'stat_boost', value: 20, stat: 'atk', duration: 4, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 8,
    price: 180,
    obtain_method: 'shop',
    flavor: 'Drink of warriors and skalds alike',
    consume_on_use: true
  },

  // MODERN TECH ITEMS
  {
    id: 'smartphone',
    name: 'Tactical Smartphone',
    description: 'Advanced phone with battle analysis apps',
    type: 'special',
    rarity: 'uncommon',
    icon: '📱',
    effects: [{ type: 'xp_boost', value: 25, duration: 30, target: 'self' }],
    usage_context: 'anytime',
    stackable: false,
    max_stack: 1,
    price: 800,
    obtain_method: 'shop',
    flavor: 'Knowledge at your fingertips',
    consume_on_use: false
  },
  {
    id: 'power_bank',
    name: 'Portable Power Bank',
    description: 'External battery for electronic devices',
    type: 'enhancement',
    rarity: 'common',
    icon: '🔋',
    effects: [{ type: 'energy_restore', value: 20, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 10,
    price: 75,
    obtain_method: 'shop',
    flavor: 'Never run out of juice again',
    consume_on_use: true
  },

  // MAGICAL ARTIFACTS
  {
    id: 'time_crystal',
    name: 'Temporal Crystal',
    description: 'Crystal that manipulates the flow of time',
    type: 'special',
    rarity: 'legendary',
    icon: '⏳',
    effects: [{ type: 'special', value: 2, target: 'self' }],
    usage_context: 'battle',
    stackable: true,
    max_stack: 2,
    cooldown: 8,
    price: 20000,
    obtain_method: 'premium',
    flavor: 'Time is a flat circle, except when it\'s not',
    consume_on_use: true
  },
  {
    id: 'luck_charm',
    name: 'Four-Leaf Clover',
    description: 'Rare clover that brings good fortune',
    type: 'enhancement',
    rarity: 'rare',
    icon: '🍀',
    effects: [{ type: 'special', value: 15, target: 'self' }],
    usage_context: 'anytime',
    stackable: true,
    max_stack: 5,
    price: 1200,
    obtain_method: 'drop',
    flavor: 'Luck of the Irish in plant form',
    consume_on_use: false
  }
];

// Item category helpers
export const getItemsByType = (type: ItemType): Item[] => {
  return allItems.filter(item => item.type === type);
};

export const getItemsByRarity = (rarity: ItemRarity): Item[] => {
  return allItems.filter(item => item.rarity === rarity);
};

export const getItemsByUsage = (usage: UsageContext): Item[] => {
  return allItems.filter(item => item.usage_context === usage);
};

export const getRandomItems = (count: number, rarity?: ItemRarity): Item[] => {
  const sourceItems = rarity ? getItemsByRarity(rarity) : allItems;
  const shuffled = [...sourceItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const calculateItemValue = (item: Item): number => {
  const rarityMultiplier = itemRarityConfig[item.rarity].value_multiplier;
  return Math.floor(item.price * rarityMultiplier);
};

// Get items that can be used in a specific context
export const getUsableItems = (context: UsageContext, character_level: number = 1): Item[] => {
  return allItems.filter(item => {
    // Check usage context
    if (item.usage_context !== context && item.usage_context !== 'anytime') {
      return false;
    }
    
    // Check level requirements (if any)
    if (item.crafting_cost && character_level < 1) {
      return false;
    }
    
    return true;
  });
};

// Check if a character can use a specific item
export const canUseItem = (item: Item, character_level: number, context: UsageContext): boolean => {
  // Check usage context
  if (item.usage_context !== context && item.usage_context !== 'anytime') {
    return false;
  }
  
  // Check level requirements (basic implementation)
  if (item.rarity === 'legendary' && character_level < 10) {
    return false;
  }
  if (item.rarity === 'epic' && character_level < 5) {
    return false;
  }
  
  return true;
};

// Crafting system interface
export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  result_item: string; // Item ID
  result_quantity: number;
  materials: { item_id: string; quantity: number }[];
  gold_cost: number;
  required_level: number;
  crafting_time: number; // in minutes
  success_rate: number; // 0-100
}

// Crafting recipes for items
export const craftingRecipes: CraftingRecipe[] = [
  {
    id: 'health_potion_craft',
    name: 'Brew Health Potion',
    description: 'Combine herbs to create a healing potion',
    result_item: 'health_potion',
    result_quantity: 1,
    materials: [
      { item_id: 'healing_herb', quantity: 2 },
      { item_id: 'pure_water', quantity: 1 }
    ],
    gold_cost: 50,
    required_level: 1,
    crafting_time: 5,
    success_rate: 90
  },
  {
    id: 'strength_brew_craft',
    name: 'Brew Strength Elixir',
    description: 'Create a powerful strength-enhancing potion',
    result_item: 'strength_brew',
    result_quantity: 1,
    materials: [
      { item_id: 'warriors_root', quantity: 1 },
      { item_id: 'mountain_spring', quantity: 1 }
    ],
    gold_cost: 100,
    required_level: 3,
    crafting_time: 10,
    success_rate: 75
  },
  {
    id: 'energy_drink_craft',
    name: 'Mix Energy Drink',
    description: 'Combine modern ingredients for instant energy',
    result_item: 'energy_drink',
    result_quantity: 1,
    materials: [
      { item_id: 'caffeine_extract', quantity: 1 },
      { item_id: 'sugar_cube', quantity: 2 }
    ],
    gold_cost: 25,
    required_level: 1,
    crafting_time: 2,
    success_rate: 95
  }
];

// Demo item collection for UI testing
export const createDemoItemInventory = (): Item[] => {
  return [
    ...getRandomItems(3, 'common'),
    ...getRandomItems(2, 'uncommon'),
    ...getRandomItems(1, 'rare'),
  ];
};