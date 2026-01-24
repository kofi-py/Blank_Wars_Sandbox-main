-- Add financial personality columns to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS spending_style text DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS money_motivations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS financial_wisdom integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS risk_tolerance integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS luxury_desire integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS generosity integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS financial_traumas text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS money_beliefs text[] DEFAULT '{}';
