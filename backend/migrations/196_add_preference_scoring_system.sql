-- Create the Enum for Category Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preference_category_type') THEN
        CREATE TYPE preference_category_type AS ENUM (
            'damage_type', 
            'equipment_type', 
            'spell_category', 
            'power_category', 
            'attribute', 
            'resource', 
            'combat_style'
        );
    END IF;
END $$;

-- Create the Character Category Preferences Table
CREATE TABLE IF NOT EXISTS character_category_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    category_type preference_category_type NOT NULL,
    category_value TEXT NOT NULL,
    rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 4),
    preference_score INTEGER CHECK (preference_score >= 1 AND preference_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, category_type, category_value)
);

-- Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_char_cat_pref_char_id ON character_category_preferences(character_id);

-- Add preference_score columns to Item Tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_spells' AND column_name = 'preference_score') THEN
        ALTER TABLE character_spells ADD COLUMN preference_score INTEGER DEFAULT 50 CHECK (preference_score >= 1 AND preference_score <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_powers' AND column_name = 'preference_score') THEN
        ALTER TABLE character_powers ADD COLUMN preference_score INTEGER DEFAULT 50 CHECK (preference_score >= 1 AND preference_score <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'character_equipment' AND column_name = 'preference_score') THEN
        ALTER TABLE character_equipment ADD COLUMN preference_score INTEGER DEFAULT 50 CHECK (preference_score >= 1 AND preference_score <= 100);
    END IF;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (196, '196_add_preference_scoring_system')
ON CONFLICT (version) DO NOTHING;
