-- Fix Headquarters Schema
-- Creates missing room_beds table and adds missing columns to headquarters_rooms

-- 1. Create room_beds table
CREATE TABLE IF NOT EXISTS room_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    bed_id TEXT NOT NULL,
    bed_type TEXT NOT NULL, -- e.g., 'luxury_bed', 'couch', 'floor_mat'
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    
    -- New fields for specific assignment and bonuses
    character_id TEXT, -- Specific character assigned to this spot
    stat_modifier_type TEXT DEFAULT 'morale', -- e.g., 'morale', 'energy', 'recovery'
    stat_modifier_value INTEGER DEFAULT 0, -- e.g., 10, -5
    
    comfort_bonus INTEGER DEFAULT 0, -- Keeping for backward compatibility with service code
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT room_beds_room_id_fkey FOREIGN KEY (room_id) REFERENCES headquarters_rooms(id) ON DELETE CASCADE
);

-- 2. Add missing columns to headquarters_rooms
ALTER TABLE headquarters_rooms
ADD COLUMN IF NOT EXISTS assigned_characters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_room_beds_room_id ON room_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_room_beds_character_id ON room_beds(character_id);
