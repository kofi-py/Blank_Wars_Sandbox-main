/**
 * Training domain - Scene context builder
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData, SystemCharacterData, TrainingBuildOptions } from '../../types';
import { getHqTierProse } from '../../narratives/hqTier';
import { getTimeOfDayProse } from '../../narratives/timeOfDay';

/**
 * Get training phase description
 * STRICT MODE: Only valid phases allowed
 */
function getTrainingPhaseProse(phase: string): string {
  switch (phase) {
    // Frontend session phases
    case 'planning':
      return 'The session is in PLANNING phase - discussing goals, assessing condition, planning the workout. Intensity is minimal, focus is on preparation and rapport.';
    case 'active':
      return 'The session is in ACTIVE TRAINING phase - full workout mode with drills, exercises, and skill work. Intensity varies by exercise, focus is on improvement.';
    case 'recovery':
      return 'The session is in RECOVERY phase - post-workout cooldown, stretching, and review. Intensity is low, focus is on recovery and next steps.';
    // Detailed workout phases
    case 'warmup':
      return 'The session is in WARMUP phase - light stretching, basic movements, getting the blood flowing. Intensity is low, focus is on preparation.';
    case 'skill_practice':
      return 'The session is in SKILL PRACTICE phase - focused drills on specific techniques. Intensity is moderate, focus is on form and repetition.';
    case 'sparring':
      return 'The session is in SPARRING phase - live combat practice against training partners. Intensity is high, focus is on application and adaptation.';
    case 'cooldown':
      return 'The session is in COOLDOWN phase - recovery stretches, breathing exercises. Intensity is low, focus is on recovery and reflection.';
    default:
      throw new Error(`STRICT MODE: Invalid training_phase "${phase}" - valid values: planning, active, recovery, warmup, skill_practice, sparring, cooldown`);
  }
}

/**
 * Get intensity level description
 * STRICT MODE: Only valid intensities allowed
 */
function getIntensityProse(intensity: string): string {
  switch (intensity) {
    case 'light':
      return 'Training intensity is LIGHT - recovery day, technique focus, no heavy exertion expected.';
    case 'moderate':
      return 'Training intensity is MODERATE - solid workout, pushing limits but not to exhaustion.';
    case 'intense':
      return 'Training intensity is INTENSE - maximum effort, pushing past comfort zones, building real strength.';
    default:
      throw new Error(`STRICT MODE: Invalid intensity_level "${intensity}" - valid values: light, moderate, intense`);
  }
}

export default function buildScene(
  data: CharacterData | SystemCharacterData,
  options: TrainingBuildOptions
): string {
  // STRICT MODE validation - session context from options
  if (!options.trainee_hq_tier) {
    throw new Error('STRICT MODE: Missing trainee_hq_tier for training scene');
  }
  if (!options.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for training scene');
  }
  if (!options.training_phase) {
    throw new Error('STRICT MODE: Missing training_phase for training scene');
  }
  if (!options.intensity_level) {
    throw new Error('STRICT MODE: Missing intensity_level for training scene');
  }
  if (!options.facility_tier) {
    throw new Error('STRICT MODE: Missing facility_tier for training scene');
  }
  if (!options.available_equipment || options.available_equipment.length === 0) {
    throw new Error('STRICT MODE: Missing or empty available_equipment - all training facilities have equipment');
  }
  if (!options.group_participants || options.group_participants.length === 0) {
    throw new Error('STRICT MODE: Missing or empty group_participants - training sessions have at least trainer + trainee');
  }
  if (!options.trainer_name) {
    throw new Error('STRICT MODE: Missing trainer_name for training scene');
  }

  const traineeHqProse = getHqTierProse(options.trainee_hq_tier);
  const timeOfDayProse = getTimeOfDayProse(options.time_of_day);
  const phaseProse = getTrainingPhaseProse(options.training_phase);
  const intensityProse = getIntensityProse(options.intensity_level);

  // Build equipment context
  const equipmentContext = `Available Equipment: ${options.available_equipment.join(', ')}`;

  // Build participants context with full details
  const participantsContext = options.group_participants.map(p => {
    if (!p.max_health || p.max_health <= 0) {
      throw new Error(`STRICT MODE: Invalid max_health for participant ${p.name} - characters must have positive max_health`);
    }
    const healthPct = Math.round((p.current_health / p.max_health) * 100);
    return `• ${p.name} (${p.archetype}) - ${p.species} - Level ${p.level}
  Battle Record: ${p.wins}W - ${p.losses}L (${p.win_percentage.toFixed(1)}% win rate)
  Physical Condition: ${healthPct}% health
  Financial: $${p.wallet} wallet, $${p.debt} debt`;
  }).join('\n\n');

  // session_duration of 0 is valid for planning phase (session hasn't started yet)
  // For active training phases, we expect elapsed time
  const durationContext = options.session_duration > 0
    ? `Session Duration: ${options.session_duration} minutes so far.`
    : 'Session just starting - no time elapsed yet.';

  return `# CURRENT SCENE: GROUP TRAINING SESSION

You are at the BlankWars training facility for a group training session led by ${options.trainer_name}, the facility's head trainer.

## TRAINING FACILITY
Facility Tier: ${options.facility_tier}
${equipmentContext}

## TRAINEE'S LIVING SITUATION (for psychological context)
${traineeHqProse}

## TIME
${timeOfDayProse}

## TRAINING SESSION STATUS
${phaseProse}

${intensityProse}

${durationContext}

## TRAINEES PRESENT
${participantsContext}

## TRAINING DYNAMICS
- Battle records reveal who needs extra work and who's performing well
- Win rates expose competitive hierarchies and skill gaps
- Physical condition affects training capacity and intensity limits
- Financial stress can impact focus and performance
- ${options.trainer_name} pushes harder on winners and calls out slackers`;
}
