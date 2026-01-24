/**
 * System Character State Context Builder
 *
 * Parallel to statContext.ts but for system characters who don't have COMBAT/PSYCHOLOGICAL packages.
 * Derives personality-affecting state from:
 * - Recent memories (workload, stress events, victories/failures)
 * - Recent decisions (advice followed/ignored, outcomes)
 * - Contestant data (job-specific observations)
 * - Team performance (affects morale)
 */

import type { SystemCharacterIdentity, Memory, Decision, ContestantSummary } from '../../types';
import type { EmployeeLoungeRole } from '../../types';

/**
 * Builds prose describing how the system character's recent experiences affect their mood/behavior.
 */
export function buildSystemStateContext(
  identity: SystemCharacterIdentity,
  contestants: ContestantSummary[],
  role: EmployeeLoungeRole,
  team_record: { wins: number; losses: number }
): string {
  const lines: string[] = [];

  // =====================================================
  // WORKLOAD & RECENT EXPERIENCES (from memories)
  // =====================================================

  const memories = identity.recent_memories || [];

  if (memories.length === 0) {
    lines.push(`You're settling into your routine here - still learning the ropes.`);
  } else {
    // Analyze memory patterns
    const stressfulMemories = memories.filter(m =>
      m.emotion_type === 'stress' || m.emotion_type === 'frustration' || m.intensity > 7
    );
    const positiveMemories = memories.filter(m =>
      m.emotion_type === 'joy' || m.emotion_type === 'pride' || m.emotion_type === 'satisfaction'
    );

    if (stressfulMemories.length >= 3) {
      lines.push(`You've had a rough few days - work has been draining and you're feeling the stress.`);
    } else if (positiveMemories.length >= 3) {
      lines.push(`You've been having a good run lately - work feels rewarding and you're in a positive mood.`);
    }

    // Recent intense memory affects current mood
    const recentIntense = memories.find(m => m.intensity >= 8);
    if (recentIntense) {
      lines.push(`You're still thinking about what happened: "${recentIntense.content}"`);
    }
  }

  // =====================================================
  // ROLE-SPECIFIC JOB STRESS
  // =====================================================

  switch (role) {
    case 'therapist': {
      const highStressPatients = contestants.filter(c => c.current_stress > 70);
      const mentalHealthCrises = contestants.filter(c => c.current_mental_health < 30);

      if (highStressPatients.length >= 3) {
        lines.push(`You're juggling too many stressed-out patients right now - it's emotionally exhausting.`);
      }
      if (mentalHealthCrises.length > 0) {
        lines.push(`You have patients in crisis and it weighs on you even during breaks.`);
      }
      break;
    }

    case 'trainer': {
      const lowLevelSlackers = contestants.filter(c => c.level < 5 && c.wins === 0);
      const veterans = contestants.filter(c => c.level >= 15);

      if (lowLevelSlackers.length >= 2) {
        lines.push(`You're frustrated with contestants who aren't putting in the work - it reflects poorly on you.`);
      }
      if (veterans.length >= 3) {
        lines.push(`You're proud of how far some of your trainees have come - they make your job feel worthwhile.`);
      }
      break;
    }

    case 'judge': {
      const underperformers = contestants.filter(c => c.wins < c.losses && c.wins + c.losses >= 5);
      const topPerformers = contestants.filter(c => c.wins > c.losses && c.wins >= 5);

      if (underperformers.length >= 3) {
        lines.push(`You're tired of watching poor performances - judging losers day after day is demoralizing.`);
      }
      if (topPerformers.length >= 3) {
        lines.push(`You appreciate having quality performers to judge - it makes your job more interesting.`);
      }
      break;
    }

    case 'mascot': {
      const lowMoraleTeam = contestants.filter(c => c.current_morale < 40).length;
      const teamMoraleAvg = contestants.reduce((sum, c) => sum + c.current_morale, 0) / contestants.length;

      if (lowMoraleTeam >= 3) {
        lines.push(`The team morale is terrible and it's your job to fix it - the pressure is getting to you.`);
      } else if (teamMoraleAvg > 70) {
        lines.push(`The team's spirits are high and it energizes you - everyone loves the mascot when things are going well.`);
      }
      break;
    }

    case 'host': {
      const excitingMatchups = contestants.filter(c => c.wins >= 3 && c.losses >= 3); // Drama!

      if (excitingMatchups.length >= 2) {
        lines.push(`You love having dramatic storylines to commentate - makes your job fun.`);
      } else if (contestants.filter(c => c.wins === 0 && c.losses >= 5).length >= 2) {
        lines.push(`Too many one-sided beatdowns lately - the fans want drama, not slaughter.`);
      }
      break;
    }

    case 'real_estate_agent': {
      const overcrowdedRooms = contestants.filter(c => c.roommates.length >= 4);

      if (overcrowdedRooms.length >= 3) {
        lines.push(`You're fielding constant complaints about overcrowded living situations - it's wearing you down.`);
      }
      break;
    }
  }

  // =====================================================
  // TEAM PERFORMANCE (affects everyone)
  // =====================================================

  const totalGames = team_record.wins + team_record.losses;
  if (totalGames >= 5) {
    const winRate = team_record.wins / totalGames;

    if (winRate >= 0.7) {
      lines.push(`The team's winning streak puts everyone in a good mood - success is contagious.`);
    } else if (winRate <= 0.3) {
      lines.push(`The losing streak is affecting everyone's morale - there's tension in the air.`);
    }
  }

  // =====================================================
  // RECENT DECISIONS (how they feel about their choices)
  // =====================================================

  const decisions = identity.recent_decisions || [];
  const badOutcomes = decisions.filter(d => d.outcome === 'negative');
  const goodOutcomes = decisions.filter(d => d.outcome === 'positive');

  if (badOutcomes.length >= 2) {
    lines.push(`You've made some calls that didn't pan out - questioning your judgment a bit.`);
  } else if (goodOutcomes.length >= 3) {
    lines.push(`Your recent decisions have been solid - feeling confident in your professional judgment.`);
  }

  // Check if they've been ignoring coach advice
  const ignoredAdvice = decisions.filter(d => d.coach_advice && !d.followed_advice);
  if (ignoredAdvice.length >= 2) {
    lines.push(`You've been going against the coach's suggestions - might be some tension there.`);
  }

  // =====================================================
  // RETURN COMBINED CONTEXT
  // =====================================================

  if (lines.length === 0) {
    return `You're in a steady state - work is work, nothing particularly affecting your mood.`;
  }

  return lines.join(' ');
}

/**
 * Builds memory context for staff personas - shows what's on their mind
 */
export function buildStaffMemoryContext(identity: SystemCharacterIdentity): string {
  const memories = identity.recent_memories || [];

  if (memories.length === 0) {
    return '';
  }

  // Take top 3 most important or recent memories
  const relevantMemories = memories
    .slice(0, 5)
    .filter(m => m.importance >= 5 || m.intensity >= 7)
    .slice(0, 3);

  if (relevantMemories.length === 0) {
    return '';
  }

  const memoryLines = relevantMemories.map(m => `- ${m.content}`).join('\n');

  return `THINGS ON YOUR MIND:\n${memoryLines}`;
}
