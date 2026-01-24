/**
 * Performance domain - Scene context builder
 * SCENE = Where you are, what's happening, environmental context
 *
 * Receives character data and builds prose using narrative templates.
 */

import type { CharacterData } from '../../types';
import { getHqTierProse } from '../../narratives/hqTier';
import { getSleepingProse } from '../../narratives/sleeping';
import { getTimeOfDayProse } from '../../narratives/timeOfDay';
import { getSceneTypeProse } from '../../narratives/sceneType';

export default function buildScene(data: CharacterData): string {
  const identity = data.IDENTITY;

  // Get narrative prose from templates - STRICT MODE (no fallbacks)
  if (!identity.hq_tier) {
    throw new Error(`STRICT MODE: Missing hq_tier for performance scene`);
  }
  if (!identity.sleeping_arrangement) {
    throw new Error(`STRICT MODE: Missing sleeping_arrangement for performance scene`);
  }
  if (!identity.time_of_day) {
    throw new Error(`STRICT MODE: Missing time_of_day for performance scene`);
  }
  if (!identity.scene_type) {
    throw new Error(`STRICT MODE: Missing scene_type for performance scene`);
  }

  // STRICT MODE: All characters have roommates
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);

  // Build roommate overcrowding context
  const roommates = identity.roommates;
  const roommate_count = roommates.length;
  const floor_sleeper_count = roommates.filter(r =>
    ['floor', 'couch', 'air_mattress', 'bunk_bed'].includes(r.sleeping_arrangement)
  ).length;
  const room_overcrowded = roommate_count > 4;
  const sleepingAddendum = room_overcrowded && floor_sleeper_count && roommate_count
    ? `\n\nROOM DYNAMICS: Your bedroom is severely overcrowded with ${roommate_count} people crammed in. There's ${floor_sleeper_count} people sleeping on floors and couches. The lack of personal space creates tension and irritability - and it affects how well-rested you are for battles.`
    : '';

  return `# CURRENT SCENE: PERFORMANCE COACHING SESSION

You are having a one-on-one performance review with your coach. This is a coaching session focused on your battles, combat strategy, and areas for improvement.

## YOUR LIVING SITUATION
${hqTierProse}

## YOUR SLEEPING SITUATION
${sleepingProse}${sleepingAddendum}

## TIME OF DAY
${timeOfDayProse}

## SCENE TONE
${sceneTypeProse}

## SESSION PURPOSE
Your coach is reviewing your combat performance and working with you to improve your fighting strategy. This is about honest assessment of your battles, identifying weaknesses, and developing plans for improvement. Your living situation and energy levels affect how receptive you are to this feedback.`;
}
