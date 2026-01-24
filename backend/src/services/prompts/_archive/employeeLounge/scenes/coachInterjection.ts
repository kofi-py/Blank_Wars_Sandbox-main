/**
 * Employee Lounge Coach Interjection Scene
 *
 * Scene for when the coach says something and staff respond.
 * This is the original behavior - coach speaks, staff react.
 */

import type { EmployeeLoungeBuildOptions } from '../../../types';
import { buildContestantContext, buildStaffPresence, buildTeamStatus, buildRecentConversation } from './shared';
import { getTeamMomentumProse, getBreakRoomEnvironmentTag } from '../narratives';

export default function buildCoachInterjectionScene(options: EmployeeLoungeBuildOptions): string {
  const {
    coach_name,
    coach_message,
    team_context,
    all_staff,
    contestants,
    active_participants,
    recent_messages,
    responding_to
  } = options;

  const staffPresence = buildStaffPresence(all_staff, active_participants);
  const contestantContext = buildContestantContext(contestants);
  const teamStatus = buildTeamStatus(team_context);
  const recentConversation = buildRecentConversation(recent_messages);

  // Build atmospheric narrative
  const environmentTag = getBreakRoomEnvironmentTag();
  const teamMomentumProse = getTeamMomentumProse(team_context.total_wins, team_context.total_losses);

  // Build context for what we're responding to
  let respondingContext = '';
  if (responding_to) {
    // In group mode, we might be responding to another staff member who already responded
    respondingContext = `\nLAST MESSAGE:
${responding_to.speaker_name} (${responding_to.speaker_role.replace('_', ' ')}) said:
"${responding_to.content}"

React to both the coach's message AND what your coworker just said.`;
  }

  // Check if we're in group mode
  const isGroupMode = active_participants && active_participants.length >= 2;

  const groupInstructions = isGroupMode
    ? `\n\nGROUP RESPONSE:
Other staff members are also responding. You can:
- Add your unique perspective based on your role
- Agree or disagree with what others said
- Build on the conversation naturally
- Address other staff members by name`
    : '';

  return `SCENE: THE EMPLOYEE LOUNGE

You are in the Employee Lounge ${environmentTag} - where Blank Wars staff can relax and chat between shifts.

${staffPresence}

Coach ${coach_name} is managing the ${team_context.team_name} team.

${teamStatus}

TEAM ATMOSPHERE:
${teamMomentumProse}
${contestantContext}

You all work for Blank Wars - the organization that runs this whole competition. The coach manages the team, and you've each been assigned specific support roles. You're all coworkers here. The atmosphere is casual - employees chatting on break, venting about work, gossiping, or just hanging out. Feel free to reference specific contestants by name when relevant to the conversation.
${recentConversation}

THE COACH JUST SAID:
"${coach_message}"

Respond naturally as a coworker reacting to what the coach said. Your perspective is shaped by your specific role and relationship with the contestants.${respondingContext}${groupInstructions}`;
}
