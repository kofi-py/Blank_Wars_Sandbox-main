/**
 * Adherence Calculation Service
 *
 * Architecture (per BATTLE_SYSTEM_BLUEPRINT.md):
 * - Layer 1 & 2: DB generated column `gameplan_adherence` handles all stat-based modifiers
 *   (training, mental_health, team_player, coach_trust, morale, ego, stress, fatigue, stored HP%)
 * - Layer 3: This service applies EPHEMERAL battle-state modifiers only
 *   (mid-battle HP%, team winning/losing, teammates alive)
 *
 * The DB value is the single source of truth for base adherence.
 * This service only applies modifiers that exist during battle and aren't stored.
 */

export interface BattleState {
  current_hp: number;
  max_hp: number;
  team_winning: boolean;
  teammates_total: number;
  teammates_alive: number;
}

/**
 * Apply battle-state modifiers to the base adherence from DB.
 * These are ephemeral - only exist during battle, not stored.
 *
 * @param base_adherence - The gameplan_adherence value from user_characters (DB generated column)
 * @param battle_state - Current battle conditions
 * @returns Modified adherence score (0-100)
 */
export function applyBattleStateModifiers(base_adherence: number, battle_state: BattleState): number {
  let modified = base_adherence;

  // HP-based modifiers (mid-battle HP, not stored current_health)
  const hp_percent = battle_state.current_hp / battle_state.max_hp;
  if (hp_percent <= 0.1) {
    modified -= 50; // Near death desperation
  } else if (hp_percent <= 0.25) {
    modified -= 30; // Critical injuries
  } else if (hp_percent <= 0.5) {
    modified -= 15; // Wounded/pain
  }

  // Team losing penalty
  if (!battle_state.team_winning) {
    modified -= 10;
  }

  // Teammates down penalty (up to -20 if all teammates KO'd)
  // Guard against division by zero if teammates_total is 0
  const teammate_loss_ratio = battle_state.teammates_total > 0
    ? (battle_state.teammates_total - battle_state.teammates_alive) / battle_state.teammates_total
    : 0;
  modified -= Math.floor(teammate_loss_ratio * 20);

  return Math.max(0, Math.min(100, Math.round(modified)));
}

/**
 * Perform an adherence check for a character during battle.
 *
 * @param base_adherence - The gameplan_adherence from DB
 * @param battle_state - Current battle conditions
 * @returns Object with roll result, threshold, and whether character follows orders
 */
export function performAdherenceCheck(base_adherence: number, battle_state: BattleState): {
  roll: number;
  threshold: number;
  passed: boolean;
} {
  const threshold = applyBattleStateModifiers(base_adherence, battle_state);
  const roll = Math.floor(Math.random() * 100) + 1; // d100: 1-100

  return {
    roll,
    threshold,
    passed: roll <= threshold
  };
}

export function performSimpleAdherenceRoll(
  adherence_score: number,
  preference_score: number = 50 // Default neutral
): {
  roll: number;
  adherence_score: number;
  passed: boolean;
  modifier: number;
} {
  // Calculate modifier: (Score - 50) / 2
  // Example: 70 -> +10, 30 -> -10
  const modifier = Math.floor((preference_score - 50) / 2);
  const effective_adherence = Math.max(0, Math.min(100, adherence_score + modifier));
  const roll = Math.floor(Math.random() * 100) + 1;
  const passed = roll <= effective_adherence;

  console.log(`🎲 [ADHERENCE-ROLL] Roll: ${roll}, Base: ${adherence_score}, Pref: ${preference_score} (Mod: ${modifier}), Effective: ${effective_adherence}, Passed: ${passed}`);

  return {
    roll,
    adherence_score: effective_adherence,
    passed,
    modifier
  };
}
