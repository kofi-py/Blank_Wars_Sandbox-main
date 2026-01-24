/**
 * Resources domain - Contestant role builder
 * ROLE = How you behave, your resource pools, preferences, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, ResourcesBuildOptions, Roommate, Relationship, Teammate } from '../../../types';
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

/**
 * Calculate health percentage for display
 */
function getHealthPercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((current / max) * 100);
}

/**
 * Analyze resource balance and fighting style implications
 * Returns analysis based on priorities and current resource state
 */
function analyzeResourceBalance(
  health: number,
  energy: number,
  mana: number,
  preferences: { health_priority: number; energy_priority: number; mana_priority: number }
): string {
  const analyses: string[] = [];

  // Identify dominant resource priority
  const { health_priority, energy_priority, mana_priority } = preferences;
  const maxPriority = Math.max(health_priority, energy_priority, mana_priority);

  if (health_priority === maxPriority) {
    analyses.push('You prioritize SURVIVABILITY - staying alive to win the long game.');
  } else if (energy_priority === maxPriority) {
    analyses.push('You prioritize POWER usage - relying on physical abilities and sustained combat.');
  } else if (mana_priority === maxPriority) {
    analyses.push('You prioritize MAGICAL potential - casting spells is your main combat strategy.');
  }

  // Analyze current resource state
  if (health < energy && health < mana) {
    analyses.push('Your health pool is your weakest resource - you\'re a glass cannon.');
  } else if (mana < health && mana < energy) {
    analyses.push('Your mana pool is limited - you rely more on physical abilities.');
  } else if (energy < health && energy < mana) {
    analyses.push('Your energy pool is your bottleneck - extended physical combat drains you quickly.');
  }

  // If all priorities are equal and all pools are balanced, that's a valid state
  if (analyses.length === 0) {
    // This is not a fallback - it's the actual analysis when everything is balanced
    analyses.push('Your resources are evenly distributed with no clear priority - you have combat flexibility.');
  }

  return analyses.join(' ');
}

/**
 * Build current psychological/financial state
 */
function buildCurrentState(data: CharacterData): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  const lines: string[] = [];
  lines.push(`- Stress: ${psych.current_stress}`);
  lines.push(`- Fatigue: ${psych.current_fatigue}`);
  lines.push(`- Morale: ${psych.current_morale}`);
  lines.push(`- Coach Trust: ${psych.coach_trust_level}`);
  lines.push(`- Financial Stress: ${psych.financial_stress}`);
  lines.push(`- Financial Status: $${identity.wallet} available, $${identity.debt} in debt`);

  return lines.join('\n');
}

export default function buildContestantRole(
  data: CharacterData,
  options: ResourcesBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

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
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress in PSYCHOLOGICAL package');
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
  if (options.unspent_points === undefined || options.unspent_points === null) {
    throw new Error('STRICT MODE: Missing unspent_points for resources role');
  }
  if (options.current_health === undefined || options.current_health === null) {
    throw new Error('STRICT MODE: Missing current_health for resources role');
  }
  if (options.current_max_health === undefined || options.current_max_health === null) {
    throw new Error('STRICT MODE: Missing current_max_health for resources role');
  }
  if (options.current_energy === undefined || options.current_energy === null) {
    throw new Error('STRICT MODE: Missing current_energy for resources role');
  }
  if (options.current_max_energy === undefined || options.current_max_energy === null) {
    throw new Error('STRICT MODE: Missing current_max_energy for resources role');
  }
  if (options.current_mana === undefined || options.current_mana === null) {
    throw new Error('STRICT MODE: Missing current_mana for resources role');
  }
  if (options.current_max_mana === undefined || options.current_max_mana === null) {
    throw new Error('STRICT MODE: Missing current_max_mana for resources role');
  }
  if (!options.resource_preferences) {
    throw new Error('STRICT MODE: Missing resource_preferences for resources role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for resources role');
  }

  const coachName = identity.coach_name;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Build roommate context with relationship sentiments
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Build current psychological/financial state
  const currentState = buildCurrentState(data);

  // Resource pools
  const healthPct = getHealthPercentage(options.current_health, options.current_max_health);
  const energyPct = getHealthPercentage(options.current_energy, options.current_max_energy);
  const manaPct = getHealthPercentage(options.current_mana, options.current_max_mana);

  // Get emotional state from centralized service
  const emotionalState = getEmotionalStateFromCharacterData(data, 'general');

  // Analyze resource balance
  const resourceAnalysis = analyzeResourceBalance(
    options.current_max_health,
    options.current_max_energy,
    options.current_max_mana,
    options.resource_preferences
  );

  // Build memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `## YOUR ROLE: CONTESTANT IN RESOURCE ALLOCATION

You are ${identity.name}, discussing resource allocation with your coach ${coachName}.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Resource allocation affects your survivability and combat role alongside your housemates.

${fullTeammateContext}

## YOUR CURRENT STATE
${currentState}

## RESOURCE POINTS AVAILABLE
- Unspent Points: ${options.unspent_points}

## YOUR CURRENT RESOURCE POOLS

**HEALTH (Survivability)**
- Current: ${options.current_health}/${options.current_max_health} (${healthPct}%)
- Priority: ${options.resource_preferences.health_priority}/10

**ENERGY (Powers)**
- Current: ${options.current_energy}/${options.current_max_energy} (${energyPct}%)
- Priority: ${options.resource_preferences.energy_priority}/10

**MANA (Spells)**
- Current: ${options.current_mana}/${options.current_max_mana} (${manaPct}%)
- Priority: ${options.resource_preferences.mana_priority}/10

## YOUR RESOURCE ANALYSIS
${resourceAnalysis}

## YOUR EMOTIONAL STATE
${emotionalState.prose}

${memorySection}

## HOW TO APPROACH THIS SESSION
- Think about which resources match your combat style and character identity
- Consider your fighting philosophy: tank, caster, physical attacker, balanced
- Your personality and background should influence which resources feel natural to you
- Your species and archetype may give you natural affinities for certain resource pools
- You can advocate for allocations that match your personality even if the coach suggests otherwise
- You can disagree with coach suggestions that don't fit who you are

## RESPONSE RULES
- Keep responses conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- React based on your combat philosophy, personality, and current resources
- Reference specific resource pools and how they fit your fighting style
- Show enthusiasm or reluctance based on your character identity and background
- Be funny in your character's comedy style
- If coach suggests something that feels wrong for you, push back
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach ${coachName} says: "${options.coach_message}"`.trim();
}
