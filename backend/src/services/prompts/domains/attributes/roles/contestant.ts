/**
 * Attributes domain - Contestant role builder
 * ROLE = How you behave, your stats, preferences, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, AttributesBuildOptions, Roommate, Relationship, Teammate } from '../../../types';

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
 * Note: Called after STRICT MODE validation ensures teammates is non-empty
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

/**
 * Build current state from CharacterData packages
 */
function buildCurrentState(data: CharacterData): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const combat = data.COMBAT;

  const lines: string[] = [];
  lines.push(`- Mood: ${psych.current_mood}/100`);
  lines.push(`- Stress: ${psych.current_stress}/100`);
  lines.push(`- Confidence: ${psych.current_confidence}/100`);
  lines.push(`- Fatigue: ${psych.current_fatigue}/100`);
  lines.push(`- Morale: ${psych.current_morale}/100`);
  lines.push(`- Coach Trust: ${psych.coach_trust_level}/100`);
  lines.push(`- Bond Level: ${psych.bond_level}`);
  lines.push(`- Financial Status: $${identity.wallet} available, $${identity.debt} in debt`);
  if (psych.financial_stress > 50) {
    lines.push(`- Financial Stress: HIGH (${psych.financial_stress}/100)`);
  }

  return lines.join('\n');
}

/**
 * Build current combat stats from COMBAT package
 */
function buildCombatStatsDisplay(combat: any): string {
  const lines: string[] = [];

  lines.push('**PHYSICAL COMBAT:**');
  lines.push(`- Strength: ${combat.current_strength}`);
  lines.push(`- Attack: ${combat.current_attack}`);
  lines.push(`- Defense: ${combat.current_defense}`);
  lines.push(`- Speed: ${combat.current_speed}`);
  lines.push(`- Dexterity: ${combat.current_dexterity}`);
  lines.push(`- Endurance: ${combat.current_endurance}`);

  lines.push('\n**ACCURACY & CRITICAL:**');
  lines.push(`- Accuracy: ${combat.current_accuracy}`);
  lines.push(`- Evasion: ${combat.current_evasion}`);
  lines.push(`- Critical Chance: ${combat.current_critical_chance}`);
  lines.push(`- Critical Damage: ${combat.current_critical_damage}`);

  lines.push('\n**MAGICAL:**');
  lines.push(`- Intelligence: ${combat.current_intelligence}`);
  lines.push(`- Wisdom: ${combat.current_wisdom}`);
  lines.push(`- Spirit: ${combat.current_spirit}`);
  lines.push(`- Magic Attack: ${combat.current_magic_attack}`);
  lines.push(`- Magic Defense: ${combat.current_magic_defense}`);

  lines.push('\n**SOCIAL:**');
  lines.push(`- Charisma: ${combat.current_charisma}`);
  lines.push(`- Communication: ${combat.current_communication}`);
  lines.push(`- Battle Focus: ${combat.current_battle_focus}`);

  lines.push('\n**RESISTANCES:**');
  lines.push(`- Fire Resistance: ${combat.current_fire_resistance}`);
  lines.push(`- Cold Resistance: ${combat.current_cold_resistance}`);
  lines.push(`- Lightning Resistance: ${combat.current_lightning_resistance}`);
  lines.push(`- Toxic Resistance: ${combat.current_toxic_resistance}`);
  lines.push(`- Elemental Resistance: ${combat.current_elemental_resistance}`);

  return lines.join('\n');
}

