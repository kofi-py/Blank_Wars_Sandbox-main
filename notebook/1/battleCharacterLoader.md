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
  max_rank: number;
  current_rank: number; // From character_powers
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
  max_rank: number;
  current_rank: number; // From character_spells
  icon?: string;
  animation?: string;
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
  max_health: number;
  // Resources
  current_mana: number;
  max_mana: number;
  current_energy: number;
  max_energy: number;
  // Combat stats
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  abilities: any[];
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  // Psychology stats
  gameplan_adherence_level: number;
  stress_level: number;
  team_trust: number;
  current_mental_health: number;
  battle_focus: number;
  // Powers & Spells
  unlockedPowers: PowerDefinition[];
  unlockedSpells: SpellDefinition[];
  equippedPowers: PowerDefinition[];
  equippedSpells: SpellDefinition[];
}

/**
 * Load character with equipped powers and spells for battle
 */
export async function loadBattleCharacter(characterId: string): Promise<BattleCharacterData> {
  // 1. Load base character data with combat stats
  const charResult = await query(
    `SELECT uc.*, c.name, c.title, c.archetype, c.species,
            c.personality_traits, c.abilities,
            c.attack, c.defense, c.speed, c.magic_attack, c.magic_defense
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [characterId]
  );

  if (charResult.rows.length === 0) {
    throw new Error(`Character ${characterId} not found`);
  }

  const character = charResult.rows[0];

  // Parse JSON fields (stored as TEXT in database)
  // Abilities and personality_traits can be NULL - throw error if missing
  if (character.abilities === null) {
    throw new Error(`Character ${characterId} has NULL abilities field`);
  }
  if (character.personality_traits === null) {
    throw new Error(`Character ${characterId} has NULL personality_traits field`);
  }

  const parsedAbilities = JSON.parse(character.abilities);
  const parsedPersonalityTraits = JSON.parse(character.personality_traits);
  const parsedEquipment = JSON.parse(character.equipment); // equipment has DEFAULT '[]' so never NULL

  // 2. Load equipped powers with their definitions
  const powersResult = await query(
    `SELECT pd.*, cp.current_rank, cpl.slot_number
     FROM character_power_loadout cpl
     JOIN power_definitions pd ON cpl.power_id = pd.id
     JOIN character_powers cp ON cp.power_id = pd.id AND cp.character_id = cpl.user_character_id
     WHERE cpl.user_character_id = $1
     ORDER BY cpl.slot_number`,
    [characterId]
  );

  const equippedPowers: PowerDefinition[] = powersResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    category: row.category,
    description: row.description,
    power_type: row.power_type,
    effects: row.effects,
    cooldown: row.cooldown,
    energy_cost: row.energy_cost,
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    unlock_cost: row.unlock_cost,
    rank_up_cost: row.rank_up_cost,
    icon: row.icon
  }));

  // 3. Load all unlocked powers (for reference)
  const unlockedPowersResult = await query(
    `SELECT pd.*, cp.current_rank
     FROM character_powers cp
     JOIN power_definitions pd ON cp.power_id = pd.id
     WHERE cp.character_id = $1 AND cp.unlocked = true
     ORDER BY pd.tier, pd.name`,
    [characterId]
  );

  const unlockedPowers: PowerDefinition[] = unlockedPowersResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    category: row.category,
    description: row.description,
    power_type: row.power_type,
    effects: row.effects,
    cooldown: row.cooldown,
    energy_cost: row.energy_cost,
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    unlock_cost: row.unlock_cost,
    rank_up_cost: row.rank_up_cost,
    icon: row.icon
  }));

  // 4. Load equipped spells with their definitions
  const spellsResult = await query(
    `SELECT sd.*, cs.current_rank, csl.slot_number
     FROM character_spell_loadout csl
     JOIN spell_definitions sd ON csl.spell_id = sd.id
     JOIN character_spells cs ON cs.spell_id = sd.id AND cs.character_id = csl.user_character_id
     WHERE csl.user_character_id = $1
     ORDER BY csl.slot_number`,
    [characterId]
  );

  const equippedSpells: SpellDefinition[] = spellsResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    description: row.description,
    effects: row.effects,
    mana_cost: row.mana_cost,
    cooldown_turns: row.cooldown_turns,
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    icon: row.icon,
    animation: row.animation
  }));

  // 5. Load all unlocked spells (for reference)
  const unlockedSpellsResult = await query(
    `SELECT sd.*, cs.current_rank
     FROM character_spells cs
     JOIN spell_definitions sd ON cs.spell_id = sd.id
     WHERE cs.character_id = $1 AND cs.unlocked = true
     ORDER BY sd.tier, sd.name`,
    [characterId]
  );

  const unlockedSpells: SpellDefinition[] = unlockedSpellsResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    description: row.description,
    effects: row.effects,
    mana_cost: row.mana_cost,
    cooldown_turns: row.cooldown_turns,
    max_rank: row.max_rank,
    current_rank: row.current_rank,
    icon: row.icon,
    animation: row.animation
  }));

  // 6. Construct battle character data
  return {
    id: character.id,
    user_id: character.user_id,
    character_id: character.character_id,
    name: character.name,
    title: character.title,
    archetype: character.archetype,
    level: character.level,
    experience: character.experience,
    current_health: character.current_health,
    max_health: character.max_health,
    // Resources
    current_mana: character.current_mana,
    max_mana: character.max_mana,
    current_energy: character.current_energy,
    max_energy: character.max_energy,
    // Combat stats
    attack: character.attack,
    defense: character.defense,
    speed: character.speed,
    magic_attack: character.magic_attack,
    magic_defense: character.magic_defense,
    abilities: parsedAbilities,
    personality_traits: parsedPersonalityTraits,
    equipment: parsedEquipment,
    is_injured: character.is_injured,
    recovery_time: character.recovery_time,
    total_battles: character.total_battles,
    total_wins: character.total_wins,
    // Psychology stats
    gameplan_adherence_level: character.gameplan_adherence_level,
    stress_level: character.stress_level,
    team_trust: character.team_trust,
    current_mental_health: character.current_mental_health,
    battle_focus: character.battle_focus,
    // Powers & Spells
    unlockedPowers,
    unlockedSpells,
    equippedPowers,
    equippedSpells
  };
}

/**
 * Calculate AP cost for a power based on its rank
 * Rank 1 = 1 AP, Rank 2 = 2 AP, Rank 3 = 3 AP
 */
export function calculatePowerAPCost(power: PowerDefinition): number {
  return power.current_rank;
}

/**
 * Calculate AP cost for a spell based on its rank
 * Rank 1 = 1 AP, Rank 2 = 2 AP, Rank 3 = 3 AP
 */
export function calculateSpellAPCost(spell: SpellDefinition): number {
  return spell.current_rank;
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
