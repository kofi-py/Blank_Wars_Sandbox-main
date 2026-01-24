-- Rename attack_types to action_types (if not already renamed)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attack_types') THEN
        ALTER TABLE attack_types RENAME TO action_types;
    END IF;
END $$;

-- Rename index (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_attack_types_ap_cost') THEN
        ALTER INDEX idx_attack_types_ap_cost RENAME TO idx_action_types_ap_cost;
    END IF;
END $$;

-- Add new action types
INSERT INTO action_types (id, name, description, flavor_text, ap_cost, damage_multiplier, accuracy_modifier, crit_chance_modifier, sort_order) VALUES
-- Defense
('defense', 'Defend', 'Take a defensive stance to reduce incoming damage.', 'Hold the line!', 1, 0, 0, 0, 10),

-- Movement (1-3 hexes)
('movement_1', 'Move (Short)', 'Move up to 3 hexes.', 'Quick step.', 1, 0, 0, 0, 20),
('movement_2', 'Move (Medium)', 'Move up to 6 hexes.', 'Picking up the pace.', 2, 0, 0, 0, 21),
('movement_3', 'Move (Long)', 'Move up to 9 hexes.', 'Full sprint.', 3, 0, 0, 0, 22),

-- Items (Rank 1-3)
('item_1', 'Use Item (Basic)', 'Use a basic item.', 'Handy.', 1, 0, 0, 0, 30),
('item_2', 'Use Item (Advanced)', 'Use an advanced item.', 'Effective.', 2, 0, 0, 0, 31),
('item_3', 'Use Item (Complex)', 'Use a complex item.', 'Worth the effort.', 3, 0, 0, 0, 32),

-- Spells (Rank 1-3)
('spell_rank_1', 'Cast Spell (Rank 1)', 'Cast a Rank 1 spell.', 'Basic incantation.', 1, 0, 0, 0, 40),
('spell_rank_2', 'Cast Spell (Rank 2)', 'Cast a Rank 2 spell.', 'Intermediate weaving.', 2, 0, 0, 0, 41),
('spell_rank_3', 'Cast Spell (Rank 3)', 'Cast a Rank 3 spell.', 'Master level casting.', 3, 0, 0, 0, 42),

-- Powers (Rank 1-3)
('power_rank_1', 'Use Power (Rank 1)', 'Use a Rank 1 power.', 'Basic technique.', 1, 0, 0, 0, 50),
('power_rank_2', 'Use Power (Rank 2)', 'Use a Rank 2 power.', 'Advanced technique.', 2, 0, 0, 0, 51),
('power_rank_3', 'Use Power (Rank 3)', 'Use a Rank 3 power.', 'Ultimate technique.', 3, 0, 0, 0, 52)
ON CONFLICT (id) DO NOTHING;
