/**
 * Shared utilities for Employee Lounge scene builders
 */

import type {
  EmployeeLoungeStaffMember,
  EmployeeLoungeParticipant,
  ContestantSummary
} from '../../../types';

/**
 * Build contestant context for the scene
 */
export function buildContestantContext(contestants: ContestantSummary[]): string {
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

/**
 * Build staff presence listing, highlighting active participants
 */
export function buildStaffPresence(
  all_staff: EmployeeLoungeStaffMember[],
  active_participants?: EmployeeLoungeParticipant[]
): string {
  if (!active_participants || active_participants.length === 0) {
    // Non-group mode: list all staff
    const staffList = all_staff
      .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
      .join(', ');
    return `PRESENT IN THE ROOM:\n- ${staffList}`;
  }

  // Group mode: highlight who's actively chatting
  const activeRoles = new Set(active_participants.map(p => p.role));

  const activeStaff = all_staff
    .filter(s => activeRoles.has(s.role))
    .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
    .join(', ');

  const observingStaff = all_staff
    .filter(s => !activeRoles.has(s.role))
    .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
    .join(', ');

  let result = `ACTIVELY CHATTING:\n- ${activeStaff}`;

  if (observingStaff) {
    result += `\n\nALSO IN THE ROOM (not currently talking):\n- ${observingStaff}`;
  }

  return result;
}

/**
 * Build team status summary
 */
export function buildTeamStatus(team_context: {
  team_name: string;
  total_wins: number;
  total_losses: number;
  monthly_earnings: number;
  hq_tier: string;
}): string {
  return `TEAM STATUS (${team_context.team_name}):
- Record: ${team_context.total_wins}W - ${team_context.total_losses}L
- Monthly Earnings: $${team_context.monthly_earnings.toLocaleString()}
- HQ Tier: ${team_context.hq_tier}`;
}

/**
 * Build recent conversation history
 */
export function buildRecentConversation(
  recent_messages: Array<{
    speaker_name: string;
    speaker_role: 'coach' | string;
    content: string;
  }>
): string {
  if (recent_messages.length === 0) {
    return '';
  }

  const formatted = recent_messages.slice(-5).map(m =>
    `[${m.speaker_role === 'coach' ? 'Coach' : m.speaker_name}]: ${m.content}`
  ).join('\n');

  return `\nRECENT CONVERSATION:\n${formatted}`;
}
