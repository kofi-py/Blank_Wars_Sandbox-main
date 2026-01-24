-- Migration 312: Add rarity to system characters
-- System characters should have rarity for collectibility

-- Mascots (13)
UPDATE characters SET rarity = 'legendary' WHERE id IN ('phoenix', 'sphinx');
UPDATE characters SET rarity = 'epic' WHERE id IN ('honey_badger', 'orca', 'wraith');
UPDATE characters SET rarity = 'rare' WHERE id IN ('elephant', 'porcupine', 'locusts');
UPDATE characters SET rarity = 'uncommon' WHERE id IN ('emu', 'platypus', 'streptococcus_a');
UPDATE characters SET rarity = 'common' WHERE id IN ('cupcake', 'goldfish');

-- Hosts (3)
UPDATE characters SET rarity = 'legendary' WHERE id = 'mad_hatter';
UPDATE characters SET rarity = 'epic' WHERE id IN ('betty_boop', 'groucho_marx');

-- Judges (3)
UPDATE characters SET rarity = 'legendary' WHERE id = 'king_solomon';
UPDATE characters SET rarity = 'epic' WHERE id = 'anubis';
UPDATE characters SET rarity = 'rare' WHERE id = 'eleanor_roosevelt';

-- Real Estate Agents (3)
UPDATE characters SET rarity = 'epic' WHERE id = 'zyxthala';
UPDATE characters SET rarity = 'rare' WHERE id = 'lmb_3000';
UPDATE characters SET rarity = 'uncommon' WHERE id = 'barry';

-- Therapists (3)
UPDATE characters SET rarity = 'legendary' WHERE id = 'carl_jung';
UPDATE characters SET rarity = 'epic' WHERE id = 'seraphina';
UPDATE characters SET rarity = 'rare' WHERE id = 'zxk14bw7';

-- Trainers (3)
UPDATE characters SET rarity = 'legendary' WHERE id = 'athena';
UPDATE characters SET rarity = 'epic' WHERE id = 'popeye';
UPDATE characters SET rarity = 'rare' WHERE id = 'argock';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (312, '312_add_rarity_to_system_characters')
ON CONFLICT (version) DO NOTHING;
