-- Migration 306: Add Disease Damage System
-- Adds biological damage category, disease damage type, infection DoT, and disease_resistance stat
-- Includes all archetype, species, and signature modifiers

BEGIN;

-- Add 'biological' to allowed damage type categories
ALTER TABLE damage_type_reference DROP CONSTRAINT damage_type_reference_category_check;
ALTER TABLE damage_type_reference ADD CONSTRAINT damage_type_reference_category_check
    CHECK (category = ANY (ARRAY['physical', 'magical', 'elemental', 'biological']));

-- New damage type
INSERT INTO damage_type_reference (id, name, category, description, resistance_stat, icon)
VALUES ('disease', 'Disease', 'biological', 'Infectious damage from pathogens', 'disease_resistance', '🦠');

-- New DoT effect
INSERT INTO status_effect_types (id, name, category, description, damage_type, icon, stackable)
VALUES ('infection', 'Infected', 'dot', 'Disease damage each turn', 'disease', '🦠', true);

-- Base stat column (nullable for non-contestants)
ALTER TABLE characters ADD COLUMN disease_resistance INTEGER;

-- Calculated current value on user_characters
ALTER TABLE user_characters ADD COLUMN current_disease_resistance INTEGER;

-- Set base disease_resistance = 50 for all contestants
UPDATE characters SET disease_resistance = 50 WHERE role = 'contestant' OR role IS NULL;

-- ============================================
-- ARCHETYPE MODIFIERS FOR DISEASE_RESISTANCE
-- ============================================
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
    ('assassin', 'disease_resistance', 5, 'Works with toxins, builds tolerance'),
    ('beast', 'disease_resistance', 8, 'Natural immunity'),
    ('beastmaster', 'disease_resistance', 3, 'Some exposure to animals'),
    ('detective', 'disease_resistance', 0, 'No particular advantage'),
    ('leader', 'disease_resistance', 0, 'No particular advantage'),
    ('magical_appliance', 'disease_resistance', 10, 'Non-biological'),
    ('mage', 'disease_resistance', -5, 'Physically frail'),
    ('mystic', 'disease_resistance', 3, 'Spiritual discipline'),
    ('scholar', 'disease_resistance', -3, 'Sheltered'),
    ('system', 'disease_resistance', 0, 'N/A'),
    ('tank', 'disease_resistance', 8, 'Hardy constitution'),
    ('trickster', 'disease_resistance', 0, 'Neutral'),
    ('warrior', 'disease_resistance', 5, 'Battle-hardened');

-- ============================================
-- SPECIES MODIFIERS FOR DISEASE_RESISTANCE
-- ============================================
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
    ('human', 'disease_resistance', -5, 'Susceptible to disease'),
    ('human_magical', 'disease_resistance', 0, 'Magic offsets human frailty'),
    ('angel', 'disease_resistance', 5, 'Celestial resistance'),
    ('deity', 'disease_resistance', 8, 'Divine constitution'),
    ('cyborg', 'disease_resistance', 5, 'Part machine'),
    ('robot', 'disease_resistance', 10, 'Fully non-biological'),
    ('golem', 'disease_resistance', 10, 'Construct, no biology'),
    ('magical_toaster', 'disease_resistance', 10, 'Appliance, no biology'),
    ('undead', 'disease_resistance', 8, 'Dead tissue, different vulnerabilities'),
    ('vampire', 'disease_resistance', 8, 'Undead'),
    ('dinosaur', 'disease_resistance', -3, 'No immunity to modern pathogens'),
    ('dire_wolf', 'disease_resistance', 3, 'Animal, natural resistance'),
    ('fairy', 'disease_resistance', 3, 'Magical creature'),
    ('kangaroo', 'disease_resistance', 3, 'Animal'),
    ('reptilian', 'disease_resistance', 5, 'Different biology'),
    ('unicorn', 'disease_resistance', 5, 'Magical purity'),
    ('zeta_reticulan_grey', 'disease_resistance', -8, 'No immunity to Earth pathogens');

-- ============================================
-- SIGNATURE MODIFIERS FOR DISEASE_RESISTANCE
-- ============================================
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
    ('achilles', 'disease_resistance', 6, 'Invulnerable body blessed by the Styx'),
    ('agent_x', 'disease_resistance', 4, 'Trained operative, vaccinated, prepared'),
    ('aleister_crowley', 'disease_resistance', -4, 'Drug abuse weakened constitution'),
    ('archangel_michael', 'disease_resistance', 5, 'Divine warrior, holy vitality'),
    ('billy_the_kid', 'disease_resistance', 0, 'Outdoor lifestyle, died young'),
    ('cleopatra', 'disease_resistance', -3, 'Pampered royalty, experimented with poisons'),
    ('dracula', 'disease_resistance', 6, 'Ancient vampire lord, centuries of survival'),
    ('crumbsworth', 'disease_resistance', 5, 'Enchanted appliance, magic-infused'),
    ('don_quixote', 'disease_resistance', -5, 'Old, frail, delusional'),
    ('fenrir', 'disease_resistance', 5, 'Monstrous wolf, god-level beast'),
    ('frankenstein_monster', 'disease_resistance', 6, 'Dead tissue, diseases need living cells'),
    ('genghis_khan', 'disease_resistance', 5, 'Hardy steppe warrior'),
    ('jack_the_ripper', 'disease_resistance', 3, 'Operated in filth, built immunity'),
    ('joan', 'disease_resistance', 4, 'Divine protection'),
    ('kali', 'disease_resistance', 4, 'Goddess of destruction'),
    ('kangaroo', 'disease_resistance', 2, 'Tough outback survivor'),
    ('karna', 'disease_resistance', 5, 'Demigod, sun-born vitality'),
    ('little_bo_peep', 'disease_resistance', 2, 'Outdoor shepherdess'),
    ('mami_wata', 'disease_resistance', 3, 'Aquatic deity, cleansing waters'),
    ('merlin', 'disease_resistance', 4, 'Magical wards and protection'),
    ('napoleon_bonaparte', 'disease_resistance', -3, 'Died of stomach ailment'),
    ('tesla', 'disease_resistance', 3, 'Germophobe, avoided exposure'),
    ('quetzalcoatl', 'disease_resistance', 4, 'Feathered serpent god'),
    ('ramses_ii', 'disease_resistance', 4, 'Mummified, preserved flesh'),
    ('rilak_trelkar', 'disease_resistance', -3, 'Sheltered lab scientist'),
    ('robin_hood', 'disease_resistance', 3, 'Forest immunity'),
    ('sam_spade', 'disease_resistance', 2, 'Hard-boiled, tough'),
    ('shaka_zulu', 'disease_resistance', 4, 'Warrior lifestyle'),
    ('holmes', 'disease_resistance', -3, 'Cocaine habit'),
    ('space_cyborg', 'disease_resistance', 4, 'Advanced medical implants'),
    ('sun_wukong', 'disease_resistance', 6, 'Immortal monkey king'),
    ('unicorn', 'disease_resistance', 4, 'Magical purity'),
    ('velociraptor', 'disease_resistance', 3, 'Apex predator, survival instincts');

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (306, '306_add_disease_damage_system')
ON CONFLICT (version) DO NOTHING;
