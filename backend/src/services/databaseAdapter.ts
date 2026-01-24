
import { db, query } from '../database/index';
import { v4 as uuidv4 } from 'uuid';
// adherence is now calculated by DB generated column (see migration 090)

import { CharacterProgressionService } from './characterProgressionService';
import { headquarters_service } from './headquartersService';

/**
 * Database adapter layer to bridge battle system expectations
 * with existing SQLite implementation
 */



// Power Effect - canonical definition (never changes)
interface PowerEffect {
  type: string;
  value: number;
  target: string;
  rank: number;
  // Type-specific fields (all required when present)
  stat: string;           // For stat_modifier type
  damageType: string;     // For damage type
  duration: number;       // For status effects
}

// Spell Effect - canonical definition
interface SpellEffect {
  type: string;
  value: number;
  target: string;
  rank: number;
  stat: string;
  damageType: string;
  duration: number;
}

// Power from database query
interface PowerRow {
  id: string;
  power_id: string;
  current_rank: number; // Mapped from mastery_level
  mastery_level: number;
  mastery_points: number;
  unlocked: boolean;
  times_used: number;
  unlocked_at: string | null;
  unlocked_by: string | null;
  name: string;
  description: string;
  tier: string;
  power_type: string;
  cooldown_turns: number;
  effects: PowerEffect[];  // JSONB - already parsed, never null for valid powers
  icon: string | null;
  unlock_cost: number;
  rank_up_cost: number;
}

// Spell from database query
interface SpellRow {
  id: string;
  spell_id: string;
  current_rank: number; // Mapped from mastery_level
  mastery_level: number;
  mastery_points: number;
  unlocked: boolean;
  times_used: number;
  last_used_at: string | null;
  on_cooldown: boolean;
  cooldown_expires_at: string | null;
  total_damage_dealt: number;
  total_healing_done: number;
  unlocked_at: string | null;
  unlocked_by: string | null;
  name: string;
  description: string;
  tier: string;
  category: string;
  mana_cost: number;
  cooldown_turns: number;
  effects: SpellEffect[];  // JSONB - already parsed, never null
  icon: string | null;
  unlock_cost: number;
  rank_up_cost: number;
}



// Types for battle system compatibility
interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  total_battles: number;
  total_wins: number;
  subscription_tier: string;
  level: number;
  experience: number;
  character_slot_capacity: number; // Added for dynamic character slots
}

interface UserCharacter {
  id: string;
  user_id: string;
  character_id: string;
  serial_number: string;
  nickname?: string;
  level: number;
  experience: number;
  bond_level: number;
  total_battles: number;
  total_wins: number;
  current_health: number;
  current_max_health: number;
  current_mental_health?: number;
  gameplan_adherence: number;
  coach_lockout_until?: string | Date;
  current_stress: number;
  current_confidence?: number;
  current_morale?: number;
  current_communication?: number;
  current_team_player?: number;
  is_injured: boolean;
  injury_severity?: string;
  recovery_time: Date | null;
  equipment: any[];
  enhancements: any[];
  conversation_memory: any[];
  significant_memories: any[];
  personality_drift: Record<string, any>;
  equipment_budget?: number;
  consumables_budget?: number;
  acquired_at: Date;
  last_battle_at?: Date;
  // Financial fields
  wallet: number;
  debt: number;
  monthly_earnings: number;
  financial_stress: number;
  coach_trust_level?: number;
  // Character progression
  ability_points: number;
  recent_decisions: any[];
  total_losses: number;
  // Character fields from JOIN (always present from find_by_id)
  name: string;
  title: string;
  archetype: string;
  origin_era: string;
  rarity: string;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  personality_traits: string[];
  conversation_style: string;
  backstory: string;
  conversation_topics: string[];
  avatar_emoji: string;
  artwork_url: string;
  abilities: any[];
  starter_gear_given: boolean;
}

interface Battle {
  id: string;
  user_id: string; // COACH initiating battle
  is_pve: boolean; // true = vs AI, false = vs human
  opponent_user_id: string | null; // Opponent COACH (null when is_pve=true)
  opponent_ai_coach_id: string | null; // AI Coach ID (null when is_pve=false)
  opponent_ai_team_id: string | null; // AI Team ID (null when is_pve=false)
  user_character_id: string | null; // Character ID for user (if 1v1)
  opponent_character_id: string | null; // Character ID for opponent (if 1v1)
  opponent_ai_character_id: string | null; // AI Character ID for opponent (if vs AI)
  battle_type: string;
  tournament_id?: string;
  status: string;
  phase: string;
  current_round: number;
  max_rounds: number;
  user_team_data: any; // JSONB - coach's team (was player_team_data)
  opponent_team_data: any; // JSONB - opponent's team
  combat_log: any[];
  round_results: any[];
  coaching_data: any;
  winner_user_id?: string;
  battle_result?: string;
  final_score?: any;
  ai_judge_context: any;
  ai_commentary?: string;
  global_morale: any;
  started_at?: Date;
  ended_at?: Date;
  total_duration_seconds?: number;
  xp_gained?: number;
  bond_gained?: number;
  currency_gained?: number;
}

interface Character {
  id: string;
  name: string;
  title?: string;
  archetype: string;
  species: string;
  origin_era?: string;
  origin_location?: string;
  rarity: string;
  max_health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  personality_traits: string[];
  conversation_style?: string;
  backstory?: string;
  emotional_range?: string[];
  conversation_topics: string[];
  dialogue_intro?: string;
  dialogue_victory?: string;
  dialogue_defeat?: string;
  dialogue_bonding?: string;
  avatar_emoji?: string;
  artwork_url?: string;
  abilities: any[];
  base_action_points: number;
  created_at: Date;
}

/**
 * Safe JSON parser that handles null, undefined, empty strings, and non-JSON strings
 */
function safe_json_parse(json_string: any, default_value: any) {
  if (!json_string || json_string === '' || json_string === null || json_string === undefined) {
    return default_value;
  }

  // If it's already an object/array, return it
  if (typeof json_string === 'object') {
    return json_string;
  }

  // Convert to string if not already
  const str = String(json_string);

  // Check if it looks like JSON (starts with [ or {)
  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.warn('JSON parse error, returning default:', error);
      return default_value;
    }
  }

  // Handle comma-separated strings by converting to array
  if (str.includes(',') && Array.isArray(default_value)) {
    return str.split(',').map(item => item.trim());
  }

  // For other strings, if expecting an array, wrap in array
  if (Array.isArray(default_value) && str.length > 0) {
    return [str];
  }

  // For objects, return default
  if (typeof default_value === 'object' && !Array.isArray(default_value)) {
    return default_value;
  }

  return default_value;
}

const speciesModifierCache = new Map<string, number>();
const archetypeModifierCache = new Map<string, number>();

async function getSpeciesModifier(species1: string, species2: string): Promise<number> {
  const cacheKey = `${species1} -> ${species2} `;
  if (speciesModifierCache.has(cacheKey)) return speciesModifierCache.get(cacheKey) as number;

  const result = await query(
    `SELECT base_modifier FROM species_relationships WHERE species1 = $1 AND species2 = $2`,
    [species1, species2]
  );

  const modifier = result.rows[0]?.base_modifier ?? 0;
  speciesModifierCache.set(cacheKey, modifier);
  return modifier;
}

async function getArchetypeModifier(archetype1: string, archetype2: string): Promise<number> {
  const cacheKey = `${archetype1} -> ${archetype2} `;
  if (archetypeModifierCache.has(cacheKey)) return archetypeModifierCache.get(cacheKey) as number;

  const result = await query(
    `SELECT base_modifier FROM archetype_relationships WHERE archetype1 = $1 AND archetype2 = $2`,
    [archetype1, archetype2]
  );

  const modifier = result.rows[0]?.base_modifier ?? 0;
  archetypeModifierCache.set(cacheKey, modifier);
  return modifier;
}

function deriveRelationshipStatus(total_score: number): string {
  if (total_score <= -80) return 'mortal_enemies';
  if (total_score <= -60) return 'enemies';
  if (total_score <= -40) return 'rivals';
  if (total_score <= -20) return 'antagonistic';
  if (total_score <= -1) return 'tense';
  if (total_score === 0) return 'strangers';
  if (total_score <= 20) return 'acquaintances';
  if (total_score <= 40) return 'friendly';
  if (total_score <= 60) return 'friends';
  if (total_score <= 80) return 'close_friends';
  return 'best_friends';
}

function simplifyRelationshipStatusForBattle(
  relationship_status: string | null | undefined,
  trust: number,
  affection: number
): 'ally' | 'rival' | 'enemy' | 'neutral' {
  const status = (relationship_status || '').toLowerCase();
  const total = (trust || 0) + (affection || 0);

  if (status.includes('enemy') || total <= -60) return 'enemy';
  if (status.includes('rival') || status.includes('antagonistic') || total <= -25) return 'rival';
  if (
    status.includes('friend') ||
    status.includes('ally') ||
    status.includes('acquaintance') ||
    total >= 25
  ) {
    return 'ally';
  }

  return 'neutral';
}

