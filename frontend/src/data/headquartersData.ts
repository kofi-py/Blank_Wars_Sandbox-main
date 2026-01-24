import { HeadquartersTier, RoomTheme, RoomElement, PurchasableBed } from '../types/headquarters';

// Bed hierarchy for auto-assignment (Priority: 1 = Best)
export const BED_HIERARCHY = [
  { type: 'bed', priority: 1, bonus: 10, name: 'Master Bed' },
  { type: 'bunk_bed', priority: 2, bonus: 5, name: 'Bunk Bed' },
  { type: 'couch', priority: 3, bonus: 0, name: 'Couch' },
  { type: 'air_mattress', priority: 4, bonus: -2, name: 'Air Mattress' },
  { type: 'floor_bedroom', priority: 5, bonus: -5, name: 'Floor (Bedroom)' },
  { type: 'floor_living', priority: 6, bonus: -10, name: 'Floor (Living Room)' }
] as const;

// Floor capacity for overflow sleeping (virtual beds created dynamically)
export const FLOOR_CAPACITY = {
  bedroom: 2,    // Bedrooms can fit 2 floor sleepers (-5 morale each)
  living: 3,     // Living rooms can fit 3 floor sleepers (-10 morale each)
  default: 1     // Other rooms can fit 1 floor sleeper (-5 morale)
} as const;

// Purchasable bed options for expanding room capacity
export const PURCHASABLE_BEDS: PurchasableBed[] = [
  {
    id: 'additional_bunk',
    name: 'Additional Bunk Bed',
    type: 'bunk_bed',
    description: 'A sturdy metal bunk bed that sleeps 2 fighters. Decent comfort for the price.',
    capacity: 2,
    comfort_bonus: 10,
    cost: { coins: 15000, gems: 25 },
    icon: '🛏️'
  },
  {
    id: 'air_mattress',
    name: 'Air Mattress',
    type: 'air_mattress',
    description: 'Inflatable mattress for emergency sleeping. Better than the floor, barely.',
    capacity: 1,
    comfort_bonus: 2,
    cost: { coins: 5000, gems: 5 },
    icon: '🛌'
  }
];

// Headquarters progression tiers - determines building size and capacity
export const HEADQUARTERS_TIERS: HeadquartersTier[] = [
  {
    id: 'spartan_apartment',
    name: 'Spartan Apartment',
    description: 'A cramped 2-room apartment where legendary warriors share bunk beds. Not ideal, but everyone starts somewhere!',
    max_rooms: 2,
    characters_per_room: 4,
    cost: { coins: 0, gems: 0 },
    unlock_level: 1,
    room_upgrades: ['basic_furniture']
  },
  {
    id: 'basic_house',
    name: 'Basic House',
    description: 'A modest house with individual rooms. Characters finally get some privacy and better sleep!',
    max_rooms: 6,
    characters_per_room: 3,
    cost: { coins: 25000, gems: 50 },
    unlock_level: 10,
    room_upgrades: ['basic_furniture', 'private_rooms']
  },
  {
    id: 'team_mansion',
    name: 'Team Mansion',
    description: 'A luxurious mansion with themed rooms. Characters can customize their living spaces for battle bonuses!',
    max_rooms: 10,
    characters_per_room: 2,
    cost: { coins: 100000, gems: 200 },
    unlock_level: 25,
    room_upgrades: ['luxury_furniture', 'themed_rooms', 'common_areas']
  },
  {
    id: 'elite_compound',
    name: 'Elite Compound',
    description: 'The ultimate headquarters with specialized facilities, training rooms, and maximum theme bonuses!',
    max_rooms: 15,
    characters_per_room: 1,
    cost: { coins: 500000, gems: 1000 },
    unlock_level: 50,
    room_upgrades: ['elite_furniture', 'specialized_facilities', 'max_bonuses']
  }
];

