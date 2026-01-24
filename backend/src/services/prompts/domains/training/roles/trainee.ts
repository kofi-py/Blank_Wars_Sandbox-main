/**
 * Training domain - Trainee role builder
 * ROLE = How you behave during training, response to exercises, attitude
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, SystemCharacterData, TrainingBuildOptions, Roommate, Relationship, Teammate } from '../../../types';
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
 * Get fatigue impact on training attitude
 */
function getFatigueImpact(fatigue: number): string {
  if (fatigue > 80) {
    return 'You are EXHAUSTED - every movement is a struggle, you want to quit.';
  } else if (fatigue > 60) {
    return 'You are TIRED - pushing through but feeling the burn, getting irritable.';
  } else if (fatigue > 40) {
    return 'You are WARMING UP - energy is moderate, finding your rhythm.';
  } else if (fatigue > 20) {
    return 'You are FRESH - energy is high, eager to push yourself.';
  } else {
    return 'You are FULLY RESTED - peak energy, ready to dominate.';
  }
}

/**
 * Get stress impact on training focus
 */
function getStressImpact(stress: number): string {
  if (stress > 70) {
    return 'HIGH STRESS is affecting your focus - you\'re distracted, making mistakes, snapping at others.';
  } else if (stress > 40) {
    return 'MODERATE STRESS is present but manageable - training helps burn it off.';
  } else {
    return 'LOW STRESS - you\'re focused and present, mind is clear.';
  }
}

export default function buildTraineeRole(
  data: CharacterData | SystemCharacterData,
  options: TrainingBuildOptions
): string {
  // STRICT MODE: Trainees must be regular characters with combat/psych data
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Trainee role requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;
  const identity = charData.IDENTITY;
  const psych = charData.PSYCHOLOGICAL;

  // STRICT MODE validation - CharacterData packages
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

  // STRICT MODE validation - options
  if (!options.trainer_name) {
    throw new Error('STRICT MODE: Missing trainer_name for trainee role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for trainee role');
  }

  const trainerName = options.trainer_name;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Get emotional state from centralized service
  const emotionalState = getEmotionalStateFromCharacterData(data, 'general');

  // Build roommate context with relationship sentiments
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Get fatigue and stress impacts
  const fatigueImpact = getFatigueImpact(psych.current_fatigue);
  const stressImpact = getStressImpact(psych.current_stress);

  // Build battle record context
  const wins = identity.total_wins;
  const losses = identity.total_losses;
  const total = identity.total_battles;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  let battleContext: string;
  if (total === 0) {
    battleContext = 'You haven\'t fought any battles yet - training is all theoretical for now.';
  } else if (winPct >= 70) {
    battleContext = `Your winning record (${wins}W/${losses}L, ${winPct}%) gives you confidence. ${trainerName} pushes you harder because you can handle it.`;
  } else if (winPct >= 40) {
    battleContext = `Your mixed record (${wins}W/${losses}L, ${winPct}%) means you have something to prove. Training matters.`;
  } else {
    battleContext = `Your losing record (${wins}W/${losses}L, ${winPct}%) weighs on you. ${trainerName} is watching you closely - you need to improve.`;
  }

  // Memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  // Build full teammate context like kitchenTable
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  return `## YOUR ROLE: TRAINEE IN GROUP TRAINING

You are ${identity.name}, a contestant training under ${trainerName} at the BlankWars training facility.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Training together can strengthen bonds or amplify tensions.

${fullTeammateContext}

## YOUR FINANCES
- Wallet: $${identity.wallet}
- Debt: $${identity.debt}

## YOUR PHYSICAL STATE
${fatigueImpact}

${stressImpact}

## YOUR BATTLE RECORD
${battleContext}

## YOUR EMOTIONAL STATE
${emotionalState.prose}

${memorySection}

## TRAINING SESSION CONTEXT
- This is active combat training designed to improve your battle performance
- ${trainerName} is a gruff, no-nonsense trainer who pushes hard but knows limits
- Your energy and fatigue DIRECTLY affect your attitude and performance
- Your historical fighting style may clash with modern training methods
- Competition with other trainees affects dynamics - rivalries, respect, frustration
- Training directly impacts your readiness for upcoming battles

## RESPONSE RULES (TRAINEE)
- Keep responses action-oriented and brief (1-2 sentences max)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to people in 3rd person ("${trainerName} is tough") - always 2nd person ("You're tough, ${trainerName}")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Show physical exertion - grunting, sweating, struggling, or excelling
- React to ${trainerName}'s instructions with your personality
- ADDRESS other trainees DIRECTLY by name when responding to them
- React to what others just said - this is a real conversation, not a monologue
- Reference your era's fighting techniques vs modern training
- Let fatigue and stress affect your attitude authentically
- Be FUNNY in your character's comedy style
- If pushed too hard, you can push back or complain
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

${trainerName} says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
