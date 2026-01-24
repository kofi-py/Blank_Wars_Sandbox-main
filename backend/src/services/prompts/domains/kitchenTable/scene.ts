/**
 * Kitchen Table domain - Scene context builder
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
    throw new Error('STRICT MODE: Missing hq_tier for kitchen table scene');
  }
  if (!identity.sleeping_arrangement) {
    throw new Error('STRICT MODE: Missing sleeping_arrangement for kitchen table scene');
  }
  if (!identity.time_of_day) {
    throw new Error('STRICT MODE: Missing time_of_day for kitchen table scene');
  }
  if (!identity.scene_type) {
    throw new Error('STRICT MODE: Missing scene_type for kitchen table scene');
  }

  const hqTierProse = getHqTierProse(identity.hq_tier);
  const sleepingProse = getSleepingProse(identity.sleeping_arrangement);
  const timeOfDayProse = getTimeOfDayProse(identity.time_of_day);
  const sceneTypeProse = getSceneTypeProse(identity.scene_type);
  const roommates = identity.roommates || [];
  const roommate_count = roommates.length;
  const floor_sleeper_count = roommates.filter(r =>
    ['floor', 'couch', 'air_mattress', 'bunk_bed'].includes(r.sleeping_arrangement)
  ).length;
  const room_overcrowded = roommate_count > 4;
  const sleepingAddendum = room_overcrowded && floor_sleeper_count && roommate_count
    ? `\n\nROOM DYNAMICS: Your bedroom is severely overcrowded with ${roommate_count} people crammed in. There's ${floor_sleeper_count} people sleeping on floors and couches. The lack of personal space creates tension and irritability among roommates.`
    : '';

  return `CURRENT SCENE: KITCHEN TABLE

You are hanging out at the kitchen table in your shared housing - casual downtime with your roommates and possibly your coach.

LIVING SITUATION:
${hqTierProse}

YOUR SLEEPING SITUATION:
${sleepingProse}${sleepingAddendum}

TIME OF DAY:
${timeOfDayProse}

SCENE TONE:
${sceneTypeProse}`;
}
