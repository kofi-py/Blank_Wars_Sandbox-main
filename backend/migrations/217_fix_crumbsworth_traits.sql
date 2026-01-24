-- Migration: Fix Crumbsworth personality_traits JSON
-- Converts plain string to valid JSON array

UPDATE characters
SET personality_traits = '["Quirky", "Helpful", "Existentially Confused", "Enthusiastic about Breakfast", "Supportive"]'::jsonb
WHERE name = 'Crumbsworth';
