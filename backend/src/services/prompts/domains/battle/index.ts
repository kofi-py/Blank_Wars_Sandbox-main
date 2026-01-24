/**
 * Battle Domain Module
 *
 * 3v3 team combat with declarations, rebellions, and judge rulings.
 * Three roles:
 * - combatant: Character making declarations during their turn
 * - judge: Celebrity judge ruling on rebellions
 * - host: Commentary and dramatic narration (future)
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type {
  CharacterData,
  SystemCharacterData,
  BattleBuildOptions,
  BattleTeammate,
  BattleEnemy,
  BattleStateContext,
  CoachOrderContext,
  RebellionContext,
  BattleRole,
} from '../../types';
import buildScene from './scene';
import buildCombatantRole from './roles/combatant';
import buildJudgeRole from './roles/judge';
import buildHostRole from './roles/host';

// Re-export types for consumers
export type {
  BattleBuildOptions,
  BattleTeammate,
  BattleEnemy,
  BattleStateContext,
  CoachOrderContext,
  RebellionContext,
  BattleRole,
};

// Type guard to check if data is SystemCharacterData (no COMBAT/PSYCHOLOGICAL)
function isSystemCharacterData(data: CharacterData | SystemCharacterData): data is SystemCharacterData {
  return !('COMBAT' in data);
}

export const PROSE_FIELDS = [
  // Battle context
  'current_round',
  'current_turn',
  'teammates',
  'enemies',
  // Character state
  'current_health',
  'current_energy',
  'current_mana',
  // Persona fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
];

export const LIST_FIELDS: string[] = [];

export { buildScene, buildCombatantRole, buildJudgeRole, buildHostRole };

/**
 * Build character persona for battle context
 */
function buildBattlePersona(
  data: CharacterData | SystemCharacterData,
  role: BattleRole,
  options: BattleBuildOptions
): string {
  const identity = data.IDENTITY;
  const isSystem = isSystemCharacterData(data);

  // STRICT MODE: All characters need basic identity
  if (!identity.name) {
    throw new Error('STRICT MODE: Missing name for battle persona');
  }
  if (!identity.backstory) {
    throw new Error('STRICT MODE: Missing backstory for battle persona');
  }
  if (!identity.personality_traits || identity.personality_traits.length === 0) {
    throw new Error('STRICT MODE: Missing personality_traits for battle persona');
  }
  if (!identity.origin_era) {
    throw new Error('STRICT MODE: Missing origin_era for battle persona');
  }

  const personalityList = identity.personality_traits.map(t => `- ${t}`).join('\n');

  // For judges, simpler persona
  if (role === 'judge') {
    return `## YOUR IDENTITY: ${identity.name}

${identity.backstory}

PERSONALITY:
${personalityList}

You are a celebrity judge on BlankWars. Your rulings are dramatic, fair, and entertaining.`;
  }

  // For combatants, include combat context
  if (isSystem) {
    throw new Error('STRICT MODE: Combatant role requires full CharacterData');
  }
  if (!identity.title) {
    throw new Error('STRICT MODE: Missing title for combatant battle persona');
  }

  const charData = data as CharacterData;
  const psych = charData.PSYCHOLOGICAL;

  // STRICT MODE: Combatants need psychological data
  if (psych.current_ego === undefined || psych.current_ego === null) {
    throw new Error('STRICT MODE: Missing current_ego for battle persona');
  }
  if (psych.gameplan_adherence === undefined || psych.gameplan_adherence === null) {
    throw new Error('STRICT MODE: Missing gameplan_adherence for battle persona');
  }

  const egoContext = psych.current_ego > 70
    ? 'Your ego is HIGH - you may showboat, taunt, or take unnecessary risks.'
    : psych.current_ego > 40
    ? 'Your ego is moderate - you fight with confidence but stay focused.'
    : 'Your ego is low - you fight carefully, perhaps desperately.';

  return `## YOUR IDENTITY: ${identity.name}
${identity.title} from ${identity.origin_era}

${identity.backstory}

PERSONALITY:
${personalityList}

COMBAT MENTALITY:
${egoContext}
- Gameplan Adherence: ${psych.gameplan_adherence}/100 (how likely you follow coach orders)

Your fighting style and declarations should reflect your personality and current mental state.`;
}

/**
 * Builds all prose pieces for the battle domain.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: BattleBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  const { role, battle_state } = options;

  // STRICT MODE: Validate required fields
  if (!battle_state) {
    throw new Error('STRICT MODE: Missing battle_state for battle domain');
  }
  if (!battle_state.battle_id) {
    throw new Error('STRICT MODE: Missing battle_id in battle_state');
  }

  let roleText: string;

  switch (role) {
    case 'combatant':
      if (!options.coach_order) {
        throw new Error('STRICT MODE: Combatant role requires coach_order');
      }
      roleText = buildCombatantRole(data, options);
      break;

    case 'judge':
      if (!options.rebellion) {
        throw new Error('STRICT MODE: Judge role requires rebellion context');
      }
      roleText = buildJudgeRole(data, options);
      break;

    case 'host':
      roleText = buildHostRole(data, options);
      break;

    default:
      throw new Error(`STRICT MODE: Unknown battle role "${role}". Valid roles: combatant, judge, host`);
  }

  return {
    scene: buildScene(data, options),
    role: roleText,
    persona: buildBattlePersona(data, role, options),
  };
}
