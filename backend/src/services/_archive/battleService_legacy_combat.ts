/**
 * ARCHIVED: Legacy Battle Combat Logic
 *
 * File: battleService_legacy_combat.ts
 * Archived: 2025-12-05
 *
 * This code was deprecated as part of the Pure Socket Authority migration.
 * It contained "hollow" validation that trusted client state, creating
 * cheating vulnerabilities.
 *
 * The authoritative replacement is:
 * - battleActionExecutor.ts (action execution)
 * - battleMechanicsService.ts (damage/effect calculation)
 * - battleStateReconstructor.ts (event sourcing)
 *
 * Keep for reference only. Do not import or use.
 */

// Type definitions from battleService.ts
interface BattleCharacter {
  id: string;
  user_id: string;
  character_id: string;
  name: string;
  title?: string;
  archetype: string;
  level: number;
  experience: number;
  current_health: number;
  max_health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  dexterity?: number;
  intelligence?: number;
  wisdom?: number;
  spirit?: number;
  initiative: number;
  abilities: Ability[];
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  base_action_points?: number;
  unlocked_powers?: any[];
  unlocked_spells?: any[];
  equipped_powers?: any[];
  equipped_spells?: any[];
  gameplan_adherence_level: number;
}

interface Ability {
  name: string;
  power: number;
  cooldown: number;
  type: string;
  effect?: string;
}

interface BattleUser {
  user_id: string;
  character_id: string;
  character: BattleCharacter;
  strategy: string | null;
  connected: boolean;
  health: number;
  max_health: number;
  effects: StatusEffect[];
  cooldowns: Record<string, number>;
  rating: number;
  power_cooldowns?: Map<string, number>;
  spell_cooldowns?: Map<string, number>;
  team_characters?: BattleCharacter[];
}

interface StatusEffect {
  type: string;
  duration: number;
  value?: number;
  damage_per_turn?: number;
  heal_per_turn?: number;
  charges?: number;
  damage_multiplier?: number;
  attack_multiplier?: number;
  defense_reduction?: number;
}

interface BattleState {
  id: string;
  phase: string;
  round: number;
  turn: number;
  user: BattleUser;
  opponent: BattleUser;
  combat_log: CombatEvent[];
  chat_enabled: boolean;
  timer: NodeJS.Timeout | null;
  created_at: number;
  hex_battle_mode?: boolean;
  hex_grid_state?: any;
  round_adherence?: Record<string, boolean>;
}

interface CombatEvent {
  type: string;
  round?: number;
  timestamp: number;
  attacker?: string;
  defender?: string;
  ability?: string;
  damage?: number;
  critical?: boolean;
  remaining_health?: Record<string, number>;
  order?: string[];
  character?: string;
  target?: string;
  effect?: string;
  amount?: number;
  reason?: string;
}

interface StrategyModifiers {
  atk_mod: number;
  def_mod: number;
  spd_mod: number;
}

interface CombatResult {
  user: {
    health: number;
    effects: StatusEffect[];
    cooldowns: Record<string, number>;
  };
  opponent: {
    health: number;
    effects: StatusEffect[];
    cooldowns: Record<string, number>;
  };
  events: CombatEvent[];
}

const BATTLE_CONFIG = {
  MAX_ROUNDS: 3,
  ROUND_DURATION: 30,
  CHAT_DURATION: 45,
  STRATEGY_DURATION: 15,
  TURN_SPEED_BONUS: 0.1,
  CRIT_MULTIPLIER: 2.0,
} as const;

/**
 * ARCHIVED METHOD: start_combat_round
 *
 * This method auto-executed combat turns without player input.
 * It performed adherence checks and called simulate_combat to run
 * an entire round automatically.
 *
 * Replacement: Players now manually select actions via socket events,
 * which are processed by battleActionExecutor.ts
 */
