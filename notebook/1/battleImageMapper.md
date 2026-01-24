/**
 * Battle Image Mapper - Maps character IDs to battle image file names
 * Handles the conversion between internal character IDs and image file naming conventions
 */

// Character ID to Battle Image Name mapping
export const CHARACTER_TO_IMAGE_NAME = {
  // Warriors
  'achilles': 'Achilles',
  'joan': 'Joan of Arc', 
  'genghis_khan': 'Gengas Khan', // Note: Most images use "Gengas" not "Genghis"
  
  // Mages/Mystics
  'merlin': 'Merlin',
  'holmes': 'Sherlock Holmes',
  'dracula': 'Dracula',
  'cleopatra': 'Cleopatra',
  
  // Assassins/Rangers
  'sammy_slugger': 'Sammy Slugger',
  'billy_the_kid': 'Billy the Kid',
  'robin_hood': 'Robin Hood',
  'agent_x': 'Agent X',
  
  // Tanks
  'frankenstein_monster': 'Frankenstein',
  'space_cyborg': 'Cyborg',
  
  // Support/Alien
  'rilak_trelkar': 'Rilak', // Rilak-Trelkar (Grey alien from Zeta Reticuli)
  
  // Beast
  'fenrir': 'Fenrir',
  
  // Trickster
  'sun_wukong': 'Sun Wukong',
  
  // Elementalist
  'tesla': 'Tesla'
} as const;

// Reverse mapping for validation
export const IMAGE_NAME_TO_CHARACTER = Object.fromEntries(
  Object.entries(CHARACTER_TO_IMAGE_NAME).map(([id, name]) => [name, id])
);

/**
 * Generates battle image filename for a character matchup
 */
export function getBattleImagePath(fighter1Id: string, fighter2Id: string, round: number): string {
  const fighter1Name = CHARACTER_TO_IMAGE_NAME[fighter1Id as keyof typeof CHARACTER_TO_IMAGE_NAME];
  const fighter2Name = CHARACTER_TO_IMAGE_NAME[fighter2Id as keyof typeof CHARACTER_TO_IMAGE_NAME];
  
  if (!fighter1Name || !fighter2Name) {
    console.warn(`Unknown character ID: ${fighter1Id} or ${fighter2Id}`);
    return '/images/colosseaum/default_battle.png'; // Fallback image
  }
  
  // Battle images are numbered 01-07 typically, we'll use round to select
  const imageNumber = String(round).padStart(2, '0');
  
  // Try the standard naming pattern: "Battle [Fighter1] vs [Fighter2] [Number].png"
  return `/images/colosseaum/Battle ${fighter1Name} vs ${fighter2Name} ${imageNumber}.png`;
}

/**
 * Gets all available battle images for a character matchup
 */
export function getAvailableBattleImages(fighter1Id: string, fighter2Id: string): string[] {
  const fighter1Name = CHARACTER_TO_IMAGE_NAME[fighter1Id as keyof typeof CHARACTER_TO_IMAGE_NAME];
  const fighter2Name = CHARACTER_TO_IMAGE_NAME[fighter2Id as keyof typeof CHARACTER_TO_IMAGE_NAME];
  
  if (!fighter1Name || !fighter2Name) {
    return [];
  }
  
  // Generate paths for images 01-07 (most matchups have 4-7 images)
  const imagePaths: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const imageNumber = String(i).padStart(2, '0');
    imagePaths.push(`/images/colosseaum/Battle ${fighter1Name} vs ${fighter2Name} ${imageNumber}.png`);
  }
  
  return imagePaths;
}

/**
 * Gets a random battle image for a character matchup
 */
export function getRandomBattleImage(fighter1Id: string, fighter2Id: string): string {
  const availableImages = getAvailableBattleImages(fighter1Id, fighter2Id);
  
  if (availableImages.length === 0) {
    return '/images/colosseaum/default_battle.png';
  }
  
  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}

/**
 * Gets battle image with fallback logic (tries both fighter orders)
 */
export function getBattleImageWithFallback(fighter1Id: string, fighter2Id: string, round: number): string {
  // Try primary order first
  let imagePath = getBattleImagePath(fighter1Id, fighter2Id, round);
  
  // If that doesn't work, try reverse order (some images might be named the other way)
  if (!imagePath.includes('default_battle')) {
    return imagePath;
  }
  
  // Try reverse order
  imagePath = getBattleImagePath(fighter2Id, fighter1Id, round);
  
  return imagePath;
}

/**
 * Validates if a character ID has battle images
 */
export function hasCharacterBattleImages(characterId: string): boolean {
  return characterId in CHARACTER_TO_IMAGE_NAME;
}

/**
 * Gets all character names that have battle images
 */
export function getCharactersWithBattleImages(): string[] {
  return Object.keys(CHARACTER_TO_IMAGE_NAME);
}

/**
 * Battle animation sequence configuration
 */
export const BATTLE_ANIMATION_CONFIG = {
  // Duration for each image in a round (milliseconds)
  imageDuration: 2000,
  
  // Transition duration between images
  transitionDuration: 500,
  
  // Number of images to cycle through per round
  imagesPerRound: 3,
  
  // Total rounds in a battle
  totalRounds: 3,
  
  // Animation types
  animationTypes: ['fadeIn', 'slideLeft', 'slideRight', 'zoomIn'] as const
};

export type BattleAnimationType = typeof BATTLE_ANIMATION_CONFIG.animationTypes[number];