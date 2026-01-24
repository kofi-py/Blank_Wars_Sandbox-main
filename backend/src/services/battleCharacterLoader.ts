/**
 * Battle Character Loader Service
 * Loads character data with equipped powers/spells for battle initialization
 */

import { query } from '../database/index';

export interface PowerDefinition {
  id: string;
  name: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  category?: string;
  description: string;
  power_type: 'active' | 'passive' | 'toggle';
  effects: any;
  cooldown: number;
  energy_cost?: number;
  ap_cost: number; // Loaded from action_types based on rank
  max_rank: number;
  current_rank: number; // From character_powers (mastery_level)
  mastery_points?: number;
  unlock_cost: number;
  rank_up_cost: number;
  icon?: string;
}

export interface SpellDefinition {
  id: string;
  name: string;
  tier: 'universal' | 'archetype' | 'species' | 'signature';
  description: string;
  effects: any;
  mana_cost: number;
  cooldown_turns: number;
  ap_cost: number; // Loaded from action_types based on rank
  max_rank: number;
  current_rank: number; // From character_spells (mastery_level)
  mastery_points?: number;
  icon?: string;
  animation?: string;
}

// Row types for database queries
interface PowerQueryRow {
  id: string;
  name: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  category: string | null;
  description: string;
  power_type: 'active' | 'passive' | 'toggle';
  effects: any;
  cooldown: number;
  energy_cost: number | null;
  max_rank: number;
  current_rank: number;
  mastery_points: number;
  unlock_cost: number;
  rank_up_cost: number;
  icon: string | null;
  slot_number?: number;
}

interface SpellQueryRow {
  id: string;
  name: string;
  tier: 'universal' | 'archetype' | 'species' | 'signature';
  description: string;
  effects: any;
  mana_cost: number;
  cooldown_turns: number;
  max_rank: number;
  current_rank: number;
  mastery_points: number;
  icon: string | null;
  animation: string | null;
  slot_number?: number;
}

export interface BattleCharacterData {
  // Base character data
  id: string;
  user_id: string;
  character_id: string;
  name: string;
  title?: string;
  archetype: string;
  level: number;
  experience: number;
  current_health: number;
  current_max_health: number;
  // Resources
  current_mana: number;
  current_max_mana: number;
  current_energy: number;
  current_max_energy: number;
  // Combat stats
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  spirit: number;
  initiative: number;
  base_action_points: number;
  // Resistances
  elemental_resistance: number;
  fire_resistance: number;
  cold_resistance: number;
  lightning_resistance: number;
  toxic_resistance: number;
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  // Psychology stats
  gameplan_adherence: number;
  current_stress: number;
  team_trust: number;
  current_mental_health: number;
  battle_focus: number;
  // Powers & Spells
  unlocked_powers: PowerDefinition[];
  unlocked_spells: SpellDefinition[];
  equipped_powers: PowerDefinition[];
  equipped_spells: SpellDefinition[];
}

/**
 * Load character with equipped powers and spells for battle
 */
