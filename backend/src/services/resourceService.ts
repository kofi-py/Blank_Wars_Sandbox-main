import { db, query } from '../database';
import { performSimpleAdherenceRoll } from './battleAdherenceService';

export interface ResourceStat {
  id: string;
  name: string;
  value: number;
}

export interface ResourceAllocation {
  resource_id: string;
  points: number;
}

export interface ResourceSurveyOption {
  id: string;
  label: string;
  allocations: ResourceAllocation[];
  rationale?: string;
}

export interface ResourceAdherenceResult {
  success: boolean;
  adhered: boolean;
  coach_choice: ResourceAllocation[];
  final_choice: ResourceAllocation[];
  message?: string;
  survey_required?: boolean;
  survey_options?: ResourceSurveyOption[];
  adherence_score?: number;
  roll?: number;
}

const RESOURCE_SPECS = [
  { id: 'max_health', column: 'max_health', name: 'Max Health' },
  { id: 'max_energy', column: 'max_energy', name: 'Max Energy' },
  { id: 'max_mana', column: 'max_mana', name: 'Max Mana' },
];

export async function getCharacterResources(character_id: string, user_id?: string) {
  const result = await query(
    `
    SELECT
      uc.id,
      uc.user_id,
      uc.level,
      COALESCE(uc.gameplan_adherence, 70) AS gameplan_adherence,
      COALESCE(uc.resource_points, 0) AS resource_points,
      COALESCE(uc.resource_allocations, '{}'::jsonb) AS resource_allocations,
      uc.resource_pending_survey,
      c.name,
      c.max_health,
      c.max_energy,
      c.max_mana
    FROM user_characters uc
    JOIN characters c ON c.id = uc.character_id
    WHERE uc.id = $1
  `,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const row = result.rows[0];
  if (user_id && row.user_id !== user_id) {
    throw new Error('Access denied for character');
  }

  const allocations = row.resource_allocations || {};

  const resources: ResourceStat[] = RESOURCE_SPECS.map((spec) => {
    const base_value = Number(row[spec.column] || 0);
    const allocated = Number(allocations[spec.id] || 0);
    return {
      id: spec.id,
      name: spec.name,
      value: base_value + allocated,
    };
  });

  return {
    character: {
      id: row.id,
      name: row.name,
      level: row.level || 1,
      gameplan_adherence: row.gameplan_adherence,
      unspent_resource_points: row.resource_points,
    },
    resources,
    pending_allocations: Object.entries(allocations).map(([resource_id, points]) => ({
      resource_id,
      points: Number(points),
    })),
    pending_survey: row.resource_pending_survey || undefined,
  };
}

function validateAllocations(allocations: ResourceAllocation[]) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('At least one allocation is required');
  }
  allocations.forEach((a) => {
    if (!a.resource_id || typeof a.points !== 'number' || a.points <= 0) {
      throw new Error('Each allocation requires resource_id and positive points');
    }
    const valid = RESOURCE_SPECS.some((spec) => spec.id === a.resource_id);
    if (!valid) {
      throw new Error(`Invalid resource_id: ${a.resource_id}`);
    }
  });
}

function sumAllocations(allocations: ResourceAllocation[]) {
  return allocations.reduce((sum, a) => sum + a.points, 0);
}

function buildSurveyOptions(total_points: number): ResourceSurveyOption[] {
  return [
    {
      id: 'option_health',
      label: 'Focus on Health',
      allocations: [{ resource_id: 'max_health', points: total_points }],
      rationale: 'Maximize survivability.',
    },
    {
      id: 'option_energy',
      label: 'Focus on Energy',
      allocations: [{ resource_id: 'max_energy', points: total_points }],
      rationale: 'More physical actions per battle.',
    },
    {
      id: 'option_mana',
      label: 'Focus on Mana',
      allocations: [{ resource_id: 'max_mana', points: total_points }],
      rationale: 'More magical power.',
    },
    {
      id: 'option_balanced',
      label: 'Balanced',
      allocations: [
        { resource_id: 'max_health', points: Math.ceil(total_points / 3) },
        { resource_id: 'max_energy', points: Math.floor(total_points / 3) },
        { resource_id: 'max_mana', points: total_points - Math.ceil(total_points / 3) - Math.floor(total_points / 3) },
      ],
      rationale: 'Spread evenly across all resources.',
    },
  ];
}

export async function allocateResources(params: {
  character_id: string;
  user_id: string;
  allocations: ResourceAllocation[];
}): Promise<ResourceAdherenceResult> {
  const { character_id, user_id, allocations } = params;
  validateAllocations(allocations);
  const total_points = sumAllocations(allocations);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT user_id,
             COALESCE(resource_points, 0) AS resource_points,
             COALESCE(resource_allocations, '{}'::jsonb) AS resource_allocations,
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

    const available_points = Number(row.resource_points);
    if (available_points < total_points) {
      throw new Error(`Not enough resource points. Available: ${available_points}, required: ${total_points}`);
    }

    const existingAllocations: Record<string, number> = row.resource_allocations || {};
    const { passed, roll } = performSimpleAdherenceRoll(Number(row.gameplan_adherence));

    if (!passed) {
      const survey_options = buildSurveyOptions(total_points);
      await client.query(
        `UPDATE user_characters
         SET resource_pending_survey = $1
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
        adherence_score: Number(row.gameplan_adherence),
        roll,
      };
    }

    const newAllocations = { ...existingAllocations };
    allocations.forEach((a) => {
      newAllocations[a.resource_id] = (newAllocations[a.resource_id] || 0) + a.points;
    });

    await client.query(
      `UPDATE user_characters
       SET resource_points = resource_points - $1,
           resource_allocations = $2,
           resource_pending_survey = NULL
       WHERE id = $3`,
      [total_points, JSON.stringify(newAllocations), character_id]
    );

    await client.query('COMMIT');
    return {
      success: true,
      adhered: true,
      coach_choice: allocations,
      final_choice: allocations,
      message: 'Resource allocation applied successfully.',
      survey_required: false,
      adherence_score: Number(row.gameplan_adherence),
      roll,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function submitResourceSurveyChoice(params: {
  character_id: string;
  user_id: string;
  survey_option_id: string;
}): Promise<ResourceAdherenceResult> {
  const { character_id, user_id, survey_option_id } = params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT user_id,
             COALESCE(resource_points, 0) AS resource_points,
             COALESCE(resource_allocations, '{}'::jsonb) AS resource_allocations,
             resource_pending_survey,
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

    const pending: ResourceSurveyOption[] = row.resource_pending_survey || [];
    if (!pending || pending.length === 0) {
      throw new Error('No pending survey options to apply');
    }

    const choice = pending.find((opt) => opt.id === survey_option_id);
    if (!choice) {
      throw new Error('Invalid survey option id');
    }

    validateAllocations(choice.allocations);
    const total_points = sumAllocations(choice.allocations);

    const available_points = Number(row.resource_points);
    if (available_points < total_points) {
      throw new Error(`Not enough resource points. Available: ${available_points}, required: ${total_points}`);
    }

    const existingAllocations: Record<string, number> = row.resource_allocations || {};
    const newAllocations = { ...existingAllocations };
    choice.allocations.forEach((a) => {
      newAllocations[a.resource_id] = (newAllocations[a.resource_id] || 0) + a.points;
    });

    await client.query(
      `UPDATE user_characters
       SET resource_points = resource_points - $1,
           resource_allocations = $2,
           resource_pending_survey = NULL
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
