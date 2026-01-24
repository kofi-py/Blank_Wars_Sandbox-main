DO $$
BEGIN
    -- Check if the column 'character_points' exists before trying to rename it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_characters' 
        AND column_name = 'character_points'
    ) THEN
        ALTER TABLE user_characters RENAME COLUMN character_points TO ability_points;
    END IF;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (195, '195_rename_character_points_to_ability_points')
ON CONFLICT (version) DO NOTHING;
