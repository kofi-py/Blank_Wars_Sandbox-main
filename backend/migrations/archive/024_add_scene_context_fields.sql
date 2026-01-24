-- Migration: Add rich scene context fields to support universal template system
-- These fields provide environmental and emotional context for all scene interactions

-- Add rich context fields to characters table for default character states
ALTER TABLE characters 
ADD COLUMN default_mood VARCHAR(50) DEFAULT 'neutral',
ADD COLUMN default_energy_level INTEGER DEFAULT 100 CHECK (default_energy_level >= 0 AND default_energy_level <= 100);

-- Create a new table for team/session context that affects all characters
CREATE TABLE IF NOT EXISTS team_context (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255),
    hq_tier VARCHAR(50) DEFAULT 'basic_house' CHECK (hq_tier IN ('spartan_apartment', 'basic_house', 'team_mansion', 'elite_compound')),
    current_scene_type VARCHAR(20) DEFAULT 'mundane' CHECK (current_scene_type IN ('mundane', 'conflict', 'chaos')),
    current_time_of_day VARCHAR(20) DEFAULT 'afternoon' CHECK (current_time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

-- Create a table for character sleeping arrangements and living conditions  
CREATE TABLE IF NOT EXISTS character_living_context (
    id SERIAL PRIMARY KEY,
    character_id VARCHAR(255) REFERENCES characters(id),
    team_id VARCHAR(255),
    sleeps_on_floor BOOLEAN DEFAULT FALSE,
    sleeps_on_couch BOOLEAN DEFAULT FALSE, 
    sleeps_under_table BOOLEAN DEFAULT FALSE,
    room_overcrowded BOOLEAN DEFAULT FALSE,
    floor_sleeper_count INTEGER DEFAULT 0,
    roommate_count INTEGER DEFAULT 1,
    current_mood VARCHAR(50) DEFAULT 'neutral',
    current_energy_level INTEGER DEFAULT 100 CHECK (current_energy_level >= 0 AND current_energy_level <= 100),
    last_sleep_quality VARCHAR(20) DEFAULT 'good' CHECK (last_sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, team_id)
);

-- Create a table for dynamic scene triggers and conflicts (derived from PromptTemplateService)
CREATE TABLE IF NOT EXISTS scene_triggers (
    id SERIAL PRIMARY KEY,
    scene_type VARCHAR(20) CHECK (scene_type IN ('mundane', 'conflict', 'chaos')),
    hq_tier VARCHAR(50) CHECK (hq_tier IN ('spartan_apartment', 'basic_house', 'team_mansion', 'elite_compound')),
    trigger_text TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    domain VARCHAR(50), -- kitchen_table, training, equipment, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert scene triggers from your sophisticated PromptTemplateService
-- Mundane triggers
INSERT INTO scene_triggers (scene_type, trigger_text, weight, domain) VALUES
('mundane', 'Someone''s making a grocery list and asking for input', 1, 'kitchen_table'),
('mundane', 'The dishwasher is making a weird noise', 1, 'kitchen_table'),
('mundane', 'There''s a debate about the thermostat setting', 1, 'kitchen_table'),
('mundane', 'Someone''s organizing the spice rack', 1, 'kitchen_table'),
('mundane', 'The WiFi password needs to be shared with everyone', 1, 'kitchen_table'),
('mundane', 'There''s discussion about whose turn it is to take out trash', 1, 'kitchen_table'),
('mundane', 'Someone''s trying to figure out how the coffee maker works', 1, 'kitchen_table'),
('mundane', 'The electric bill came and it''s higher than expected', 1, 'kitchen_table'),
('mundane', 'Someone''s looking for their missing food from the fridge', 1, 'kitchen_table'),
('mundane', 'There''s a conversation about bathroom cleaning schedule', 1, 'kitchen_table'),

-- Conflict triggers  
('conflict', 'Someone used the last of the milk without buying more', 1, 'kitchen_table'),
('conflict', 'There''s an argument about noise levels during sleep hours', 1, 'kitchen_table'),
('conflict', 'Two people want to use the kitchen at the same time', 1, 'kitchen_table'),
('conflict', 'Someone''s been eating other people''s labeled food', 1, 'kitchen_table'),
('conflict', 'There''s disagreement about what temperature to keep the house', 1, 'kitchen_table'),
('conflict', 'Someone left dirty dishes in the sink overnight', 1, 'kitchen_table'),
('conflict', 'There''s conflict about bathroom time in the morning', 1, 'kitchen_table'),
('conflict', 'Someone''s music/TV is too loud for others', 1, 'kitchen_table'),
('conflict', 'There''s disagreement about having guests over', 1, 'kitchen_table'),
('conflict', 'Someone''s workout routine is disturbing others', 1, 'kitchen_table'),

-- Chaos triggers
('chaos', 'The fire alarm is going off because someone burned breakfast', 1, 'kitchen_table'),
('chaos', 'There''s a water leak flooding the kitchen floor', 1, 'kitchen_table'),
('chaos', 'Someone accidentally broke something expensive', 1, 'kitchen_table'),
('chaos', 'Multiple people are arguing about different things simultaneously', 1, 'kitchen_table'),
('chaos', 'The power went out during everyone''s morning routines', 1, 'kitchen_table'),
('chaos', 'There''s a pest problem that needs immediate attention', 1, 'kitchen_table'),
('chaos', 'Someone''s experiment/project went wrong and made a mess', 1, 'kitchen_table'),
('chaos', 'An unexpected visitor (inspector, landlord, etc.) showed up', 1, 'kitchen_table'),
('chaos', 'There''s a medical emergency or injury situation', 1, 'kitchen_table'),
('chaos', 'Someone lost their keys and everyone''s locked out', 1, 'kitchen_table');

-- Insert HQ-specific triggers for spartan_apartment
INSERT INTO scene_triggers (scene_type, hq_tier, trigger_text, weight, domain) VALUES
('mundane', 'spartan_apartment', 'Someone tripped over Dracula''s coffin under the table', 1, 'kitchen_table'),
('conflict', 'spartan_apartment', 'There''s only one bathroom for everyone and someone''s taking too long', 1, 'kitchen_table'),
('chaos', 'spartan_apartment', 'The bunk bed collapsed with someone in it', 1, 'kitchen_table');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_context_team_id ON team_context(team_id);
CREATE INDEX IF NOT EXISTS idx_character_living_context_character_id ON character_living_context(character_id);
CREATE INDEX IF NOT EXISTS idx_character_living_context_team_id ON character_living_context(team_id);
CREATE INDEX IF NOT EXISTS idx_scene_triggers_scene_type ON scene_triggers(scene_type);
CREATE INDEX IF NOT EXISTS idx_scene_triggers_hq_tier ON scene_triggers(hq_tier);
CREATE INDEX IF NOT EXISTS idx_scene_triggers_domain ON scene_triggers(domain);

-- Add comments for documentation
COMMENT ON TABLE team_context IS 'Stores team-level environmental context like HQ tier, current scene atmosphere, and time of day that affects all team members';
COMMENT ON TABLE character_living_context IS 'Stores individual character living situations including sleeping arrangements, mood, and energy levels that affect their interactions';
COMMENT ON TABLE scene_triggers IS 'Database-driven scene triggers and conflicts from PromptTemplateService, allowing dynamic scene generation without code changes';

COMMENT ON COLUMN characters.default_mood IS 'Character''s baseline mood when not affected by specific situations';
COMMENT ON COLUMN characters.default_energy_level IS 'Character''s baseline energy level (0-100) when well-rested';
COMMENT ON COLUMN team_context.hq_tier IS 'Team''s housing tier: spartan_apartment, basic_house, team_mansion, elite_compound';
COMMENT ON COLUMN team_context.current_scene_type IS 'Current scene atmosphere: mundane, conflict, chaos';
COMMENT ON COLUMN character_living_context.sleeps_on_floor IS 'Character is currently sleeping on the floor due to overcrowding';
COMMENT ON COLUMN character_living_context.last_sleep_quality IS 'Quality of character''s most recent sleep affects mood and energy';