async function buildNewRelationshipRowForPair(
  char1: { id: string; species: string; archetype: string },
  char2: { id: string; species: string; archetype: string }
) {
  if (!char1.species || !char2.species) {
    throw new Error(`Missing species data for relationship generation between ${char1.id} and ${char2.id} `);
  }
  if (!char1.archetype || !char2.archetype) {
    throw new Error(`Missing archetype data for relationship generation between ${char1.id} and ${char2.id} `);
  }

  const species_modifier = await getSpeciesModifier(char1.species, char2.species);
  const archetype_modifier = await getArchetypeModifier(char1.archetype, char2.archetype);
  const random_variance = Math.floor(Math.random() * 11) - 5; // -5..+5 to keep some organic variance
  const base_disposition = species_modifier + archetype_modifier + random_variance;
  const current_trust = base_disposition;
  const current_respect = Math.floor(base_disposition * 0.7);
  const current_affection = Math.floor(base_disposition * 0.5);
  const total_score = current_trust + current_affection;

  return {
    character1_id: char1.id,
    character2_id: char2.id,
    species_modifier,
    archetype_modifier,
    base_disposition,
    current_trust,
    current_respect,
    current_affection,
    current_rivalry: base_disposition < -20 ? 20 : 0,
    relationship_status: deriveRelationshipStatus(total_score),
    trajectory: 'stable',
    progress_score: 0,
    last_interaction: new Date()
  };
}

// Updated to use user_character UUIDs for per-user relationships
async function ensureRelationshipsForCharacters(userCharacters: { id: string; character_id: string }[]): Promise<any[]> {
  if (!userCharacters || userCharacters.length < 2) return [];

  // Extract user_character UUIDs for querying
  const userCharacterIds = userCharacters.map(uc => uc.id);
  const baseCharacterIds = userCharacters.map(uc => uc.character_id);

  // Get species/archetype metadata from base characters table
  const character_meta_result = await query(
    `SELECT id, species, archetype FROM characters WHERE id = ANY($1)`,
    [baseCharacterIds]
  );
  const characterMetaMap = new Map<string, { id: string; species: string; archetype: string }>();
  character_meta_result.rows.forEach((row: any) => {
    characterMetaMap.set(row.id, { id: row.id, species: row.species, archetype: row.archetype });
  });

  const missingCharacters = baseCharacterIds.filter(id => !characterMetaMap.has(id));
  if (missingCharacters.length > 0) {
    throw new Error(`Missing character metadata for ids: ${missingCharacters.join(', ')} `);
  }

  // Query existing relationships by user_character UUIDs (new columns)
  const existing_result = await query(
    `SELECT user_character1_id, user_character2_id, character1_id, character2_id,
            species_modifier, archetype_modifier, base_disposition,
            current_trust, current_respect, current_affection, current_rivalry,
            relationship_status, trajectory, progress_score, last_interaction
     FROM character_relationships
     WHERE user_character1_id = ANY($1) AND user_character2_id = ANY($1)
       AND user_character1_id != user_character2_id`,
    [userCharacterIds]
  );

  // Key by user_character UUIDs for uniqueness, but store base character IDs for return value
  const relationshipMap = new Map<string, any>();
  existing_result.rows.forEach((row: any) => {
    const key = `${row.user_character1_id} -> ${row.user_character2_id}`;
    relationshipMap.set(key, row);
  });

  // Create mapping from user_character UUID to base character ID
  const uuidToBaseId = new Map<string, string>();
  userCharacters.forEach(uc => uuidToBaseId.set(uc.id, uc.character_id));

  for (const uc1 of userCharacters) {
    for (const uc2 of userCharacters) {
      if (uc1.id === uc2.id) continue;
      const key = `${uc1.id} -> ${uc2.id}`;
      if (relationshipMap.has(key)) continue;

      const char1Meta = characterMetaMap.get(uc1.character_id);
      const char2Meta = characterMetaMap.get(uc2.character_id);
      if (!char1Meta || !char2Meta) {
        throw new Error(`Missing character metadata when generating relationship ${uc1.character_id} -> ${uc2.character_id}`);
      }

      const newRow = await buildNewRelationshipRowForPair(char1Meta, char2Meta);

      // Insert with both base character IDs and user_character UUIDs
      await query(
        `INSERT INTO character_relationships(
          character1_id, character2_id, user_character1_id, user_character2_id,
          species_modifier, archetype_modifier,
          base_disposition, current_trust, current_respect, current_affection,
          current_rivalry, relationship_status, trajectory, progress_score,
          last_interaction, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT(user_character1_id, user_character2_id) DO NOTHING`,
        [
          newRow.character1_id,
          newRow.character2_id,
          uc1.id,
          uc2.id,
          newRow.species_modifier,
          newRow.archetype_modifier,
          newRow.base_disposition,
          newRow.current_trust,
          newRow.current_respect,
          newRow.current_affection,
          newRow.current_rivalry,
          newRow.relationship_status,
          newRow.trajectory,
          newRow.progress_score,
          newRow.last_interaction
        ]
      );

      // Store with base character IDs for return value compatibility
      relationshipMap.set(key, {
        ...newRow,
        user_character1_id: uc1.id,
        user_character2_id: uc2.id
      });
    }
  }

  return Array.from(relationshipMap.values());
}

/**
 * Database adapter that provides ORM-style methods expected by battle system
 */