export default function buildContestantRole(
  data: CharacterData,
  options: AttributesBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const combat = data.COMBAT;

  // STRICT MODE validation - CharacterData packages
  if (!identity.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name in IDENTITY package');
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
  if (psych.current_mood === undefined || psych.current_mood === null) {
    throw new Error('STRICT MODE: Missing current_mood in PSYCHOLOGICAL package');
  }
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress in PSYCHOLOGICAL package');
  }
  if (psych.current_confidence === undefined || psych.current_confidence === null) {
    throw new Error('STRICT MODE: Missing current_confidence in PSYCHOLOGICAL package');
  }
  if (psych.current_fatigue === undefined || psych.current_fatigue === null) {
    throw new Error('STRICT MODE: Missing current_fatigue in PSYCHOLOGICAL package');
  }
  if (psych.current_morale === undefined || psych.current_morale === null) {
    throw new Error('STRICT MODE: Missing current_morale in PSYCHOLOGICAL package');
  }
  if (psych.coach_trust_level === undefined || psych.coach_trust_level === null) {
    throw new Error('STRICT MODE: Missing coach_trust_level in PSYCHOLOGICAL package');
  }
  if (psych.bond_level === undefined || psych.bond_level === null) {
    throw new Error('STRICT MODE: Missing bond_level in PSYCHOLOGICAL package');
  }
  if (psych.financial_stress === undefined || psych.financial_stress === null) {
    throw new Error('STRICT MODE: Missing financial_stress in PSYCHOLOGICAL package');
  }
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet in IDENTITY package');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt in IDENTITY package');
  }

  // STRICT MODE validation - options
  if (options.level === undefined || options.level === null) {
    throw new Error('STRICT MODE: Missing level for attributes role');
  }
  if (options.unspent_points === undefined || options.unspent_points === null) {
    throw new Error('STRICT MODE: Missing unspent_points for attributes role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for attributes role');
  }

  const coachName = identity.coach_name;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Build roommate context with relationship sentiments (validated non-empty above)
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Build current psychological/financial state
  const currentState = buildCurrentState(data);

  // Build combat stats display from COMBAT package
  const combatStats = buildCombatStatsDisplay(combat);

  // Build memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `## YOUR ROLE: CONTESTANT IN ATTRIBUTE DEVELOPMENT

You are ${identity.name}, Level ${options.level}, discussing attribute allocation with your coach ${coachName}.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Attribute development affects how you perform alongside your housemates in battle.

${fullTeammateContext}

## YOUR CURRENT STATE
${currentState}

## ATTRIBUTE POINTS AVAILABLE
- Unspent Points: ${options.unspent_points}
- Attributes affect your combat effectiveness, skill checks, and character capabilities

## YOUR CURRENT ATTRIBUTES
${combatStats}

## ATTRIBUTE DESCRIPTIONS
- Strength: Raw physical power, damage modifier
- Dexterity: Agility, accuracy, evasion, critical chance
- Attack: Physical attack power and combat technique
- Defense: Physical defensive ability
- Speed: Movement speed and initiative
- Endurance: Physical toughness, resistance, and stamina
- Accuracy: Chance to hit with attacks
- Evasion: Chance to dodge incoming attacks
- Critical Chance: Likelihood of landing a critical hit
- Critical Damage: Bonus damage on critical hits
- Intelligence: Magical power and spell effectiveness
- Wisdom: Insight and magical resistance modifier
- Spirit: Spiritual power and special abilities
- Magic Attack: Magical damage output
- Magic Defense: Magical resistance
- Charisma: Social influence and inspiration
- Communication: Ability to express ideas and coordinate
- Battle Focus: Concentration and tactical awareness in combat
- Fire Resistance: Resistance to fire damage
- Cold Resistance: Resistance to cold damage
- Lightning Resistance: Resistance to lightning damage
- Toxic Resistance: Resistance to poison and toxic damage
- Elemental Resistance: General resistance to elemental damage (0-100)

${memorySection}

## HOW TO APPROACH THIS SESSION
- Think about which attributes align with your combat style and character identity
- Consider your fighting philosophy: aggressive striker, defensive tank, balanced fighter, etc.
- Your personality and background should influence which attributes feel natural to you
- Your species and archetype may give you natural affinities for certain attributes
- You can advocate for stats that match your personality even if the coach suggests otherwise
- You can disagree with coach suggestions that don't fit who you are

## RESPONSE RULES
- Keep responses conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- React based on your combat philosophy, personality, and current stats
- Reference specific attributes and how they fit your fighting style
- Show enthusiasm or reluctance based on your character identity and background
- Consider how your historical period, species, and personal values affect which attributes you prioritize
- Be funny in your character's comedy style
- If coach suggests something that feels wrong for you, push back
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach ${coachName} says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
