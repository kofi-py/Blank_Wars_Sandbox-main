// backend/src/utils/schemaGuard.ts
import { Pool } from 'pg';

const REQUIRED = {
  claimable_packs: ['id','pack_type','claimed_by_user_id','claimed_at'],
  // memory_entries: Removed - table doesn't exist and isn't used
  characters: ['id','name'],
  equipment: ['id','name','rarity'], // Fixed - equipment doesn't have character_id/character_name
};

export default async function runSchemaGuard(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // or rely on PG* env vars; Pool handles both cases
  });

  const client = await pool.connect();
  try {
    console.log('[schemaGuard] verifying expected columns...');
    for (const [table, cols] of Object.entries(REQUIRED)) {
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      const present = new Set(rows.map(r => r.column_name as string));
      const missing = cols.filter(c => !present.has(c));
      if (missing.length) {
        console.warn(`[schemaGuard] ${table} missing columns: ${missing.join(', ')}`);
      } else {
        console.log(`[schemaGuard] ${table} OK`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}