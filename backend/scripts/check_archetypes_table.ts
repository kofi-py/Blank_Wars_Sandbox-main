
import { query } from '../src/database';

async function checkTableExists() {
    try {
        const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'archetypes'
      );
    `);
        console.log('Archetypes table exists:', result.rows[0].exists);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkTableExists();
