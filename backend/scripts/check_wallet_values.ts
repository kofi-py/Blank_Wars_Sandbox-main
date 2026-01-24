import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function checkWalletValues() {
    try {
        const result = await query(`
      SELECT id, wallet, wallet_cents, debt_principal_cents, monthly_earnings_cents
      FROM user_characters
      LIMIT 10;
    `);
        console.log('Wallet Values:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkWalletValues();
