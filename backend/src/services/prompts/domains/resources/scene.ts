/**
 * Resources domain - Scene context builder
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
    throw new Error('STRICT MODE: Missing hq_tier for resources scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for resources scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for resources scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for resources scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  return `# CURRENT SCENE: RESOURCE ALLOCATION SESSION

You are at the level-up station with your coach, discussing how to distribute your resource points among Health, Energy, and Mana.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is a critical allocation decision. Health keeps you alive, Energy fuels your powers, Mana powers your spells. Your coach wants optimal allocation, but YOU know how you like to fight.`;
}
