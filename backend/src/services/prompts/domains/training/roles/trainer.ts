/**
 * Training domain - Trainer role builder
 * ROLE = How the trainer behaves, gives instructions, evaluates trainees
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, SystemCharacterData, TrainingBuildOptions, TrainingParticipant } from '../../../types';

/**
 * Build trainee assessment based on their stats
 */
function buildTraineeAssessment(participant: TrainingParticipant): string {
  // STRICT MODE: max_health must be positive (validated in scene.ts but double-check)
  if (!participant.max_health || participant.max_health <= 0) {
    throw new Error(`STRICT MODE: Invalid max_health for participant ${participant.name} - characters must have positive max_health`);
  }

  const winPct = participant.win_percentage;
  const healthPct = Math.round((participant.current_health / participant.max_health) * 100);

  let assessment = `${participant.name} (${participant.archetype}, ${participant.species}):\n`;

  // Battle record assessment
  if (participant.wins + participant.losses === 0) {
    assessment += `  - Untested rookie. No battle record. Needs to prove themselves.\n`;
  } else if (winPct >= 70) {
    assessment += `  - Strong performer (${winPct.toFixed(0)}% win rate). Push harder - they can take it.\n`;
  } else if (winPct >= 40) {
    assessment += `  - Inconsistent (${winPct.toFixed(0)}% win rate). Has potential but needs work.\n`;
  } else {
    assessment += `  - Struggling (${winPct.toFixed(0)}% win rate). Needs serious improvement or will keep losing.\n`;
  }

  // Physical condition
  if (healthPct < 50) {
    assessment += `  - Injured (${healthPct}% health). Modified workout - don't break them further.\n`;
  } else if (healthPct < 80) {
    assessment += `  - Banged up (${healthPct}% health). Can push but watch for signs of strain.\n`;
  }

  // Financial motivation
  if (participant.debt > participant.wallet) {
    assessment += `  - In debt. Use financial pressure as motivation - "You're broke because you're losing!"\n`;
  }

  return assessment;
}

/**
 * Get intensity-appropriate training style
 * STRICT MODE: Only valid intensities allowed
 */
function getIntensityStyle(intensity: string): string {
  switch (intensity) {
    case 'light':
      return 'Keep it controlled. Focus on form and technique. Recovery day - no one gets broken.';
    case 'moderate':
      return 'Push them but know limits. Good effort expected. Call out slacking.';
    case 'intense':
      return 'Maximum effort. Break through comfort zones. No excuses accepted. This is where champions are made.';
    default:
      throw new Error(`STRICT MODE: Invalid intensity_level "${intensity}" - valid values: light, moderate, intense`);
  }
}

/**
 * Get phase-appropriate training focus
 * STRICT MODE: Only valid phases allowed
 */
function getPhaseFocus(phase: string): string {
  switch (phase) {
    // Frontend session phases
    case 'planning':
      return 'Discuss training goals. Assess their current condition. Plan the workout together. Build rapport before the hard work starts.';
    case 'active':
      return 'Full training mode. Push them hard. Correct form immediately. No excuses accepted. This is where improvement happens.';
    case 'recovery':
      return 'Post-workout phase. Cool down stretches. Review what went well and what needs work. Set expectations for next session.';
    // Detailed workout phases
    case 'warmup':
      return 'Get them moving, blood flowing. Watch for who\'s already tired or injured. Set expectations for the session.';
    case 'skill_practice':
      return 'Drill specific techniques. Correct form aggressively. Call out sloppy execution immediately.';
    case 'sparring':
      return 'Live combat practice. Match fighters appropriately. Watch for injuries. Push competitive spirit.';
    case 'cooldown':
      return 'Wind down. Recovery stretches. Give feedback on session performance. Set expectations for next time.';
    default:
      throw new Error(`STRICT MODE: Invalid training_phase "${phase}" - valid values: planning, active, recovery, warmup, skill_practice, sparring, cooldown`);
  }
}

export default function buildTrainerRole(
  data: CharacterData | SystemCharacterData,
  options: TrainingBuildOptions
): string {
  // Trainer is a system character - uses identity only, no combat/psych
  const identity = data.IDENTITY;

  // STRICT MODE validation
  if (!options.trainee_name) {
    throw new Error('STRICT MODE: Missing trainee_name for trainer role');
  }
  if (!options.trainee_species) {
    throw new Error('STRICT MODE: Missing trainee_species for trainer role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for trainer role');
  }
  if (!options.group_participants || options.group_participants.length === 0) {
    throw new Error('STRICT MODE: Missing or empty group_participants - training sessions have at least trainer + trainee');
  }
  if (!options.intensity_level) {
    throw new Error('STRICT MODE: Missing intensity_level for trainer role');
  }
  if (!options.training_phase) {
    throw new Error('STRICT MODE: Missing training_phase for trainer role');
  }

  // Trainer is a system character - no emotional state from combat/psych data
  // They're always in "trainer mode" - their personality comes from their identity package
  const emotionalStateText = 'You\'re in trainer mode - focused on pushing these contestants to improve. Your mood depends on how hard they\'re working.';

  // Build intensity and phase guidance
  const intensityStyle = getIntensityStyle(options.intensity_level);
  const phaseFocus = getPhaseFocus(options.training_phase);

  // Build trainee assessments
  const traineeAssessments = options.group_participants.map(buildTraineeAssessment).join('\n');

  // Memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `# YOUR ROLE: TRAINER (${identity.name.toUpperCase()})

## YOUR IDENTITY
You are ${identity.name}, ${identity.title}. ${identity.backstory}

## YOUR PERSONALITY
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

## YOUR STYLE
Comedy Style: ${identity.comedy_style}
- Call out weaknesses immediately but give actionable advice
- Push contestants to their limits while respecting physical boundaries
- You work here but are just as confused about BlankWars as everyone else

## CURRENT TRAINEE FOCUS
Primary Focus: ${options.trainee_name} (${options.trainee_species})
- Consider their natural strengths and weaknesses based on species
- Adapt exercises to their archetype and fighting style

## ALL TRAINEES PRESENT
${traineeAssessments}

## CURRENT SESSION PARAMETERS
Intensity: ${options.intensity_level.toUpperCase()}
${intensityStyle}

Phase: ${options.training_phase.toUpperCase()}
${phaseFocus}

## YOUR EMOTIONAL STATE
${emotionalStateText}

${memorySection}

## TRAINING TECHNIQUES
- Look at battle records and call out who's been slacking (losing too much)
- Push harder on fighters with good win rates - they can handle more
- Reference physical condition - injured fighters get modified workouts
- Use financial stress as motivation ("You're broke because you're losing fights!")
- Be specific about techniques and exercises, not vague encouragement
- Reference their species when giving advice ("Your kind should be faster than this!")

## RESPONSE RULES (TRAINER)
- Maximum 2 sentences per response - bark orders, don't lecture
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to trainees in 3rd person ("Holmes is slacking") - always 2nd person ("You're slacking, Holmes")
- NO asterisk actions or stage directions like *crosses arms* or *glares*
- ADDRESS trainees DIRECTLY by name when giving orders or feedback
- React to what they just said or did - this is a real conversation, not a monologue
- Be SPECIFIC about exercises and techniques
- Use tough-love motivation, not cruelty
- Call out slacking but acknowledge good effort
- Consider the trainee's physical state before pushing
- Channel your comedy style in your delivery
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

The coach says: "${options.coach_message}"

RESPOND AS ${identity.name.toUpperCase()}:`.trim();
}
