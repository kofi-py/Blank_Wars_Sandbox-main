-- Add attack_type_id to battle_actions table
ALTER TABLE battle_actions 
ADD COLUMN IF NOT EXISTS attack_type_id TEXT REFERENCES attack_types(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_battle_actions_attack_type_id ON battle_actions(attack_type_id);
