import { db, query } from '../database';
import { ai_chat_service } from './aiChatService';
import { performSimpleAdherenceRoll } from './battleAdherenceService';
import { requireNotInBattle } from './battleLockService';

export interface AttributeStat {
  id: string;
  name: string;
  value: number;
  description?: string;
}

export interface AttributeAllocation {
  attribute_id: string;
  points: number;
}

export interface AttributeSurveyOption {
  id: string;
  label: string;
  allocations: AttributeAllocation[];
  rationale?: string;
}

export interface AttributeAdherenceResult {
  success: boolean;
  adhered: boolean;
  coach_choice: AttributeAllocation[];
  final_choice: AttributeAllocation[];
  message?: string;
  survey_required?: boolean;
  survey_options?: AttributeSurveyOption[];
  adherence_score?: number;
}

const ATTRIBUTE_SPECS: Array<{ id: string; column: string; name: string; description: string }> = [
  { id: 'strength', column: 'strength', name: 'Strength', description: 'Physical power and melee capability' },
  { id: 'dexterity', column: 'dexterity', name: 'Dexterity', description: 'Precision, agility, and fine control' },
  { id: 'endurance', column: 'endurance', name: 'Endurance', description: 'Stamina and sustained effort' },
  { id: 'attack', column: 'attack', name: 'Attack', description: 'Overall offensive output' },
  { id: 'defense', column: 'defense', name: 'Defense', description: 'Damage mitigation and resilience' },
  { id: 'speed', column: 'speed', name: 'Speed', description: 'Action tempo and turn priority' },
  { id: 'magic_attack', column: 'magic_attack', name: 'Magic Attack', description: 'Magical damage output' },
  { id: 'magic_defense', column: 'magic_defense', name: 'Magic Defense', description: 'Resistance to magical damage' },
  { id: 'intelligence', column: 'intelligence', name: 'Intelligence', description: 'Tactical and magical efficacy' },
  { id: 'wisdom', column: 'wisdom', name: 'Wisdom', description: 'Decision quality and insight' },
  { id: 'spirit', column: 'spirit', name: 'Spirit', description: 'Willpower and mental fortitude' },
  { id: 'charisma', column: 'charisma', name: 'Charisma', description: 'Leadership and persuasion' },
  { id: 'training', column: 'training', name: 'Training', description: 'Discipline and practice' },
  { id: 'mental_health', column: 'mental_health', name: 'Mental Health', description: 'Psychological stability' },
  { id: 'team_player', column: 'team_player', name: 'Team Player', description: 'Cooperation and synergy' },
  { id: 'ego', column: 'ego', name: 'Ego', description: 'Self-importance (high = rebellious)' },
  { id: 'communication', column: 'communication', name: 'Communication', description: 'Expression and clarity' },
  { id: 'energy_regen', column: 'energy_regen', name: 'Energy Regen', description: 'Energy recovery per turn' },
];

type AttributeRow = {
  id: string;
  user_id: string;
  name: string;
  level: number;
  gameplan_adherence: number;
  attribute_points: number;
  attribute_allocations: Record<string, number>;
  attribute_pending_survey: AttributeSurveyOption[] | null;
} & Record<string, any>;

export async function getCharacterAttributes(character_id: string, user_id?: string) {
  const result = await query(
    `
    SELECT
      uc.id,
      uc.user_id,
      uc.level,
      COALESCE(uc.gameplan_adherence, 70) AS gameplan_adherence,
      COALESCE(uc.attribute_points, 0) AS attribute_points,
      COALESCE(uc.attribute_allocations, '{}'::jsonb) AS attribute_allocations,
      uc.attribute_pending_survey,
      c.name,
      c.strength,
      c.dexterity,
      c.endurance,
      c.attack,
      c.defense,
      c.speed,
      c.magic_attack,
      c.magic_defense,
      c.intelligence,
      c.wisdom,
      c.spirit,
      c.charisma,
      c.training,
      c.mental_health,
      c.team_player,
      c.ego,
      c.communication,
      c.energy_regen
    FROM user_characters uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.id = $1
  `,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const row: AttributeRow = result.rows[0];
  if (user_id && row.user_id !== user_id) {
    throw new Error('Access denied for character');
  }

  const allocations = row.attribute_allocations || {};

  const attributes: AttributeStat[] = ATTRIBUTE_SPECS.map((spec) => {
    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (row[spec.column] === undefined) {
      throw new Error(`Missing base stat ${spec.column} for character ${row.id}`);
    }
    const base_value = Number(row[spec.column]);
    // Allocations are optional/sparse, so 0 default is correct here
    const allocated = Number(allocations[spec.id] || 0);
    return {
      id: spec.id,
      name: spec.name,
      value: base_value + allocated,
      description: spec.description,
    };
  });

  return {
    character: {
      id: row.id,
      name: row.name,
      level: row.level || 1,
      gameplan_adherence: row.gameplan_adherence,
      unspent_attribute_points: row.attribute_points,
    },
    attributes,
    pending_allocations: Object.entries(allocations).map(([attribute_id, points]) => ({
      attribute_id,
      points: Number(points),
    })),
    pending_survey: row.attribute_pending_survey || undefined,
  };
}

function validateAllocations(allocations: AttributeAllocation[]) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('At least one allocation is required');
  }
  allocations.forEach((a) => {
    if (!a.attribute_id || typeof a.points !== 'number' || a.points <= 0) {
      throw new Error('Each allocation requires attribute_id and positive points');
    }
    const valid = ATTRIBUTE_SPECS.some((spec) => spec.id === a.attribute_id);
    if (!valid) {
      throw new Error(`Invalid attribute_id: ${a.attribute_id}`);
    }
  });
}

