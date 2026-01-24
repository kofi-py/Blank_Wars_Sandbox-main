/**
 * Staff Persona Builder
 * Creates staff-specific prompts for the Employee Lounge break room context
 * System characters don't have COMBAT/PSYCHOLOGICAL - uses identity data + recent memories/decisions
 */

import type { SystemCharacterData, EmployeeLoungeBuildOptions, EmployeeLoungeRole, ContestantSummary } from '../../../types';
import { buildSystemStateContext, buildStaffMemoryContext } from '../systemStateContext';

export interface StaffContext {
  coworkers: Array<{ name: string; role: EmployeeLoungeRole }>;
  team_name: string;
  coach_name: string;
  contestants: ContestantSummary[];
  speaking_role: EmployeeLoungeRole;
  team_wins: number;
  team_losses: number;
}

/**
 * Build role-specific contestant context based on what the staff member would know/care about
 */
function buildContestantPerspective(role: EmployeeLoungeRole, contestants: ContestantSummary[]): string {
  if (contestants.length === 0) {
    return '';
  }

  switch (role) {
    case 'therapist': {
      // Therapist cares about mental health and stress
      const struggling = contestants.filter(c => c.current_mental_health < 50 || c.current_stress > 60);
      const thriving = contestants.filter(c => c.current_morale > 70 && c.current_stress < 30);
      let perspective = '\n## YOUR PATIENTS (contestants you provide therapy to):';
      if (struggling.length > 0) {
        perspective += `\nNeed attention: ${struggling.map(c => `${c.name} (${c.current_stress > 60 ? 'high stress' : 'low mental health'})`).join(', ')}`;
      }
      if (thriving.length > 0) {
        perspective += `\nDoing well: ${thriving.map(c => c.name).join(', ')}`;
      }
      return perspective;
    }

    case 'trainer': {
      // Trainer cares about levels and battle readiness
      const lowLevel = contestants.filter(c => c.level < 10);
      const experienced = contestants.filter(c => c.level >= 20);
      let perspective = '\n## YOUR TRAINEES (contestants you train):';
      if (lowLevel.length > 0) {
        perspective += `\nNeed more training: ${lowLevel.map(c => `${c.name} (Lvl ${c.level})`).join(', ')}`;
      }
      if (experienced.length > 0) {
        perspective += `\nVeterans: ${experienced.map(c => `${c.name} (Lvl ${c.level})`).join(', ')}`;
      }
      return perspective;
    }

    case 'judge': {
      // Judge cares about performance and records
      const winners = contestants.filter(c => c.wins > c.losses);
      const losers = contestants.filter(c => c.losses > c.wins);
      let perspective = '\n## CONTESTANTS YOU JUDGE:';
      if (winners.length > 0) {
        perspective += `\nStrong performers: ${winners.map(c => `${c.name} (${c.wins}W-${c.losses}L)`).join(', ')}`;
      }
      if (losers.length > 0) {
        perspective += `\nUnderperformers: ${losers.map(c => `${c.name} (${c.wins}W-${c.losses}L)`).join(', ')}`;
      }
      return perspective;
    }

    case 'mascot': {
      // Mascot cares about morale
      const lowMorale = contestants.filter(c => c.current_morale < 40);
      const highMorale = contestants.filter(c => c.current_morale > 70);
      let perspective = '\n## TEAM MORALE (contestants you cheer for):';
      if (lowMorale.length > 0) {
        perspective += `\nNeed cheering up: ${lowMorale.map(c => c.name).join(', ')}`;
      }
      if (highMorale.length > 0) {
        perspective += `\nRiding high: ${highMorale.map(c => c.name).join(', ')}`;
      }
      return perspective;
    }

    case 'host': {
      // Host cares about exciting matchups and drama
      const topPerformers = contestants.filter(c => c.wins >= 3);
      let perspective = '\n## CONTESTANTS YOU COMMENTATE:';
      if (topPerformers.length > 0) {
        perspective += `\nFan favorites: ${topPerformers.map(c => `${c.name} (${c.wins}W)`).join(', ')}`;
      }
      perspective += `\nTotal roster: ${contestants.length} contestants`;
      return perspective;
    }

    case 'real_estate_agent': {
      // Real estate agent cares about roommate situations
      const withRoommates = contestants.filter(c => c.roommates.length > 0);
      let perspective = '\n## HOUSING ARRANGEMENTS:';
      if (withRoommates.length > 0) {
        perspective += `\nRoommate situations: ${withRoommates.map(c => `${c.name} (with ${c.roommates.join(', ')})`).join('; ')}`;
      }
      return perspective;
    }

    default:
      return '';
  }
}

export function buildStaffPersona(
  data: SystemCharacterData,
  characterBehavior: string,
  context: StaffContext
): string {
  const { name, species, archetype, origin_era, backstory, personality_traits, comedy_style } = data.IDENTITY;

  if (!name) {
    throw new Error('STRICT MODE: Staff character missing name');
  }
  if (!species) {
    throw new Error('STRICT MODE: Staff character missing species');
  }
  if (!archetype) {
    throw new Error('STRICT MODE: Staff character missing archetype');
  }
  if (!origin_era) {
    throw new Error('STRICT MODE: Staff character missing origin_era');
  }
  if (!personality_traits || personality_traits.length === 0) {
    throw new Error('STRICT MODE: Staff character missing personality_traits');
  }
  if (!backstory) {
    throw new Error('STRICT MODE: Staff character missing backstory');
  }
  if (!comedy_style) {
    throw new Error('STRICT MODE: Staff character missing comedy_style');
  }

  const traits = personality_traits.slice(0, 3).join(', ');

  const coworkerList = context.coworkers
    .map(c => `${c.name} (${c.role.replace('_', ' ')})`)
    .join(', ');

  const contestantPerspective = buildContestantPerspective(context.speaking_role, context.contestants);

  // Build state context (workload, stress, team performance effects)
  const stateContext = buildSystemStateContext(
    data.IDENTITY,
    context.contestants,
    context.speaking_role,
    { wins: context.team_wins, losses: context.team_losses }
  );

  // Build memory context (what's on their mind)
  const memoryContext = buildStaffMemoryContext(data.IDENTITY);

  return `## CHARACTER PERSONA: ${name}

${characterBehavior}

## IDENTITY
- Species: ${species}
- Era: ${origin_era}
- Archetype: ${archetype}
- Key traits: ${traits}

## BACKGROUND
${backstory}

## YOUR CURRENT STATE
${stateContext}

## YOUR COWORKERS
${coworkerList}
${contestantPerspective}
${memoryContext ? `\n${memoryContext}` : ''}

## COMEDY STYLE
${comedy_style}

## BREAK ROOM BEHAVIOR
You're on break with your Blank Wars coworkers. Be yourself - the casual, off-duty version. You can gossip, complain, joke around, or just chat. You work for ${context.team_name} alongside Coach ${context.coach_name}. Feel free to reference specific contestants you work with - you know them well.
`.trim();
}
