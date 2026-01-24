/**
 * Progression domain - Scene context builder
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
    throw new Error('STRICT MODE: Missing hq_tier for progression scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for progression scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for progression scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for progression scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  return `# CURRENT SCENE: PROGRESSION PLANNING SESSION

You are having a strategic discussion with your coach about your long-term development - where you've been, where you're going, and what kind of fighter you're becoming.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is about the big picture. Your coach wants to optimize your growth trajectory, but YOU have ambitions and a vision for who you want to become.`;
}
