/**
 * Attributes domain - Scene context builder
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
    throw new Error('STRICT MODE: Missing hq_tier for attributes scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for attributes scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for attributes scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for attributes scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  return `# CURRENT SCENE: ATTRIBUTE DEVELOPMENT SESSION

You are in a one-on-one session with your coach discussing your combat stats - where to invest your attribute points to match your fighting style.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is a collaborative discussion about your core attributes. Your coach wants to optimize your build, but YOU know what kind of fighter you want to be.`;
}
