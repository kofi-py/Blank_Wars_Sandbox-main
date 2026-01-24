-- Add ap_cost column to spell_definitions table
ALTER TABLE spell_definitions ADD COLUMN ap_cost INTEGER NOT NULL DEFAULT 1;

-- Update existing spells to have appropriate AP costs (mostly 1, but some powerful ones might be 2 or 3)
-- For now, default all to 1 as per user request for "Move Jab Spell" combo support
UPDATE spell_definitions SET ap_cost = 1;
