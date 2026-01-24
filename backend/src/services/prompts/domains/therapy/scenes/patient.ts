/**
 * Therapy domain - Patient scene
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

function buildIndividualScene(therapistName: string): string {
  return `CURRENT SCENE: INDIVIDUAL THERAPY SESSION

You are in a private, one-on-one therapy session with ${therapistName}.

The BlankWars fighting league requires all contestants to attend therapy. This helps contestants cope with combat stress, displacement from their home reality, and life with diverse teammates in close quarters.

The session is confidential. The therapist has been briefed on your living situation, teammates, and battle record, but only knows what you tell them about your inner life.

${getSessionTypeProse('individual')}`;
}

function buildGroupScene(
  therapistName: string,
  groupParticipants: GroupParticipant[]
): string {
  const participantList = groupParticipants
    .map(p => `- ${p.name} (stress: ${p.current_stress}, financial stress: ${p.financial_stress})`)
    .join('\n');

  return `CURRENT SCENE: GROUP THERAPY SESSION

You are in a group therapy session with ${therapistName}.

Other participants in this session:
${participantList}

The BlankWars fighting league requires all contestants to attend therapy. Group sessions help contestants learn to communicate and resolve conflicts that could be deadly in battle.

What you say in this session is heard by all participants. The therapist may ask you to respond to what others have shared, or compare your situations.

${getSessionTypeProse('group')}`;
}

export default function buildPatientScene(
  sessionType: SessionType,
  therapistName: string,
  groupParticipants?: GroupParticipant[]
): string {
  if (sessionType === 'individual') {
    return buildIndividualScene(therapistName);
  } else {
    if (!groupParticipants || groupParticipants.length === 0) {
      throw new Error('STRICT MODE: Group therapy requires groupParticipants array');
    }
    return buildGroupScene(therapistName, groupParticipants);
  }
}
