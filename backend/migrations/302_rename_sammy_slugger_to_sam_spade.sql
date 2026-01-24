-- Migration: 302 - Rename sammy_slugger to sam_spade
-- Description: Renames the character ID and updates all foreign key references
-- Strategy: Drop ALL FK constraints referencing characters.id, update in place, re-add constraints
-- Fixed: 2026-01-02 - Added missing constraints (battles_judge_id_fkey, user_characters_old)
-- Note: Drops deprecated user_characters_old table entirely

BEGIN;

-- 1. Drop ALL FK constraints that reference characters.id
ALTER TABLE ai_characters DROP CONSTRAINT IF EXISTS ai_characters_character_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_judge_id_fkey;
ALTER TABLE claimable_pack_contents DROP CONSTRAINT IF EXISTS claimable_pack_contents_character_id_fkey;
ALTER TABLE domain_context DROP CONSTRAINT IF EXISTS domain_context_character_id_fkey;
ALTER TABLE judge_bonuses DROP CONSTRAINT IF EXISTS judge_bonuses_character_id_fkey;
ALTER TABLE signature_attribute_modifiers DROP CONSTRAINT IF EXISTS signature_attribute_modifiers_character_id_fkey;
ALTER TABLE spell_definitions DROP CONSTRAINT IF EXISTS spell_definitions_character_id_fkey;
ALTER TABLE therapist_bonuses DROP CONSTRAINT IF EXISTS therapist_bonuses_character_id_fkey;

-- 2. Drop deprecated user_characters_old table (unused, blocking migration)
DROP TABLE IF EXISTS user_characters_old;

-- 3. Update the main characters table FIRST (triggers on user_characters need sam_spade to exist)
UPDATE characters
SET
    id = 'sam_spade',
    name = 'Sam Spade',
    title = 'Private Detective',
    origin_era = 'Prohibition Era San Francisco (1920s-1930s)',
    personality_traits = '["Cynical", "Sharp", "Detached", "Determined"]'::jsonb,
    conversation_style = 'Hard-boiled, terse, noir',
    backstory = 'A private eye in San Francisco whose partner Miles Archer was murdered during the Maltese Falcon case. Described as looking like a blond Satan. He plays by his own code—neither fully crooked nor fully straight.',
    conversation_topics = '["The Maltese Falcon", "Miles Archer", "San Francisco", "The detective business", "Trust and betrayal"]'::jsonb,
    avatar_emoji = '🕵️',
    comedian_name = 'Humphrey Bogart',
    comedy_style = 'Hard-boiled detective noir with dry wit and cynical observations'
WHERE id = 'sammy_slugger';

-- 4. Update all tables that reference sammy_slugger (after characters table so triggers work)
UPDATE user_characters SET character_id = 'sam_spade' WHERE character_id = 'sammy_slugger';
UPDATE power_definitions SET character_id = 'sam_spade' WHERE character_id = 'sammy_slugger';
UPDATE domain_context SET character_id = 'sam_spade' WHERE character_id = 'sammy_slugger';
UPDATE signature_attribute_modifiers SET character_id = 'sam_spade' WHERE character_id = 'sammy_slugger';
UPDATE claimable_pack_contents SET character_id = 'sam_spade' WHERE character_id = 'sammy_slugger';
UPDATE battles SET judge_id = 'sam_spade' WHERE judge_id = 'sammy_slugger';

-- 5. Re-add FK constraints
ALTER TABLE ai_characters ADD CONSTRAINT ai_characters_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE battles ADD CONSTRAINT battles_judge_id_fkey
    FOREIGN KEY (judge_id) REFERENCES characters(id);
ALTER TABLE claimable_pack_contents ADD CONSTRAINT claimable_pack_contents_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE domain_context ADD CONSTRAINT domain_context_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE judge_bonuses ADD CONSTRAINT judge_bonuses_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE signature_attribute_modifiers ADD CONSTRAINT signature_attribute_modifiers_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE spell_definitions ADD CONSTRAINT spell_definitions_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);
ALTER TABLE therapist_bonuses ADD CONSTRAINT therapist_bonuses_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id);

-- 6. Verify the rename worked
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters WHERE id = 'sam_spade') THEN
        RAISE EXCEPTION 'Failed to rename character to sam_spade';
    END IF;

    IF EXISTS (SELECT 1 FROM characters WHERE id = 'sammy_slugger') THEN
        RAISE EXCEPTION 'sammy_slugger still exists after rename';
    END IF;

    RAISE NOTICE 'Successfully renamed sammy_slugger to sam_spade';
END $$;

COMMIT;

-- Log migration (outside transaction so it only runs if above succeeds)
INSERT INTO migration_log (version, name)
VALUES (302, '302_rename_sammy_slugger_to_sam_spade')
ON CONFLICT (version) DO NOTHING;