function sumAllocations(allocations: AttributeAllocation[]) {
  return allocations.reduce((sum, a) => sum + a.points, 0);
}

function computeAdherence(gameplan_adherence: number) {
  const { roll, passed } = performSimpleAdherenceRoll(gameplan_adherence);
  return { adhered: passed, adherence_score: gameplan_adherence, roll };
}

function buildSurveyOptions(total_points: number): AttributeSurveyOption[] {
  // Simple deterministic options to avoid randomness: focus, split, balance
  const topAttrs = ATTRIBUTE_SPECS.slice(0, 3).map((spec, idx) => ({
    id: `option_focus_${spec.id}`,
    label: `Focus on ${spec.name}`,
    allocations: [{ attribute_id: spec.id, points: total_points }],
    rationale: `All points into ${spec.name} for a strong spike.`,
  }));

  const splitOption: AttributeSurveyOption = {
    id: 'option_split_top2',
    label: 'Split between Strength & Defense',
    allocations: [
      { attribute_id: 'strength', points: Math.ceil(total_points / 2) },
      { attribute_id: 'defense', points: Math.floor(total_points / 2) },
    ],
    rationale: 'Balanced durability and power.',
  };

  const balancedCount = Math.min(4, ATTRIBUTE_SPECS.length);
  const evenPoints = Math.max(1, Math.floor(total_points / balancedCount));
  const balancedOption: AttributeSurveyOption = {
    id: 'option_balanced',
    label: 'Balanced growth',
    allocations: ATTRIBUTE_SPECS.slice(0, balancedCount).map((spec, idx) => ({
      attribute_id: spec.id,
      points: idx === 0 ? total_points - evenPoints * (balancedCount - 1) : evenPoints,
    })),
    rationale: 'Spread points evenly for steady growth.',
  };

  return [...topAttrs, splitOption, balancedOption];
}

