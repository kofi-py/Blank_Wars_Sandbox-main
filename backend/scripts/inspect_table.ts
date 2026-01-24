import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/blankwars';

const tableName = process.argv[2] || 'spell_definitions';

try {
    const output = execSync(`psql "${DB_URL}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY column_name"`, { encoding: 'utf-8' });
    console.log('Columns:');
    console.log(output);

    const constraints = execSync(`psql "${DB_URL}" -t -c "SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace JOIN pg_class cls ON cls.oid = c.conrelid WHERE cls.relname = '${tableName}'"`, { encoding: 'utf-8' });
    console.log('Constraints:');
    console.log(constraints);
} catch (error) {
    console.error('Error querying table info:', error);
}
