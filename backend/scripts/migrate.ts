import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔵 Starting Node.js migration runner...');

// Configuration
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SCRIPT_DIR = __dirname;
const MIGRATIONS_DIR = path.join(SCRIPT_DIR, '../migrations');
const LOG_FILE = path.join(SCRIPT_DIR, '../migration.log');

// Log function
function log(message: string) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMessage = `${timestamp} - ${message}`;
    console.log(logMessage);
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
        // ignore log file errors
    }
}

// Database Connection
let DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    if (ENVIRONMENT === 'development') {
        const DB_HOST = process.env.DEV_DB_HOST || 'localhost';
        const DB_PORT = process.env.DEV_DB_PORT || '5432';
        const DB_NAME = process.env.DEV_DB_NAME || 'blankwars';
        const DB_USER = process.env.DEV_DB_USER || 'postgres';
        const DB_PASSWORD = process.env.DEV_DB_PASSWORD || '';
        
        DB_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
        log(`Using development connection parameters: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    } else {
        log(`Error: DATABASE_URL is not set for environment '${ENVIRONMENT}'`);
        process.exit(1);
    }
}

// Check psql
try {
    execSync('psql --version', { stdio: 'ignore' });
} catch (error) {
    log('Error: psql command not found. Please install PostgreSQL client tools.');
    process.exit(1);
}

// Check connection
log('Checking database connection...');
try {
    execSync(`psql "${DB_URL}" -c "SELECT 1"`, { stdio: 'ignore' });
} catch (error) {
    log('Error: Cannot connect to database. Please check your connection parameters.');
    log('If the database does not exist, try creating it with: createdb ' + (process.env.DEV_DB_NAME || 'blankwars'));
    process.exit(1);
}

// Initialize migration_log table handling
let appliedMigrations = new Set<string>();

try {
    const output = execSync(`psql "${DB_URL}" -t -c "SELECT version FROM migration_log"`, { encoding: 'utf-8' });
    const versions = output.trim().split('\n').map(v => v.trim()).filter(v => v);
    versions.forEach(v => appliedMigrations.add(parseInt(v).toString())); 
} catch (error) {
    log('migration_log table does not exist or cannot be queried. Assuming fresh database.');
}

// List migration files
const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); 

log(`Found ${files.length} migration files.`);

let appliedCount = 0;

for (const file of files) {
    // Extract version from filename "001_baseline..." -> "1"
    const versionMatch = file.match(/^(\d+)/);
    if (!versionMatch) {
       log(`Skipping invalid filename: ${file}`);
       continue;
    }
    const versionStr = versionMatch[1];
    const versionInt = parseInt(versionStr).toString();

    if (appliedMigrations.has(versionInt)) {
        continue;
    }

    log(`Applying migration: ${file}`);
    const filePath = path.join(MIGRATIONS_DIR, file);
    
    try {
        // Run the migration
        execSync(`psql -v ON_ERROR_STOP=1 "${DB_URL}" -f "${filePath}"`, { stdio: 'inherit' });
        
        // Record success
        // 001 creates the table. If 001 just ran, the table now exists.
        
        execSync(`psql "${DB_URL}" -c "INSERT INTO migration_log (version, name) VALUES (${versionInt}, '${file}') ON CONFLICT (version) DO NOTHING"`);
        
        log(`Successfully applied migration: ${file}`);
        appliedCount++;
    } catch (error) {
        log(`Failed to apply migration: ${file}`);
        process.exit(1);
    }
}

if (appliedCount === 0) {
    log('Database is up to date.');
} else {
    log(`Migration process completed successfully! Applied ${appliedCount} migrations.`);
}