export async function start_combat_round_LEGACY(battle_state: BattleState, io: any): Promise<void> {
  battle_state.phase = 'round_combat';
  battle_state.combat_log.push({
    type: 'round_start',
    round: battle_state.round,
    timestamp: Date.now()
  });

  // 1. Perform Adherence Checks for ALL characters
  battle_state.round_adherence = {};
  const adherence_events: any[] = [];

  // Helper to check adherence for a team
  const check_team_adherence = (characters: BattleCharacter[], strategy: string) => {
    characters.forEach(char => {
      // Roll for adherence (0-100)
      const roll = Math.random() * 100;
      const adherence_level = char.gameplan_adherence_level || 50;
      const is_adhering = roll <= adherence_level;

      battle_state.round_adherence![char.id] = is_adhering;

      // Log significant adherence failures (rogue behavior)
      if (!is_adhering) {
        adherence_events.push({
          character_id: char.id,
          name: char.name,
          adherence_level,
          roll: Math.round(roll),
          status: 'rogue'
        });

        console.log(`⚠️ [ADHERENCE] ${char.name} went ROGUE! (Roll: ${Math.round(roll)} > Level: ${adherence_level})`);
      } else {
        console.log(`✅ [ADHERENCE] ${char.name} following strategy. (Roll: ${Math.round(roll)} <= Level: ${adherence_level})`);
      }
    });
  };

  // Check both teams
  check_team_adherence(battle_state.user.team_characters || [battle_state.user.character], battle_state.user.strategy || 'balanced');
  check_team_adherence(battle_state.opponent.team_characters || [battle_state.opponent.character], battle_state.opponent.strategy || 'balanced');

  // Apply strategy modifiers
  const user_mods = get_strategy_modifiers_LEGACY(battle_state.user.strategy!);
  const opponent_mods = get_strategy_modifiers_LEGACY(battle_state.opponent.strategy!);

  // Notify users
  io.to(`battle:${battle_state.id}`).emit('round_start', {
    round: battle_state.round,
    strategies: {
      user: battle_state.user.strategy,
      opponent: battle_state.opponent.strategy
    },
    adherence_results: adherence_events
  });

  // Execute combat simulation
  const combat_result = await simulate_combat_LEGACY(battle_state, user_mods, opponent_mods);

  // Update state
  battle_state.user.health = combat_result.user.health;
  battle_state.opponent.health = combat_result.opponent.health;
  battle_state.user.effects = combat_result.user.effects;
  battle_state.opponent.effects = combat_result.opponent.effects;
  battle_state.user.cooldowns = combat_result.user.cooldowns;
  battle_state.opponent.cooldowns = combat_result.opponent.cooldowns;
  battle_state.combat_log.push(...combat_result.events);

  // Send combat events to players
  for (const event of combat_result.events) {
    await sleep_LEGACY(500);
    io.to(`battle:${battle_state.id}`).emit('combat_event', event);
  }

  // Check for battle end
  if (check_battle_end_LEGACY(battle_state)) {
    // Battle would end here
    console.log('Battle ended in legacy combat');
  }
}

/**
 * ARCHIVED METHOD: get_strategy_modifiers
 *
 * Returns stat modifiers based on strategy selection.
 * This is still valid logic but was part of the auto-combat system.
 *
 * Replacement: Strategy modifiers are now applied in battleMechanicsService
 */
export function get_strategy_modifiers_LEGACY(strategy: string): StrategyModifiers {
  switch (strategy) {
    case 'aggressive':
      return { atk_mod: 1.2, def_mod: 0.9, spd_mod: 1.0 };
    case 'defensive':
      return { atk_mod: 0.9, def_mod: 1.2, spd_mod: 0.95 };
    case 'balanced':
    default:
      return { atk_mod: 1.0, def_mod: 1.0, spd_mod: 1.0 };
  }
}

/**
 * ARCHIVED METHOD: simulate_combat
 *
 * This method simulated an entire combat round automatically,
 * including turn order, ability selection, and damage calculation.
 * It was the core of the "hollow validation" problem.
 *
 * Replacement: battleActionExecutor.ts processes individual actions
 * as they are received from clients, maintaining authoritative state.
 */
