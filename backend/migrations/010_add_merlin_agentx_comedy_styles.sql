-- Migration 010: Add comedy style references for Merlin and Agent X
-- These characters were missing from migration 040

BEGIN;

-- Merlin: wise wizard, mystic adviser
UPDATE characters
SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'magician_051' LIMIT 1)
WHERE id = 'merlin';

-- Agent X: professional spy, brief and calculated
UPDATE characters
SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'deadpan_014' LIMIT 1)
WHERE id = 'agent_x';


COMMIT;
