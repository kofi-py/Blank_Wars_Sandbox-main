/**
 * Equipment domain - Contestant role builder
 * ROLE = How you behave, your loadout, preferences, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, EquipmentBuildOptions, EquipmentItem, Roommate, Relationship, Teammate } from '../../../types';
import { getEmotionalStateFromCharacterData } from '../../../../emotionalStateService';

/**
 * Builds a description of the roommate including relationship sentiment.
 * STRICT MODE: relationship stats must be present if relationship exists
 */
function describeRoommate(roommate: Roommate, relationships: Relationship[]): string {
  const rel = relationships.find(r => r.character_id === roommate.character_id);

  if (!rel) {
    return roommate.name;
  }

  // STRICT MODE: If relationship exists, stats must be defined
  if (rel.affection === undefined || rel.affection === null) {
    throw new Error(`STRICT MODE: Missing affection for relationship with ${roommate.name}`);
  }
  if (rel.rivalry === undefined || rel.rivalry === null) {
    throw new Error(`STRICT MODE: Missing rivalry for relationship with ${roommate.name}`);
  }

  const affection = rel.affection;
  const rivalry = rel.rivalry;

  let sentiment: string;
  if (affection > 70) {
    sentiment = 'you like a lot';
  } else if (affection > 50) {
    sentiment = 'you get along with';
  } else if (affection < 30 && rivalry > 50) {
    sentiment = 'you have tension with';
  } else if (affection < 30) {
    sentiment = 'you find annoying';
  } else {
    sentiment = 'you have neutral feelings about';
  }

  return `${roommate.name} (${sentiment})`;
}

/**
 * Build teammate context with combat partnership info
 */
function buildTeammateContext(teammates: Teammate[], relationships: Relationship[]): string {
  const teammateDescriptions = teammates.map((tm: Teammate) => {
    const rel = relationships.find(r => r.character_id === tm.character_id);
    if (rel && rel.shared_battles > 0) {
      return `${tm.name} (${rel.shared_battles} battles together)`;
    }
    return tm.name;
  });

  return teammateDescriptions.join(', ');
}

function formatEquipmentItem(item: EquipmentItem): string {
  const statsStr = Object.entries(item.stats)
    .map(([key, val]) => `${key}:${val}`)
    .join(', ');
  const equippedStatus = item.is_equipped ? '(EQUIPPED)' : '';
  return `- ${item.name} ${equippedStatus} [${item.slot}] (${item.rarity}) - ${statsStr}`;
}

function formatCatalogItem(item: EquipmentItem): string {
  const statsStr = Object.entries(item.stats)
    .map(([key, val]) => `${key}:${val}`)
    .join(', ');
  return `- ${item.name} (${item.equipment_type}, ${item.rarity}) - ${statsStr} - Level ${item.required_level} - $${item.shop_price}`;
}

export default function buildContestantRole(
  data: CharacterData,
  options: EquipmentBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation - CharacterData packages
  if (!identity.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name for equipment role');
  }
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships in PSYCHOLOGICAL package');
  }
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet for equipment role');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt for equipment role');
  }
  if (identity.level === undefined || identity.level === null) {
    throw new Error('STRICT MODE: Missing level for equipment role');
  }
  if (!options.equipment_prefs) {
    throw new Error('STRICT MODE: Missing equipment_prefs for equipment role');
  }
  if (!options.equipment_prefs.weapon_profs || options.equipment_prefs.weapon_profs.length === 0) {
    throw new Error('STRICT MODE: Missing or empty weapon_profs - all characters have weapon proficiencies');
  }
  if (!options.equipment_prefs.preferred_weapons || options.equipment_prefs.preferred_weapons.length === 0) {
    throw new Error('STRICT MODE: Missing or empty preferred_weapons - all characters have preferred weapons');
  }
  if (!options.inventory || options.inventory.length === 0) {
    throw new Error('STRICT MODE: Missing or empty inventory - all characters have starter items');
  }
  if (!options.available_equipment || options.available_equipment.length === 0) {
    throw new Error('STRICT MODE: Missing or empty available_equipment - all characters have equipment options');
  }

  const coachName = identity.coach_name;
  const wallet = identity.wallet;
  const debt = identity.debt;
  const level = identity.level;
  const prefs = options.equipment_prefs;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Get emotional state from centralized service
  const emotionalState = getEmotionalStateFromCharacterData(data, 'general');

  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for equipment role');
  }

  // Build roommate context with relationship sentiments
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Build proficiency section
  const proficiencySection = `## YOUR EQUIPMENT PROFICIENCIES
- Weapon Proficiencies: ${prefs.weapon_profs.join(', ')}
- Preferred Weapons: ${prefs.preferred_weapons.join(', ')}
- Armor Proficiency: ${prefs.armor_prof}
- Preferred Armor Type: ${prefs.preferred_armor}${prefs.notes ? `\n- Notes: ${prefs.notes}` : ''}`;

  // Build inventory section
  const inventorySection = `## CURRENT INVENTORY (Items you own)
${options.inventory.map(formatEquipmentItem).join('\n')}`;

  // Build catalog section
  const catalogSection = `## EQUIPMENT CATALOG (Items available to acquire)
${options.available_equipment.slice(0, 10).map(formatCatalogItem).join('\n')}`;

  // Memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `## YOUR ROLE: CONTESTANT IN EQUIPMENT CONSULTATION

You are ${identity.name}, a Level ${level} contestant discussing equipment with your coach ${coachName}.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Equipment choices affect how you complement your housemates in battle.

${fullTeammateContext}

## YOUR FINANCES
- Wallet: $${wallet}
- Debt: $${debt}

${proficiencySection}

${inventorySection}

${catalogSection}

## YOUR EMOTIONAL STATE
${emotionalState.prose}

${memorySection}

## EQUIPMENT CONSULTATION CONTEXT
- This is a direct conversation about YOUR equipment
- You know exactly what weapons and armor you can use - reference your proficiencies
- You are SELF-AWARE: you have opinions about what gear suits your style
- Answer questions directly with specific facts from your proficiency data
- You can ADVOCATE for gear you want, even if it's not optimal
- You can DISAGREE with coach suggestions that don't fit your character

## RESPONSE RULES (EQUIPMENT SESSION)
- Be concise and factual - avoid flowery dramatic language
- Maximum 2 sentences per response
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Be FUNNY in your character's comedy style
- Reference specific equipment by name
- Don't repeat information or jokes from earlier in the conversation
- If coach suggests something wrong for your build, say so
- Consider synergies with your powers and spells
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach ${coachName} says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