// Room themes - legacy single-theme system with battle bonuses
export const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'gothic',
    name: 'Gothic Chamber',
    description: 'Dark stone walls, candles, and an ominous atmosphere perfect for creatures of the night',
    bonus: 'Magic Damage',
    bonus_value: 15,
    suitable_characters: ['dracula', 'frankenstein_monster'],
    cost: { coins: 5000, gems: 10 },
    background_color: 'bg-purple-900/20',
    text_color: 'text-purple-300',
    icon: '🦇'
  },
  {
    id: 'medieval',
    name: 'Medieval Hall',
    description: 'Stone walls, banners, and weapon racks - a warriors paradise',
    bonus: 'Physical Damage',
    bonus_value: 15,
    suitable_characters: ['achilles', 'joan', 'robin_hood'],
    cost: { coins: 5000, gems: 10 },
    background_color: 'bg-amber-900/20',
    text_color: 'text-amber-300',
    icon: '⚔️'
  },
  {
    id: 'victorian',
    name: 'Victorian Study',
    description: 'Elegant furniture, books, and scientific instruments for the intellectual mind',
    bonus: 'Critical Chance',
    bonus_value: 12,
    suitable_characters: ['holmes'],
    cost: { coins: 7000, gems: 15 },
    background_color: 'bg-emerald-900/20',
    text_color: 'text-emerald-300',
    icon: '🔍'
  },
  {
    id: 'egyptian',
    name: 'Pharaoh\'s Chamber',
    description: 'Golden decorations, hieroglyphs, and royal splendor fit for a pharaoh',
    bonus: 'Defense',
    bonus_value: 20,
    suitable_characters: ['cleopatra'],
    cost: { coins: 8000, gems: 20 },
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    icon: '👑'
  },
  {
    id: 'mystical',
    name: 'Mystical Sanctuary',
    description: 'Magical crystals, ancient symbols, and ethereal energy',
    bonus: 'Mana Regeneration',
    bonus_value: 25,
    suitable_characters: ['merlin', 'sun_wukong'],
    cost: { coins: 6000, gems: 12 },
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    icon: '🔮'
  },
  {
    id: 'wild_west',
    name: 'Saloon Room',
    description: 'Wooden furniture, spittoons, and the spirit of the frontier',
    bonus: 'Speed',
    bonus_value: 18,
    suitable_characters: ['billy_the_kid'],
    cost: { coins: 4000, gems: 8 },
    background_color: 'bg-orange-900/20',
    text_color: 'text-orange-300',
    icon: '🤠'
  },
  {
    id: 'futuristic',
    name: 'Tech Lab',
    description: 'Holographic displays, advanced equipment, and cutting-edge technology',
    bonus: 'Accuracy',
    bonus_value: 20,
    suitable_characters: ['tesla', 'space_cyborg', 'agent_x'],
    cost: { coins: 10000, gems: 25 },
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    icon: '🤖'
  },
  {
    id: 'noir_office',
    name: 'Noir Detective Office',
    description: 'Fedora on the hat rack, whiskey in the drawer, San Francisco fog outside',
    bonus: 'Max Energy',
    bonus_value: 15,
    suitable_characters: ['sam_spade'],
    cost: { coins: 3000, gems: 5 },
    background_color: 'bg-gray-900/20',
    text_color: 'text-gray-300',
    icon: '🕵️'
  },
  {
    id: 'mongolian',
    name: 'Khan\'s Yurt',
    description: 'Traditional Mongolian decorations and symbols of conquest',
    bonus: 'Leadership',
    bonus_value: 20,
    suitable_characters: ['genghis_khan'],
    cost: { coins: 6000, gems: 15 },
    background_color: 'bg-red-900/20',
    text_color: 'text-red-300',
    icon: '🏹'
  },
  {
    id: 'alien_lab',
    name: 'Research Pod',
    description: 'Advanced alien technology and experimental equipment',
    bonus: 'Experience Gain',
    bonus_value: 30,
    suitable_characters: ['rilak_trelkar'],
    cost: { coins: 15000, gems: 50 },
    background_color: 'bg-indigo-900/20',
    text_color: 'text-indigo-300',
    icon: '🛸'
  },
  {
    id: 'nordic',
    name: 'Viking Lodge',
    description: 'Wooden halls, fur pelts, and the spirit of the wild hunt',
    bonus: 'Berserker Rage',
    bonus_value: 25,
    suitable_characters: ['fenrir'],
    cost: { coins: 5000, gems: 10 },
    background_color: 'bg-slate-900/20',
    text_color: 'text-slate-300',
    icon: '🐺'
  }
];

