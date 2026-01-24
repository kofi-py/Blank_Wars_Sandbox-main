import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../src/database/postgres';

async function analyzeColumnNames() {
    try {
        const result = await query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, column_name;
    `);

        // Filter for potential money-related terms
        const moneyTerms = ['price', 'cost', 'value', 'amount', 'balance', 'wallet', 'money', 'cash', 'currency', 'fund', 'budget'];

        const potentialMoneyColumns = result.rows.filter(row => {
            const colName = row.column_name.toLowerCase();
            return moneyTerms.some(term => colName.includes(term));
        });

        console.log('Potential Money Columns:', potentialMoneyColumns);
    } catch (error) {
        console.error('Error:', error);
    }
}

analyzeColumnNames();
