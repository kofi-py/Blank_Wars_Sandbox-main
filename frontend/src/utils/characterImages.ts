/**
 * Character image path utilities
 * Returns image paths based on database character_id - NO hardcoded mapping needed!
 * Images are named to match the database character_id field.
 */

export function getEquipmentCharacterImages(character_id: string): string[] {
  const base_path = '/images/Character/Equipment/';

  return [
    `${base_path}${character_id}_equipment_1.png`,
    `${base_path}${character_id}_equipment_2.png`,
    `${base_path}${character_id}_equipment_3.png`
  ];
}

/**
 * Get character images for the combined Abilities tab (Powers + Spells)
 * One shared image set per character covering both powers and spells
 */
import { getCharacterImagePath } from './characterImageUtils';

export function getAbilitiesCharacterImages(character_id: string): string[] {
  // Use the central utility to get the correct remote path
  // We need to manually construct the variants 1, 2, 3 since the utility defaults to 1
  // But the utility handles the remote URL and folder structure correctly

  // Hack: The utility returns ".../slug_therapy_1.png"
  // We can strip the suffix and rebuild it, or just use the utility's logic directly here
  // Ideally, we should refactor this entire file to use characterImageUtils, but for now:

  const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';
  const base_path = `${REMOTE_IMAGE_BASE_URL}/Therapy/`;

  return [
    `${base_path}${character_id}_therapy_1.png`,
    `${base_path}${character_id}_therapy_2.png`,
    `${base_path}${character_id}_therapy_3.png`
  ];
}

// ARCHIVED: Replaced by getAbilitiesCharacterImages (combined Powers + Spells tab)
// export function getSkillsCharacterImages(character_id: string): string[] {
//   const base_path = '/images/Character/Skills/';
//   return [
//     `${base_path}${character_id}_skills_1.png`,
//     `${base_path}${character_id}_skills_2.png`,
//     `${base_path}${character_id}_skills_3.png`
//   ];
// }
