-- Migration 040: Remap characters to comedy styles from reference library
-- Updates character comedy styles to reference the new comedian_styles library

BEGIN;

-- Add foreign key column to reference comedian_styles table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS comedian_style_id INTEGER,
ADD CONSTRAINT fk_comedian_style
  FOREIGN KEY (comedian_style_id)
  REFERENCES comedian_styles(id)
  ON DELETE SET NULL;

-- Battle Characters
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'Oscar Wilde' LIMIT 1) WHERE id = 'dracula';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'matronist_003' LIMIT 1) WHERE id = 'cleopatra';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'analyst_036' LIMIT 1) WHERE id = 'holmes';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'ranter_021' LIMIT 1) WHERE id = 'genghis_khan';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'anarchist_049' LIMIT 1) WHERE id = 'fenrir';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'existential_romantic_094' LIMIT 1) WHERE id = 'frankenstein_monster';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'youthful_020' LIMIT 1) WHERE id = 'billy_the_kid';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'futurist_085' LIMIT 1) WHERE id = 'tesla';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'algorithmic_poet_098' LIMIT 1) WHERE id = 'zeta_reticulan';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'meta_engineer_095' LIMIT 1) WHERE id = 'space_cyborg';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'Charlie Chaplin' LIMIT 1) WHERE id = 'robin_hood';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'stoic_063' LIMIT 1) WHERE id = 'achilles';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'chaotic_038' LIMIT 1) WHERE id = 'sun_wukong';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'Groucho Marx' LIMIT 1) WHERE id = 'noir_detective_1930s';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'deadpan_014' LIMIT 1) WHERE id = 'black_ops_agent';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'iconoclast_004' LIMIT 1) WHERE id = 'joan';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'villain_073' LIMIT 1) WHERE id = 'lady_macbeth_2000';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'mimic_006' LIMIT 1) WHERE id = 'reptilian_alien';

-- Therapist Characters
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'therapist_050' LIMIT 1) WHERE id = 'carl_jung';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'charmer_013' LIMIT 1) WHERE id = 'fairy_godmother';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'rebooted_philosopher_100' LIMIT 1) WHERE id = 'cosmic_alien';

-- Judge Characters
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'Mark Twain' LIMIT 1) WHERE id = 'king_solomon';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'oracle_057' LIMIT 1) WHERE id = 'anubis';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'Dorothy Parker' LIMIT 1) WHERE id = 'eleanor_roosevelt';

-- Real Estate Characters
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'performer_048' LIMIT 1) WHERE id = 'barry_closer';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'bureaucrat_081' LIMIT 1) WHERE id = 'zyxthala_reptilian';
UPDATE characters SET comedian_style_id = (SELECT id FROM comedian_styles WHERE comedian_name = 'algorithmic_poet_098' LIMIT 1) WHERE id = 'lmb_3000_robot_lady_macbeth';

-- Record migration
INSERT INTO migration_log (version, name) VALUES (40, '040_remap_character_comedy_styles') ON CONFLICT (version) DO NOTHING;

COMMIT;
