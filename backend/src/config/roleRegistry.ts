// Database-driven role system - minimal functions only
export type TherapyRole = 'therapist' | 'patient' | 'judge';

// Get all characters by role from database
export async function getCharactersByRole(role: 'therapist' | 'judge' | 'contestant'): Promise<string[]> {
  const { query } = require('../database/postgres');
  const result = await query('SELECT id FROM characters WHERE role = $1', [role]);
  return result.rows.map((row: { id: string }) => row.id);
}

// OPTIONAL: centralize session-type constraints
export const THERAPY_SESSION_CONSTRAINTS = {
  individual: { min_patients: 1, max_patients: 1, therapists: 1 },
  group:      { min_patients: 2, max_patients: 3, therapists: 1 },
} as const;