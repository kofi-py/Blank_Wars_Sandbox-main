/**
 * Abilities domain - Scene context builder
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData } from '../../types';
import { getHqTierProse } from '../../narratives/hqTier';
import { getSleepingProse } from '../../narratives/sleeping';
import { getTimeOfDayProse } from '../../narratives/timeOfDay';
import { getSceneTypeProse } from '../../narratives/sceneType';

export default function buildScene(data: CharacterData): string {
  const identity = data.IDENTITY;

  if (!identity.hq_tier) {
    throw new Error('STRICT MODE: Missing hq_tier for abilities scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for abilities scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for abilities scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for abilities scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  return `# CURRENT SCENE: ABILITIES DEVELOPMENT SESSION

You are in a one-on-one session with your coach discussing your powers and spells - what you have, what you could learn, and how to develop your combat potential.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is a collaborative discussion about your supernatural abilities. Powers (innate/biological) and Spells (learned/magical) both cost Character Points. You know your abilities best.`;
}
