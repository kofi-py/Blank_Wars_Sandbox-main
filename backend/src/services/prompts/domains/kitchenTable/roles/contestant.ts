/**
 * Kitchen Table domain - Contestant role builder
 * ROLE = Who's present, social dynamics, immediate situation
 *
 * Note: Response rules, memory, and behavior are in PERSONA (at the end, for better AI compliance)
 */

import type { CharacterData, KitchenBuildOptions, Roommate, Relationship, Teammate } from '../../../types';

/**
 * Builds a description of the roommate including relationship sentiment.
 * STRICT MODE: relationship stats must be present if relationship exists
 */
function describeRoommate(roommate: Roommate, relationships: Relationship[]): string {
  const rel = relationships.find(r => r.character_id === roommate.character_id);

  if (!rel) {
    return roommate.name;
  }

  // STRICT MODE: If relationship exists, stats must be defined
  if (rel.affection === undefined || rel.affection === null) {
    throw new Error(`STRICT MODE: Missing affection for relationship with ${roommate.name}`);
  }
  if (rel.rivalry === undefined || rel.rivalry === null) {
    throw new Error(`STRICT MODE: Missing rivalry for relationship with ${roommate.name}`);
  }

  const affection = rel.affection;
  const rivalry = rel.rivalry;

  let sentiment: string;
  if (affection > 70) {
    sentiment = 'you like a lot';
  } else if (affection > 50) {
    sentiment = 'you get along with';
  } else if (affection < 30 && rivalry > 50) {
    sentiment = 'you have tension with';
  } else if (affection < 30) {
    sentiment = 'you find annoying';
  } else {
    sentiment = 'you have neutral feelings about';
  }

  return `${roommate.name} (${sentiment})`;
}

export default function buildRole(data: CharacterData, options: KitchenBuildOptions): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const coachName = identity.coach_name;
  const { immediate_situation } = options;

  // STRICT MODE validation
  if (!coachName) {
    throw new Error('STRICT MODE: Missing coach_name for kitchen table role');
  }
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships in PSYCHOLOGICAL package');
  }
  if (!immediate_situation) {
    throw new Error('STRICT MODE: Missing immediate_situation for kitchen table role');
  }

  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Build roommate list with relationship context
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build teammate list
  const teammateNames = teammates.map((tm: Teammate) => tm.name);

  return `YOUR ROLE: CONTESTANT

CURRENT HOUSEMATES: ${roommateContext}
COACH: ${coachName}
CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

IMMEDIATE SITUATION: ${immediate_situation}`;
}
