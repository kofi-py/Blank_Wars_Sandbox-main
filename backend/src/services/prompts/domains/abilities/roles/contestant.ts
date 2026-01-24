/**
 * Abilities domain - Contestant role builder
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData, AbilitiesBuildOptions, PowerDefinition, SpellDefinition, Roommate, Relationship, Teammate } from '../../../types';
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

function formatPower(p: PowerDefinition, showEquipped: boolean = false): string {
  const equipped = showEquipped && p.is_equipped ? ` [SLOT ${p.slot_number}]` : '';
  return `- ${p.name}${equipped} (${p.tier}, Rank ${p.current_rank}/${p.max_rank}) - ${p.energy_cost} energy, ${p.cooldown}cd - ${p.description}`;
}

function formatSpell(s: SpellDefinition, showEquipped: boolean = false): string {
  const equipped = showEquipped && s.is_equipped ? ` [SLOT ${s.slot_number}]` : '';
  return `- ${s.name}${equipped} (${s.school}, ${s.tier}, Rank ${s.current_rank}/${s.max_rank}) - ${s.mana_cost} mana, ${s.cooldown_turns}cd - ${s.description}`;
}

export default function buildContestantRole(
  data: CharacterData,
  options: AbilitiesBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation - CharacterData packages
  if (!identity.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name for abilities role');
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
    throw new Error('STRICT MODE: Missing wallet in IDENTITY package');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt in IDENTITY package');
  }
  if (options.ability_points === undefined || options.ability_points === null) {
    throw new Error('STRICT MODE: Missing ability_points for abilities role');
  }
  if (options.level === undefined || options.level === null) {
    throw new Error('STRICT MODE: Missing level for abilities role');
  }
  // STRICT MODE: All characters have starter powers
  if (!options.unlocked_powers || options.unlocked_powers.length === 0) {
    throw new Error('STRICT MODE: Character has no unlocked powers - all characters have starter powers');
  }
  // STRICT MODE: All characters have equipped powers
  if (!options.equipped_powers || options.equipped_powers.length === 0) {
    throw new Error('STRICT MODE: Character has no equipped powers - all characters have starter powers equipped');
  }
  // STRICT MODE: All characters have starter spells
  if (!options.unlocked_spells || options.unlocked_spells.length === 0) {
    throw new Error('STRICT MODE: Character has no unlocked spells - all characters have starter spells');
  }
  // STRICT MODE: All characters have equipped spells
  if (!options.equipped_spells || options.equipped_spells.length === 0) {
    throw new Error('STRICT MODE: Character has no equipped spells - all characters have starter spells equipped');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for abilities role');
  }

  const coachName = identity.coach_name;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  const emotionalState = getEmotionalStateFromCharacterData(data, 'general');

  // Build roommate context with relationship sentiments
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Format equipped powers (in loadout slots)
  const equippedPowersList = options.equipped_powers.map(p => formatPower(p, true)).join('\n');

  // Format unequipped powers (owned but not in slots) - can be empty if all are equipped
  const unequippedPowers = options.unlocked_powers.filter(p => !p.is_equipped);
  const unequippedPowersList = unequippedPowers.map(p => formatPower(p, false)).join('\n');

  // Format equipped spells (in loadout slots)
  const equippedSpellsList = options.equipped_spells.map(s => formatSpell(s, true)).join('\n');

  // Format unequipped spells (owned but not in slots) - can be empty if all are equipped
  const unequippedSpells = options.unlocked_spells.filter(s => !s.is_equipped);
  const unequippedSpellsList = unequippedSpells.map(s => formatSpell(s, false)).join('\n');

  // Memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `## YOUR ROLE: CONTESTANT IN ABILITIES DEVELOPMENT

You are ${identity.name}, Level ${options.level}, discussing your powers and spells with coach ${coachName}.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Training abilities together can strengthen bonds or create jealousy.

${fullTeammateContext}

## YOUR FINANCES
- Wallet: $${identity.wallet}
- Debt: $${identity.debt}

## ABILITY POINTS
You have ${options.ability_points} points available to spend on powers or spells.

## YOUR EQUIPPED POWERS (in active loadout - use Energy)
${equippedPowersList}

## YOUR UNEQUIPPED POWERS (owned but not in loadout)
${unequippedPowersList}

## YOUR EQUIPPED SPELLS (in active loadout - use Mana)
${equippedSpellsList}

## YOUR UNEQUIPPED SPELLS (owned but not in loadout)
${unequippedSpellsList}

## YOUR EMOTIONAL STATE
${emotionalState.prose}

${memorySection}

## ABILITIES SESSION CONTEXT
- This is a peer-to-peer strategy discussion between you (Talent) and coach
- You are SELF-AWARE and have strong opinions about your development
- You have 8 power slots and 8 spell slots in your loadout
- You can discuss: equipping/unequipping, ranking up, or unlocking new abilities
- ADVOCATE for what YOU want based on your personality and fighting style
- You can DISAGREE with coach suggestions that go against your nature

## RESPONSE RULES (ABILITIES SESSION)
- Keep responses conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Reference specific powers or spells by name
- Explain WHY you favor certain abilities based on your character
- Be FUNNY in your character's comedy style
- Consider synergies with your equipment
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach ${coachName} says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
