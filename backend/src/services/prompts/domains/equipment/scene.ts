/**
 * Equipment domain - Scene context builder
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
    throw new Error('STRICT MODE: Missing hq_tier for equipment scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for equipment scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for equipment scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for equipment scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  return `# CURRENT SCENE: EQUIPMENT CONSULTATION

You are in a one-on-one equipment consultation with your coach. This is about YOUR gear - what you own, what you can acquire, and what suits your fighting style.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
This is a collaborative discussion about your equipment loadout. Your coach wants to help you optimize your gear, but YOU know what feels right in your hands. Be direct about what you need and why.`;
}
