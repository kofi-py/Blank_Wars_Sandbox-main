
export interface FinancialPersonality {
    spending_style: 'conservative' | 'moderate' | 'impulsive' | 'strategic';
    money_motivations: string[];
    financial_wisdom: number;
    risk_tolerance: number;
    luxury_desire: number;
    generosity: number;
    financial_traumas: string[];
}

// NOTE: All financial personality calculations are now done by PostgreSQL
// as GENERATED columns in the user_characters table.
// See migrations:
//   - 105_make_financial_stress_generated.sql
//   - 106_make_coach_trust_generated.sql
// 
// The calculations automatically update based on the financial_personality JSON field.
// No TypeScript calculation functions are needed.
