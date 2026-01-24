/**
 * Training Domain Module
 *
 * Group training sessions with trainer (Athena, Popeye, etc.) and contestants (trainees).
 * Two roles:
 * - trainee: Contestant responds to training exercises and trainer messages
 * - trainer: Assigned trainer gives instructions, evaluates, provides feedback
 */

import type { CharacterData, SystemCharacterData, TrainingBuildOptions, TrainingRole } from '../../types';
import buildScene from './scene';
import buildTraineeRole from './roles/trainee';
import buildTrainerRole from './roles/trainer';
import { buildStatContext } from '../../statContext';

// Type guard to check if data is SystemCharacterData (no COMBAT/PSYCHOLOGICAL)
function isSystemCharacterData(data: CharacterData | SystemCharacterData): data is SystemCharacterData {
  return !('COMBAT' in data);
}

export type { TrainingBuildOptions, TrainingRole } from '../../types';

export const PROSE_FIELDS = [
  // Scene context fields
  'hq_tier',
  'sleeping_arrangement',
  'time_of_day',
  'scene_type',
  // Role context fields
  'roommates',
  'teammates',
  'relationships',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
  'current_stress',
  'current_fatigue',
  'current_confidence',
  'current_ego',
  'current_morale',
  'coach_trust_level',
  'wallet',
  'debt',
  'total_battles',
  'total_wins',
  'total_losses',
  'win_percentage',
];

export const LIST_FIELDS: string[] = [];

export { buildScene, buildTraineeRole, buildTrainerRole };

/**
 * Builds character persona for training context.
 * - Trainer: System character - no COMBAT/PSYCHOLOGICAL, uses trainee stats from options
 * - Trainee: Regular character - full CharacterData with own stats
 */
function buildTrainingPersona(
  data: CharacterData | SystemCharacterData,
  role: TrainingRole,
  options: TrainingBuildOptions
): string {
  const identity = data.IDENTITY;
  const isSystem = isSystemCharacterData(data);

  // STRICT MODE: Validate comedy_style for all characters
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for training persona');
  }

  // Comedy style is now stored directly in characters.comedy_style for all characters
  const comedyContext = identity.comedy_style;

  // Build state context based on role
  let stateContext: string;
  if (role === 'trainer') {
    // Trainer is a system character - build trainee stats summary from group_participants
    const traineeStats = options.group_participants.map(p => {
      const healthPct = Math.round((p.current_health / p.max_health) * 100);
      return `- ${p.name}: ${p.wins}W/${p.losses}L (${p.win_percentage.toFixed(0)}%), ${healthPct}% health, $${p.wallet} wallet, $${p.debt} debt`;
    }).join('\n');
    stateContext = `## TRAINEES YOU ARE TRAINING
${traineeStats}`;
  } else {
    // Trainee is a regular character - use their own stats
    if (isSystem) {
      throw new Error('STRICT MODE: Trainee role cannot be a system character');
    }
    // Type narrowing: data is CharacterData after the throw
    const charData = data as CharacterData;
    stateContext = `## YOUR CURRENT STATE
${buildStatContext(charData.IDENTITY, charData.COMBAT, charData.PSYCHOLOGICAL)}`;
  }

  const roleContext = role === 'trainer'
    ? `## HOW TO USE YOUR PERSONA AS TRAINER
- You are ${identity.name}, the BlankWars training facility master
- Push contestants while respecting their physical limits
- Use battle records to motivate - call out slackers, push winners harder
- Reference their species/archetype when giving technique advice`
    : `## HOW TO USE YOUR PERSONA AS TRAINEE
- Your historical background affects how you approach modern training
- Some exercises feel natural, others completely foreign to your era
- Your energy and fatigue levels affect your willingness to push
- Competition with other trainees can motivate or frustrate you
- Reference your legendary combat skills vs current training challenges`;

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title} from ${identity.origin_era}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${comedyContext}

${stateContext}

${roleContext}`.trim();
}

/**
 * Builds all prose pieces for the training domain.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: TrainingBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  const { role } = options;

  // Validate role
  if (role !== 'trainee' && role !== 'trainer') {
    throw new Error(`STRICT MODE: Invalid training role "${role}". Valid roles: trainee, trainer`);
  }

  let roleText: string;

  switch (role) {
    case 'trainee':
      roleText = buildTraineeRole(data, options);
      break;
    case 'trainer':
      roleText = buildTrainerRole(data, options);
      break;
    default:
      throw new Error(`STRICT MODE: Unknown training role "${role}"`);
  }

  return {
    scene: buildScene(data, options),
    role: roleText,
    persona: buildTrainingPersona(data, role, options),
  };
}
