// Equipment Image Constants - Based on Actual Database Equipment Names
// Maps specific equipment names to their image paths

export interface EquipmentImageConfig {
  image_path: string;
  fallback_icon: string;
  alt_text: string;
}

// ACTUAL EQUIPMENT FROM DATABASE - MAPPED TO AVAILABLE IMAGES
export const EQUIPMENT_IMAGES: Record<string, EquipmentImageConfig> = {
  // GENERIC EQUIPMENT
  'wooden_club_generic': {
    image_path: '/images/Equipment/wooden_club_generic.png',
    fallback_icon: '🏏',
    alt_text: 'Wooden Club'
  },
  'wooden_staff_generic': {
    image_path: '/images/Equipment/wooden_staff_generic.png',
    fallback_icon: '🪄',
    alt_text: 'Wooden Staff'
  },
  'rusty_sword_generic': {
    image_path: '/images/Equipment/rusty_sword_generic.png',
    fallback_icon: '⚔️',
    alt_text: 'Rusty Sword'
  },
  'leather_vest_generic': {
    image_path: '/images/Equipment/leather_vest_generic.png',
    fallback_icon: '🦺',
    alt_text: 'Leather Vest'
  },
  'flame_sword_generic': {
    image_path: '/images/Equipment/flame_sword_generic.png',
    fallback_icon: '🔥⚔️',
    alt_text: 'Flame Sword'
  },
  'enchanted_robes_generic': {
    image_path: '/images/Equipment/enchanted_robes.png',
    fallback_icon: '🧙‍♂️',
    alt_text: 'Enchanted Robes'
  },
  'elemental_staff_generic': {
    image_path: '/images/Equipment/elemental_staff_generic.png',
    fallback_icon: '🌪️🪄',
    alt_text: 'Elemental Staff'
  },
  'gauntlets_strength_generic': {
    image_path: '/images/Equipment/gauntlets_strength_generic.png',
    fallback_icon: '🥊',
    alt_text: 'Gauntlets of Strength'
  },
  'power_ring_generic': {
    image_path: '/images/Equipment/power_ring_generic.png',
    fallback_icon: '💍',
    alt_text: 'Ring of Power'
  },
  'beast_claws_generic': {
    image_path: '/images/Equipment/beast_claws_generic.png',
    fallback_icon: '🐾',
    alt_text: 'Beast Claws'
  },
  'daggers_generic': {
    image_path: '/images/Equipment/daggers_generic.png',
    fallback_icon: '🗡️',
    alt_text: 'Daggers'
  },
  'peasant_sword_generic': {
    image_path: '/images/Equipment/peasant_sword_generic.png',
    fallback_icon: '⚔️',
    alt_text: 'Peasant Sword'
  },
  'magic_robe_generic': {
    image_path: '/images/Equipment/magic_robe_generic.png',
    fallback_icon: '🧙‍♂️',
    alt_text: 'Magic Robe'
  },

  // CHARACTER-SPECIFIC EQUIPMENT
  // ACHILLES
  'trojan_war_sword_achilles': {
    image_path: '/images/Equipment/trojan_war_sword.png',
    fallback_icon: '⚔️',
    alt_text: 'Trojan War Sword'
  },
  'hephaestus_shield_achilles': {
    image_path: '/images/Equipment/shield_of_hephaestus.png',
    fallback_icon: '🛡️',
    alt_text: 'Shield of Hephaestus'
  },

  // MERLIN
  'apprentice_staff_merlin': {
    image_path: '/images/Equipment/apprentice_staff_merlin.png',
    fallback_icon: '🪄',
    alt_text: 'Apprentice Staff'
  },
  'round_table_seal_merlin': {
    image_path: '/images/Equipment/round_table_seal_merlin.png',
    fallback_icon: '⚜️',
    alt_text: 'Round Table Seal'
  },

  // FRANKENSTEIN MONSTER
  'arctic_gear_frankenstein': {
    image_path: '/images/Equipment/arctic_gear_frankenstein.png',
    fallback_icon: '🧥',
    alt_text: 'Arctic Expedition Gear'
  },
  'assembled_body_frankenstein': {
    image_path: '/images/Equipment/frankenstein_hammer.png',
    fallback_icon: '🔬',
    alt_text: 'Assembled Body Parts'
  },

  // TESLA
  'laboratory_coat_tesla': {
    image_path: '/images/Equipment/laboratory_coat_tesla.png',
    fallback_icon: '🥼',
    alt_text: 'Laboratory Coat'
  },
  'wardenclyffe_tower_tesla': {
    image_path: '/images/Equipment/death_ray_prototype_tesla.png',
    fallback_icon: '🗼⚡',
    alt_text: 'Wardenclyffe Tower Model'
  },

  // DRACULA
  'vial_of_blood_dracula': {
    image_path: '/images/Equipment/vial_of_blood_dracula.png',
    fallback_icon: '🩸',
    alt_text: 'Vial of Blood'
  },
  'blood_drain_chalice_dracula': {
    image_path: '/images/Equipment/blood_drain_chalice_dracula.png',
    fallback_icon: '🍷',
    alt_text: 'Chalice of Blood Drain'
  },

  // AGENT X
  'tactical_earpiece_agent_x': {
    image_path: '/images/Equipment/silenced_pistol_agent_x.png',
    fallback_icon: '📻',
    alt_text: 'Tactical Earpiece'
  },
  'spy_gadget_kit_agent_x': {
    image_path: '/images/Equipment/spy_gadget_kit.png',
    fallback_icon: '🛠️',
    alt_text: 'Spy Gadget Kit'
  },

  // FENRIR
  'lokis_mark_fenrir': {
    image_path: '/images/Equipment/lokis_mark_fenrir.png',
    fallback_icon: '🔥',
    alt_text: 'Loki\'s Trickster Mark'
  },
  'gleipnir_fragments_fenrir': {
    image_path: '/images/Equipment/gleipnirs_broken_links.png',
    fallback_icon: '🔗',
    alt_text: 'Gleipnir Fragments'
  },

  // JOAN OF ARC
  'peasants_cross_joan': {
    image_path: '/images/Equipment/peasants_cross_joan.png',
    fallback_icon: '✝️',
    alt_text: 'Peasant\'s Cross'
  },
  'blessed_sword_joan': {
    image_path: '/images/Equipment/blessed_sword_of_compiegne.png',
    fallback_icon: '⚔️✨',
    alt_text: 'Blessed Sword of Compiègne'
  },

  // SPACE CYBORG
  'basic_implants_space_cyborg': {
    image_path: '/images/Equipment/basic_implants_space_cyborg.png',
    fallback_icon: '🤖',
    alt_text: 'Basic Cybernetic Implants'
  },
  'adaptive_armor_space_cyborg': {
    image_path: '/images/Equipment/adaptive_armor_space_cyborg.png',
    fallback_icon: '🛡️🤖',
    alt_text: 'Adaptive Armor Plating'
  },

  // SHERLOCK HOLMES
  'magnifying_glass_holmes': {
    image_path: '/images/Equipment/magnifying_glass_holmes.png',
    fallback_icon: '🔍',
    alt_text: 'Magnifying Glass'
  },
  'baker_street_pipe_holmes': {
    image_path: '/images/Equipment/baker_street_pipe_holmes.png',
    fallback_icon: '🚬',
    alt_text: 'Baker Street Pipe'
  },

  // CLEOPATRA
  'royal_jewelry_cleopatra': {
    image_path: '/images/Equipment/royal_egyptian_jewelry.png',
    fallback_icon: '💎',
    alt_text: 'Royal Egyptian Jewelry'
  },
  'divine_scepter_cleopatra': {
    image_path: '/images/Equipment/crown_two_lands_cleopatra.png',
    fallback_icon: '👑✨',
    alt_text: 'Pharaoh\'s Divine Scepter'
  },

  // SUN WUKONG
  'monkey_king_crown_sun_wukong': {
    image_path: '/images/Equipment/monkey_king_crown_sun_wukong.png',
    fallback_icon: '👑',
    alt_text: 'Monkey King Crown'
  },
  'ruyi_jingu_bang_sun_wukong': {
    image_path: '/images/Equipment/ruyi_jingu_bang_sun_wukong.png',
    fallback_icon: '🥢',
    alt_text: 'Ruyi Jingu Bang'
  },
  'dragon_kings_armor_sun_wukong': {
    image_path: '/images/Equipment/dragon_kings_armor_sun_wukong.png',
    fallback_icon: '🛡️',
    alt_text: 'Armor of the Dragon Kings'
  },
  'cloud_somersault_boots_sun_wukong': {
    image_path: '/images/Equipment/cloud_somersault_boots.png',
    fallback_icon: '☁️',
    alt_text: 'Cloud Somersault Boots'
  },
  'transformations_manual_sun_wukong': {
    image_path: '/images/Equipment/transformations_manual_sun_wukong.png',
    fallback_icon: '📜',
    alt_text: '72 Transformations Manual'
  },

  // BILLY THE KID
  'colt_45_peacemaker_billy_the_kid': {
    image_path: '/images/Equipment/colt_45_peacemaker_billy_the_kid.png',
    fallback_icon: '🔫',
    alt_text: 'Colt .45 Peacemaker'
  },
  'outlaws_spurs_billy_the_kid': {
    image_path: '/images/Equipment/outlaws_spurs.png',
    fallback_icon: '⭐',
    alt_text: 'Outlaw\'s Spurs'
  },

  // SAM SPADE
  'louisville_slugger_sam_spade': {
    image_path: '/images/Equipment/louisville_slugger_bat.png',
    fallback_icon: '🏏',
    alt_text: 'Louisville Slugger Bat'
  },
  'detective_badge_sam_spade': {
    image_path: '/images/Equipment/sammyslugger_detective_hat.png',
    fallback_icon: '🛡️',
    alt_text: 'Detective Badge'
  },
  'getaway_car_keys_sam_spade': {
    image_path: '/images/Equipment/getaway_car_keys_sam_spade.png',
    fallback_icon: '🚗',
    alt_text: 'Getaway Car Keys'
  },

  // ALIEN GREY
  'telepathic_amplifier_alien_grey': {
    image_path: '/images/Equipment/telepathic_amplifier_alien_grey.png',
    fallback_icon: '🧠',
    alt_text: 'Telepathic Amplifier'
  },
  'teleportation_device_alien_grey': {
    image_path: '/images/Equipment/ufo_summoner_alien_grey.png',
    fallback_icon: '📡',
    alt_text: 'Teleportation Device'
  },
  'healing_ray_alien_grey': {
    image_path: '/images/Equipment/ray_gun_alien_grey.png',
    fallback_icon: '🔬',
    alt_text: 'Healing Ray'
  },

  // GENGHIS KHAN
  'steppe_horse_bridle_genghis_khan': {
    image_path: '/images/Equipment/steppe_horse_bridle_genghis_khan.png',
    fallback_icon: '🐎',
    alt_text: 'Steppe Horse Bridle'
  },
  'horde_war_banner_genghis_khan': {
    image_path: '/images/Equipment/mongol_warriors_bow_genghis_khan.png',
    fallback_icon: '🚩',
    alt_text: 'Mongol Horde War Banner'
  },

  // ROBIN HOOD
  'longbow_sherwood_robin_hood': {
    image_path: '/images/Equipment/lincoln_green_hood_robin_hood.png',
    fallback_icon: '🏹',
    alt_text: 'Longbow of Sherwood'
  },
  'redistribution_pouch_robin_hood': {
    image_path: '/images/Equipment/redistribution_pouch_robin_hood.png',
    fallback_icon: '💰',
    alt_text: 'Redistribution Money Pouch'
  },
  'signal_horn_robin_hood': {
    image_path: '/images/Equipment/signal_horn_robin_hood.png',
    fallback_icon: '📯',
    alt_text: 'Merry Men\'s Signal Horn'
  },

  // ALEXANDER THE GREAT
  'bucephalus_bridle_alexander': {
    image_path: '/images/Equipment/bucephalus_bridle_alexander.png',
    fallback_icon: '🐎',
    alt_text: 'Bucephalus\' Bridle'
  },

  // MISSING EQUIPMENT - USE ICONS INSTEAD OF WRONG IMAGES
  'wooden_club': { // Normalized name version
    image_path: '', // No image - use icon
    fallback_icon: '🏏',
    alt_text: 'Wooden Club'
  },
  'wooden_staff': { // Normalized name version
    image_path: '', // No image - use icon
    fallback_icon: '🪄',
    alt_text: 'Wooden Staff'
  },
  'leather_vest': { // Normalized name version
    image_path: '', // No image - use icon
    fallback_icon: '🦺',
    alt_text: 'Leather Vest'
  },
  'rusty_sword': { // Normalized name version (this one has an image but add for consistency)
    image_path: '/images/Equipment/rusty_sword_generic.png',
    fallback_icon: '⚔️',
    alt_text: 'Rusty Sword'
  },

  // DEFAULT FALLBACK - NO IMAGE PATH FORCES ICON FALLBACK
  'unknown': {
    image_path: '', // Empty path forces fallback to icon
    fallback_icon: '⚔️',
    alt_text: 'Unknown equipment'
  }
};

// Helper function to get equipment image configuration
export const getEquipmentImage = (equipmentName: string): EquipmentImageConfig => {
  // Normalize the equipment name (lowercase, replace spaces and special chars with underscores)
  const normalizedName = equipmentName
    .toLowerCase()
    .replace(/[\s\-'()]/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  return EQUIPMENT_IMAGES[normalizedName] || EQUIPMENT_IMAGES.unknown;
};

// Equipment Rarity Frame Images
export const EQUIPMENT_RARITY_FRAMES: Record<string, string> = {
  common: '/images/Equipment/frames/common_frame.png',
  uncommon: '/images/Equipment/frames/uncommon_frame.png',
  rare: '/images/Equipment/frames/rare_frame.png',
  epic: '/images/Equipment/frames/epic_frame.png',
  legendary: '/images/Equipment/frames/legendary_frame.png',
  mythic: '/images/Equipment/frames/mythic_frame.png'
};

export const getEquipmentRarityFrame = (rarity: string): string => {
  return EQUIPMENT_RARITY_FRAMES[rarity.toLowerCase()] || EQUIPMENT_RARITY_FRAMES.common;
};