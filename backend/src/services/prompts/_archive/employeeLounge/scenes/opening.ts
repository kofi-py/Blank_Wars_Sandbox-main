/**
 * Employee Lounge Opening Scene
 *
 * Scene for when staff start chatting as the user enters the lounge.
 * This is the first message in a group conversation - no prior context.
 */

import type { EmployeeLoungeBuildOptions, ContestantSummary } from '../../../types';
import { buildContestantContext, buildStaffPresence, buildTeamStatus, buildRecentConversation } from './shared';
import { getBreakRoomEnvironmentProse, getTeamMomentumProse } from '../narratives';

export default function buildOpeningScene(options: EmployeeLoungeBuildOptions): string {
  const { coach_name, team_context, all_staff, contestants, active_participants, recent_messages, responding_to } = options;

  // Validate group mode requirements
  if (!active_participants || active_participants.length < 2) {
    throw new Error('STRICT MODE: Opening scene requires at least 2 active participants');
  }

  const participantNames = active_participants.map(p => p.name).join(', ');
  const staffPresence = buildStaffPresence(all_staff, active_participants);
  const contestantContext = buildContestantContext(contestants);
  const teamStatus = buildTeamStatus(team_context);
  const recentConversation = buildRecentConversation(recent_messages);

  // Build atmospheric narrative
  const environmentProse = getBreakRoomEnvironmentProse();
  const teamMomentumProse = getTeamMomentumProse(team_context.total_wins, team_context.total_losses);

  // Build responding_to context if available (for 2nd, 3rd, etc. speakers)
  let respondingContext = '';
  if (responding_to) {
    respondingContext = `\nRESPONDING TO:
${responding_to.speaker_name} (${responding_to.speaker_role.replace('_', ' ')}) just said:
"${responding_to.content}"

React naturally to what they said - agree, disagree, add to it, joke about it, or change the subject.`;
  }

  return `SCENE: THE EMPLOYEE LOUNGE - OPENING

${environmentProse}

${staffPresence}

Coach ${coach_name} is managing the ${team_context.team_name} team.

${teamStatus}

TEAM ATMOSPHERE:
${teamMomentumProse}
${contestantContext}
${recentConversation}${respondingContext}

SCENE CONTEXT:
You're entering mid-break. Some coworkers are getting coffee, others are settling into chairs. The atmosphere reflects how the team's been doing. It's a natural moment to start chatting - maybe comment on the team's performance, a contestant, your workload, the terrible coffee, or just say good morning.

OPENING INSTRUCTIONS:
- Start a CASUAL conversation - this is just coworkers hanging out
- You can talk about work, contestants, the team, or anything relevant
- Keep it natural - like walking into a break room
- ${responding_to ? 'React to what was just said by your coworker' : 'This is the FIRST message, so set the tone for the conversation'}
- Other staff will join in: ${participantNames}`;
}
