-- Migration 303: Add System Character and Mascot Slots to Teams
-- Adds active + backup slots for all system characters and mascots
-- Also adds backup contestant slots (4-6)

BEGIN;

-- Add active system character slots (5 new columns)
ALTER TABLE teams
    ADD COLUMN judge_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN host_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_active UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add backup system character slots (5 new columns)
ALTER TABLE teams
    ADD COLUMN judge_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN therapist_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN trainer_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN host_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN real_estate_agent_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add backup contestant slots (3 new columns)
ALTER TABLE teams
    ADD COLUMN character_slot_4 UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN character_slot_5 UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN character_slot_6 UUID REFERENCES user_characters(id) ON DELETE SET NULL;

-- Add mascot slots (2 new columns)
ALTER TABLE teams
    ADD COLUMN mascot_active UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    ADD COLUMN mascot_backup UUID REFERENCES user_characters(id) ON DELETE SET NULL;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (303, '303_add_system_char_slots_to_teams')
ON CONFLICT (version) DO NOTHING;
