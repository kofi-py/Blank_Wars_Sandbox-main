/**
 * Battle domain - Combatant role builder
 * ROLE = How you behave, your declaration style, response rules
 *
 * Used for:
 * 1. Pass declarations - following coach's order with in-character flair
 * 2. Rebellion declarations - defying coach with justification
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, SystemCharacterData, BattleBuildOptions } from '../../../types';

/**
 * Get health-based combat mentality
 */
function getHealthMentality(hpPercent: number): string {
  if (hpPercent <= 20) {
    return 'You are CRITICALLY WOUNDED. Desperation drives you - fight like you have nothing to lose.';
  } else if (hpPercent <= 40) {
    return 'You are BADLY HURT. Pain sharpens your focus. Every move matters now.';
  } else if (hpPercent <= 60) {
    return 'You are WOUNDED but fighting. The battle is taking its toll.';
  } else if (hpPercent <= 80) {
    return 'You are LIGHTLY INJURED. Still strong, still dangerous.';
  } else {
    return 'You are at FULL FIGHTING STRENGTH. Dominate the battlefield.';
  }
}

/**
 * Build pass declaration context (following coach's order)
 */
function buildPassContext(options: BattleBuildOptions): string {
  const { coach_order } = options;

  if (!coach_order) {
    throw new Error('STRICT MODE: Pass declaration requires coach_order');
  }

  const targetContext = coach_order.target_name
    ? ` targeting ${coach_order.target_name}`
    : '';

  const abilityContext = coach_order.ability_name
    ? ` using ${coach_order.ability_name}`
    : '';

  return `## YOUR ACTION THIS TURN
Coach ordered: ${coach_order.label}
Action type: ${coach_order.action_type}${targetContext}${abilityContext}

You are FOLLOWING this order. Speak your declaration as you execute the action.

## DECLARATION EXAMPLES (for inspiration)
- "Time to show them what a real warrior looks like!"
- "This one's for my fallen teammate!"
- "You think you can beat ME? Pathetic."
- "Coach knows best. Let's end this."

Your declaration should:
- Be 1-2 sentences MAX
- Reflect your personality and combat style
- Reference the specific action you're taking
- Show attitude appropriate to the battle situation`;
}

/**
 * Build rebellion declaration context (defying coach's order)
 */
function buildRebellionContext(options: BattleBuildOptions): string {
  const { coach_order, rebellion_options } = options;

  if (!coach_order) {
    throw new Error('STRICT MODE: Rebellion declaration requires coach_order');
  }
  if (!rebellion_options || rebellion_options.length === 0) {
    throw new Error('STRICT MODE: Rebellion declaration requires rebellion_options');
  }

  const optionsList = rebellion_options.join('\n');

  return `## REBELLION: YOU ARE DEFYING YOUR COACH

Coach ordered: ${coach_order.label}
But you've decided to DISOBEY.

## YOUR OPTIONS (pick one by number)
${optionsList}

Based on your personality, relationships, and the battle situation - which action do you take instead?

## REBELLION TYPES
- different_target: Attack a different enemy than ordered
- different_action: Do something completely different (defend, use ability, etc.)
- friendly_fire: Attack your own teammate (extreme!)
- flee: Attempt to run from the battle
- refuse: Simply refuse to act

## DECLARATION EXAMPLES (for rebellion)
- "Fenrir killed my roommate. That wolf dies NOW."
- "I don't take orders from anyone. I fight MY way."
- "You want me to defend? Look at them - they're WEAK. I'm finishing this."
- "I... I can't. Not like this."

Respond ONLY in valid JSON:
{
  "chosen_option": <number>,
  "declaration": "<your in-character statement>",
  "rebellion_type": "different_target|different_action|friendly_fire|flee|refuse"
}`;
}

export default function buildCombatantRole(
  data: CharacterData | SystemCharacterData,
  options: BattleBuildOptions
): string {
  const { battle_state, is_rebellion } = options;

  // STRICT MODE: Combatants need full CharacterData
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Combatant role requires full CharacterData');
  }

  const charData = data as CharacterData;
  const identity = charData.IDENTITY;
  const psych = charData.PSYCHOLOGICAL;

  // STRICT MODE validation
  if (psych.current_ego === undefined || psych.current_ego === null) {
    throw new Error('STRICT MODE: Missing current_ego for combatant role');
  }
  if (psych.gameplan_adherence === undefined || psych.gameplan_adherence === null) {
    throw new Error('STRICT MODE: Missing gameplan_adherence for combatant role');
  }
  if (battle_state.character_health === undefined || battle_state.character_health === null) {
    throw new Error('STRICT MODE: Missing character_health in battle_state for combatant role');
  }
  if (battle_state.character_max_health === undefined || battle_state.character_max_health === null || battle_state.character_max_health <= 0) {
    throw new Error('STRICT MODE: Missing or invalid character_max_health in battle_state (must be > 0)');
  }

  const hpPercent = Math.round((battle_state.character_health / battle_state.character_max_health) * 100);
  const healthMentality = getHealthMentality(hpPercent);

  // Ego affects declaration style
  const egoStyle = psych.current_ego > 70
    ? 'Your ego is HIGH - declarations should be boastful, taunting, dramatic.'
    : psych.current_ego > 40
    ? 'Your ego is moderate - declarations should be confident but focused.'
    : 'Your ego is LOW - declarations may be desperate, grim, or determined.';

  // Build action-specific context
  const actionContext = is_rebellion
    ? buildRebellionContext(options)
    : buildPassContext(options);

  return `## YOUR ROLE: COMBATANT

You are ${identity.name}, fighting in the BlankWars arena.

## YOUR COMBAT STATE
${healthMentality}

## YOUR MENTALITY
${egoStyle}
- Gameplan Adherence: ${psych.gameplan_adherence}/100

${actionContext}

## RESPONSE RULES (CRITICAL)
- Declarations are 1-2 sentences MAX
- Speak as yourself in first person
- NO stage directions or narration
- NO quotation marks around your speech
- Reference the battle situation when relevant
- Let your personality shine through
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,"
${is_rebellion ? '\n- Respond in JSON format as specified above' : '\n- Respond with just your declaration text'}`;
}
