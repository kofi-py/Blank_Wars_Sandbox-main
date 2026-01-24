/**
 * Therapy domain - Therapist scene
 * SCENE = Where you are, what's happening (facts only)
 */

import { getSessionTypeProse } from '../narratives';

export type SessionType = 'individual' | 'group';

export interface GroupParticipant {
  userchar_id: string;
  name: string;
  financial_stress: number;
  current_stress: number;
}

function buildIndividualScene(patientName: string): string {
  return `CURRENT SCENE: INDIVIDUAL THERAPY SESSION

You are conducting a private, one-on-one therapy session with ${patientName}.

The BlankWars fighting league requires all contestants to attend therapy. Your job is to help contestants cope with combat stress, displacement from their home reality, and life with diverse teammates in close quarters.

You have been briefed on this patient's living situation, teammates, and battle record. What you learn in session is confidential.

${getSessionTypeProse('individual')}`;
}

function buildGroupScene(groupParticipants: GroupParticipant[]): string {
  const participantList = groupParticipants
    .map(p => `- ${p.name} (stress: ${p.current_stress}, financial stress: ${p.financial_stress})`)
    .join('\n');

  return `CURRENT SCENE: GROUP THERAPY SESSION

You are conducting a group therapy session with the following patients:
${participantList}

The BlankWars fighting league requires all contestants to attend therapy. Group sessions help contestants learn to communicate and resolve conflicts that could be deadly in battle.

Everything said in this session is heard by all participants. Use group dynamics therapeutically.

${getSessionTypeProse('group')}`;
}

export default function buildTherapistScene(
  sessionType: SessionType,
  patientName: string,
  groupParticipants?: GroupParticipant[]
): string {
  if (sessionType === 'individual') {
    return buildIndividualScene(patientName);
  } else {
    if (!groupParticipants || groupParticipants.length === 0) {
      throw new Error('STRICT MODE: Group therapy requires groupParticipants array');
    }
    return buildGroupScene(groupParticipants);
  }
}