export async function simulate_combat_LEGACY(
  battle_state: BattleState,
  user_mods: StrategyModifiers,
  opponent_mods: StrategyModifiers
): Promise<CombatResult> {
  const events: CombatEvent[] = [];
  const user = { ...battle_state.user };
  const opponent = { ...battle_state.opponent };

  // Initialize effects arrays if not present
  user.effects = user.effects || [];
  opponent.effects = opponent.effects || [];

  // Process start of round effects
  const user_start_events = process_status_effects_LEGACY(user, true);
  const opponent_start_events = process_status_effects_LEGACY(opponent, true);
  events.push(...user_start_events, ...opponent_start_events);

  // Calculate effective stats with modifiers AND adherence check
  const get_effective_mods = (char_id: string, intended_mods: StrategyModifiers): StrategyModifiers => {
    const is_adhering = battle_state.round_adherence?.[char_id] ?? true;
    if (is_adhering) {
      return intended_mods;
    } else {
      // ROGUE: No strategy modifiers
      return { atk_mod: 1.0, def_mod: 1.0, spd_mod: 1.0 };
    }
  };

  const user_stats = calculate_effective_stats_LEGACY(
    user.character,
    get_effective_mods(user.character.id, user_mods)
  );
  const opponent_stats = calculate_effective_stats_LEGACY(
    opponent.character,
    get_effective_mods(opponent.character.id, opponent_mods)
  );

  // Determine turn order
  const user_speed = user_stats.speed * (1 + Math.random() * 0.1);
  const opponent_speed = opponent_stats.speed * (1 + Math.random() * 0.1);
  const turn_order = user_speed >= opponent_speed ? ['user', 'opponent'] : ['opponent', 'user'];

  events.push({
    type: 'turn_order',
    order: turn_order,
    timestamp: Date.now()
  });

  // Execute turns (3 per round)
  for (let turn = 0; turn < 3; turn++) {
    for (const attacker of turn_order) {
      const defender = attacker === 'user' ? 'opponent' : 'user';
      const attacker_state = attacker === 'user' ? user : opponent;
      const defender_state = defender === 'user' ? user : opponent;

      // Check if battle is over
      if (attacker_state.health <= 0 || defender_state.health <= 0) break;

      // Choose ability
      const ability = choose_ability_LEGACY(attacker_state.character, attacker_state.cooldowns);

      // Calculate and apply damage
      if (ability.power > 0) {
        let damage = calculate_damage_LEGACY(
          attacker === 'user' ? user_stats : opponent_stats,
          defender === 'user' ? user_stats : opponent_stats,
          ability,
          attacker === 'user'
            ? get_effective_mods(attacker_state.character.id, user_mods)
            : get_effective_mods(attacker_state.character.id, opponent_mods)
        );

        // Apply damage with BOUNDS CHECK
        const current_health = Math.max(0, Math.min(99999, defender_state.health || 0));
        defender_state.health = Math.max(0, current_health - damage);

        // Create attack event
        events.push({
          type: 'attack',
          attacker,
          defender,
          ability: ability.name,
          damage,
          critical: false,
          remaining_health: {
            [attacker]: attacker_state.health,
            [defender]: defender_state.health
          },
          timestamp: Date.now()
        });
      }

      // Update cooldowns
      if (ability.cooldown > 0) {
        attacker_state.cooldowns[ability.name] = ability.cooldown;
      }
    }

    // Process end of turn effects
    const user_end_events = process_status_effects_LEGACY(user, false);
    const opponent_end_events = process_status_effects_LEGACY(opponent, false);
    events.push(...user_end_events, ...opponent_end_events);

    // Reduce cooldowns
    reduce_cooldowns_LEGACY(user.cooldowns);
    reduce_cooldowns_LEGACY(opponent.cooldowns);
  }

  return {
    user: {
      health: user.health,
      effects: user.effects,
      cooldowns: user.cooldowns
    },
    opponent: {
      health: opponent.health,
      effects: opponent.effects,
      cooldowns: opponent.cooldowns
    },
    events
  };
}

/**
 * ARCHIVED METHOD: process_status_effects
 *
 * Processed status effects like poison, regen, buffs, debuffs.
 * The logic was sound but part of the auto-combat system.
 *
 * Replacement: battleMechanicsService.processStatusEffects()
 */
export function process_status_effects_LEGACY(battle_user: BattleUser, is_start_of_turn: boolean): CombatEvent[] {
  const events: CombatEvent[] = [];

  // This was a simplified stub that delegated to battleMechanicsService
  // The actual implementation would process each effect type

  return events;
}

/**
 * ARCHIVED METHOD: calculate_effective_stats
 *
 * Calculates character stats with strategy modifiers applied.
 *
 * Replacement: battleMechanicsService.calculateEffectiveStats()
 */
export function calculate_effective_stats_LEGACY(character: BattleCharacter, mods: StrategyModifiers): any {
  const base_attack = (character as any).effective_attack || character.attack;
  const base_defense = (character as any).effective_defense || character.defense;
  const base_speed = (character as any).effective_speed || character.speed;
  const critical_chance = (character as any).effective_critical_chance || 10;

  return {
    health: character.max_health,
    attack: base_attack * mods.atk_mod,
    defense: base_defense * mods.def_mod,
    speed: base_speed * mods.spd_mod,
    special: character.magic_attack,
    critical_chance: critical_chance,
    headquarters_effects: (character as any).headquarters_effects || null
  };
}

