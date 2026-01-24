-- Migration 226: Create judge_bonuses table
-- Judge bonuses define stat ranges each judge awards to contestants
-- Penalty = 1/3 of bonus, scales by intensity (easy/medium/hard)

CREATE TABLE IF NOT EXISTS judge_bonuses (
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

CREATE INDEX IF NOT EXISTS idx_judge_bonuses_character_id ON judge_bonuses(character_id);

-- Anubis: truth, harsh
INSERT INTO judge_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('anubis', 'bond_level', 15, -5, 45, -15, 135, -45),
('anubis', 'current_team_player', 15, -5, 45, -15, 135, -45),
('anubis', 'current_mental_health', 15, -5, 45, -15, 135, -45);

-- Eleanor Roosevelt: compassion, generous
INSERT INTO judge_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('eleanor_roosevelt', 'current_morale', 15, -5, 45, -15, 135, -45),
('eleanor_roosevelt', 'bond_level', 15, -5, 45, -15, 135, -45),
('eleanor_roosevelt', 'current_confidence', 15, -5, 45, -15, 135, -45);

-- King Solomon: wisdom
INSERT INTO judge_bonuses (character_id, bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty) VALUES
('king_solomon', 'experience', 15, -5, 45, -15, 135, -45),
('king_solomon', 'current_communication', 15, -5, 45, -15, 135, -45),
('king_solomon', 'current_confidence', 15, -5, 45, -15, 135, -45);
