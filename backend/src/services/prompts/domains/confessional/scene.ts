/**
 * Confessional domain - Scene context builder
 * SCENE = Where you are, what's happening, environmental context
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData } from '../../types';
import { getHqTierProse } from '../../narratives/hqTier';
import { getSleepingProse } from '../../narratives/sleeping';
import { getTimeOfDayProse } from '../../narratives/timeOfDay';
import { getSceneTypeProse } from '../../narratives/sceneType';

export default function buildScene(data: CharacterData): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation
  if (!identity.hq_tier) {
    throw new Error('STRICT MODE: Missing hq_tier for confessional scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for confessional scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for confessional scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for confessional scene');
  }
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress for confessional scene');
  }

  // STRICT MODE: All characters have roommates
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  // Build roommate context for what they might vent about
  const roommates = identity.roommates;
  const roommateCount = roommates.length;

  // Build stress context
  const currentStress = psych.current_stress;
  let stressContext = '';
  if (currentStress > 70) {
    stressContext = `\n\nYOUR STATE: You're under significant stress (${currentStress}). This private moment is a chance to vent about everything that's been building up.`;
  } else if (currentStress > 50) {
    stressContext = `\n\nYOUR STATE: You're feeling the pressure (stress: ${currentStress}). The confessional is your outlet.`;
  } else {
    stressContext = `\n\nYOUR STATE: You're relatively calm (stress: ${currentStress}), but there's always something to reflect on in this place.`;
  }

  // Build overcrowding context if applicable
  const floorSleeperCount = roommates.filter(r =>
    ['floor', 'couch', 'air_mattress', 'bunk_bed'].includes(r.sleeping_arrangement)
  ).length;
  const roomOvercrowded = roommateCount > 4;
  const livingAddendum = roomOvercrowded && floorSleeperCount
    ? `\n\nLIVING SITUATION WEIGHING ON YOU: Your bedroom is severely overcrowded with ${roommateCount} people. There's ${floorSleeperCount} people sleeping on floors and couches. This lack of privacy makes these confessional moments even more valuable.`
    : '';

  return `# CURRENT SCENE: CONFESSIONAL BOOTH

You are in the BlankWars confessional booth - a private, soundproofed space where contestants speak directly to the camera (or the Hostmaster AI) about their experiences, frustrations, and secrets. The lighting is dramatic, focusing solely on you.

## THE BOOTH
This is the one truly private space in the entire facility. No roommates, no coach, no cameras watching your every move (except this one). Here you can be honest about what's really going on.

## YOUR LIVING SITUATION (what you're escaping from)
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}${livingAddendum}

## TIME OF DAY
${timeOfDayProse}
${stressContext}

## SCENE TONE
${sceneTypeProse}

## CONFESSIONAL PURPOSE
This is your chance to speak candidly - about your roommates, your coach, your battles, your frustrations, your hopes. The Hostmaster is here to draw out the drama. Be real. Be raw. This is reality TV.`;
}
