/**
 * Battle Image Mapper - Maps character IDs to battle image file names
 * STRICTLY USES DATABASE DATA - NO FALLBACKS
 * 
 * PHILOSOPHY: Fail Fast, Find, Fix
 * If data is missing, we throw errors to identify data integrity issues immediately.
 */

import { type TeamCharacter } from '@/data/teamBattleSystem';
import { getCharacterImagePath } from './characterImageUtils';

/**
 * Generates battle image filename for a character
 * Uses the individual Colosseaum image: [char]_colosseaum.png
 */
export function getColosseaumImagePath(fighter: TeamCharacter): string {
  // Use the centralized image utility
  // We pass the fighter object which now includes scene_image_slug
  // If scene_image_slug is missing, it falls back to name/id logic
  return getCharacterImagePath(fighter, 'colosseaum');
}

/**
 * Generates battle image filename for a character matchup
 * Alternates between fighter 1 and fighter 2 based on the image number/round
 * 
 * @param fighter1 - First fighter
 * @param fighter2 - Second fighter
 * @param imageNumber - Sequential image number
 */
export function getBattleImagePath(
  fighter1: TeamCharacter,
  fighter2: TeamCharacter,
  imageNumber: number
): string {
  // Alternate based on image number (odd = fighter1, even = fighter2)
  const isFighter1 = imageNumber % 2 !== 0;
  return getColosseaumImagePath(isFighter1 ? fighter1 : fighter2);
}

/**
 * Gets all available battle images for a character matchup
 * Returns the Colosseaum images for both fighters
 */
export function getAvailableBattleImages(
  fighter1: TeamCharacter,
  fighter2: TeamCharacter
): string[] {
  return [
    getColosseaumImagePath(fighter1),
    getColosseaumImagePath(fighter2)
  ];
}

/**
 * Gets a random battle image for a character matchup
 */
export function getRandomBattleImage(
  fighter1: TeamCharacter,
  fighter2: TeamCharacter
): string {
  const availableImages = getAvailableBattleImages(fighter1, fighter2);

  if (availableImages.length === 0) {
    throw new Error('No battle images available for this matchup');
  }

  const randomIndex = Math.floor(Math.random() * availableImages.length);
  return availableImages[randomIndex];
}

/**
 * Gets battle image with fallback logic (tries both fighter orders)
 * NOTE: This is the ONLY place where we try alternative logic (reversing order),
 * but we still require valid database names.
 */
export function getBattleImageWithFallback(
  fighter1: TeamCharacter,
  fighter2: TeamCharacter,
  round: number
): string {
  // Try primary order first
  // This will throw if names are missing
  const image_path = getBattleImagePath(fighter1, fighter2, round);

  // We return the path directly. The caller is responsible for checking if the file exists
  // or handling 404s. We assume if the DB has the name, the image should exist.
  // If it doesn't, that's a content bug we want to find.
  return image_path;
}

/**
 * Battle animation sequence configuration
 */
export const BATTLE_ANIMATION_CONFIG = {
  // Duration for each image in a round (milliseconds)
  image_duration: 2000,

  // Transition duration between images
  transition_duration: 500,

  // Number of images to cycle through per round
  images_per_round: 3,

  // Total rounds in a battle
  total_rounds: 3,

  // Animation types
  animation_types: ['fadeIn', 'slideLeft', 'slideRight', 'zoomIn'] as const
};

export type BattleAnimationType = typeof BATTLE_ANIMATION_CONFIG.animation_types[number];