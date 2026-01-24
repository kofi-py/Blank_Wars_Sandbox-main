/**
 * Equipment Eligibility Service
 *
 * Validates whether a character can use specific equipment based on 4-tier system:
 * - Tier 1: Universal (anyone can use)
 * - Tier 2: Archetype (must match character's archetype)
 * - Tier 3: Species (must match character's species)
 * - Tier 4: Character (must match specific character ID)
 */

import { query } from '../database/index';

export interface EquipmentEligibility {
  can_use: boolean;
  reason?: string;
  tier: string;
}

/**
 * Check if a character can use a specific equipment item
 */
export async function checkEquipmentEligibility(
  character_id: string,
  equipment_id: string
): Promise<EquipmentEligibility> {
  // Get character details
  const char_result = await query(
    `SELECT uc.id, uc.character_id, c.archetype, c.species
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    return {
      can_use: false,
      reason: 'Character not found',
      tier: 'unknown',
    };
  }

  const character = char_result.rows[0];

  // Get equipment details
  const equip_result = await query(
    `SELECT id, name, equipment_tier, archetype,
            species, restricted_to_character
     FROM equipment
     WHERE id = $1`,
    [equipment_id]
  );

  if (equip_result.rows.length === 0) {
    return {
      can_use: false,
      reason: 'Equipment not found',
      tier: 'unknown',
    };
  }

  const equipment = equip_result.rows[0];

  // Check eligibility based on tier
  switch (equipment.equipment_tier) {
    case 'universal':
      // Anyone can use universal equipment
      return {
        can_use: true,
        tier: 'universal',
      };

    case 'archetype':
      // Must match archetype
      if (equipment.archetype !== character.archetype) {
        return {
          can_use: false,
          reason: `Requires ${equipment.archetype} archetype (character is ${character.archetype})`,
          tier: 'archetype',
        };
      }
      return {
        can_use: true,
        tier: 'archetype',
      };

    case 'species':
      // Must match species
      if (equipment.species !== character.species) {
        return {
          can_use: false,
          reason: `Requires ${equipment.species} species (character is ${character.species})`,
          tier: 'species',
        };
      }
      return {
        can_use: true,
        tier: 'species',
      };

    case 'contestant':
      // Must match specific character
      if (equipment.restricted_to_character !== character.character_id &&
        equipment.restricted_to_character !== 'universal') {
        return {
          can_use: false,
          reason: `Only ${equipment.restricted_to_character} can use this equipment`,
          tier: 'contestant',
        };
      }
      return {
        can_use: true,
        tier: 'contestant',
      };

    default:
      return {
        can_use: false,
        reason: `Unknown equipment tier: ${equipment.equipment_tier}`,
        tier: equipment.equipment_tier,
      };
  }
}

/**
 * Filter equipment list to only items character can use
 */
export async function filterEligibleEquipment(
  character_id: string,
  equipment_ids: string[]
): Promise<string[]> {
  const eligible: string[] = [];

  for (const equipment_id of equipment_ids) {
    const check = await checkEquipmentEligibility(character_id, equipment_id);
    if (check.can_use) {
      eligible.push(equipment_id);
    }
  }

  return eligible;
}

/**
 * Get all equipment a character is eligible to use (from their inventory)
 */
export async function getEligibleInventory(character_id: string): Promise<any[]> {
  // Get character details
  const char_result = await query(
    `SELECT uc.id, uc.character_id, c.archetype, c.species
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    return [];
  }

  const character = char_result.rows[0];

  // Get character's inventory with eligibility filtering
  const result = await query(
    `SELECT ce.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects,
            e.equipment_type, e.equipment_tier, e.archetype,
            e.species, e.restricted_to_character
     FROM character_equipment ce
     JOIN equipment e ON ce.equipment_id = e.id
     WHERE ce.character_id = $1
       AND (
         e.equipment_tier = 'universal'
         OR (e.equipment_tier = 'archetype' AND e.archetype = $2)
         OR (e.equipment_tier = 'species' AND e.species = $3)
         OR (e.equipment_tier = 'contestant' AND (e.restricted_to_character = $4 OR e.restricted_to_character = 'universal'))
       )
     ORDER BY e.slot, e.rarity DESC, e.name ASC`,
    [character_id, character.archetype, character.species, character.character_id]
  );

  return result.rows;
}
