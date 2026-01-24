/**
 * Battle domain - Scene context builder
 * SCENE = Where you are, what's happening, battle state
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type {
  CharacterData,
  SystemCharacterData,
  BattleBuildOptions,
  BattleTeammate,
  BattleEnemy,
} from '../../types';

/**
 * Format teammate status for display
 * STRICT MODE: Validates required fields
 */
function formatTeammate(tm: BattleTeammate): string {
  if (!tm.name) {
    throw new Error('STRICT MODE: Teammate missing name');
  }
  if (!tm.archetype) {
    throw new Error(`STRICT MODE: Teammate "${tm.name}" missing archetype`);
  }
  if (tm.current_health === undefined || tm.current_health === null) {
    throw new Error(`STRICT MODE: Teammate "${tm.name}" missing current_health`);
  }
  if (tm.max_health === undefined || tm.max_health === null || tm.max_health <= 0) {
    throw new Error(`STRICT MODE: Teammate "${tm.name}" missing or invalid max_health (must be > 0)`);
  }
  if (tm.is_dead === undefined || tm.is_dead === null) {
    throw new Error(`STRICT MODE: Teammate "${tm.name}" missing is_dead flag`);
  }

  const hpPercent = Math.round((tm.current_health / tm.max_health) * 100);
  const status = tm.is_dead ? '💀 DEAD' : `${hpPercent}% HP`;
  return `- ${tm.name} (${tm.archetype}): ${status}`;
}

/**
 * Format enemy status for display
 * STRICT MODE: Validates required fields
 */
function formatEnemy(enemy: BattleEnemy): string {
  if (!enemy.name) {
    throw new Error('STRICT MODE: Enemy missing name');
  }
  if (!enemy.archetype) {
    throw new Error(`STRICT MODE: Enemy "${enemy.name}" missing archetype`);
  }
  if (enemy.current_health === undefined || enemy.current_health === null) {
    throw new Error(`STRICT MODE: Enemy "${enemy.name}" missing current_health`);
  }
  if (enemy.max_health === undefined || enemy.max_health === null || enemy.max_health <= 0) {
    throw new Error(`STRICT MODE: Enemy "${enemy.name}" missing or invalid max_health (must be > 0)`);
  }
  if (enemy.is_dead === undefined || enemy.is_dead === null) {
    throw new Error(`STRICT MODE: Enemy "${enemy.name}" missing is_dead flag`);
  }

  const hpPercent = Math.round((enemy.current_health / enemy.max_health) * 100);
  const status = enemy.is_dead ? '💀 DEAD' : `${hpPercent}% HP`;
  return `- ${enemy.name} (${enemy.archetype}): ${status}`;
}

/**
 * Get battle momentum description
 */
function getMomentumProse(team_winning: boolean, teammates: BattleTeammate[], enemies: BattleEnemy[]): string {
  const aliveTeammates = teammates.filter(t => !t.is_dead).length;
  const aliveEnemies = enemies.filter(e => !e.is_dead).length;

  if (aliveTeammates === 0) {
    return 'YOUR TEAM IS ELIMINATED. The battle is lost.';
  }
  if (aliveEnemies === 0) {
    return 'ENEMY TEAM ELIMINATED. Victory is yours!';
  }

  if (team_winning) {
    if (aliveTeammates > aliveEnemies) {
      return 'Your team has the ADVANTAGE - more fighters standing. Press the attack!';
    }
    return 'Your team is WINNING - keep up the pressure!';
  } else {
    if (aliveEnemies > aliveTeammates) {
      return 'Your team is OUTNUMBERED - fight smart or fall.';
    }
    return 'Your team is LOSING - you need to turn this around.';
  }
}

export default function buildScene(
  data: CharacterData | SystemCharacterData,
  options: BattleBuildOptions
): string {
  const { battle_state, role } = options;

  // STRICT MODE validation
  if (battle_state.current_round === undefined || battle_state.current_round === null) {
    throw new Error('STRICT MODE: Missing current_round in battle_state');
  }
  if (battle_state.current_turn === undefined || battle_state.current_turn === null) {
    throw new Error('STRICT MODE: Missing current_turn in battle_state');
  }
  if (!battle_state.teammates) {
    throw new Error('STRICT MODE: Missing teammates in battle_state');
  }
  if (!battle_state.enemies) {
    throw new Error('STRICT MODE: Missing enemies in battle_state');
  }

  const teammatesList = battle_state.teammates.map(formatTeammate).join('\n');
  const enemiesList = battle_state.enemies.map(formatEnemy).join('\n');
  const momentumProse = getMomentumProse(battle_state.team_winning, battle_state.teammates, battle_state.enemies);

  // For judge role, simpler scene
  if (role === 'judge') {
    return `# REBELLION RULING

You are judging a rebellion that occurred in battle ${battle_state.battle_id}.

Round: ${battle_state.current_round}

Your job is to evaluate whether the contestant's defiance of their coach was justified.`;
  }

  // For combatant/host roles, full battle context
  // STRICT MODE: Validate character stats (only needed for combatant/host, not judge)
  if (battle_state.character_health === undefined || battle_state.character_health === null) {
    throw new Error('STRICT MODE: Missing character_health in battle_state');
  }
  if (battle_state.character_max_health === undefined || battle_state.character_max_health === null || battle_state.character_max_health <= 0) {
    throw new Error('STRICT MODE: Missing or invalid character_max_health in battle_state (must be > 0)');
  }
  if (battle_state.character_energy === undefined || battle_state.character_energy === null) {
    throw new Error('STRICT MODE: Missing character_energy in battle_state');
  }
  if (battle_state.character_max_energy === undefined || battle_state.character_max_energy === null || battle_state.character_max_energy <= 0) {
    throw new Error('STRICT MODE: Missing or invalid character_max_energy in battle_state (must be > 0)');
  }
  if (battle_state.character_mana === undefined || battle_state.character_mana === null) {
    throw new Error('STRICT MODE: Missing character_mana in battle_state');
  }
  if (battle_state.character_max_mana === undefined || battle_state.character_max_mana === null || battle_state.character_max_mana <= 0) {
    throw new Error('STRICT MODE: Missing or invalid character_max_mana in battle_state (must be > 0)');
  }

  const hpPercent = Math.round((battle_state.character_health / battle_state.character_max_health) * 100);
  const energyPercent = Math.round((battle_state.character_energy / battle_state.character_max_energy) * 100);
  const manaPercent = Math.round((battle_state.character_mana / battle_state.character_max_mana) * 100);

  const recentActionContext = battle_state.recent_action
    ? `\nLAST ACTION: ${battle_state.recent_action}`
    : '';

  return `# CURRENT SCENE: 3v3 TEAM BATTLE

You are fighting in the BlankWars arena - a sanctioned 3v3 team battle under league rules.

## BATTLE STATUS
Round: ${battle_state.current_round}
Turn: ${battle_state.current_turn}
${recentActionContext}

## YOUR CONDITION
- Health: ${battle_state.character_health}/${battle_state.character_max_health} (${hpPercent}%)
- Energy: ${battle_state.character_energy}/${battle_state.character_max_energy} (${energyPercent}%)
- Mana: ${battle_state.character_mana}/${battle_state.character_max_mana} (${manaPercent}%)

## YOUR TEAM
${teammatesList}

## ENEMY TEAM
${enemiesList}

## BATTLE MOMENTUM
${momentumProse}

## ARENA RULES
- Coach gives orders each turn - you may follow or rebel
- Judges rule on rebellions and can penalize unjustified defiance
- Dead teammates stay dead until battle ends
- Host provides commentary for the audience`;
}
