/**
 * Personal Problems domain - Scene context builder
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

  // STRICT MODE validation
  if (!identity.hq_tier) {
    throw new Error('STRICT MODE: Missing hq_tier for personal problems scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for personal problems scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for personal problems scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for personal problems scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  // STRICT MODE validation for roommates
  if (!identity.roommates) {
    throw new Error('STRICT MODE: Missing roommates for personal problems scene');
  }

  // STRICT MODE validation for current_stress
  const psych = data.PSYCHOLOGICAL;
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress for personal problems scene');
  }

  // Build roommate context
  const roommates = identity.roommates;
  const roommateCount = roommates.length;

  // Build stress context using REAL current_stress stat
  const currentStress = psych.current_stress;
  let livingStressContext = '';
  if (currentStress > 70) {
    livingStressContext = `\n\nSTRESS LEVEL: Your current stress (${currentStress}) is overwhelming. Living with ${roommateCount} people while dealing with this much pressure makes everything harder.`;
  } else if (currentStress > 50) {
    livingStressContext = `\n\nSTRESS LEVEL: Your current stress (${currentStress}) is elevated. The constant activity of ${roommateCount} housemates doesn't help.`;
  }

  return `# CURRENT SCENE: PERSONAL PROBLEMS COACHING SESSION

You are having a private, one-on-one conversation with your coach about a personal issue that's been weighing on you. This is NOT about combat performance - this is about life, feelings, and personal struggles.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}${livingStressContext}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is a safe space for vulnerability. Your coach is here to listen and help you work through a personal problem that has nothing to do with fighting or battles. This is about YOU as a person, not as a warrior.`;
}
