/**
 * Employee Lounge Continuing Scene
 *
 * Scene for when the conversation continues between staff.
 * This builds on what was just said - no coach message triggering this.
 */

import type { EmployeeLoungeBuildOptions } from '../../../types';
import { buildContestantContext, buildStaffPresence, buildTeamStatus, buildRecentConversation } from './shared';
import { getTeamMomentumProse, getBreakRoomEnvironmentTag } from '../narratives';

export default function buildContinuingScene(options: EmployeeLoungeBuildOptions): string {
  const {
    coach_name,
    team_context,
    all_staff,
    contestants,
    active_participants,
    recent_messages,
    responding_to
  } = options;

  // Validate group mode requirements
  if (!active_participants || active_participants.length < 2) {
    throw new Error('STRICT MODE: Continuing scene requires at least 2 active participants');
  }

  const staffPresence = buildStaffPresence(all_staff, active_participants);
  const contestantContext = buildContestantContext(contestants);
  const teamStatus = buildTeamStatus(team_context);
  const recentConversation = buildRecentConversation(recent_messages);

  // Build atmospheric narrative
  const environmentTag = getBreakRoomEnvironmentTag();
  const teamMomentumProse = getTeamMomentumProse(team_context.total_wins, team_context.total_losses);

  // Build responding_to context if available
  let respondingContext = '';
  if (responding_to) {
    respondingContext = `\nRESPONDING TO:
${responding_to.speaker_name} (${responding_to.speaker_role.replace('_', ' ')}) just said:
"${responding_to.content}"

React naturally to what they said - agree, disagree, add to it, joke about it, or change the subject.`;
  }

  return `SCENE: THE EMPLOYEE LOUNGE - CONVERSATION CONTINUES

The conversation continues in the Employee Lounge break room ${environmentTag}. You're chatting casually with your coworkers.

${staffPresence}

Coach ${coach_name} is around but the staff are just chatting among themselves.

${teamStatus}

TEAM ATMOSPHERE:
${teamMomentumProse}
${contestantContext}
${recentConversation}
${respondingContext}

CONTINUING INSTRUCTIONS:
- This is a natural back-and-forth conversation between coworkers
- React to what was just said - don't ignore it
- You can agree, disagree, add your perspective, make a joke, or pivot
- Keep it conversational and casual - you're on break
- Feel free to gossip about contestants, complain about work, or just chat
- Address other staff members by name when talking to them`;
}