// Multi-element room decoration system for advanced customization
export const ROOM_ELEMENTS: RoomElement[] = [
  // Wall Decor
  {
    id: 'gothic_tapestries',
    name: 'Gothic Tapestries',
    category: 'wallDecor',
    description: 'Dark velvet tapestries with mysterious symbols',
    bonus: 'Magic Damage',
    bonus_value: 8,
    suitable_characters: ['dracula', 'frankenstein_monster'],
    cost: { coins: 2000, gems: 5 },
    background_color: 'bg-purple-900/20',
    text_color: 'text-purple-300',
    icon: '🪶',
    compatible_with: ['gothic_chandelier', 'stone_floors'],
    incompatible_with: ['neon_strips', 'holographic_panels']
  },
  {
    id: 'weapon_displays',
    name: 'Weapon Displays',
    category: 'wallDecor',
    description: 'Mounted swords, shields, and battle trophies',
    bonus: 'Physical Damage',
    bonus_value: 8,
    suitable_characters: ['achilles', 'joan', 'robin_hood'],
    cost: { coins: 2500, gems: 4 },
    background_color: 'bg-amber-900/20',
    text_color: 'text-amber-300',
    icon: '⚔️',
    compatible_with: ['wooden_furniture', 'torch_lighting'],
    incompatible_with: ['crystal_displays', 'tech_panels']
  },
  {
    id: 'holographic_panels',
    name: 'Holographic Panels',
    category: 'wallDecor',
    description: 'Advanced tech displays with data streams',
    bonus: 'Accuracy',
    bonus_value: 10,
    suitable_characters: ['tesla', 'space_cyborg', 'agent_x'],
    cost: { coins: 4000, gems: 12 },
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    icon: '📱',
    compatible_with: ['led_lighting', 'metal_floors'],
    incompatible_with: ['gothic_tapestries', 'wooden_furniture']
  },

  // Furniture
  {
    id: 'throne_chair',
    name: 'Royal Throne',
    category: 'furniture',
    description: 'Ornate golden throne for true royalty',
    bonus: 'Leadership',
    bonus_value: 12,
    suitable_characters: ['cleopatra', 'genghis_khan'],
    cost: { coins: 3000, gems: 8 },
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    icon: '👑',
    compatible_with: ['golden_accents', 'marble_floors'],
    incompatible_with: ['wooden_furniture', 'tech_stations']
  },
  {
    id: 'wooden_furniture',
    name: 'Rustic Wood Set',
    category: 'furniture',
    description: 'Handcrafted wooden tables and chairs',
    bonus: 'Max Energy',
    bonus_value: 8,
    suitable_characters: ['billy_the_kid', 'robin_hood'],
    cost: { coins: 1500, gems: 3 },
    background_color: 'bg-orange-900/20',
    text_color: 'text-orange-300',
    icon: '🪑',
    compatible_with: ['weapon_displays', 'torch_lighting'],
    incompatible_with: ['throne_chair', 'tech_stations']
  },
  {
    id: 'tech_stations',
    name: 'Tech Workstations',
    category: 'furniture',
    description: 'Advanced computer terminals and lab equipment',
    bonus: 'Critical Chance',
    bonus_value: 10,
    suitable_characters: ['tesla', 'holmes', 'rilak_trelkar'],
    cost: { coins: 5000, gems: 15 },
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    icon: '💻',
    compatible_with: ['holographic_panels', 'led_lighting'],
    incompatible_with: ['throne_chair', 'wooden_furniture']
  },

  // Lighting
  {
    id: 'gothic_chandelier',
    name: 'Gothic Chandelier',
    category: 'lighting',
    description: 'Ornate iron chandelier with flickering candles',
    bonus: 'Magic Damage',
    bonus_value: 6,
    suitable_characters: ['dracula', 'frankenstein_monster'],
    cost: { coins: 2000, gems: 6 },
    background_color: 'bg-purple-900/20',
    text_color: 'text-purple-300',
    icon: '🕯️',
    compatible_with: ['gothic_tapestries', 'stone_floors'],
    incompatible_with: ['led_lighting', 'neon_strips']
  },
  {
    id: 'led_lighting',
    name: 'LED Strip System',
    category: 'lighting',
    description: 'Color-changing LED lights with smart controls',
    bonus: 'Speed',
    bonus_value: 8,
    suitable_characters: ['tesla', 'space_cyborg'],
    cost: { coins: 3500, gems: 10 },
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    icon: '💡',
    compatible_with: ['holographic_panels', 'tech_stations'],
    incompatible_with: ['gothic_chandelier', 'torch_lighting']
  },
  {
    id: 'torch_lighting',
    name: 'Medieval Torches',
    category: 'lighting',
    description: 'Classic wall-mounted torches for authentic ambiance',
    bonus: 'Physical Damage',
    bonus_value: 6,
    suitable_characters: ['achilles', 'joan'],
    cost: { coins: 1000, gems: 2 },
    background_color: 'bg-amber-900/20',
    text_color: 'text-amber-300',
    icon: '🔥',
    compatible_with: ['weapon_displays', 'wooden_furniture'],
    incompatible_with: ['led_lighting', 'gothic_chandelier']
  },

  // Accessories
  {
    id: 'crystal_displays',
    name: 'Mystical Crystals',
    category: 'accessories',
    description: 'Glowing crystals with magical properties',
    bonus: 'Mana Regeneration',
    bonus_value: 15,
    suitable_characters: ['merlin', 'sun_wukong'],
    cost: { coins: 2500, gems: 8 },
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    icon: '🔮',
    compatible_with: ['gothic_chandelier', 'stone_floors'],
    incompatible_with: ['weapon_displays', 'tech_stations']
  },
  {
    id: 'golden_accents',
    name: 'Golden Decorations',
    category: 'accessories',
    description: 'Luxurious gold trim and ornamental pieces',
    bonus: 'Defense',
    bonus_value: 10,
    suitable_characters: ['cleopatra', 'genghis_khan'],
    cost: { coins: 4000, gems: 12 },
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    icon: '✨',
    compatible_with: ['throne_chair', 'marble_floors'],
    incompatible_with: ['wooden_furniture', 'metal_floors']
  },

  // Flooring
  {
    id: 'stone_floors',
    name: 'Ancient Stone',
    category: 'flooring',
    description: 'Weathered stone blocks with mystical runes',
    bonus: 'Defense',
    bonus_value: 8,
    suitable_characters: ['dracula', 'merlin'],
    cost: { coins: 3000, gems: 7 },
    background_color: 'bg-gray-900/20',
    text_color: 'text-gray-300',
    icon: '🗿',
    compatible_with: ['gothic_tapestries', 'crystal_displays'],
    incompatible_with: ['metal_floors', 'tech_stations']
  },
  {
    id: 'marble_floors',
    name: 'Royal Marble',
    category: 'flooring',
    description: 'Polished marble with golden veins',
    bonus: 'Leadership',
    bonus_value: 8,
    suitable_characters: ['cleopatra', 'achilles'],
    cost: { coins: 5000, gems: 15 },
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    icon: '⬜',
    compatible_with: ['throne_chair', 'golden_accents'],
    incompatible_with: ['wooden_furniture', 'stone_floors']
  },
  {
    id: 'metal_floors',
    name: 'Tech Flooring',
    category: 'flooring',
    description: 'Reinforced metal grating with LED strips',
    bonus: 'Speed',
    bonus_value: 8,
    suitable_characters: ['tesla', 'space_cyborg'],
    cost: { coins: 4000, gems: 10 },
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    icon: '🔲',
    compatible_with: ['holographic_panels', 'led_lighting'],
    incompatible_with: ['stone_floors', 'marble_floors']
  }
];