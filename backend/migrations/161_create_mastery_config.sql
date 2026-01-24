
-- Create mastery_config table
CREATE TABLE IF NOT EXISTS mastery_config (
    type VARCHAR(50) NOT NULL, -- 'spell' or 'power'
    strength_level INTEGER NOT NULL, -- 1, 2, 3
    mastery_level INTEGER NOT NULL, -- 1 to 10
    points_required INTEGER NOT NULL,
    PRIMARY KEY (type, strength_level, mastery_level)
);

-- Seed Data for Mastery Curve (Standard Linear-ish Curve)
-- Level 1 is 0 points (Start)
-- Level 2: 100
-- Level 3: 250
-- Level 4: 450
-- Level 5: 700
-- Level 6: 1000
-- Level 7: 1350
-- Level 8: 1750
-- Level 9: 2200
-- Level 10: 2700

-- Insert for Spells (Strength 1 - Basic)
INSERT INTO mastery_config (type, strength_level, mastery_level, points_required) VALUES
('spell', 1, 1, 0),
('spell', 1, 2, 100),
('spell', 1, 3, 250),
('spell', 1, 4, 450),
('spell', 1, 5, 700),
('spell', 1, 6, 1000),
('spell', 1, 7, 1350),
('spell', 1, 8, 1750),
('spell', 1, 9, 2200),
('spell', 1, 10, 2700)
ON CONFLICT DO NOTHING;

-- Insert for Powers (Strength 1 - Basic)
INSERT INTO mastery_config (type, strength_level, mastery_level, points_required) VALUES
('power', 1, 1, 0),
('power', 1, 2, 100),
('power', 1, 3, 250),
('power', 1, 4, 450),
('power', 1, 5, 700),
('power', 1, 6, 1000),
('power', 1, 7, 1350),
('power', 1, 8, 1750),
('power', 1, 9, 2200),
('power', 1, 10, 2700)
ON CONFLICT DO NOTHING;

-- Note: We can add Strength 2 and 3 curves later if needed, defaulting to same for now.

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (161, '161_create_mastery_config')
ON CONFLICT (version) DO NOTHING;