export async function allocateAttributes(params: {
  character_id: string;
  user_id: string;
  allocations: AttributeAllocation[];
  coach_notes?: string;
}): Promise<AttributeAdherenceResult> {
  const { character_id, user_id, allocations, coach_notes } = params;
  validateAllocations(allocations);
  const total_points = sumAllocations(allocations);

  // Check if character is in battle
  await requireNotInBattle(character_id);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT user_id,
             COALESCE(attribute_points, 0) AS attribute_points,
             COALESCE(attribute_allocations, '{}'::jsonb) AS attribute_allocations,
             COALESCE(gameplan_adherence, 70) AS gameplan_adherence
      FROM user_characters
      WHERE id = $1
      FOR UPDATE
    `,
      [character_id]
    );

    if (currentResult.rowCount === 0) {
      throw new Error(`Character ${character_id} not found`);
    }

    const row = currentResult.rows[0];
    if (row.user_id !== user_id) {
      throw new Error('Access denied for character');
    }

    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (row.attribute_points === undefined) throw new Error(`attribute_points missing for ${character_id}`);
    if (row.gameplan_adherence === undefined) throw new Error(`gameplan_adherence missing for ${character_id}`);

    const available_points = Number(row.attribute_points);
    if (available_points < total_points) {
      throw new Error(`Not enough attribute points. Available: ${available_points}, required: ${total_points}`);
    }

    const existingAllocations: Record<string, number> = row.attribute_allocations || {};
    const { adhered, adherence_score } = computeAdherence(Number(row.gameplan_adherence));

    if (!adhered) {
      const survey_options = buildSurveyOptions(total_points);
      await client.query(
        `UPDATE user_characters
         SET attribute_pending_survey = $1
         WHERE id = $2`,
        [JSON.stringify(survey_options), character_id]
      );
      await client.query('COMMIT');
      return {
        success: true,
        adhered: false,
        coach_choice: allocations,
        final_choice: allocations,
        message: 'Adherence failed. Character will decide via survey.',
        survey_required: true,
        survey_options,
        adherence_score,
      };
    }

    const newAllocations = { ...existingAllocations };
    allocations.forEach((a) => {
      newAllocations[a.attribute_id] = (newAllocations[a.attribute_id] || 0) + a.points;
    });

    await client.query(
      `UPDATE user_characters
       SET attribute_points = attribute_points - $1,
           attribute_allocations = $2,
           attribute_pending_survey = NULL
       WHERE id = $3`,
      [total_points, JSON.stringify(newAllocations), character_id]
    );

    await client.query('COMMIT');
    return {
      success: true,
      adhered: true,
      coach_choice: allocations,
      final_choice: allocations,
      message: coach_notes || 'Attribute allocation applied successfully.',
      survey_required: false,
      adherence_score,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function submitAttributeSurveyChoice(params: {
  character_id: string;
  user_id: string;
  survey_option_id: string;
}): Promise<AttributeAdherenceResult> {
  const { character_id, user_id, survey_option_id } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT user_id,
             COALESCE(attribute_points, 0) AS attribute_points,
             COALESCE(attribute_allocations, '{}'::jsonb) AS attribute_allocations,
             attribute_pending_survey,
             COALESCE(gameplan_adherence, 70) AS gameplan_adherence
      FROM user_characters
      WHERE id = $1
      FOR UPDATE
    `,
      [character_id]
    );

    if (currentResult.rowCount === 0) {
      throw new Error(`Character ${character_id} not found`);
    }

    const row = currentResult.rows[0];
    if (row.user_id !== user_id) {
      throw new Error('Access denied for character');
    }

    const pending: AttributeSurveyOption[] = row.attribute_pending_survey || [];
    if (!pending || pending.length === 0) {
      throw new Error('No pending survey options to apply');
    }

    const choice = pending.find((opt) => opt.id === survey_option_id);
    if (!choice) {
      throw new Error('Invalid survey option id');
    }

    validateAllocations(choice.allocations);
    const total_points = sumAllocations(choice.allocations);
    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (row.attribute_points === undefined) throw new Error(`attribute_points missing for ${character_id}`);
    if (row.gameplan_adherence === undefined) throw new Error(`gameplan_adherence missing for ${character_id}`);

    const available_points = Number(row.attribute_points);
    if (available_points < total_points) {
      throw new Error(`Not enough attribute points. Available: ${available_points}, required: ${total_points}`);
    }

    const existingAllocations: Record<string, number> = row.attribute_allocations || {};
    const newAllocations = { ...existingAllocations };
    choice.allocations.forEach((a) => {
      newAllocations[a.attribute_id] = (newAllocations[a.attribute_id] || 0) + a.points;
    });

    await client.query(
      `UPDATE user_characters
       SET attribute_points = attribute_points - $1,
           attribute_allocations = $2,
           attribute_pending_survey = NULL
       WHERE id = $3`,
      [total_points, JSON.stringify(newAllocations), character_id]
    );

    await client.query('COMMIT');
    return {
      success: true,
      adhered: false,
      coach_choice: choice.allocations,
      final_choice: choice.allocations,
      message: 'Character survey choice applied.',
      survey_required: false,
      adherence_score: Number(row.gameplan_adherence),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function requestAttributeAdvice(params: {
  character_id: string;
  user_id: string;
  message: string;
  attributes?: AttributeStat[];
  character_name?: string;
}): Promise<{ reply: string }> {
  const { message, attributes, character_name } = params;
  const sorted = (attributes || []).slice().sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 3).map((a) => `${a.name} (${a.value})`).join(', ');
  const focus = sorted[0]?.name || 'core strengths';

  const reply = [
    `${character_name || 'The character'} considers your note: "${message}".`,
    top ? `Top attributes right now: ${top}.` : 'No attributes reported yet.',
    `Recommendation: invest in ${focus} for immediate impact, then shore up defenses and speed.`,
    'If you want a balanced plan, split points across Strength, Defense, and Speed.',
  ].join(' ');

  return { reply };
}
