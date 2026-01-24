
import { initialize_database, closeDatabase } from '../src/database';

async function runInit() {
    try {
        await initialize_database();
        await closeDatabase();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

runInit();