export async function loadBattleCharacter(character_id: string): Promise<BattleCharacterData> {
  // 0. Load action types for AP cost lookup
  const action_types_result = await query('SELECT id, ap_cost FROM action_types', []);
  const ap_cost_map = new Map<string, number>();
  action_types_result.rows.forEach((row: { id: string; ap_cost: number }) => {
    ap_cost_map.set(row.id, row.ap_cost);
  });

  // Helper to get AP cost for a rank - fails fast if DB entry missing
  const getAPCost = (type: 'spell' | 'power', rank: number): number => {
    const key = `${type}_rank_${rank}`;
    const cost = ap_cost_map.get(key);
    if (cost === undefined) {
      throw new Error(
        `Missing AP cost for "${key}" in action_types table. ` +
        `Fix: INSERT INTO action_types (id, ap_cost) VALUES ('${key}', ${rank});`
      );
    }
    return cost;
  };

  // 1. Load base character data with combat stats AND attribute allocations
  const char_result = await query(
    `SELECT uc.*, c.name, c.title, c.archetype, c.species,
            c.personality_traits,
            c.attack, c.defense, c.speed, c.magic_attack, c.magic_defense,
            c.dexterity, c.intelligence, c.wisdom, c.spirit,
            c.initiative,
            c.base_action_points,
            COALESCE(uc.attribute_allocations, '{}'::jsonb) AS attribute_allocations
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const character = char_result.rows[0];

  // personality_traits must exist - no fallbacks
  if (character.personality_traits === null) {
    throw new Error(`Character ${character_id} has NULL personality_traits field`);
  }

  const parsed_personality_traits = character.personality_traits;
  const parsed_equipment = JSON.parse(character.equipment); // equipment has DEFAULT '[]' so never NULL

  // Parse attribute allocations (COALESCE'd to '{}' in query - sparse object containing only allocated stats)
  const allocations: Record<string, number> = typeof character.attribute_allocations === 'string'
    ? JSON.parse(character.attribute_allocations)
    : character.attribute_allocations;

  // Helper to get allocated points (sparse object: missing key = 0 allocated, not missing data)
  function getAllocated(stat: string): number {
    return stat in allocations ? allocations[stat] : 0;
  }

  // Apply attribute allocations to combat stats
  // Base stats from characters table (NOT NULL), allocations from user_characters (sparse JSONB)
  const final_attack = character.attack + getAllocated('attack');
  const final_defense = character.defense + getAllocated('defense');
  const final_speed = character.speed + getAllocated('speed');
  const final_magic_attack = character.magic_attack + getAllocated('intelligence');
  const final_magic_defense = character.magic_defense + getAllocated('wisdom');
  const final_dexterity = character.dexterity + getAllocated('dexterity');
  const final_intelligence = character.intelligence + getAllocated('intelligence');
  const final_wisdom = character.wisdom + getAllocated('wisdom');
  const final_spirit = character.spirit + getAllocated('spirit');

  // 2. Load equipped powers with their definitions
  const powers_result = await query(
    `SELECT pd.*, cp.mastery_level as current_rank, cp.mastery_points, cpl.slot_number
     FROM character_power_loadout cpl
     JOIN power_definitions pd ON cpl.power_id = pd.id
     JOIN character_powers cp ON cp.power_id = pd.id AND cp.character_id = cpl.user_character_id
     WHERE cpl.user_character_id = $1
     ORDER BY cpl.slot_number`,
    [character_id]
  );

  const equipped_powers: PowerDefinition[] = powers_result.rows.map((row: PowerQueryRow) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    category: row.category,
    description: row.description,
    power_type: row.power_type,
    effects: row.effects,
    cooldown: row.cooldown,
    energy_cost: row.energy_cost,
    ap_cost: getAPCost('power', row.current_rank),
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    mastery_points: row.mastery_points,
    unlock_cost: row.unlock_cost,
    rank_up_cost: row.rank_up_cost,
    icon: row.icon
  }));

  // 3. Load all unlocked powers (for reference)
  const unlocked_powers_result = await query(
    `SELECT pd.*, cp.mastery_level as current_rank, cp.mastery_points
     FROM character_powers cp
     JOIN power_definitions pd ON cp.power_id = pd.id
     WHERE cp.character_id = $1 AND cp.unlocked = true
     ORDER BY pd.tier, pd.name`,
    [character_id]
  );

  const unlocked_powers: PowerDefinition[] = unlocked_powers_result.rows.map((row: PowerQueryRow) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    category: row.category,
    description: row.description,
    power_type: row.power_type,
    effects: row.effects,
    cooldown: row.cooldown,
    energy_cost: row.energy_cost,
    ap_cost: getAPCost('power', row.current_rank),
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    mastery_points: row.mastery_points,
    unlock_cost: row.unlock_cost,
    rank_up_cost: row.rank_up_cost,
    icon: row.icon
  }));

  // 4. Load equipped spells with their definitions
  const spells_result = await query(
    `SELECT sd.*, cs.mastery_level as current_rank, cs.mastery_points, csl.slot_number
     FROM character_spell_loadout csl
     JOIN spell_definitions sd ON csl.spell_id = sd.id
     JOIN character_spells cs ON cs.spell_id = sd.id AND cs.character_id = csl.user_character_id
     WHERE csl.user_character_id = $1
     ORDER BY csl.slot_number`,
    [character_id]
  );

  const equipped_spells: SpellDefinition[] = spells_result.rows.map((row: SpellQueryRow) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    description: row.description,
    effects: row.effects,
    mana_cost: row.mana_cost,
    cooldown_turns: row.cooldown_turns,
    ap_cost: getAPCost('spell', row.current_rank),
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    mastery_points: row.mastery_points,
    icon: row.icon,
    animation: row.animation
  }));

  // 5. Load all unlocked spells (for reference)
  const unlocked_spells_result = await query(
    `SELECT sd.*, cs.mastery_level as current_rank, cs.mastery_points
     FROM character_spells cs
     JOIN spell_definitions sd ON cs.spell_id = sd.id
     WHERE cs.character_id = $1 AND cs.unlocked = true
     ORDER BY sd.tier, sd.name`,
    [character_id]
  );

  const unlocked_spells: SpellDefinition[] = unlocked_spells_result.rows.map((row: SpellQueryRow) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    description: row.description,
    effects: row.effects,
    mana_cost: row.mana_cost,
    cooldown_turns: row.cooldown_turns,
    ap_cost: getAPCost('spell', row.current_rank),
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    mastery_points: row.mastery_points,
    icon: row.icon,
    animation: row.animation
  }));

  // 6. Construct battle character data
  const battleCharacter: BattleCharacterData = {
    id: character.id,
    user_id: character.user_id,
    character_id: character.character_id,
    name: character.name,
    title: character.title,
    archetype: character.archetype,
    level: character.level,
    experience: character.experience,
    current_health: character.current_health,
    current_max_health: character.current_max_health,
    // Resources
    current_mana: character.current_mana,
    current_max_mana: character.current_max_mana,
    current_energy: character.current_energy,
    current_max_energy: character.current_max_energy,
    // Combat stats (base + attribute allocations)
    attack: final_attack,
    defense: final_defense,
    speed: final_speed,
    magic_attack: final_magic_attack,
    magic_defense: final_magic_defense,
    dexterity: final_dexterity,
    intelligence: final_intelligence,
    wisdom: final_wisdom,
    spirit: final_spirit,
    initiative: character.initiative,
    base_action_points: character.base_action_points,
    // Resistances (from user_characters current_* fields)
    elemental_resistance: character.current_elemental_resistance,
    fire_resistance: character.current_fire_resistance,
    cold_resistance: character.current_cold_resistance,
    lightning_resistance: character.current_lightning_resistance,
    toxic_resistance: character.current_toxic_resistance,
    personality_traits: parsed_personality_traits,
    equipment: parsed_equipment,
    is_injured: character.is_injured,
    recovery_time: character.recovery_time,
    total_battles: character.total_battles,
    total_wins: character.total_wins,
    // Psychology stats
    gameplan_adherence: character.gameplan_adherence,
    current_stress: character.current_stress,
    team_trust: character.team_trust,
    current_mental_health: character.current_mental_health,
    battle_focus: character.battle_focus,
    // Powers & Spells
    unlocked_powers,
    unlocked_spells,
    equipped_powers,
    equipped_spells
  };

  // NO FALLBACKS - Migration 122_unlock_universal_abilities.sql is the ONLY source
  // If powers/spells are missing, that's a data integrity issue that should be caught and fixed at the source

  return battleCharacter;
}

/**
 * Calculate AP cost for a power based on its rank
 * Uses pre-loaded ap_cost from action_types table
 */
export function calculatePowerAPCost(power: PowerDefinition): number {
  return power.ap_cost;
}

/**
 * Calculate AP cost for a spell based on its rank
 * Uses pre-loaded ap_cost from action_types table
 */
export function calculateSpellAPCost(spell: SpellDefinition): number {
  return spell.ap_cost;
}

/**
 * Get weapon range from power/spell effects
 */
export function getPowerRange(power: PowerDefinition): number {
  // Check if effects has a range property
  if (power.effects && Array.isArray(power.effects)) {
    for (const effect of power.effects) {
      if (effect.range !== undefined) {
        return effect.range;
      }
    }
  }
  // Default to melee range (1 hex)
  return 1;
}

/**
 * Get spell range from effects
 */
export function getSpellRange(spell: SpellDefinition): number {
  // Check if effects has a range property
  if (spell.effects && Array.isArray(spell.effects)) {
    for (const effect of spell.effects) {
      if (effect.range !== undefined) {
        return effect.range;
      }
    }
  }
  // Default to medium range (3 hexes)
  return 3;
}

/**
 * Initialize cooldown map for powers
 */
export function initializePowerCooldowns(powers: PowerDefinition[]): Map<string, number> {
  const cooldowns = new Map<string, number>();
  powers.forEach(power => {
    cooldowns.set(power.id, 0); // Start with no cooldowns
  });
  return cooldowns;
}

/**
 * Initialize cooldown map for spells
 */
export function initializeSpellCooldowns(spells: SpellDefinition[]): Map<string, number> {
  const cooldowns = new Map<string, number>();
  spells.forEach(spell => {
    cooldowns.set(spell.id, 0); // Start with no cooldowns
  });
  return cooldowns;
}