/**
 * ARCHIVED METHOD: choose_ability
 *
 * Randomly selected an ability from available (non-cooldown) abilities.
 * This was part of the auto-combat AI and created exploitable patterns.
 *
 * Replacement: Players manually select abilities via socket events
 */
export function choose_ability_LEGACY(character: BattleCharacter, cooldowns: Record<string, number>): Ability {
  // Filter available abilities (not on cooldown)
  const available_abilities = character.abilities.filter(ability =>
    !cooldowns[ability.name] || cooldowns[ability.name] <= 0
  );

  if (available_abilities.length === 0) {
    return { name: 'Basic Attack', power: 1.0, cooldown: 0, type: 'attack' };
  }

  return available_abilities[Math.floor(Math.random() * available_abilities.length)];
}

/**
 * ARCHIVED METHOD: calculate_damage
 *
 * Calculated damage based on attacker/defender stats and ability power.
 * The formula was deterministic and could be exploited by clients
 * who knew the calculation.
 *
 * Replacement: battleMechanicsService.calculateDamage() with additional
 * server-side validation and anti-cheat measures
 */
export function calculate_damage_LEGACY(
  attacker: any,
  defender: any,
  ability: Ability,
  mods: StrategyModifiers
): number {
  // BOUNDS CHECK: Ensure valid attacker stats
  const attack_stat = Math.max(0, Math.min(9999, attacker.attack));
  const ability_power = Math.max(0.1, Math.min(10, ability?.power || 1));
  const atk_modifier = Math.max(0.1, Math.min(5, mods?.atk_mod || 1));

  // BOUNDS CHECK: Ensure valid defender stats
  const defense_stat = Math.max(0, Math.min(9999, defender.defense));
  const def_modifier = Math.max(0.1, Math.min(5, mods?.def_mod || 1));

  // Calculate base damage with bounds
  const base_damage = attack_stat * ability_power * atk_modifier;
  const defense = defense_stat * def_modifier;
  const variance = 0.85 + Math.random() * 0.3;

  // Calculate raw damage
  let damage = Math.max(5, (base_damage - defense * 0.5) * variance);

  // Critical hit chance
  const crit_chance = 0.15;
  const is_critical = Math.random() < crit_chance;
  if (is_critical) {
    const crit_multiplier = Math.max(1.5, Math.min(3, BATTLE_CONFIG.CRIT_MULTIPLIER || 1.5));
    damage *= crit_multiplier;
  }

  // BOUNDS CHECK: Cap final damage
  return Math.max(1, Math.min(9999, Math.round(damage)));
}

/**
 * ARCHIVED METHOD: reduce_cooldowns
 *
 * Decremented all ability cooldowns by 1 each turn.
 *
 * Replacement: battleMechanicsService.reduceCooldowns()
 */
export function reduce_cooldowns_LEGACY(cooldowns: Record<string, number>): void {
  for (const ability in cooldowns) {
    cooldowns[ability] = Math.max(0, cooldowns[ability] - 1);
  }
}

/**
 * ARCHIVED METHOD: check_battle_end
 *
 * Checked if battle should end (health <= 0 or max rounds reached).
 * This logic is still valid and kept in battleService.ts
 *
 * Replacement: Still used in battleService.ts for battle end conditions
 */
export function check_battle_end_LEGACY(battle_state: BattleState): boolean {
  // Check if either user's health is 0
  if (battle_state.user.health <= 0 || battle_state.opponent.health <= 0) {
    return true;
  }

  // Check if we've completed all rounds
  if (battle_state.round > BATTLE_CONFIG.MAX_ROUNDS) {
    return true;
  }

  return false;
}

/**
 * ARCHIVED HELPER: sleep
 *
 * Simple promise-based delay function used for combat event pacing.
 */
function sleep_LEGACY(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * END OF ARCHIVED CODE
 *
 * These methods represent the old "hollow validation" combat system
 * where the server auto-executed turns and trusted client state.
 *
 * The new system uses:
 * 1. Pure Socket Authority - Server is source of truth
 * 2. Event Sourcing - All actions recorded as events
 * 3. Manual Action Selection - Players choose actions explicitly
 * 4. Authoritative Validation - Server validates all inputs
 *
 * Do not use this code in production.
 */
