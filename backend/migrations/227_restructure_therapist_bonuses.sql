-- Migration 227: Restructure therapist_bonuses to use flat values like judge_bonuses
-- Changes from multipliers to intensity-based bonus/penalty values
-- Therapist values: Easy +5/-1, Medium +10/-5, Hard +15/-10

-- Drop old table and recreate with new structure
DROP TABLE IF EXISTS therapist_bonuses CASCADE;

CREATE TABLE therapist_bonuses (
    id SERIAL PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    bonus_type TEXT NOT NULL,
    easy_bonus INTEGER NOT NULL,
    easy_penalty INTEGER NOT NULL,
    medium_bonus INTEGER NOT NULL,
    medium_penalty INTEGER NOT NULL,
    hard_bonus INTEGER NOT NULL,
    hard_penalty INTEGER NOT NULL,
    UNIQUE(character_id, bonus_type)
);

CREATE INDEX idx_therapist_bonuses_character_id ON therapist_bonuses(character_id);

-- Carl Jung: bond_level, current_team_player, experience
INSERT INTO therapist_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('carl_jung', 'bond_level', 5, -1, 10, -5, 15, -10),
('carl_jung', 'current_team_player', 5, -1, 10, -5, 15, -10),
('carl_jung', 'experience', 5, -1, 10, -5, 15, -10);

-- Zxk14bw7: current_mental_health, current_stress, current_communication
INSERT INTO therapist_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('zxk14bw7', 'current_mental_health', 5, -1, 10, -5, 15, -10),
('zxk14bw7', 'current_stress', 5, -1, 10, -5, 15, -10),
('zxk14bw7', 'current_communication', 5, -1, 10, -5, 15, -10);

-- Seraphina: current_morale, current_confidence, experience
INSERT INTO therapist_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('seraphina', 'current_morale', 5, -1, 10, -5, 15, -10),
('seraphina', 'current_confidence', 5, -1, 10, -5, 15, -10),
('seraphina', 'experience', 5, -1, 10, -5, 15, -10);
