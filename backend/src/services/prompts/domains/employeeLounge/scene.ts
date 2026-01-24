/**
 * Employee Lounge Scene Builder
 *
 * Builds the scene context for the Employee Lounge - a staff break room
 * where Blank Wars employees assigned to this team can chat with each other and the coach.
 */

import type { EmployeeLoungeBuildOptions, ContestantSummary } from '../../types';
import { getTeamMomentumProse, getBreakRoomEnvironmentProse } from './narratives';

function buildContestantContext(contestants: ContestantSummary[]): string {
  if (contestants.length === 0) {
    throw new Error('STRICT MODE: Employee Lounge requires at least one contestant');
  }

  const activeContestants = contestants.filter(c => c.is_active);
  const backupContestants = contestants.filter(c => !c.is_active);

  const formatContestant = (c: ContestantSummary): string => {
    const record = `${c.wins}W-${c.losses}L`;
    const mentalState = c.current_stress > 70 ? 'stressed' :
                        c.current_mental_health < 40 ? 'struggling' :
                        c.current_morale > 70 ? 'thriving' : 'stable';
    return `${c.name} (${c.species}, ${c.archetype}) - Lvl ${c.level}, ${record}, ${mentalState}`;
  };

  let result = '\nTEAM CONTESTANTS (the people you all work with):';

  if (activeContestants.length > 0) {
    result += '\nActive Roster:';
    activeContestants.forEach(c => {
      result += `\n- ${formatContestant(c)}`;
      if (c.roommates.length > 0) {
        result += ` [rooms with: ${c.roommates.join(', ')}]`;
      }
    });
  }

  if (backupContestants.length > 0) {
    result += '\nBackup:';
    backupContestants.forEach(c => {
      result += `\n- ${formatContestant(c)}`;
    });
  }

  return result;
}

export default function buildScene(options: EmployeeLoungeBuildOptions): string {
  const { coach_name, team_context, all_staff, contestants, recent_messages } = options;

  // STRICT MODE validation
  if (!coach_name) {
    throw new Error('STRICT MODE: Missing coach_name for employee lounge scene');
  }
  if (!team_context) {
    throw new Error('STRICT MODE: Missing team_context for employee lounge scene');
  }
  if (!team_context.team_name) {
    throw new Error('STRICT MODE: Missing team_name in team_context');
  }
  if (team_context.total_wins === undefined || team_context.total_wins === null) {
    throw new Error('STRICT MODE: Missing total_wins in team_context');
  }
  if (team_context.total_losses === undefined || team_context.total_losses === null) {
    throw new Error('STRICT MODE: Missing total_losses in team_context');
  }
  if (!all_staff || all_staff.length === 0) {
    throw new Error('STRICT MODE: Missing or empty all_staff for employee lounge scene');
  }
  if (!contestants) {
    throw new Error('STRICT MODE: Missing contestants for employee lounge scene');
  }

  // Get narrative prose
  const teamMomentumProse = getTeamMomentumProse(team_context.total_wins, team_context.total_losses);
  const breakRoomProse = getBreakRoomEnvironmentProse();

  const staffList = all_staff
    .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
    .join(', ');

  const contestantContext = buildContestantContext(contestants);

  const recentActivity = recent_messages.length > 0
    ? `\n\nRECENT CONVERSATION:\n${recent_messages.slice(-5).map(m =>
        `[${m.speaker_role === 'coach' ? 'Coach' : m.speaker_name}]: ${m.content}`
      ).join('\n')}`
    : '';

  return `SCENE: THE EMPLOYEE LOUNGE

You are in the Employee Lounge - a break room for Blank Wars staff. This is where you and your fellow employees can relax and chat between shifts.

${breakRoomProse}

PRESENT IN THE ROOM:
- Coach ${coach_name} (team manager for ${team_context.team_name})
- ${staffList}

TEAM STATUS (${team_context.team_name}):
- Record: ${team_context.total_wins}W - ${team_context.total_losses}L
- Monthly Earnings: $${team_context.monthly_earnings.toLocaleString()}
- HQ Tier: ${team_context.hq_tier}

TEAM MOMENTUM:
${teamMomentumProse}
${contestantContext}

You all work for Blank Wars - the organization that runs this whole competition. The coach manages the team, and you've each been assigned specific support roles. You're all coworkers here. Feel free to reference specific contestants by name when relevant to the conversation.${recentActivity}`;
}