export const db_adapter = {
  users: {
    async find_by_id(id: string): Promise<User | null> {
      try {
        const result = await query('SELECT *, character_slot_capacity FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
      }
    },

    async update(id: string, data: Partial<User>): Promise<boolean> {
      try {
        // SECURITY: Whitelist allowed fields to prevent SQL injection
        const allowed_fields = ['username', 'email', 'rating', 'total_battles', 'total_wins',
          'subscription_tier', 'level', 'experience', 'character_slot_capacity'];

        const updates = Object.entries(data)
          .filter(([key]) => allowed_fields.includes(key))
          .map(([key], index) => `${key} = $${index + 1} `);

        if (updates.length === 0) return false;

        const values = Object.entries(data)
          .filter(([key]) => allowed_fields.includes(key))
          .map(([, value]) => value);

        await query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} `,
          [...values, id]
        );
        return true;
      } catch (error) {
        console.error('Error updating user:', error);
        return false;
      }
    },

    async find_by_email(email: string): Promise<User | null> {
      try {
        const result = await query('SELECT *, character_slot_capacity FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
      }
    },

    async create(data: Partial<User> & { id: string, username: string, email: string }): Promise<User | null> {
      try {
        await query(`
          INSERT INTO users(
    id, username, email, subscription_tier, level, experience,
    total_battles, total_wins, rating, character_slot_capacity
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
          data.id,
          data.username,
          data.email,
          data.subscription_tier || 'free',
          data.level || 1,
          data.experience || 0,
          data.total_battles || 0,
          data.total_wins || 0,
          data.rating || 1000,
          data.character_slot_capacity || 12
        ]);

        const result = await query('SELECT * FROM users WHERE id = $1', [data.id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error creating user:', error);
        return null;
      }
    }
  },

  user_characters: {
    async find_by_id(id: string): Promise<UserCharacter> {
      const result = await query(`
        SELECT uc.*, c.name, c.title, c.archetype, c.origin_era, c.rarity,
c.max_health, c.attack, c.defense, c.speed, c.magic_attack, c.magic_defense,
c.strength, c.dexterity, c.defense, c.intelligence, c.wisdom, c.charisma, c.spirit,
c.critical_chance, c.critical_damage, c.accuracy, c.evasion, c.max_mana, c.energy_regen, c.initiative,
c.personality_traits, c.conversation_style, c.backstory, c.conversation_topics,
c.avatar_emoji, c.artwork_url, c.abilities,
uc.wallet, uc.debt, uc.financial_stress, uc.financial_personality, uc.monthly_earnings, uc.recent_decisions,
uc.gameplan_adherence, uc.bond_level, uc.current_morale, uc.current_communication, uc.current_team_player,
uc.attribute_allocations, uc.attribute_points
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.id = $1
`, [id]);

      if (!result.rows[0]) {
        throw new Error(`STRICT MODE: UserCharacter not found: ${id}`);
      }

      const row = result.rows[0];
      return {
        ...row,
        equipment: safe_json_parse(row.equipment, []),
        enhancements: safe_json_parse(row.enhancements, []),
        conversation_memory: safe_json_parse(row.conversation_memory, []),
        significant_memories: safe_json_parse(row.significant_memories, []),
        personality_drift: safe_json_parse(row.personality_drift, {}),
        personality_traits: safe_json_parse(row.personality_traits, []),
        conversation_topics: safe_json_parse(row.conversation_topics, []),
        abilities: safe_json_parse(row.abilities, []),
        recent_decisions: safe_json_parse(row.recent_decisions, [])
      };
    },

    async update(id: string, data: Partial<UserCharacter>): Promise<boolean> {
      try {
        // SECURITY: Whitelist allowed fields to prevent SQL injection
        const allowed_fields = ['nickname', 'level', 'experience', 'bond_level',
          'total_battles', 'total_wins', 'current_health', 'current_max_health',
          'is_injured', 'recovery_time', 'equipment', 'enhancements',
          'conversation_memory', 'significant_memories', 'personality_drift',
          'last_battle_at', 'starter_gear_given', 'wallet', 'equipment_budget', 'consumables_budget'];

        const updates: Record<string, any> = {};

        // Filter and process allowed fields
        Object.entries(data).forEach(([key, value]) => {
          if (allowed_fields.includes(key)) {
            // Convert arrays/objects to JSON strings for storage
            if (['equipment', 'enhancements', 'conversation_memory',
              'significant_memories', 'personality_drift'].includes(key)) {
              updates[key] = JSON.stringify(value);
            } else {
              updates[key] = value;
            }
          }
        });

        if (Object.keys(updates).length === 0) return false;

        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1} `);
        const values = Object.values(updates);

        await query(
          `UPDATE user_characters SET ${fields.join(', ')} WHERE id = $${values.length + 1} `,
          [...values, id]
        );
        return true;
      } catch (error) {
        console.error('Error updating user character:', error);
        return false;
      }
    },

    async find_by_user_id(user_id: string): Promise<UserCharacter[]> {
      try {
        const result = await query(`
          SELECT uc.*, c.name, c.title, c.archetype, c.origin_era, c.rarity,
  c.max_health, c.attack, c.defense, c.speed, c.magic_attack, c.magic_defense,
  c.strength, c.dexterity, c.defense, c.intelligence, c.wisdom, c.charisma, c.spirit,
  c.critical_chance, c.critical_damage, c.accuracy, c.evasion, c.max_mana, c.energy_regen, c.initiative,
  c.personality_traits, c.conversation_style, c.backstory, c.conversation_topics,
  c.avatar_emoji, c.artwork_url, c.abilities,
  c.training, c.team_player, c.ego, c.mental_health, c.battle_focus,
  c.battle_image_name, c.battle_image_variants,
  uc.current_mental_health, uc.current_stress, uc.current_fatigue, uc.current_morale, uc.current_communication, uc.current_team_player,
  uc.wallet, uc.debt, uc.financial_stress, uc.financial_personality, uc.monthly_earnings, uc.recent_decisions,
  uc.gameplan_adherence, uc.bond_level, uc.attribute_allocations, uc.attribute_points
          FROM user_characters uc
          JOIN characters c ON uc.character_id = c.id
          WHERE uc.user_id = $1
          AND (c.role IS NULL OR c.role NOT IN ('therapist', 'judge', 'host', 'real_estate_agent', 'trainer', 'mascot', 'system'))
          ORDER BY uc.acquired_at DESC
  `, [user_id]);

        // Fetch inventory and powers/spells for each character
        const characters_with_inventory = await Promise.all(result.rows.map(async (row: any) => {
          const inventory_result = await query(`
            SELECT ce.equipment_id, ce.is_equipped, ce.equipped_at, ce.acquired_from, ce.acquired_at,
  e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.required_level, e.icon
            FROM character_equipment ce
            JOIN equipment e ON ce.equipment_id = e.id
            WHERE ce.character_id = $1
  `, [row.id]);

          // Fetch powers for this character
          const powers_result = await query(`
            SELECT cp.id, cp.power_id, cp.mastery_level as current_rank, cp.mastery_points, cp.unlocked,
  cp.times_used, cp.unlocked_at, cp.unlocked_by,
  pd.name, pd.description, pd.tier, pd.power_type, pd.cooldown as cooldown_turns,
  pd.effects, pd.icon, pd.unlock_cost, pd.rank_up_cost
            FROM character_powers cp
            JOIN power_definitions pd ON cp.power_id = pd.id
            WHERE cp.character_id = $1
            ORDER BY pd.tier, pd.name
  `, [row.id]);

          // Fetch spells for this character
          const spells_result = await query(`
            SELECT cs.id, cs.spell_id, cs.mastery_level as current_rank, cs.mastery_points, cs.unlocked,
  cs.times_cast AS times_used,
    cs.last_cast_at AS last_used_at,
      cs.on_cooldown,
      cs.cooldown_expires_at,
      cs.total_damage_dealt,
      cs.total_healing_done,
      cs.unlocked_at, cs.unlocked_by,
      sd.name, sd.description, sd.tier, sd.category, sd.mana_cost,
      sd.cooldown_turns, sd.effects, sd.icon, sd.unlock_cost, sd.rank_up_cost
            FROM character_spells cs
            JOIN spell_definitions sd ON cs.spell_id = sd.id
            WHERE cs.character_id = $1
            ORDER BY sd.tier, sd.name
  `, [row.id]);

          // Fetch equipped powers
          const equipped_powers_result = await query(`
            SELECT power_id FROM character_power_loadout WHERE user_character_id = $1
  `, [row.id]);
          const equipped_power_ids = new Set(equipped_powers_result.rows.map((r: any) => r.power_id));

          // Fetch equipped spells
          const equipped_spells_result = await query(`
            SELECT spell_id FROM character_spell_loadout WHERE user_character_id = $1
  `, [row.id]);
          const equipped_spell_ids = new Set(equipped_spells_result.rows.map((r: any) => r.spell_id));

          // Fetch consumable items for this character
          const items_result = await query(`
            SELECT ci.id, ci.item_id, ci.quantity, ci.acquired_from, ci.acquired_at,
              i.name, i.description, i.item_type, i.sub_type, i.rarity, i.consumable,
              i.effects, i.usage_context, i.cooldown_turns, i.icon, i.flavor_text
            FROM character_items ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.character_id = $1 AND i.consumable = true
            ORDER BY i.rarity DESC, i.name
  `, [row.id]);

          return {
            ...row,
            // Add psych_stats object from database values
            psych_stats: {
              mental_health: row.current_mental_health,
              training: row.training,
              team_player: row.team_player,
              ego: row.ego,
              communication: row.current_communication,
              gameplan_adherence: row.gameplan_adherence,
              current_stress: row.current_stress,
              team_trust: row.team_trust,
              battle_focus: row.battle_focus
            },
            // Add battle image data
            battle_image_name: row.battle_image_name,
            battle_image_variants: row.battle_image_variants,
            // Calculate experience_to_next based on character level
            // Note: This is a legacy field, frontend might still use it for display
            // Ideally this should come from CharacterProgressionService.getLevelRequirement
            experience_to_next: 0, // Placeholder, real value handled by service now
            rest_days_needed: 0,
            // Add combat stats
            health: row.current_health,
            attack: row.attack,
            defense: row.defense,
            speed: row.speed,
            magic_attack: row.magic_attack,
            magic_defense: row.magic_defense,
            // Add attribute stats
            strength: row.strength,
            dexterity: row.dexterity,
            intelligence: row.intelligence,
            wisdom: row.wisdom,
            charisma: row.charisma,
            spirit: row.spirit,
            equipment: safe_json_parse(row.equipment, []),
            enhancements: safe_json_parse(row.enhancements, []),
            conversation_memory: safe_json_parse(row.conversation_memory, []),
            significant_memories: safe_json_parse(row.significant_memories, []),
            personality_drift: safe_json_parse(row.personality_drift, {}),
            personality_traits: safe_json_parse(row.personality_traits, []),
            conversation_topics: safe_json_parse(row.conversation_topics, []),
            abilities: safe_json_parse(row.abilities, []),
            wallet: row.wallet,
            debt: row.debt,
            financial_personality: row.financial_personality,
            monthly_earnings: row.monthly_earnings,
            financial_stress: row.financial_stress,
            coach_trust_level: row.coach_trust_level,
            recent_decisions: safe_json_parse(row.recent_decisions, []),
            // Organize equipped items into proper structure
            equipped_items: (() => {
              const weaponRow = inventory_result.rows.find((inv: { slot: string; is_equipped: boolean }) =>
                inv.slot === 'weapon' && inv.is_equipped
              );
              const armorRow = inventory_result.rows.find((inv: { slot: string; is_equipped: boolean }) =>
                inv.slot === 'armor' && inv.is_equipped
              );
              const accessoryRow = inventory_result.rows.find((inv: { slot: string; is_equipped: boolean }) =>
                inv.slot === 'accessory' && inv.is_equipped
              );

              const createEquipment = (inv: { equipment_id: string; name: string; description: string; slot: string; equipment_type: string; rarity: string; level: number; required_level: number; stats: string; effects: string; icon: string; obtain_method: string; shop_price: number }) => ({
                id: inv.equipment_id,
                name: inv.name,
                description: inv.description,
                slot: inv.slot,
                type: inv.equipment_type,
                rarity: inv.rarity,
                level: inv.level,
                required_level: inv.required_level,
                stats: safe_json_parse(inv.stats, {}),
                effects: safe_json_parse(inv.effects, []),
                icon: inv.icon,
                obtain_method: inv.obtain_method,
                price: inv.shop_price
              });

              return {
                ...(weaponRow && { weapon: createEquipment(weaponRow) }),
                ...(armorRow && { armor: createEquipment(armorRow) }),
                ...(accessoryRow && { accessory: createEquipment(accessoryRow) })
              };
            })(),
            // Inventory contains unequipped items
            inventory: inventory_result.rows
              .filter((inv: { is_equipped: boolean }) => !inv.is_equipped)
              .map((inv: { equipment_id: string; name: string; description: string; slot: string; equipment_type: string; rarity: string; level: number; required_level: number; stats: string; effects: string; icon: string; obtain_method: string; shop_price: number }) => ({
                id: inv.equipment_id,
                name: inv.name,
                description: inv.description,
                slot: inv.slot,
                type: inv.equipment_type,
                rarity: inv.rarity,
                level: inv.level,
                required_level: inv.required_level,
                stats: safe_json_parse(inv.stats, {}),
                effects: safe_json_parse(inv.effects, []),
                icon: inv.icon,
                obtain_method: inv.obtain_method,
                price: inv.shop_price
              })),

            // Consumable items available to this character
            consumable_items: items_result.rows.map((item: any) => ({
              id: item.id,
              item_id: item.item_id,
              name: item.name,
              description: item.description,
              item_type: item.item_type,
              sub_type: item.sub_type,
              rarity: item.rarity,
              quantity: item.quantity,
              effects: safe_json_parse(item.effects, []),
              usage_context: item.usage_context,
              cooldown_turns: item.cooldown_turns,
              icon: item.icon,
              flavor_text: item.flavor_text,
              acquired_from: item.acquired_from,
              acquired_at: item.acquired_at
            })),

            // Powers - validate and map
            powers: powers_result.rows.map((p: PowerRow) => {
              // Validate required canonical data exists
              if (!p.effects) {
                throw new Error(`Power ${p.power_id} (${p.name}) missing effects - broken power definition`);
              }

              return {
                id: p.id,
                power_id: p.power_id,
                name: p.name,
                description: p.description,
                tier: p.tier as 'skill' | 'ability' | 'species' | 'signature',
                power_type: p.power_type,
                current_rank: p.current_rank,
                mastery_level: p.mastery_level,
                mastery_points: p.mastery_points,
                unlocked: p.unlocked,
                times_used: p.times_used,
                cooldown_turns: p.cooldown_turns,
                effects: p.effects,
                unlock_cost: p.unlock_cost,
                rank_up_cost: p.rank_up_cost,
                is_equipped: equipped_power_ids.has(p.power_id),
                unlocked_at: p.unlocked_at,
                unlocked_by: p.unlocked_by,
                icon: p.icon
              };
            }),

            // Spells - validate and map
            spells: spells_result.rows.map((s: SpellRow) => {
              // Validate required canonical data exists
              if (!s.effects) {
                throw new Error(`Spell ${s.spell_id} (${s.name}) missing effects - broken spell definition`);
              }

              return {
                id: s.id,
                spell_id: s.spell_id,
                name: s.name,
                description: s.description,
                tier: s.tier as 'novice' | 'adept' | 'expert' | 'master',
                category: s.category,
                current_rank: s.current_rank,
                mastery_level: s.mastery_level,
                mastery_points: s.mastery_points,
                unlocked: s.unlocked,
                times_used: s.times_used,
                last_used_at: s.last_used_at,
                on_cooldown: s.on_cooldown,
                cooldown_expires_at: s.cooldown_expires_at,
                total_damage_dealt: s.total_damage_dealt,
                total_healing_done: s.total_healing_done,
                mana_cost: s.mana_cost,
                cooldown_turns: s.cooldown_turns,
                effects: s.effects,
                unlock_cost: s.unlock_cost,
                rank_up_cost: s.rank_up_cost
              };
            }),

            // Convenience arrays - filter for equipped
            equipped_powers: powers_result.rows
              .filter((p: PowerRow) => equipped_power_ids.has(p.power_id))
              .map((p: PowerRow) => {
                if (!p.effects) {
                  throw new Error(`Power ${p.power_id} missing effects`);
                }
                return {
                  id: p.id,
                  power_id: p.power_id,
                  name: p.name,
                  description: p.description,
                  tier: p.tier as 'skill' | 'ability' | 'species' | 'signature',
                  power_type: p.power_type,
                  current_rank: p.current_rank,
                  mastery_level: p.mastery_level,
                  mastery_points: p.mastery_points,
                  unlocked: p.unlocked,
                  times_used: p.times_used,
                  cooldown_turns: p.cooldown_turns,
                  effects: p.effects,
                  unlock_cost: p.unlock_cost,
                  rank_up_cost: p.rank_up_cost,
                  is_equipped: true,
                  unlocked_at: p.unlocked_at,
                  unlocked_by: p.unlocked_by,
                  icon: p.icon
                };
              }),

            equipped_spells: spells_result.rows
              .filter((s: SpellRow) => equipped_spell_ids.has(s.spell_id))
              .map((s: SpellRow) => {
                if (!s.effects) {
                  throw new Error(`Spell ${s.spell_id} missing effects`);
                }
                return {
                  id: s.id,
                  spell_id: s.spell_id,
                  name: s.name,
                  description: s.description,
                  tier: s.tier as 'novice' | 'adept' | 'expert' | 'master',
                  category: s.category,
                  current_rank: s.current_rank,
                  mastery_level: s.mastery_level,
                  mastery_points: s.mastery_points,
                  unlocked: s.unlocked,
                  times_used: s.times_used,
                  last_used_at: s.last_used_at,
                  on_cooldown: s.on_cooldown,
                  cooldown_expires_at: s.cooldown_expires_at,
                  total_damage_dealt: s.total_damage_dealt,
                  total_healing_done: s.total_healing_done,
                  mana_cost: s.mana_cost,
                  cooldown_turns: s.cooldown_turns,
                  effects: s.effects,
                  unlock_cost: s.unlock_cost,
                  rank_up_cost: s.rank_up_cost,
                  is_equipped: true,
                  unlocked_at: s.unlocked_at,
                  unlocked_by: s.unlocked_by,
                  icon: s.icon
                };
              })
          };
        }));

        // Pass user_character data (UUID + base character ID) for per-user relationships
        const seenIds = new Set<string>();
        const userCharacters = result.rows
          .filter((row: any) => {
            if (seenIds.has(row.id)) return false;
            seenIds.add(row.id);
            return true;
          })
          .map((row: any) => ({ id: row.id, character_id: row.character_id }));
        const rosterRelationships = await ensureRelationshipsForCharacters(userCharacters);
        const relationshipsByCharacter = new Map<string, any[]>();

        rosterRelationships.forEach((rel: any) => {
          if (!relationshipsByCharacter.has(rel.character1_id)) {
            relationshipsByCharacter.set(rel.character1_id, []);
          }
          relationshipsByCharacter.get(rel.character1_id)?.push(rel);
        });

        const characters_with_relationships = characters_with_inventory.map((char: any) => {
          const relationships = relationshipsByCharacter.get(char.character_id) || [];
          return {
            ...char,
            relationship_modifiers: relationships.map(rel => ({
              with_character: rel.character2_id,
              relationship: simplifyRelationshipStatusForBattle(
                rel.relationship_status,
                rel.current_trust,
                rel.current_affection
              ),
              strength: rel.current_trust ?? 0,
              battle_modifiers: rel.battle_modifiers
            }))
          };
        });

        return characters_with_relationships;
      } catch (error) {
        console.error('Error finding user characters:', error);
        throw error;
      }
    },

    async create(data: Partial<UserCharacter> & { character_id: string, user_id: string }): Promise<UserCharacter | null> {
      try {
        const id = uuidv4();
        const serial_number = `${data.character_id.slice(-3)}-${Date.now().toString().slice(-6)}`;

        // Get the base character data including financial personality
        const char_result = await query(`
SELECT * FROM characters WHERE id = $1
  `, [data.character_id]);
        if (!char_result.rows[0]) {
          throw new Error('Character not found');
        }
        const character = char_result.rows[0];

        // [REMOVED] calculateInitialAdherence - handled by generated column
        // const initial_adherence = await calculateInitialAdherence({...});


        // Note: financial_stress and coach_trust_level are now auto-calculated by PostgreSQL
        // as GENERATED columns from the financial_personality JSON in user_characters table.
        // See migrations 105 and 106.

        // =====================================================
        // DETERMINE SLEEPING ARRANGEMENT BEFORE INSERT
        // Must run BEFORE INSERT so triggers have correct value
        // =====================================================
        let sleeping_arrangement: string;
        let room_bed_id: string | null = null;

        const hq_result = await query(
          'SELECT id FROM user_headquarters WHERE user_id = $1',
          [data.user_id]
        );

        if (hq_result.rows.length === 0) {
          // No HQ exists - character sleeps on floor
          sleeping_arrangement = 'floor';
        } else {
          const hq_id = hq_result.rows[0].id;

          // Find best available bed (lowest comfort_tier = best)
          const spot_result = await query(`
            SELECT rb.id, rb.bed_type
            FROM room_beds rb
            JOIN headquarters_rooms hr ON rb.room_id = hr.id
            JOIN sleeping_spot_types sst ON rb.bed_type = sst.id
            WHERE hr.headquarters_id = $1
              AND rb.character_id IS NULL
            ORDER BY sst.comfort_tier ASC
            LIMIT 1
          `, [hq_id]);

          if (spot_result.rows.length > 0) {
            sleeping_arrangement = spot_result.rows[0].bed_type;
            room_bed_id = spot_result.rows[0].id;
          } else {
            // HQ exists but no beds available - character sleeps on floor
            sleeping_arrangement = 'floor';
          }
        }

        console.log(`🛏️ Determined sleeping arrangement for ${character.name}: ${sleeping_arrangement}`);

        await query(`
          INSERT INTO user_characters(
    id, user_id, character_id, serial_number, nickname,
    level, experience, bond_level, total_battles, total_wins,
    current_health, current_max_health, is_injured, wallet, equipment, enhancements,
    conversation_memory, significant_memories, personality_drift, starter_gear_given,
    debt, monthly_earnings,
    financial_personality, recent_decisions,
    current_strength, current_endurance, current_accuracy, current_evasion,
    current_critical_chance, current_critical_damage, current_charisma, current_battle_focus,
    sleeping_arrangement, gameplay_mood_modifiers
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
        `, [
          id,
          data.user_id,
          data.character_id,
          serial_number,
          data.nickname || null,
          data.level || 1,
          data.experience || 0,
          data.bond_level || 0,
          data.total_battles || 0,
          data.total_wins || 0,
          character.max_health,
          character.max_health,
          0, // is_injured (0 = false)
          character.starting_wallet || 0, // Set wallet from character's starting_wallet
          // GOVERNANCE: No fallbacks - equipment must be provided or undefined
          JSON.stringify(data.equipment ?? []),
          JSON.stringify(data.enhancements || []),
          JSON.stringify(data.conversation_memory || []),
          JSON.stringify(data.significant_memories || []),
          JSON.stringify(data.personality_drift || {}),
          true, // starter_gear_given: true since we give starting gear during creation
          // gameplan_adherence - OMITTED: auto-calculated GENERATED ALWAYS column (migration 090)
          0, // debt - new characters start with no debt
          0, // monthly_earnings - new characters have no income yet
          // financial_stress - OMITTED: GENERATED column (migration 105)
          // coach_trust_level - OMITTED: GENERATED column (migration 106)
          JSON.stringify({
            spending_style: character.spending_style,
            money_motivations: character.money_motivations,
            financial_wisdom: character.financial_wisdom,
            risk_tolerance: character.risk_tolerance,
            luxury_desire: character.luxury_desire,
            generosity: character.generosity,
            financial_traumas: character.financial_traumas
          }), // financial_personality - used by generated columns
          JSON.stringify([]), // recent_decisions
          character.strength, // current_strength
          character.endurance, // current_endurance
          character.accuracy, // current_accuracy
          character.evasion, // current_evasion
          character.critical_chance, // current_critical_chance
          character.critical_damage, // current_critical_damage
          character.charisma, // current_charisma
          character.battle_focus, // current_battle_focus
          sleeping_arrangement, // sleeping_arrangement - determined above, no database default
          JSON.stringify({ modifiers: [] }) // gameplay_mood_modifiers - trigger will populate sleeping modifier
        ]);

        // Give ALL characters archetype-based starting gear and items
        try {
          console.log(`🎁 Setting up starting gear for ${character.name}(${character.archetype}, wallet: $${character.starting_wallet})`);

          // Calculate total health potions needed
          const base_health_potions = 2;
          const beast_bonus = character.archetype === 'beast' ? 1 : 0;
          const poor_bonus = character.starting_wallet === 0 ? 1 : 0;
          const total_health_potions = base_health_potions + beast_bonus + poor_bonus;

          // Insert single record with total quantity
          await query(`
            INSERT INTO character_items(character_id, item_id, quantity, acquired_from)
VALUES($1, 'small_health_potion', $2, 'starter')
            ON CONFLICT(character_id, item_id)
            DO UPDATE SET quantity = character_items.quantity + EXCLUDED.quantity
  `, [id, total_health_potions]);

          if (beast_bonus > 0) {
            console.log(`🐾 Extra health potion granted to beast character: ${character.name} `);
          }
          if (poor_bonus > 0) {
            console.log(`💝 Extra health potion granted to poor character: ${character.name} `);
          }

          // 4. Give archetype-based starting equipment
          const archetype_starter_equipment: Record<string, string[]> = {
            warrior: ['iron_sword', 'leather_vest'],
            mage: ['wooden_staff_generic', 'enchanted_robes_generic'],
            assassin: ['rusty_sword_generic', 'cloak_shadows_generic'],
            tank: ['iron_mace_generic', 'chain_mail_generic'],
            leader: ['steel_sword_generic', 'leather_vest'],
            mystic: ['crystal_staff_generic', 'enchanted_robes_generic'],
            scholar: ['arcane_staff_generic', 'enchanted_robes_generic'],
            trickster: ['wooden_club_generic', 'cloak_shadows_generic'],
            beast: ['wooden_club_generic', 'leather_vest'],
            magical_appliance: ['iron_mace_generic', 'chain_mail_generic'],
            detective: ['rusty_sword_generic', 'cloak_shadows_generic'],
            beastmaster: ['wooden_club_generic', 'leather_vest'],
            system: ['wooden_staff_generic', 'enchanted_robes_generic']
          };

          // Get equipment for this character's archetype
          const equipment_ids = archetype_starter_equipment[character.archetype];
          if (!equipment_ids) {
            throw new Error(`No starter equipment defined for archetype: ${character.archetype} `);
          }

          // Add equipment to character_equipment table
          for (const equipment_id of equipment_ids) {
            try {
              await query(`
                INSERT INTO character_equipment(character_id, equipment_id, acquired_from)
VALUES($1, $2, 'starter')
                ON CONFLICT(character_id, equipment_id) DO NOTHING
              `, [id, equipment_id]);
            } catch (equip_error) {
              console.error(`❌ Failed to add equipment ${equipment_id} to ${character.name}: `, equip_error instanceof Error ? equip_error.message : equip_error);
              throw new Error(`Equipment ${equipment_id} does not exist in database`);
            }
          }

          const health_potions = 2 + (character.archetype === 'beast' ? 1 : 0) + (character.starting_wallet === 0 ? 1 : 0);
          console.log(`✅ Starting gear complete for ${character.name}(${character.archetype}): ${equipment_ids.length} equipment + ${health_potions} health potions${character.archetype === 'beast' ? ' + beast bonus' : ''}${character.starting_wallet === 0 ? ' + poor bonus' : ''} `);
        } catch (starting_gear_error) {
          console.error(`❌ Failed to give starting gear to ${character.name}: `, starting_gear_error);
          throw new Error(`Character creation failed: could not give starting equipment to ${character.name}. ${starting_gear_error instanceof Error ? starting_gear_error.message : 'Unknown error'} `);
        }

        // 5. Claim the bed in room_beds (if a bed was found)
        // sleeping_arrangement was already determined BEFORE INSERT and included in the INSERT
        if (room_bed_id) {
          await query(
            'UPDATE room_beds SET character_id = $1 WHERE id = $2',
            [id, room_bed_id]
          );
          console.log(`🛏️ Claimed bed ${sleeping_arrangement} for ${character.name}`);
        } else {
          console.log(`🛏️ No bed to claim for ${character.name} (sleeping on ${sleeping_arrangement})`);
        }

        return await this.find_by_id(id);
      } catch (error) {
        console.error('Error creating user character:', error);
        return null;
      }
    },

    async find_by_user_id_and_character_id(user_id: string, character_id: string): Promise<UserCharacter | null> {
      try {
        const result = await query(`
          SELECT uc.*, c.name, c.title, c.archetype, c.origin_era, c.rarity,
  c.max_health, c.attack, c.defense, c.speed, c.magic_attack, c.magic_defense,
  c.strength, c.dexterity, c.defense, c.intelligence, c.wisdom, c.charisma, c.spirit,
  c.critical_chance, c.critical_damage, c.accuracy, c.evasion, c.max_mana, c.energy_regen,
  c.personality_traits, c.conversation_style, c.backstory, c.conversation_topics,
  c.avatar_emoji, c.artwork_url, c.abilities,
  uc.wallet, uc.debt, uc.financial_stress, uc.financial_personality, uc.monthly_earnings, uc.recent_decisions,
  uc.gameplan_adherence, uc.bond_level, uc.attribute_allocations, uc.attribute_points,
  c.scene_image_slug, c.battle_image_name
          FROM user_characters uc
          JOIN characters c ON uc.character_id = c.id
          WHERE uc.user_id = $1 AND uc.character_id = $2
  `, [user_id, character_id]);

        if (result.rows[0]) {
          const row = result.rows[0];
          return {
            ...row,
            equipment: safe_json_parse(row.equipment, []),
            enhancements: safe_json_parse(row.enhancements, []),
            conversation_memory: safe_json_parse(row.conversation_memory, []),
            significant_memories: safe_json_parse(row.significant_memories, []),
            personality_drift: safe_json_parse(row.personality_drift, {}),
            personality_traits: safe_json_parse(row.personality_traits, []),
            conversation_topics: safe_json_parse(row.conversation_topics, []),
            abilities: safe_json_parse(row.abilities, []),
            recent_decisions: safe_json_parse(row.recent_decisions, [])
          };
        }
        return null;
      } catch (error) {
        console.error('Error finding user character by user and character ID:', error);
        return null;
      }
    }
  },

  battles: {
    async create(data: Partial<Battle>): Promise<Battle | null> {
      try {
        const id = uuidv4();

        await query(`
          INSERT INTO battles(
    id, user_id, is_pve, opponent_user_id,
    opponent_ai_coach_id, opponent_ai_team_id,
    user_character_id, opponent_character_id,
    battle_type, status, phase, current_round, max_rounds,
    user_team_data, opponent_team_data, combat_log, round_results,
    coaching_data, ai_judge_context, global_morale, judge_id, started_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
        `, [
          id,
          data.user_id,
          data.is_pve,
          data.opponent_user_id,
          data.opponent_ai_coach_id,
          data.opponent_ai_team_id,
          data.user_character_id,
          data.opponent_character_id,
          data.battle_type || 'casual',
          data.status || 'active',
          data.phase || 'strategy_select',
          data.current_round || 1,
          data.max_rounds || 3,
          JSON.stringify(data.user_team_data || {}),
          JSON.stringify(data.opponent_team_data || {}),
          JSON.stringify(data.combat_log || []),
          JSON.stringify(data.round_results || []),
          JSON.stringify(data.coaching_data || {}),
          JSON.stringify(data.ai_judge_context || {}),
          JSON.stringify(data.global_morale || { user: 50, opponent: 50 }),
          (data as any).judge_id || null
        ]);

        return await this.find_by_id(id);
      } catch (error) {
        console.error('Error creating battle:', error);
        return null;
      }
    },

    async find_by_id(id: string): Promise<Battle | null> {
      try {
        const result = await query('SELECT * FROM battles WHERE id = $1', [id]);
        if (result.rows[0]) {
          const row = result.rows[0];
          return {
            ...row,
            combat_log: row.combat_log || [],
            chat_logs: JSON.parse(row.chat_logs || '[]')
          };
        }
        return null;
      } catch (error) {
        console.error('Error finding battle by ID:', error);
        return null;
      }
    },

    async update(id: string, data: Partial<Battle>): Promise<boolean> {
      try {
        // SECURITY: Whitelist allowed fields to prevent SQL injection
        const allowed_fields = ['status', 'current_round', 'turn_count',
          'user_strategy', 'opponent_strategy', 'winner_id', 'end_reason',
          'battle_log', 'chat_logs', 'xp_gained', 'bond_gained',
          'currency_gained', 'ended_at'];

        const updates: Record<string, any> = {};

        // Filter and process allowed fields
        Object.entries(data).forEach(([key, value]) => {
          if (allowed_fields.includes(key)) {
            // battle_log is already JSONB, chat_logs needs JSON string conversion
            if (key === 'chat_logs') {
              updates[key] = JSON.stringify(value);
            } else {
              updates[key] = value;
            }
          }
        });

        if (Object.keys(updates).length === 0) return false;

        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1} `);
        const values = Object.values(updates);

        await query(
          `UPDATE battles SET ${fields.join(', ')} WHERE id = $${values.length + 1} `,
          [...values, id]
        );
        return true;
      } catch (error) {
        console.error('Error updating battle:', error);
        return false;
      }
    },

    async find_active_by_user_id(user_id: string): Promise<Battle[]> {
      try {
        const result = await query(`
SELECT * FROM battles
WHERE(user_id = $1 OR opponent_user_id = $2)
            AND status IN('matchmaking', 'active', 'paused')
          ORDER BY started_at DESC
  `, [user_id, user_id]);

        return result.rows.map((row: any) => ({
          ...row,
          combat_log: row.combat_log || [],
          chat_logs: JSON.parse(row.chat_logs || '[]')
        }));
      } catch (error) {
        console.error('Error finding active battles:', error);
        return [];
      }
    }
  },

  characters: {
    async find_by_id(id: string): Promise<Character | null> {
      try {
        const result = await query('SELECT * FROM characters WHERE id = $1', [id]);
        if (result.rows[0]) {
          const row = result.rows[0];
          return {
            ...row,
            personality_traits: row.personality_traits || [],
            conversation_topics: row.conversation_topics || [],
            emotional_range: JSON.parse(row.emotional_range || '[]'),
            abilities: row.abilities || {}
          };
        }
        return null;
      } catch (error) {
        console.error('Error finding character by ID:', error);
        return null;
      }
    },

    async find_random_canonical(count: number = 1): Promise<Character[]> {
      try {
        const result = await query(`
SELECT * FROM characters 
          WHERE role = 'contestant' 
          ORDER BY RANDOM() 
          LIMIT $1
        `, [count]);

        return result.rows.map((row: any) => ({
          ...row,
          personality_traits: row.personality_traits || [],
          conversation_topics: row.conversation_topics || [],
          emotional_range: JSON.parse(row.emotional_range || '[]'),
          abilities: row.abilities || {}
        }));
      } catch (error) {
        console.error('Error finding random canonical characters:', error);
        return [];
      }
    },

    async find_all(): Promise<Character[]> {
      try {
        const result = await query('SELECT * FROM characters ORDER BY rarity DESC, name ASC');
        return result.rows.map((row: any) => ({
          ...row,
          personality_traits: row.personality_traits || [],
          conversation_topics: row.conversation_topics || [],
          emotional_range: JSON.parse(row.emotional_range || '[]'),
          abilities: row.abilities || {}
        }));
      } catch (error) {
        console.error('Error finding all characters:', error);
        return [];
      }
    }
  },

  // Currency operations
  currency: {
    async find_by_user_id(user_id: string): Promise<{ battle_tokens: number; premium_currency: number } | null> {
      try {
        const result = await query('SELECT * FROM user_currency WHERE user_id = $1', [user_id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('Error finding user currency:', error);
        return null;
      }
    },

    async update(user_id: string, data: { battle_tokens?: number; premium_currency?: number }): Promise<boolean> {
      try {
        // Insert or update currency record
        const existing = await this.find_by_user_id(user_id);

        if (existing) {
          // SECURITY: Whitelist allowed fields to prevent SQL injection
          const allowed_fields = ['battle_tokens', 'premium_currency'];
          const updates = Object.entries(data)
            .filter(([key]) => allowed_fields.includes(key))
            .map(([key], index) => `${key} = $${index + 1} `);

          if (updates.length === 0) return false;

          const values = Object.entries(data)
            .filter(([key]) => allowed_fields.includes(key))
            .map(([, value]) => value);

          await query(
            `UPDATE user_currency SET ${updates.join(', ')} WHERE user_id = $${updates.length + 1} `,
            [...values, user_id]
          );
        } else {
          await query(
            `INSERT INTO user_currency(user_id, battle_tokens, premium_currency) VALUES($1, $2, $3)`,
            [user_id, data.battle_tokens || 100, data.premium_currency || 0]
          );
        }
        return true;
      } catch (error) {
        console.error('Error updating user currency:', error);
        return false;
      }
    }
  },

  // User items operations
  user_items: {
    async find_by_user_id(user_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ui.*, i.name, i.description, i.rarity, i.item_type, i.sub_type, i.effects, i.shop_price
          FROM user_items ui
          JOIN items i ON ui.item_id = i.id
          WHERE ui.user_id = $1
          ORDER BY i.rarity DESC, i.name ASC
  `, [user_id]);

        return result.rows.map((row: any) => ({
          id: row.id,
          item_id: row.item_id,
          name: row.name,
          description: row.description,
          rarity: row.rarity,
          item_type: row.item_type,
          sub_type: row.sub_type,
          effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : row.effects,
          shop_price: row.shop_price,
          quantity: row.quantity,
          acquired_at: row.acquired_at,
          acquired_from: row.acquired_from
        }));
      } catch (error) {
        console.error('Error finding user items:', error);
        return [];
      }
    },

    async add(user_id: string, item_id: string, quantity: number = 1, acquired_from: string = 'system'): Promise<boolean> {
      try {
        // Use INSERT ... ON CONFLICT to handle duplicates by updating quantity
        await query(`
          INSERT INTO user_items(user_id, item_id, quantity, acquired_from)
VALUES($1, $2, $3, $4)
          ON CONFLICT(user_id, item_id)
          DO UPDATE SET quantity = user_items.quantity + $3
  `, [user_id, item_id, quantity, acquired_from]);

        return true;
      } catch (error) {
        console.error('Error adding user item:', error);
        return false;
      }
    },

    async remove(user_id: string, item_id: string, quantity: number = 1): Promise<boolean> {
      try {
        // Decrease quantity or remove if quantity becomes 0
        const result = await query(`
          UPDATE user_items 
          SET quantity = quantity - $3
          WHERE user_id = $1 AND item_id = $2 AND quantity >= $3
  `, [user_id, item_id, quantity]);

        if (result.row_count > 0) {
          // Remove items with 0 quantity
          await query(`
            DELETE FROM user_items 
            WHERE user_id = $1 AND item_id = $2 AND quantity <= 0
  `, [user_id, item_id]);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error removing user item:', error);
        return false;
      }
    }
  },

  // User equipment operations
  user_equipment: {
    async find_by_user_id(user_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ue.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects
          FROM user_equipment ue
          JOIN equipment e ON ue.equipment_id = e.id
          WHERE ue.user_id = $1
          ORDER BY e.slot, e.rarity DESC, e.name ASC
        `, [user_id]);
        return result.rows;
      } catch (error) {
        console.error('Error finding user equipment:', error);
        return [];
      }
    },

    async add(user_id: string, equipment_id: string, acquired_from: string = 'starter'): Promise<boolean> {
      try {
        const id = `userequip_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `;
        await query(`
          INSERT INTO user_equipment(id, user_id, equipment_id, acquired_from)
VALUES($1, $2, $3, $4)
  `, [id, user_id, equipment_id, acquired_from]);
        return true;
      } catch (error) {
        console.error('Error adding user equipment:', error);
        return false;
      }
    },

    async equip(user_id: string, equipment_id: string, character_id: string): Promise<boolean> {
      try {
        // First, check if user owns this equipment
        const ownership_check = await query(`
          SELECT id FROM user_equipment
          WHERE user_id = $1 AND equipment_id = $2 AND(equipped_to_character_id IS NULL OR equipped_to_character_id != $3)
          LIMIT 1
  `, [user_id, equipment_id, character_id]);

        if (ownership_check.rows.length === 0) {
          console.error('Equipment not found in user inventory or already equipped to this character');
          return false;
        }

        const user_equipment_id = ownership_check.rows[0].id;

        // Get equipment slot info to handle slot conflicts
        const equipment_info = await query(`
          SELECT slot FROM equipment WHERE id = $1
  `, [equipment_id]);

        if (equipment_info.rows.length === 0) {
          console.error('Equipment not found in equipment table');
          return false;
        }

        const slot = equipment_info.rows[0].slot;

        // Unequip any existing equipment in this slot for this character
        await query(`
          UPDATE user_equipment 
          SET equipped_to_character_id = NULL, equipped_at = NULL
          WHERE user_id = $1 AND equipped_to_character_id = $2 
          AND equipment_id IN(
    SELECT id FROM equipment WHERE slot = $3
  )
  `, [user_id, character_id, slot]);

        // Equip the new equipment
        await query(`
          UPDATE user_equipment
          SET equipped_to_character_id = $1, equipped_at = CURRENT_TIMESTAMP
          WHERE id = $2
  `, [character_id, user_equipment_id]);

        console.log(`✅ Equipped ${equipment_id} to character ${character_id} in slot ${slot} `);
        return true;
      } catch (error) {
        console.error('Error equipping equipment:', error);
        return false;
      }
    },

    async unequip(user_id: string, equipment_id: string, character_id: string): Promise<boolean> {
      try {
        const result = await query(`
          UPDATE user_equipment 
          SET equipped_to_character_id = NULL, equipped_at = NULL
          WHERE user_id = $1 AND equipment_id = $2 AND equipped_to_character_id = $3
  `, [user_id, equipment_id, character_id]);

        console.log(`✅ Unequipped ${equipment_id} from character ${character_id} `);
        return result.row_count > 0;
      } catch (error) {
        console.error('Error unequipping equipment:', error);
        return false;
      }
    },

    async get_equipped_for_character(user_id: string, character_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ue.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type
          FROM user_equipment ue
          JOIN equipment e ON ue.equipment_id = e.id
          WHERE ue.user_id = $1 AND ue.equipped_to_character_id = $2
          ORDER BY e.slot
  `, [user_id, character_id]);
        return result.rows;
      } catch (error) {
        console.error('Error getting equipped items for character:', error);
        return [];
      }
    }
  },

  // Character equipment operations (character-specific inventory)
  character_equipment: {
    async find_by_character_id(character_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ce.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type
          FROM character_equipment ce
          JOIN equipment e ON ce.equipment_id = e.id
          WHERE ce.character_id = $1
          ORDER BY e.slot, e.rarity DESC, e.name ASC
  `, [character_id]);
        return result.rows;
      } catch (error) {
        console.error('Error finding character equipment:', error);
        return [];
      }
    },

    async add(character_id: string, equipment_id: string, acquired_from: string = 'gift'): Promise<boolean> {
      try {
        await query(`
          INSERT INTO character_equipment(character_id, equipment_id, acquired_from)
VALUES($1, $2, $3)
          ON CONFLICT(character_id, equipment_id) DO NOTHING
  `, [character_id, equipment_id, acquired_from]);
        return true;
      } catch (error) {
        console.error('Error adding character equipment:', error);
        return false;
      }
    },

    async equip(character_id: string, equipment_id: string): Promise<boolean> {
      try {
        // Check if character owns this equipment
        const ownership_check = await query(`
          SELECT id FROM character_equipment
          WHERE character_id = $1 AND equipment_id = $2
          LIMIT 1
        `, [character_id, equipment_id]);

        if (ownership_check.rows.length === 0) {
          console.error('Equipment not found in character inventory');
          return false;
        }

        // Check if character is eligible to use this equipment (tier validation)
        const { checkEquipmentEligibility } = await import('./equipmentEligibility');
        const eligibility = await checkEquipmentEligibility(character_id, equipment_id);

        if (!eligibility.can_use) {
          console.error(`Character cannot use this equipment: ${eligibility.reason} `);
          return false;
        }

        // Get equipment slot info to handle slot conflicts
        const equipment_info = await query(`
          SELECT slot FROM equipment WHERE id = $1
  `, [equipment_id]);

        if (equipment_info.rows.length === 0) {
          console.error('Equipment not found in equipment table');
          return false;
        }

        const slot = equipment_info.rows[0].slot;

        // Unequip any existing equipment in this slot for this character
        await query(`
          UPDATE character_equipment 
          SET is_equipped = FALSE, equipped_at = NULL
          WHERE character_id = $1 AND is_equipped = TRUE
          AND equipment_id IN(
    SELECT id FROM equipment WHERE slot = $2
  )
  `, [character_id, slot]);

        // Equip the new equipment
        await query(`
          UPDATE character_equipment 
          SET is_equipped = TRUE, equipped_at = CURRENT_TIMESTAMP
          WHERE character_id = $1 AND equipment_id = $2
  `, [character_id, equipment_id]);

        console.log(`✅ Character ${character_id} equipped ${equipment_id} in slot ${slot} `);
        return true;
      } catch (error) {
        console.error('Error equipping character equipment:', error);
        return false;
      }
    },

    async unequip(character_id: string, equipment_id: string): Promise<boolean> {
      try {
        const result = await query(`
          UPDATE character_equipment 
          SET is_equipped = FALSE, equipped_at = NULL
          WHERE character_id = $1 AND equipment_id = $2 AND is_equipped = TRUE
  `, [character_id, equipment_id]);

        console.log(`✅ Character ${character_id} unequipped ${equipment_id} `);
        return result.row_count > 0;
      } catch (error) {
        console.error('Error unequipping character equipment:', error);
        return false;
      }
    },

    async get_equipped_for_character(character_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ce.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type
          FROM character_equipment ce
          JOIN equipment e ON ce.equipment_id = e.id
          WHERE ce.character_id = $1 AND ce.is_equipped = TRUE
          ORDER BY e.slot
  `, [character_id]);
        return result.rows;
      } catch (error) {
        console.error('Error getting equipped items for character:', error);
        return [];
      }
    }
  },

  // Character items operations (character-specific inventory)
  character_items: {
    async find_by_character_id(character_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT ci.*, i.name, i.description, i.rarity, i.item_type, i.sub_type, i.effects, i.shop_price
          FROM character_items ci
          JOIN items i ON ci.item_id = i.id
          WHERE ci.character_id = $1
          ORDER BY i.rarity DESC, i.name ASC
  `, [character_id]);

        return result.rows.map((row: any) => ({
          id: row.id,
          item_id: row.item_id,
          name: row.name,
          description: row.description,
          rarity: row.rarity,
          item_type: row.item_type,
          sub_type: row.sub_type,
          effects: typeof row.effects === 'string' ? JSON.parse(row.effects) : row.effects,
          shop_price: row.shop_price,
          quantity: row.quantity,
          acquired_at: row.acquired_at,
          acquired_from: row.acquired_from
        }));
      } catch (error) {
        console.error('Error finding character items:', error);
        return [];
      }
    },

    async add(character_id: string, item_id: string, quantity: number = 1, acquired_from: string = 'gift'): Promise<boolean> {
      try {
        await query(`
          INSERT INTO character_items(character_id, item_id, quantity, acquired_from)
VALUES($1, $2, $3, $4)
          ON CONFLICT(character_id, item_id)
          DO UPDATE SET quantity = character_items.quantity + $3
  `, [character_id, item_id, quantity, acquired_from]);

        return true;
      } catch (error) {
        console.error('Error adding character item:', error);
        return false;
      }
    },

    async remove(character_id: string, item_id: string, quantity: number = 1): Promise<boolean> {
      try {
        // Decrease quantity or remove if quantity becomes 0
        const result = await query(`
          UPDATE character_items 
          SET quantity = quantity - $3
          WHERE character_id = $1 AND item_id = $2 AND quantity >= $3
  `, [character_id, item_id, quantity]);

        if (result.row_count > 0) {
          // Remove items with 0 quantity
          await query(`
            DELETE FROM character_items 
            WHERE character_id = $1 AND item_id = $2 AND quantity <= 0
  `, [character_id, item_id]);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error removing character item:', error);
        return false;
      }
    }
  },

  // Inventory transfer operations
  inventory_transfers: {
    async transfer_equipment(
      from_type: 'coach' | 'contestant',
      from_id: string,
      to_type: 'coach' | 'contestant',
      to_id: string,
      equipment_id: string,
      reason: string = 'manual',
      transferred_by?: string
    ): Promise<boolean> {
      try {
        await query('BEGIN');

        // Remove from source
        if (from_type === 'coach') {
          await query(`DELETE FROM user_equipment WHERE user_id = $1 AND equipment_id = $2`, [from_id, equipment_id]);
        } else {
          await query(`DELETE FROM character_equipment WHERE character_id = $1 AND equipment_id = $2`, [from_id, equipment_id]);
        }

        // Add to destination
        if (to_type === 'coach') {
          await db_adapter.user_equipment.add(to_id, equipment_id, 'transfer');
        } else {
          await db_adapter.character_equipment.add(to_id, equipment_id, 'transfer');
        }

        // Log the transfer
        await query(`
          INSERT INTO inventory_transfers(from_owner_type, from_owner_id, to_owner_type, to_owner_id, item_type, item_id, quantity, transfer_reason, transferred_by)
VALUES($1, $2, $3, $4, 'equipment', $5, 1, $6, $7)
  `, [from_type, from_id, to_type, to_id, equipment_id, reason, transferred_by]);

        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        console.error('Error transferring equipment:', error);
        return false;
      }
    },

    async transfer_item(
      from_type: 'coach' | 'contestant',
      from_id: string,
      to_type: 'coach' | 'contestant',
      to_id: string,
      item_id: string,
      quantity: number,
      reason: string = 'manual',
      transferred_by?: string
    ): Promise<boolean> {
      try {
        await query('BEGIN');

        // Remove from source
        if (from_type === 'coach') {
          const success = await db_adapter.user_items.remove(from_id, item_id, quantity);
          if (!success) throw new Error('Failed to remove from coach inventory');
        } else {
          const success = await db_adapter.character_items.remove(from_id, item_id, quantity);
          if (!success) throw new Error('Failed to remove from character inventory');
        }

        // Add to destination
        if (to_type === 'coach') {
          await db_adapter.user_items.add(to_id, item_id, quantity, 'transfer');
        } else {
          await db_adapter.character_items.add(to_id, item_id, quantity, 'transfer');
        }

        // Log the transfer
        await query(`
          INSERT INTO inventory_transfers(from_owner_type, from_owner_id, to_owner_type, to_owner_id, item_type, item_id, quantity, transfer_reason, transferred_by)
VALUES($1, $2, $3, $4, 'item', $5, $6, $7, $8)
  `, [from_type, from_id, to_type, to_id, item_id, quantity, reason, transferred_by]);

        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        console.error('Error transferring item:', error);
        return false;
      }
    }
  },

  // Team equipment pool operations (coach lending system)
  team_equipment_pool: {
    async find_by_user_id(user_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT tep.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type,
  uc.character_id as loaned_to_character_id, c.name as loaned_to_character_name
          FROM team_equipment_pool tep
          JOIN equipment e ON tep.equipment_id = e.id
          LEFT JOIN user_characters uc ON tep.loaned_to_character_id = uc.id
          LEFT JOIN characters c ON uc.character_id = c.id
          WHERE tep.user_id = $1
          ORDER BY tep.is_available DESC, e.rarity DESC, e.name ASC
  `, [user_id]);
        return result.rows;
      } catch (error) {
        console.error('Error finding team equipment pool:', error);
        return [];
      }
    },

    async add(user_id: string, equipment_id: string, acquired_from: string = 'coach_purchase'): Promise<boolean> {
      try {
        await query(`
          INSERT INTO team_equipment_pool(user_id, equipment_id, acquired_from)
VALUES($1, $2, $3)
          ON CONFLICT(user_id, equipment_id) DO NOTHING
  `, [user_id, equipment_id, acquired_from]);
        return true;
      } catch (error) {
        console.error('Error adding equipment to team pool:', error);
        return false;
      }
    },

    async move_from_coach_inventory(user_id: string, equipment_id: string): Promise<boolean> {
      try {
        // Check if coach owns this equipment
        const ownership_check = await query(`
          SELECT id FROM user_equipment
          WHERE user_id = $1 AND equipment_id = $2
  `, [user_id, equipment_id]);

        if (ownership_check.rows.length === 0) {
          console.log('Equipment not found in coach inventory');
          return false;
        }

        await query('BEGIN');

        // Remove from coach inventory
        await query(`
          DELETE FROM user_equipment 
          WHERE user_id = $1 AND equipment_id = $2
  `, [user_id, equipment_id]);

        // Add to team pool
        await query(`
          INSERT INTO team_equipment_pool(user_id, equipment_id, acquired_from)
VALUES($1, $2, 'coach_transfer')
          ON CONFLICT(user_id, equipment_id) DO NOTHING
  `, [user_id, equipment_id]);

        // Log the transfer
        await query(`
          INSERT INTO inventory_transfers(from_owner_type, from_owner_id, to_owner_type, to_owner_id, item_type, item_id, quantity, transfer_reason, transferred_by)
VALUES('coach', $1, 'coach', $1, 'equipment', $2, 1, 'moved_to_team_pool', $1)
  `, [user_id, equipment_id]);

        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        console.error('Error moving equipment from coach inventory to team pool:', error);
        return false;
      }
    },

    async lend_to_character(user_id: string, equipment_id: string, character_id: string): Promise<boolean> {
      try {
        await query('BEGIN');

        // Check if equipment is available in team pool
        const pool_check = await query(`
          SELECT id FROM team_equipment_pool
          WHERE user_id = $1 AND equipment_id = $2 AND is_available = true
  `, [user_id, equipment_id]);

        if (pool_check.rows.length === 0) {
          await query('ROLLBACK');
          console.log('Equipment not available in team pool');
          return false;
        }

        // Check if character already has this equipment (prevent duplicates)
        const character_has_equipment = await query(`
          SELECT id FROM character_equipment
          WHERE character_id = $1 AND equipment_id = $2
  `, [character_id, equipment_id]);

        if (character_has_equipment.rows.length > 0) {
          await query('ROLLBACK');
          console.log('Character already has this equipment');
          return false;
        }

        // Mark as loaned
        await query(`
          UPDATE team_equipment_pool
          SET is_available = false, loaned_to_character_id = $3, loaned_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND equipment_id = $2
  `, [user_id, equipment_id, character_id]);

        // Add to character's equipment (as loaned item)
        const add_success = await db_adapter.character_equipment.add(character_id, equipment_id, 'team_loan');
        if (!add_success) {
          await query('ROLLBACK');
          console.error('Failed to add equipment to character inventory');
          return false;
        }

        // Log the transfer
        await query(`
          INSERT INTO inventory_transfers(from_owner_type, from_owner_id, to_owner_type, to_owner_id, item_type, item_id, quantity, transfer_reason, transferred_by)
VALUES('coach', $1, 'contestant', $2, 'equipment', $3, 1, 'team_loan', $1)
  `, [user_id, character_id, equipment_id]);

        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        console.error('Error lending equipment to character:', error);
        return false;
      }
    },

    async return_from_character(user_id: string, equipment_id: string, character_id: string): Promise<boolean> {
      try {
        await query('BEGIN');

        // Verify character has this equipment as a team loan
        const character_equipment_check = await query(`
          SELECT id FROM character_equipment
          WHERE character_id = $1 AND equipment_id = $2 AND acquired_from = 'team_loan'
  `, [character_id, equipment_id]);

        if (character_equipment_check.rows.length === 0) {
          await query('ROLLBACK');
          console.log('Character does not have this team equipment');
          return false;
        }

        // Verify this equipment is in team pool and loaned to this character
        const team_pool_check = await query(`
          SELECT id FROM team_equipment_pool
          WHERE user_id = $1 AND equipment_id = $2 AND is_available = false AND loaned_to_character_id = $3
  `, [user_id, equipment_id, character_id]);

        if (team_pool_check.rows.length === 0) {
          await query('ROLLBACK');
          console.log('Equipment not found in team pool or not loaned to this character');
          return false;
        }

        // Remove from character's equipment
        await query(`
          DELETE FROM character_equipment 
          WHERE character_id = $1 AND equipment_id = $2 AND acquired_from = 'team_loan'
  `, [character_id, equipment_id]);

        // Mark as available in team pool
        await query(`
          UPDATE team_equipment_pool 
          SET is_available = true, loaned_to_character_id = NULL, loaned_at = NULL
          WHERE user_id = $1 AND equipment_id = $2
  `, [user_id, equipment_id]);

        // Log the return transfer
        await query(`
          INSERT INTO inventory_transfers(from_owner_type, from_owner_id, to_owner_type, to_owner_id, item_type, item_id, quantity, transfer_reason, transferred_by)
VALUES('contestant', $1, 'coach', $2, 'equipment', $3, 1, 'team_return', $2)
  `, [character_id, user_id, equipment_id]);

        await query('COMMIT');
        return true;
      } catch (error) {
        await query('ROLLBACK');
        console.error('Error returning equipment from character:', error);
        return false;
      }
    },

    async get_available_equipment(user_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT tep.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type
          FROM team_equipment_pool tep
          JOIN equipment e ON tep.equipment_id = e.id
          WHERE tep.user_id = $1 AND tep.is_available = true
          ORDER BY e.rarity DESC, e.name ASC
  `, [user_id]);
        return result.rows;
      } catch (error) {
        console.error('Error finding available team equipment:', error);
        return [];
      }
    },

    async get_loaned_equipment(user_id: string): Promise<any[]> {
      try {
        const result = await query(`
          SELECT tep.*, e.name, e.description, e.slot, e.rarity, e.stats, e.effects, e.equipment_type,
  uc.character_id as loaned_to_character_id, c.name as loaned_to_character_name
          FROM team_equipment_pool tep
          JOIN equipment e ON tep.equipment_id = e.id
          JOIN user_characters uc ON tep.loaned_to_character_id = uc.id
          JOIN characters c ON uc.character_id = c.id
          WHERE tep.user_id = $1 AND tep.is_available = false
          ORDER BY tep.loaned_at DESC
  `, [user_id]);
        return result.rows;
      } catch (error) {
        console.error('Error finding loaned team equipment:', error);
        return [];
      }
    }
  },

  // Raw query access for custom operations
  query
};

export default db_adapter;
export type { UserCharacter };
