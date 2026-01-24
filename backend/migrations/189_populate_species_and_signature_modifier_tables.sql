-- Migration 189: Populate species_attribute_modifiers and signature_attribute_modifiers tables
-- These tables were created in migration 120 but never populated
-- Values extracted from migrations 100 (species) and 101 (individual)

BEGIN;

-- =====================================================
-- SPECIES ATTRIBUTE MODIFIERS (from migration 100)
-- =====================================================

-- HUMAN (Common Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('human', 'attack', 10, 'Common Tier'),
  ('human', 'defense', 5, 'Common Tier'),
  ('human', 'speed', 10, 'Common Tier'),
  ('human', 'strength', 8, 'Common Tier'),
  ('human', 'dexterity', 8, 'Common Tier'),
  ('human', 'endurance', 8, 'Common Tier'),
  ('human', 'magic_attack', -5, 'Common Tier'),
  ('human', 'magic_defense', -5, 'Common Tier'),
  ('human', 'intelligence', 12, 'Common Tier'),
  ('human', 'wisdom', 8, 'Common Tier'),
  ('human', 'spirit', 8, 'Common Tier'),
  ('human', 'charisma', 12, 'Common Tier'),
  ('human', 'max_health', 5, 'Common Tier'),
  ('human', 'max_energy', 10, 'Common Tier'),
  ('human', 'max_mana', -30, 'Common Tier'),
  ('human', 'training', 10, 'Common Tier'),
  ('human', 'mental_health', -10, 'Common Tier'),
  ('human', 'team_player', 5, 'Common Tier'),
  ('human', 'ego', 20, 'Common Tier'),
  ('human', 'communication', 5, 'Common Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- KANGAROO (Common Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('kangaroo', 'attack', 20, 'Common Tier'),
  ('kangaroo', 'defense', 5, 'Common Tier'),
  ('kangaroo', 'speed', 25, 'Common Tier'),
  ('kangaroo', 'strength', 25, 'Common Tier'),
  ('kangaroo', 'dexterity', 15, 'Common Tier'),
  ('kangaroo', 'endurance', 20, 'Common Tier'),
  ('kangaroo', 'magic_attack', -10, 'Common Tier'),
  ('kangaroo', 'magic_defense', -8, 'Common Tier'),
  ('kangaroo', 'intelligence', -15, 'Common Tier'),
  ('kangaroo', 'wisdom', 5, 'Common Tier'),
  ('kangaroo', 'spirit', 8, 'Common Tier'),
  ('kangaroo', 'charisma', -10, 'Common Tier'),
  ('kangaroo', 'max_health', 15, 'Common Tier'),
  ('kangaroo', 'max_energy', 20, 'Common Tier'),
  ('kangaroo', 'max_mana', -15, 'Common Tier'),
  ('kangaroo', 'training', -25, 'Common Tier'),
  ('kangaroo', 'mental_health', -10, 'Common Tier'),
  ('kangaroo', 'team_player', -15, 'Common Tier'),
  ('kangaroo', 'ego', 10, 'Common Tier'),
  ('kangaroo', 'communication', -15, 'Common Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- DIRE_WOLF (Common Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('dire_wolf', 'attack', 15, 'Common Tier'),
  ('dire_wolf', 'defense', 5, 'Common Tier'),
  ('dire_wolf', 'speed', 15, 'Common Tier'),
  ('dire_wolf', 'strength', 18, 'Common Tier'),
  ('dire_wolf', 'dexterity', 15, 'Common Tier'),
  ('dire_wolf', 'endurance', 20, 'Common Tier'),
  ('dire_wolf', 'magic_attack', -10, 'Common Tier'),
  ('dire_wolf', 'magic_defense', -8, 'Common Tier'),
  ('dire_wolf', 'intelligence', -15, 'Common Tier'),
  ('dire_wolf', 'wisdom', 8, 'Common Tier'),
  ('dire_wolf', 'spirit', 12, 'Common Tier'),
  ('dire_wolf', 'charisma', -12, 'Common Tier'),
  ('dire_wolf', 'max_health', 15, 'Common Tier'),
  ('dire_wolf', 'max_energy', 20, 'Common Tier'),
  ('dire_wolf', 'max_mana', -15, 'Common Tier'),
  ('dire_wolf', 'training', -25, 'Common Tier'),
  ('dire_wolf', 'mental_health', -10, 'Common Tier'),
  ('dire_wolf', 'team_player', -10, 'Common Tier'),
  ('dire_wolf', 'ego', 15, 'Common Tier'),
  ('dire_wolf', 'communication', -15, 'Common Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- UNDEAD (Common Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('undead', 'attack', 15, 'Common Tier'),
  ('undead', 'defense', -5, 'Common Tier'),
  ('undead', 'speed', -15, 'Common Tier'),
  ('undead', 'strength', 12, 'Common Tier'),
  ('undead', 'dexterity', -15, 'Common Tier'),
  ('undead', 'endurance', 15, 'Common Tier'),
  ('undead', 'magic_attack', 15, 'Common Tier'),
  ('undead', 'magic_defense', -15, 'Common Tier'),
  ('undead', 'intelligence', -20, 'Common Tier'),
  ('undead', 'wisdom', -18, 'Common Tier'),
  ('undead', 'spirit', -20, 'Common Tier'),
  ('undead', 'charisma', -25, 'Common Tier'),
  ('undead', 'max_health', -10, 'Common Tier'),
  ('undead', 'max_energy', 20, 'Common Tier'),
  ('undead', 'max_mana', 20, 'Common Tier'),
  ('undead', 'training', -15, 'Common Tier'),
  ('undead', 'mental_health', -15, 'Common Tier'),
  ('undead', 'team_player', 15, 'Common Tier'),
  ('undead', 'ego', 0, 'Common Tier'),
  ('undead', 'communication', -20, 'Common Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ROBOT (Basic Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('robot', 'attack', 10, 'Basic Tier'),
  ('robot', 'defense', 10, 'Basic Tier'),
  ('robot', 'speed', -20, 'Basic Tier'),
  ('robot', 'strength', 15, 'Basic Tier'),
  ('robot', 'dexterity', -10, 'Basic Tier'),
  ('robot', 'endurance', 20, 'Basic Tier'),
  ('robot', 'magic_attack', -15, 'Basic Tier'),
  ('robot', 'magic_defense', -10, 'Basic Tier'),
  ('robot', 'intelligence', 25, 'Basic Tier'),
  ('robot', 'wisdom', -8, 'Basic Tier'),
  ('robot', 'spirit', -12, 'Basic Tier'),
  ('robot', 'charisma', -10, 'Basic Tier'),
  ('robot', 'max_health', 10, 'Basic Tier'),
  ('robot', 'max_energy', 15, 'Basic Tier'),
  ('robot', 'max_mana', -25, 'Basic Tier'),
  ('robot', 'training', 10, 'Basic Tier'),
  ('robot', 'mental_health', -15, 'Basic Tier'),
  ('robot', 'team_player', -10, 'Basic Tier'),
  ('robot', 'ego', 0, 'Basic Tier'),
  ('robot', 'communication', 10, 'Basic Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- CYBORG (Basic Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('cyborg', 'attack', 12, 'Basic Tier'),
  ('cyborg', 'defense', 12, 'Basic Tier'),
  ('cyborg', 'speed', 8, 'Basic Tier'),
  ('cyborg', 'strength', 15, 'Basic Tier'),
  ('cyborg', 'dexterity', 10, 'Basic Tier'),
  ('cyborg', 'endurance', 18, 'Basic Tier'),
  ('cyborg', 'magic_attack', -8, 'Basic Tier'),
  ('cyborg', 'magic_defense', -10, 'Basic Tier'),
  ('cyborg', 'intelligence', 15, 'Basic Tier'),
  ('cyborg', 'wisdom', 5, 'Basic Tier'),
  ('cyborg', 'spirit', -12, 'Basic Tier'),
  ('cyborg', 'charisma', -10, 'Basic Tier'),
  ('cyborg', 'max_health', 15, 'Basic Tier'),
  ('cyborg', 'max_energy', 15, 'Basic Tier'),
  ('cyborg', 'max_mana', -25, 'Basic Tier'),
  ('cyborg', 'training', 10, 'Basic Tier'),
  ('cyborg', 'mental_health', -20, 'Basic Tier'),
  ('cyborg', 'team_player', -15, 'Basic Tier'),
  ('cyborg', 'ego', 15, 'Basic Tier'),
  ('cyborg', 'communication', 0, 'Basic Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- GOLEM (Basic Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('golem', 'attack', 12, 'Basic Tier'),
  ('golem', 'defense', 25, 'Basic Tier'),
  ('golem', 'speed', -25, 'Basic Tier'),
  ('golem', 'strength', 25, 'Basic Tier'),
  ('golem', 'dexterity', -15, 'Basic Tier'),
  ('golem', 'endurance', 35, 'Basic Tier'),
  ('golem', 'magic_attack', 8, 'Basic Tier'),
  ('golem', 'magic_defense', 8, 'Basic Tier'),
  ('golem', 'intelligence', -18, 'Basic Tier'),
  ('golem', 'wisdom', -12, 'Basic Tier'),
  ('golem', 'spirit', 12, 'Basic Tier'),
  ('golem', 'charisma', -20, 'Basic Tier'),
  ('golem', 'max_health', 20, 'Basic Tier'),
  ('golem', 'max_energy', 5, 'Basic Tier'),
  ('golem', 'max_mana', 30, 'Basic Tier'),
  ('golem', 'training', -15, 'Basic Tier'),
  ('golem', 'mental_health', -25, 'Basic Tier'),
  ('golem', 'team_player', -15, 'Basic Tier'),
  ('golem', 'ego', 0, 'Basic Tier'),
  ('golem', 'communication', -25, 'Basic Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- DINOSAUR (Basic Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('dinosaur', 'attack', 25, 'Basic Tier'),
  ('dinosaur', 'defense', 15, 'Basic Tier'),
  ('dinosaur', 'speed', 15, 'Basic Tier'),
  ('dinosaur', 'strength', 30, 'Basic Tier'),
  ('dinosaur', 'dexterity', 8, 'Basic Tier'),
  ('dinosaur', 'endurance', 25, 'Basic Tier'),
  ('dinosaur', 'magic_attack', -12, 'Basic Tier'),
  ('dinosaur', 'magic_defense', -10, 'Basic Tier'),
  ('dinosaur', 'intelligence', -18, 'Basic Tier'),
  ('dinosaur', 'wisdom', -15, 'Basic Tier'),
  ('dinosaur', 'spirit', 10, 'Basic Tier'),
  ('dinosaur', 'charisma', -15, 'Basic Tier'),
  ('dinosaur', 'max_health', 25, 'Basic Tier'),
  ('dinosaur', 'max_energy', 15, 'Basic Tier'),
  ('dinosaur', 'max_mana', -20, 'Basic Tier'),
  ('dinosaur', 'training', -20, 'Basic Tier'),
  ('dinosaur', 'mental_health', -25, 'Basic Tier'),
  ('dinosaur', 'team_player', -15, 'Basic Tier'),
  ('dinosaur', 'ego', 15, 'Basic Tier'),
  ('dinosaur', 'communication', -15, 'Basic Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- HUMAN_MAGICAL (Advanced Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('human_magical', 'attack', -10, 'Advanced Tier'),
  ('human_magical', 'defense', -20, 'Advanced Tier'),
  ('human_magical', 'speed', -10, 'Advanced Tier'),
  ('human_magical', 'strength', -12, 'Advanced Tier'),
  ('human_magical', 'dexterity', -8, 'Advanced Tier'),
  ('human_magical', 'endurance', -10, 'Advanced Tier'),
  ('human_magical', 'magic_attack', 25, 'Advanced Tier'),
  ('human_magical', 'magic_defense', 20, 'Advanced Tier'),
  ('human_magical', 'intelligence', 18, 'Advanced Tier'),
  ('human_magical', 'wisdom', 15, 'Advanced Tier'),
  ('human_magical', 'spirit', 15, 'Advanced Tier'),
  ('human_magical', 'charisma', 8, 'Advanced Tier'),
  ('human_magical', 'max_health', -20, 'Advanced Tier'),
  ('human_magical', 'max_energy', -5, 'Advanced Tier'),
  ('human_magical', 'max_mana', 40, 'Advanced Tier'),
  ('human_magical', 'training', 20, 'Advanced Tier'),
  ('human_magical', 'mental_health', 5, 'Advanced Tier'),
  ('human_magical', 'team_player', 5, 'Advanced Tier'),
  ('human_magical', 'ego', 10, 'Advanced Tier'),
  ('human_magical', 'communication', 10, 'Advanced Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- VAMPIRE (Advanced Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('vampire', 'attack', 20, 'Advanced Tier'),
  ('vampire', 'defense', 5, 'Advanced Tier'),
  ('vampire', 'speed', 20, 'Advanced Tier'),
  ('vampire', 'strength', 18, 'Advanced Tier'),
  ('vampire', 'dexterity', 18, 'Advanced Tier'),
  ('vampire', 'endurance', 20, 'Advanced Tier'),
  ('vampire', 'magic_attack', 15, 'Advanced Tier'),
  ('vampire', 'magic_defense', 15, 'Advanced Tier'),
  ('vampire', 'intelligence', 18, 'Advanced Tier'),
  ('vampire', 'wisdom', 15, 'Advanced Tier'),
  ('vampire', 'spirit', -15, 'Advanced Tier'),
  ('vampire', 'charisma', 25, 'Advanced Tier'),
  ('vampire', 'max_health', 10, 'Advanced Tier'),
  ('vampire', 'max_energy', -25, 'Advanced Tier'),
  ('vampire', 'max_mana', 25, 'Advanced Tier'),
  ('vampire', 'training', 5, 'Advanced Tier'),
  ('vampire', 'mental_health', -25, 'Advanced Tier'),
  ('vampire', 'team_player', -30, 'Advanced Tier'),
  ('vampire', 'ego', 25, 'Advanced Tier'),
  ('vampire', 'communication', 10, 'Advanced Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- UNICORN (Advanced Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('unicorn', 'attack', 15, 'Advanced Tier'),
  ('unicorn', 'defense', 10, 'Advanced Tier'),
  ('unicorn', 'speed', 20, 'Advanced Tier'),
  ('unicorn', 'strength', 12, 'Advanced Tier'),
  ('unicorn', 'dexterity', 18, 'Advanced Tier'),
  ('unicorn', 'endurance', 15, 'Advanced Tier'),
  ('unicorn', 'magic_attack', 25, 'Advanced Tier'),
  ('unicorn', 'magic_defense', 25, 'Advanced Tier'),
  ('unicorn', 'intelligence', 18, 'Advanced Tier'),
  ('unicorn', 'wisdom', 22, 'Advanced Tier'),
  ('unicorn', 'spirit', 30, 'Advanced Tier'),
  ('unicorn', 'charisma', 25, 'Advanced Tier'),
  ('unicorn', 'max_health', 15, 'Advanced Tier'),
  ('unicorn', 'max_energy', 15, 'Advanced Tier'),
  ('unicorn', 'max_mana', 35, 'Advanced Tier'),
  ('unicorn', 'training', -25, 'Advanced Tier'),
  ('unicorn', 'mental_health', 10, 'Advanced Tier'),
  ('unicorn', 'team_player', -20, 'Advanced Tier'),
  ('unicorn', 'ego', 50, 'Advanced Tier'),
  ('unicorn', 'communication', -15, 'Advanced Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ZETA_RETICULAN_GREY (Advanced Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('zeta_reticulan_grey', 'attack', 15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'defense', -20, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'speed', 0, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'strength', -15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'dexterity', -10, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'endurance', -12, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'magic_attack', 20, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'magic_defense', 18, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'intelligence', 25, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'wisdom', 20, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'spirit', 15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'charisma', -15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'max_health', 15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'max_energy', 15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'max_mana', 15, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'training', 10, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'mental_health', 10, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'team_player', -20, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'ego', 20, 'Advanced Tier'),
  ('zeta_reticulan_grey', 'communication', -10, 'Advanced Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ANGEL (Elite Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('angel', 'attack', 20, 'Elite Tier'),
  ('angel', 'defense', 15, 'Elite Tier'),
  ('angel', 'speed', 15, 'Elite Tier'),
  ('angel', 'strength', 18, 'Elite Tier'),
  ('angel', 'dexterity', 20, 'Elite Tier'),
  ('angel', 'endurance', 18, 'Elite Tier'),
  ('angel', 'magic_attack', 30, 'Elite Tier'),
  ('angel', 'magic_defense', 30, 'Elite Tier'),
  ('angel', 'intelligence', 25, 'Elite Tier'),
  ('angel', 'wisdom', 28, 'Elite Tier'),
  ('angel', 'spirit', 35, 'Elite Tier'),
  ('angel', 'charisma', 28, 'Elite Tier'),
  ('angel', 'max_health', 15, 'Elite Tier'),
  ('angel', 'max_energy', 20, 'Elite Tier'),
  ('angel', 'max_mana', 30, 'Elite Tier'),
  ('angel', 'training', 5, 'Elite Tier'),
  ('angel', 'mental_health', 15, 'Elite Tier'),
  ('angel', 'team_player', -30, 'Elite Tier'),
  ('angel', 'ego', 80, 'Elite Tier'),
  ('angel', 'communication', 5, 'Elite Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- MAGICAL_TOASTER (Elite Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('magical_toaster', 'attack', -15, 'Elite Tier'),
  ('magical_toaster', 'defense', -10, 'Elite Tier'),
  ('magical_toaster', 'speed', -20, 'Elite Tier'),
  ('magical_toaster', 'strength', -20, 'Elite Tier'),
  ('magical_toaster', 'dexterity', -20, 'Elite Tier'),
  ('magical_toaster', 'endurance', -10, 'Elite Tier'),
  ('magical_toaster', 'magic_attack', 20, 'Elite Tier'),
  ('magical_toaster', 'magic_defense', 18, 'Elite Tier'),
  ('magical_toaster', 'intelligence', 15, 'Elite Tier'),
  ('magical_toaster', 'wisdom', 5, 'Elite Tier'),
  ('magical_toaster', 'spirit', 8, 'Elite Tier'),
  ('magical_toaster', 'charisma', -18, 'Elite Tier'),
  ('magical_toaster', 'max_health', 25, 'Elite Tier'),
  ('magical_toaster', 'max_energy', 25, 'Elite Tier'),
  ('magical_toaster', 'max_mana', 40, 'Elite Tier'),
  ('magical_toaster', 'training', -25, 'Elite Tier'),
  ('magical_toaster', 'mental_health', 5, 'Elite Tier'),
  ('magical_toaster', 'team_player', 15, 'Elite Tier'),
  ('magical_toaster', 'ego', 0, 'Elite Tier'),
  ('magical_toaster', 'communication', -20, 'Elite Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- DEITY (Legendary Tier)
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier, notes) VALUES
  ('deity', 'attack', 25, 'Legendary Tier'),
  ('deity', 'defense', 15, 'Legendary Tier'),
  ('deity', 'speed', 15, 'Legendary Tier'),
  ('deity', 'strength', 20, 'Legendary Tier'),
  ('deity', 'dexterity', 15, 'Legendary Tier'),
  ('deity', 'endurance', 25, 'Legendary Tier'),
  ('deity', 'magic_attack', 30, 'Legendary Tier'),
  ('deity', 'magic_defense', 30, 'Legendary Tier'),
  ('deity', 'intelligence', 25, 'Legendary Tier'),
  ('deity', 'wisdom', 30, 'Legendary Tier'),
  ('deity', 'spirit', 35, 'Legendary Tier'),
  ('deity', 'charisma', 30, 'Legendary Tier'),
  ('deity', 'max_health', 20, 'Legendary Tier'),
  ('deity', 'max_energy', 20, 'Legendary Tier'),
  ('deity', 'max_mana', 50, 'Legendary Tier'),
  ('deity', 'training', -20, 'Legendary Tier'),
  ('deity', 'mental_health', -15, 'Legendary Tier'),
  ('deity', 'team_player', -30, 'Legendary Tier'),
  ('deity', 'ego', 80, 'Legendary Tier'),
  ('deity', 'communication', -20, 'Legendary Tier')
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- =====================================================
-- SIGNATURE/INDIVIDUAL ATTRIBUTE MODIFIERS (from migration 101)
-- =====================================================

-- ACHILLES
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('achilles', 'attack', 15, 'NET +10'),
  ('achilles', 'defense', 15, 'NET +10'),
  ('achilles', 'speed', 20, 'NET +10'),
  ('achilles', 'strength', 20, 'NET +10'),
  ('achilles', 'dexterity', 20, 'NET +10'),
  ('achilles', 'endurance', 20, 'NET +10'),
  ('achilles', 'magic_attack', 10, 'NET +10'),
  ('achilles', 'magic_defense', 10, 'NET +10'),
  ('achilles', 'intelligence', 5, 'NET +10'),
  ('achilles', 'wisdom', 5, 'NET +10'),
  ('achilles', 'spirit', 15, 'NET +10'),
  ('achilles', 'charisma', 15, 'NET +10'),
  ('achilles', 'max_health', 20, 'NET +10'),
  ('achilles', 'max_energy', 20, 'NET +10'),
  ('achilles', 'max_mana', 0, 'NET +10'),
  ('achilles', 'training', 10, 'NET +10'),
  ('achilles', 'mental_health', -45, 'NET +10'),
  ('achilles', 'team_player', -40, 'NET +10'),
  ('achilles', 'ego', 60, 'NET +10'),
  ('achilles', 'communication', 0, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- AGENT_X
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('agent_x', 'attack', 15, 'NET 0'),
  ('agent_x', 'defense', 10, 'NET 0'),
  ('agent_x', 'speed', 15, 'NET 0'),
  ('agent_x', 'strength', 10, 'NET 0'),
  ('agent_x', 'dexterity', 20, 'NET 0'),
  ('agent_x', 'endurance', 10, 'NET 0'),
  ('agent_x', 'magic_attack', -10, 'NET 0'),
  ('agent_x', 'magic_defense', 5, 'NET 0'),
  ('agent_x', 'intelligence', 20, 'NET 0'),
  ('agent_x', 'wisdom', 5, 'NET 0'),
  ('agent_x', 'spirit', 5, 'NET 0'),
  ('agent_x', 'charisma', 5, 'NET 0'),
  ('agent_x', 'max_health', 5, 'NET 0'),
  ('agent_x', 'max_energy', 20, 'NET 0'),
  ('agent_x', 'max_mana', -20, 'NET 0'),
  ('agent_x', 'training', 30, 'NET 0'),
  ('agent_x', 'mental_health', -30, 'NET 0'),
  ('agent_x', 'team_player', -30, 'NET 0'),
  ('agent_x', 'ego', 35, 'NET 0'),
  ('agent_x', 'communication', 0, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ALEISTER_CROWLEY
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('aleister_crowley', 'attack', -15, 'NET 0'),
  ('aleister_crowley', 'defense', -15, 'NET 0'),
  ('aleister_crowley', 'speed', -10, 'NET 0'),
  ('aleister_crowley', 'strength', -15, 'NET 0'),
  ('aleister_crowley', 'dexterity', -5, 'NET 0'),
  ('aleister_crowley', 'endurance', -10, 'NET 0'),
  ('aleister_crowley', 'magic_attack', 25, 'NET 0'),
  ('aleister_crowley', 'magic_defense', 20, 'NET 0'),
  ('aleister_crowley', 'intelligence', 20, 'NET 0'),
  ('aleister_crowley', 'wisdom', 15, 'NET 0'),
  ('aleister_crowley', 'spirit', 30, 'NET 0'),
  ('aleister_crowley', 'charisma', -10, 'NET 0'),
  ('aleister_crowley', 'max_health', -10, 'NET 0'),
  ('aleister_crowley', 'max_energy', -10, 'NET 0'),
  ('aleister_crowley', 'max_mana', 50, 'NET 0'),
  ('aleister_crowley', 'training', 20, 'NET 0'),
  ('aleister_crowley', 'mental_health', -30, 'NET 0'),
  ('aleister_crowley', 'team_player', -30, 'NET 0'),
  ('aleister_crowley', 'ego', 50, 'NET 0'),
  ('aleister_crowley', 'communication', 0, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ARCHANGEL_MICHAEL
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('archangel_michael', 'attack', 20, 'NET +10'),
  ('archangel_michael', 'defense', 15, 'NET +10'),
  ('archangel_michael', 'speed', 15, 'NET +10'),
  ('archangel_michael', 'strength', 20, 'NET +10'),
  ('archangel_michael', 'dexterity', 15, 'NET +10'),
  ('archangel_michael', 'endurance', 15, 'NET +10'),
  ('archangel_michael', 'magic_attack', 15, 'NET +10'),
  ('archangel_michael', 'magic_defense', 20, 'NET +10'),
  ('archangel_michael', 'intelligence', 10, 'NET +10'),
  ('archangel_michael', 'wisdom', 15, 'NET +10'),
  ('archangel_michael', 'spirit', 30, 'NET +10'),
  ('archangel_michael', 'charisma', 10, 'NET +10'),
  ('archangel_michael', 'max_health', 15, 'NET +10'),
  ('archangel_michael', 'max_energy', 15, 'NET +10'),
  ('archangel_michael', 'max_mana', 20, 'NET +10'),
  ('archangel_michael', 'training', 5, 'NET +10'),
  ('archangel_michael', 'mental_health', -30, 'NET +10'),
  ('archangel_michael', 'team_player', -45, 'NET +10'),
  ('archangel_michael', 'ego', 70, 'NET +10'),
  ('archangel_michael', 'communication', 5, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- BILLY_THE_KID
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('billy_the_kid', 'attack', 25, 'NET 0'),
  ('billy_the_kid', 'defense', -20, 'NET 0'),
  ('billy_the_kid', 'speed', 30, 'NET 0'),
  ('billy_the_kid', 'strength', 10, 'NET 0'),
  ('billy_the_kid', 'dexterity', 30, 'NET 0'),
  ('billy_the_kid', 'endurance', 5, 'NET 0'),
  ('billy_the_kid', 'magic_attack', -15, 'NET 0'),
  ('billy_the_kid', 'magic_defense', -10, 'NET 0'),
  ('billy_the_kid', 'intelligence', 5, 'NET 0'),
  ('billy_the_kid', 'wisdom', -10, 'NET 0'),
  ('billy_the_kid', 'spirit', 5, 'NET 0'),
  ('billy_the_kid', 'charisma', 10, 'NET 0'),
  ('billy_the_kid', 'max_health', 5, 'NET 0'),
  ('billy_the_kid', 'max_energy', 35, 'NET 0'),
  ('billy_the_kid', 'max_mana', -20, 'NET 0'),
  ('billy_the_kid', 'training', 10, 'NET 0'),
  ('billy_the_kid', 'mental_health', -30, 'NET 0'),
  ('billy_the_kid', 'team_player', -30, 'NET 0'),
  ('billy_the_kid', 'ego', 50, 'NET 0'),
  ('billy_the_kid', 'communication', 0, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- CLEOPATRA
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('cleopatra', 'attack', -5, 'NET +10'),
  ('cleopatra', 'defense', -10, 'NET +10'),
  ('cleopatra', 'speed', 5, 'NET +10'),
  ('cleopatra', 'strength', -10, 'NET +10'),
  ('cleopatra', 'dexterity', 10, 'NET +10'),
  ('cleopatra', 'endurance', 5, 'NET +10'),
  ('cleopatra', 'magic_attack', 15, 'NET +10'),
  ('cleopatra', 'magic_defense', 15, 'NET +10'),
  ('cleopatra', 'intelligence', 25, 'NET +10'),
  ('cleopatra', 'wisdom', 15, 'NET +10'),
  ('cleopatra', 'spirit', 15, 'NET +10'),
  ('cleopatra', 'charisma', 30, 'NET +10'),
  ('cleopatra', 'max_health', 10, 'NET +10'),
  ('cleopatra', 'max_energy', 15, 'NET +10'),
  ('cleopatra', 'max_mana', 20, 'NET +10'),
  ('cleopatra', 'training', 15, 'NET +10'),
  ('cleopatra', 'mental_health', -30, 'NET +10'),
  ('cleopatra', 'team_player', -35, 'NET +10'),
  ('cleopatra', 'ego', 55, 'NET +10'),
  ('cleopatra', 'communication', 20, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- DRACULA
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('dracula', 'attack', 15, 'NET 0'),
  ('dracula', 'defense', 10, 'NET 0'),
  ('dracula', 'speed', 20, 'NET 0'),
  ('dracula', 'strength', 20, 'NET 0'),
  ('dracula', 'dexterity', 15, 'NET 0'),
  ('dracula', 'endurance', 20, 'NET 0'),
  ('dracula', 'magic_attack', 15, 'NET 0'),
  ('dracula', 'magic_defense', 15, 'NET 0'),
  ('dracula', 'intelligence', 15, 'NET 0'),
  ('dracula', 'wisdom', 10, 'NET 0'),
  ('dracula', 'spirit', -10, 'NET 0'),
  ('dracula', 'charisma', 20, 'NET 0'),
  ('dracula', 'max_health', 15, 'NET 0'),
  ('dracula', 'max_energy', 10, 'NET 0'),
  ('dracula', 'max_mana', 25, 'NET 0'),
  ('dracula', 'training', 10, 'NET 0'),
  ('dracula', 'mental_health', -40, 'NET 0'),
  ('dracula', 'team_player', -45, 'NET 0'),
  ('dracula', 'ego', 65, 'NET 0'),
  ('dracula', 'communication', 10, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- CRUMBSWORTH
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('crumbsworth', 'attack', -30, 'NET +10'),
  ('crumbsworth', 'defense', -25, 'NET +10'),
  ('crumbsworth', 'speed', 0, 'NET +10'),
  ('crumbsworth', 'strength', -25, 'NET +10'),
  ('crumbsworth', 'dexterity', 5, 'NET +10'),
  ('crumbsworth', 'endurance', -15, 'NET +10'),
  ('crumbsworth', 'magic_attack', 40, 'NET +10'),
  ('crumbsworth', 'magic_defense', 30, 'NET +10'),
  ('crumbsworth', 'intelligence', 25, 'NET +10'),
  ('crumbsworth', 'wisdom', 20, 'NET +10'),
  ('crumbsworth', 'spirit', 30, 'NET +10'),
  ('crumbsworth', 'charisma', -20, 'NET +10'),
  ('crumbsworth', 'max_health', 10, 'NET +10'),
  ('crumbsworth', 'max_energy', 15, 'NET +10'),
  ('crumbsworth', 'max_mana', 50, 'NET +10'),
  ('crumbsworth', 'training', -20, 'NET +10'),
  ('crumbsworth', 'mental_health', 20, 'NET +10'),
  ('crumbsworth', 'team_player', 40, 'NET +10'),
  ('crumbsworth', 'ego', -10, 'NET +10'),
  ('crumbsworth', 'communication', -10, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- DON_QUIXOTE
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('don_quixote', 'attack', 10, 'NET +10'),
  ('don_quixote', 'defense', 10, 'NET +10'),
  ('don_quixote', 'speed', 5, 'NET +10'),
  ('don_quixote', 'strength', 5, 'NET +10'),
  ('don_quixote', 'dexterity', 5, 'NET +10'),
  ('don_quixote', 'endurance', 15, 'NET +10'),
  ('don_quixote', 'magic_attack', -10, 'NET +10'),
  ('don_quixote', 'magic_defense', 5, 'NET +10'),
  ('don_quixote', 'intelligence', -10, 'NET +10'),
  ('don_quixote', 'wisdom', -15, 'NET +10'),
  ('don_quixote', 'spirit', 30, 'NET +10'),
  ('don_quixote', 'charisma', 20, 'NET +10'),
  ('don_quixote', 'max_health', 10, 'NET +10'),
  ('don_quixote', 'max_energy', 25, 'NET +10'),
  ('don_quixote', 'max_mana', -10, 'NET +10'),
  ('don_quixote', 'training', 20, 'NET +10'),
  ('don_quixote', 'mental_health', -50, 'NET +10'),
  ('don_quixote', 'team_player', -20, 'NET +10'),
  ('don_quixote', 'ego', 50, 'NET +10'),
  ('don_quixote', 'communication', 20, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- FENRIR
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('fenrir', 'attack', 30, 'NET 0'),
  ('fenrir', 'defense', 15, 'NET 0'),
  ('fenrir', 'speed', 25, 'NET 0'),
  ('fenrir', 'strength', 30, 'NET 0'),
  ('fenrir', 'dexterity', 20, 'NET 0'),
  ('fenrir', 'endurance', 25, 'NET 0'),
  ('fenrir', 'magic_attack', 10, 'NET 0'),
  ('fenrir', 'magic_defense', 10, 'NET 0'),
  ('fenrir', 'intelligence', -10, 'NET 0'),
  ('fenrir', 'wisdom', -10, 'NET 0'),
  ('fenrir', 'spirit', 15, 'NET 0'),
  ('fenrir', 'charisma', -15, 'NET 0'),
  ('fenrir', 'max_health', 25, 'NET 0'),
  ('fenrir', 'max_energy', 25, 'NET 0'),
  ('fenrir', 'max_mana', -10, 'NET 0'),
  ('fenrir', 'training', -20, 'NET 0'),
  ('fenrir', 'mental_health', -40, 'NET 0'),
  ('fenrir', 'team_player', -50, 'NET 0'),
  ('fenrir', 'ego', 50, 'NET 0'),
  ('fenrir', 'communication', -20, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- FRANKENSTEIN_MONSTER
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('frankenstein_monster', 'attack', 15, 'NET +10'),
  ('frankenstein_monster', 'defense', 15, 'NET +10'),
  ('frankenstein_monster', 'speed', -15, 'NET +10'),
  ('frankenstein_monster', 'strength', 30, 'NET +10'),
  ('frankenstein_monster', 'dexterity', -10, 'NET +10'),
  ('frankenstein_monster', 'endurance', 30, 'NET +10'),
  ('frankenstein_monster', 'magic_attack', -10, 'NET +10'),
  ('frankenstein_monster', 'magic_defense', 5, 'NET +10'),
  ('frankenstein_monster', 'intelligence', -15, 'NET +10'),
  ('frankenstein_monster', 'wisdom', -10, 'NET +10'),
  ('frankenstein_monster', 'spirit', 10, 'NET +10'),
  ('frankenstein_monster', 'charisma', -20, 'NET +10'),
  ('frankenstein_monster', 'max_health', 35, 'NET +10'),
  ('frankenstein_monster', 'max_energy', 25, 'NET +10'),
  ('frankenstein_monster', 'max_mana', -10, 'NET +10'),
  ('frankenstein_monster', 'training', 5, 'NET +10'),
  ('frankenstein_monster', 'mental_health', -40, 'NET +10'),
  ('frankenstein_monster', 'team_player', -25, 'NET +10'),
  ('frankenstein_monster', 'ego', 30, 'NET +10'),
  ('frankenstein_monster', 'communication', -10, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- GENGHIS_KHAN
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('genghis_khan', 'attack', 20, 'NET +10'),
  ('genghis_khan', 'defense', 15, 'NET +10'),
  ('genghis_khan', 'speed', 15, 'NET +10'),
  ('genghis_khan', 'strength', 20, 'NET +10'),
  ('genghis_khan', 'dexterity', 15, 'NET +10'),
  ('genghis_khan', 'endurance', 15, 'NET +10'),
  ('genghis_khan', 'magic_attack', -10, 'NET +10'),
  ('genghis_khan', 'magic_defense', 5, 'NET +10'),
  ('genghis_khan', 'intelligence', 15, 'NET +10'),
  ('genghis_khan', 'wisdom', 10, 'NET +10'),
  ('genghis_khan', 'spirit', 10, 'NET +10'),
  ('genghis_khan', 'charisma', 15, 'NET +10'),
  ('genghis_khan', 'max_health', 15, 'NET +10'),
  ('genghis_khan', 'max_energy', 15, 'NET +10'),
  ('genghis_khan', 'max_mana', -20, 'NET +10'),
  ('genghis_khan', 'training', 25, 'NET +10'),
  ('genghis_khan', 'mental_health', -35, 'NET +10'),
  ('genghis_khan', 'team_player', -40, 'NET +10'),
  ('genghis_khan', 'ego', 60, 'NET +10'),
  ('genghis_khan', 'communication', 10, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- JACK_THE_RIPPER
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('jack_the_ripper', 'attack', 25, 'NET +2'),
  ('jack_the_ripper', 'defense', 5, 'NET +2'),
  ('jack_the_ripper', 'speed', 30, 'NET +2'),
  ('jack_the_ripper', 'strength', 10, 'NET +2'),
  ('jack_the_ripper', 'dexterity', 25, 'NET +2'),
  ('jack_the_ripper', 'endurance', 5, 'NET +2'),
  ('jack_the_ripper', 'magic_attack', -10, 'NET +2'),
  ('jack_the_ripper', 'magic_defense', -5, 'NET +2'),
  ('jack_the_ripper', 'intelligence', 15, 'NET +2'),
  ('jack_the_ripper', 'wisdom', -5, 'NET +2'),
  ('jack_the_ripper', 'spirit', -10, 'NET +2'),
  ('jack_the_ripper', 'charisma', -15, 'NET +2'),
  ('jack_the_ripper', 'max_health', 10, 'NET +2'),
  ('jack_the_ripper', 'max_energy', 25, 'NET +2'),
  ('jack_the_ripper', 'max_mana', -20, 'NET +2'),
  ('jack_the_ripper', 'training', 20, 'NET +2'),
  ('jack_the_ripper', 'mental_health', -50, 'NET +2'),
  ('jack_the_ripper', 'team_player', -40, 'NET +2'),
  ('jack_the_ripper', 'ego', 45, 'NET +2'),
  ('jack_the_ripper', 'communication', -5, 'NET +2')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- JOAN
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('joan', 'attack', 10, 'NET +9'),
  ('joan', 'defense', 15, 'NET +9'),
  ('joan', 'speed', -8, 'NET +9'),
  ('joan', 'strength', 12, 'NET +9'),
  ('joan', 'dexterity', -10, 'NET +9'),
  ('joan', 'endurance', 15, 'NET +9'),
  ('joan', 'magic_attack', 10, 'NET +9'),
  ('joan', 'magic_defense', 10, 'NET +9'),
  ('joan', 'intelligence', 5, 'NET +9'),
  ('joan', 'wisdom', 5, 'NET +9'),
  ('joan', 'spirit', 35, 'NET +9'),
  ('joan', 'charisma', 15, 'NET +9'),
  ('joan', 'max_health', 5, 'NET +9'),
  ('joan', 'max_energy', 20, 'NET +9'),
  ('joan', 'max_mana', 10, 'NET +9'),
  ('joan', 'training', 5, 'NET +9'),
  ('joan', 'mental_health', -60, 'NET +9'),
  ('joan', 'team_player', -35, 'NET +9'),
  ('joan', 'ego', 55, 'NET +9'),
  ('joan', 'communication', 5, 'NET +9')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- KALI
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('kali', 'attack', 15, 'NET +10'),
  ('kali', 'defense', 15, 'NET +10'),
  ('kali', 'speed', 15, 'NET +10'),
  ('kali', 'strength', 15, 'NET +10'),
  ('kali', 'dexterity', 20, 'NET +10'),
  ('kali', 'endurance', 20, 'NET +10'),
  ('kali', 'magic_attack', 15, 'NET +10'),
  ('kali', 'magic_defense', 15, 'NET +10'),
  ('kali', 'intelligence', 15, 'NET +10'),
  ('kali', 'wisdom', 15, 'NET +10'),
  ('kali', 'spirit', 15, 'NET +10'),
  ('kali', 'charisma', -20, 'NET +10'),
  ('kali', 'max_health', 15, 'NET +10'),
  ('kali', 'max_energy', 15, 'NET +10'),
  ('kali', 'max_mana', 15, 'NET +10'),
  ('kali', 'training', 0, 'NET +10'),
  ('kali', 'mental_health', -60, 'NET +10'),
  ('kali', 'team_player', -60, 'NET +10'),
  ('kali', 'ego', 70, 'NET +10'),
  ('kali', 'communication', 0, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- KANGAROO
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('kangaroo', 'attack', 30, 'NET +5'),
  ('kangaroo', 'defense', 5, 'NET +5'),
  ('kangaroo', 'speed', 25, 'NET +5'),
  ('kangaroo', 'strength', 35, 'NET +5'),
  ('kangaroo', 'dexterity', 15, 'NET +5'),
  ('kangaroo', 'endurance', 25, 'NET +5'),
  ('kangaroo', 'magic_attack', -10, 'NET +5'),
  ('kangaroo', 'magic_defense', -10, 'NET +5'),
  ('kangaroo', 'intelligence', -15, 'NET +5'),
  ('kangaroo', 'wisdom', 5, 'NET +5'),
  ('kangaroo', 'spirit', 10, 'NET +5'),
  ('kangaroo', 'charisma', -10, 'NET +5'),
  ('kangaroo', 'max_health', 10, 'NET +5'),
  ('kangaroo', 'max_energy', 30, 'NET +5'),
  ('kangaroo', 'max_mana', -5, 'NET +5'),
  ('kangaroo', 'training', -20, 'NET +5'),
  ('kangaroo', 'mental_health', -40, 'NET +5'),
  ('kangaroo', 'team_player', -40, 'NET +5'),
  ('kangaroo', 'ego', 25, 'NET +5'),
  ('kangaroo', 'communication', -10, 'NET +5')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- KARNA
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('karna', 'attack', 15, 'NET 0'),
  ('karna', 'defense', 10, 'NET 0'),
  ('karna', 'speed', 15, 'NET 0'),
  ('karna', 'strength', 10, 'NET 0'),
  ('karna', 'dexterity', 20, 'NET 0'),
  ('karna', 'endurance', 10, 'NET 0'),
  ('karna', 'magic_attack', 10, 'NET 0'),
  ('karna', 'magic_defense', 5, 'NET 0'),
  ('karna', 'intelligence', 5, 'NET 0'),
  ('karna', 'wisdom', 5, 'NET 0'),
  ('karna', 'spirit', 10, 'NET 0'),
  ('karna', 'charisma', 10, 'NET 0'),
  ('karna', 'max_health', 10, 'NET 0'),
  ('karna', 'max_energy', 10, 'NET 0'),
  ('karna', 'max_mana', 5, 'NET 0'),
  ('karna', 'training', 5, 'NET 0'),
  ('karna', 'mental_health', -45, 'NET 0'),
  ('karna', 'team_player', -50, 'NET 0'),
  ('karna', 'ego', 65, 'NET 0'),
  ('karna', 'communication', 5, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- LITTLE_BO_PEEP
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('little_bo_peep', 'attack', -10, 'NET +15'),
  ('little_bo_peep', 'defense', -15, 'NET +15'),
  ('little_bo_peep', 'speed', 10, 'NET +15'),
  ('little_bo_peep', 'strength', 5, 'NET +15'),
  ('little_bo_peep', 'dexterity', 10, 'NET +15'),
  ('little_bo_peep', 'endurance', 10, 'NET +15'),
  ('little_bo_peep', 'magic_attack', 30, 'NET +15'),
  ('little_bo_peep', 'magic_defense', 15, 'NET +15'),
  ('little_bo_peep', 'intelligence', -5, 'NET +15'),
  ('little_bo_peep', 'wisdom', 5, 'NET +15'),
  ('little_bo_peep', 'spirit', 10, 'NET +15'),
  ('little_bo_peep', 'charisma', -5, 'NET +15'),
  ('little_bo_peep', 'max_health', -10, 'NET +15'),
  ('little_bo_peep', 'max_energy', 15, 'NET +15'),
  ('little_bo_peep', 'max_mana', 40, 'NET +15'),
  ('little_bo_peep', 'training', -10, 'NET +15'),
  ('little_bo_peep', 'mental_health', -50, 'NET +15'),
  ('little_bo_peep', 'team_player', -45, 'NET +15'),
  ('little_bo_peep', 'ego', 10, 'NET +15'),
  ('little_bo_peep', 'communication', 15, 'NET +15')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- MAMI_WATA
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('mami_wata', 'attack', -20, 'NET 0'),
  ('mami_wata', 'defense', -20, 'NET 0'),
  ('mami_wata', 'speed', -10, 'NET 0'),
  ('mami_wata', 'strength', -30, 'NET 0'),
  ('mami_wata', 'dexterity', 0, 'NET 0'),
  ('mami_wata', 'endurance', -20, 'NET 0'),
  ('mami_wata', 'magic_attack', 20, 'NET 0'),
  ('mami_wata', 'magic_defense', 10, 'NET 0'),
  ('mami_wata', 'intelligence', -10, 'NET 0'),
  ('mami_wata', 'wisdom', 5, 'NET 0'),
  ('mami_wata', 'spirit', 15, 'NET 0'),
  ('mami_wata', 'charisma', 30, 'NET 0'),
  ('mami_wata', 'max_health', 40, 'NET 0'),
  ('mami_wata', 'max_energy', -20, 'NET 0'),
  ('mami_wata', 'max_mana', 40, 'NET 0'),
  ('mami_wata', 'training', -30, 'NET 0'),
  ('mami_wata', 'mental_health', 20, 'NET 0'),
  ('mami_wata', 'team_player', 10, 'NET 0'),
  ('mami_wata', 'ego', 40, 'NET 0'),
  ('mami_wata', 'communication', 10, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- MERLIN
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('merlin', 'attack', -25, 'NET +5'),
  ('merlin', 'defense', -15, 'NET +5'),
  ('merlin', 'speed', -10, 'NET +5'),
  ('merlin', 'strength', -20, 'NET +5'),
  ('merlin', 'dexterity', -15, 'NET +5'),
  ('merlin', 'endurance', -10, 'NET +5'),
  ('merlin', 'magic_attack', 30, 'NET +5'),
  ('merlin', 'magic_defense', 25, 'NET +5'),
  ('merlin', 'intelligence', 15, 'NET +5'),
  ('merlin', 'wisdom', 20, 'NET +5'),
  ('merlin', 'spirit', 10, 'NET +5'),
  ('merlin', 'charisma', -15, 'NET +5'),
  ('merlin', 'max_health', -15, 'NET +5'),
  ('merlin', 'max_energy', -20, 'NET +5'),
  ('merlin', 'max_mana', 55, 'NET +5'),
  ('merlin', 'training', 10, 'NET +5'),
  ('merlin', 'mental_health', 20, 'NET +5'),
  ('merlin', 'team_player', 20, 'NET +5'),
  ('merlin', 'ego', 50, 'NET +5'),
  ('merlin', 'communication', -5, 'NET +5')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- NAPOLEON_BONAPARTE
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('napoleon_bonaparte', 'attack', 15, 'NET 0'),
  ('napoleon_bonaparte', 'defense', -5, 'NET 0'),
  ('napoleon_bonaparte', 'speed', 10, 'NET 0'),
  ('napoleon_bonaparte', 'strength', -5, 'NET 0'),
  ('napoleon_bonaparte', 'dexterity', 15, 'NET 0'),
  ('napoleon_bonaparte', 'endurance', 5, 'NET 0'),
  ('napoleon_bonaparte', 'magic_attack', -10, 'NET 0'),
  ('napoleon_bonaparte', 'magic_defense', -10, 'NET 0'),
  ('napoleon_bonaparte', 'intelligence', 20, 'NET 0'),
  ('napoleon_bonaparte', 'wisdom', -10, 'NET 0'),
  ('napoleon_bonaparte', 'spirit', 10, 'NET 0'),
  ('napoleon_bonaparte', 'charisma', 15, 'NET 0'),
  ('napoleon_bonaparte', 'max_health', 10, 'NET 0'),
  ('napoleon_bonaparte', 'max_energy', 40, 'NET 0'),
  ('napoleon_bonaparte', 'max_mana', -10, 'NET 0'),
  ('napoleon_bonaparte', 'training', 30, 'NET 0'),
  ('napoleon_bonaparte', 'mental_health', -30, 'NET 0'),
  ('napoleon_bonaparte', 'team_player', -30, 'NET 0'),
  ('napoleon_bonaparte', 'ego', 50, 'NET 0'),
  ('napoleon_bonaparte', 'communication', -10, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- TESLA
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('tesla', 'attack', -10, 'NET +5'),
  ('tesla', 'defense', -10, 'NET +5'),
  ('tesla', 'speed', 10, 'NET +5'),
  ('tesla', 'strength', -10, 'NET +5'),
  ('tesla', 'dexterity', 10, 'NET +5'),
  ('tesla', 'endurance', 5, 'NET +5'),
  ('tesla', 'magic_attack', 10, 'NET +5'),
  ('tesla', 'magic_defense', 10, 'NET +5'),
  ('tesla', 'intelligence', 50, 'NET +5'),
  ('tesla', 'wisdom', -10, 'NET +5'),
  ('tesla', 'spirit', 10, 'NET +5'),
  ('tesla', 'charisma', -20, 'NET +5'),
  ('tesla', 'max_health', 0, 'NET +5'),
  ('tesla', 'max_energy', 50, 'NET +5'),
  ('tesla', 'max_mana', 0, 'NET +5'),
  ('tesla', 'training', 40, 'NET +5'),
  ('tesla', 'mental_health', -40, 'NET +5'),
  ('tesla', 'team_player', -30, 'NET +5'),
  ('tesla', 'ego', 50, 'NET +5'),
  ('tesla', 'communication', -10, 'NET +5')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- QUETZALCOATL
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('quetzalcoatl', 'attack', 20, 'NET 0'),
  ('quetzalcoatl', 'defense', 15, 'NET 0'),
  ('quetzalcoatl', 'speed', 20, 'NET 0'),
  ('quetzalcoatl', 'strength', 15, 'NET 0'),
  ('quetzalcoatl', 'dexterity', 20, 'NET 0'),
  ('quetzalcoatl', 'endurance', 15, 'NET 0'),
  ('quetzalcoatl', 'magic_attack', 15, 'NET 0'),
  ('quetzalcoatl', 'magic_defense', 15, 'NET 0'),
  ('quetzalcoatl', 'intelligence', 10, 'NET 0'),
  ('quetzalcoatl', 'wisdom', 15, 'NET 0'),
  ('quetzalcoatl', 'spirit', 15, 'NET 0'),
  ('quetzalcoatl', 'charisma', 10, 'NET 0'),
  ('quetzalcoatl', 'max_health', 15, 'NET 0'),
  ('quetzalcoatl', 'max_energy', 15, 'NET 0'),
  ('quetzalcoatl', 'max_mana', 25, 'NET 0'),
  ('quetzalcoatl', 'training', -40, 'NET 0'),
  ('quetzalcoatl', 'mental_health', -60, 'NET 0'),
  ('quetzalcoatl', 'team_player', -60, 'NET 0'),
  ('quetzalcoatl', 'ego', 70, 'NET 0'),
  ('quetzalcoatl', 'communication', -10, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- RAMSES_II
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('ramses_ii', 'attack', -15, 'NET +15'),
  ('ramses_ii', 'defense', -15, 'NET +15'),
  ('ramses_ii', 'speed', -20, 'NET +15'),
  ('ramses_ii', 'strength', -15, 'NET +15'),
  ('ramses_ii', 'dexterity', -20, 'NET +15'),
  ('ramses_ii', 'endurance', -10, 'NET +15'),
  ('ramses_ii', 'magic_attack', 20, 'NET +15'),
  ('ramses_ii', 'magic_defense', 20, 'NET +15'),
  ('ramses_ii', 'intelligence', 15, 'NET +15'),
  ('ramses_ii', 'wisdom', 20, 'NET +15'),
  ('ramses_ii', 'spirit', 15, 'NET +15'),
  ('ramses_ii', 'charisma', 10, 'NET +15'),
  ('ramses_ii', 'max_health', 40, 'NET +15'),
  ('ramses_ii', 'max_energy', -20, 'NET +15'),
  ('ramses_ii', 'max_mana', 50, 'NET +15'),
  ('ramses_ii', 'training', 30, 'NET +15'),
  ('ramses_ii', 'mental_health', -20, 'NET +15'),
  ('ramses_ii', 'team_player', -10, 'NET +15'),
  ('ramses_ii', 'ego', 50, 'NET +15'),
  ('ramses_ii', 'communication', -10, 'NET +15')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- RILAK_TRELKAR
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('rilak_trelkar', 'attack', -25, 'NET +5'),
  ('rilak_trelkar', 'defense', -25, 'NET +5'),
  ('rilak_trelkar', 'speed', 5, 'NET +5'),
  ('rilak_trelkar', 'strength', -20, 'NET +5'),
  ('rilak_trelkar', 'dexterity', 10, 'NET +5'),
  ('rilak_trelkar', 'endurance', 10, 'NET +5'),
  ('rilak_trelkar', 'magic_attack', 15, 'NET +5'),
  ('rilak_trelkar', 'magic_defense', 20, 'NET +5'),
  ('rilak_trelkar', 'intelligence', 35, 'NET +5'),
  ('rilak_trelkar', 'wisdom', 10, 'NET +5'),
  ('rilak_trelkar', 'spirit', 0, 'NET +5'),
  ('rilak_trelkar', 'charisma', -20, 'NET +5'),
  ('rilak_trelkar', 'max_health', 15, 'NET +5'),
  ('rilak_trelkar', 'max_energy', 25, 'NET +5'),
  ('rilak_trelkar', 'max_mana', 30, 'NET +5'),
  ('rilak_trelkar', 'training', 30, 'NET +5'),
  ('rilak_trelkar', 'mental_health', -30, 'NET +5'),
  ('rilak_trelkar', 'team_player', -30, 'NET +5'),
  ('rilak_trelkar', 'ego', 40, 'NET +5'),
  ('rilak_trelkar', 'communication', -10, 'NET +5')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- ROBIN_HOOD
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('robin_hood', 'attack', 25, 'NET 0'),
  ('robin_hood', 'defense', 5, 'NET 0'),
  ('robin_hood', 'speed', 25, 'NET 0'),
  ('robin_hood', 'strength', 5, 'NET 0'),
  ('robin_hood', 'dexterity', 20, 'NET 0'),
  ('robin_hood', 'endurance', 10, 'NET 0'),
  ('robin_hood', 'magic_attack', -5, 'NET 0'),
  ('robin_hood', 'magic_defense', 0, 'NET 0'),
  ('robin_hood', 'intelligence', 10, 'NET 0'),
  ('robin_hood', 'wisdom', -10, 'NET 0'),
  ('robin_hood', 'spirit', 10, 'NET 0'),
  ('robin_hood', 'charisma', 15, 'NET 0'),
  ('robin_hood', 'max_health', 10, 'NET 0'),
  ('robin_hood', 'max_energy', 25, 'NET 0'),
  ('robin_hood', 'max_mana', -25, 'NET 0'),
  ('robin_hood', 'training', 10, 'NET 0'),
  ('robin_hood', 'mental_health', -45, 'NET 0'),
  ('robin_hood', 'team_player', -35, 'NET 0'),
  ('robin_hood', 'ego', 50, 'NET 0'),
  ('robin_hood', 'communication', 0, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- SAM_SPADE
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('sam_spade', 'attack', 10, 'NET +1'),
  ('sam_spade', 'defense', 10, 'NET +1'),
  ('sam_spade', 'speed', 10, 'NET +1'),
  ('sam_spade', 'strength', 5, 'NET +1'),
  ('sam_spade', 'dexterity', 15, 'NET +1'),
  ('sam_spade', 'endurance', 10, 'NET +1'),
  ('sam_spade', 'magic_attack', 30, 'NET +1'),
  ('sam_spade', 'magic_defense', -10, 'NET +1'),
  ('sam_spade', 'intelligence', 20, 'NET +1'),
  ('sam_spade', 'wisdom', -10, 'NET +1'),
  ('sam_spade', 'spirit', 5, 'NET +1'),
  ('sam_spade', 'charisma', 1, 'NET +1'),
  ('sam_spade', 'max_health', 20, 'NET +1'),
  ('sam_spade', 'max_energy', 20, 'NET +1'),
  ('sam_spade', 'max_mana', -30, 'NET +1'),
  ('sam_spade', 'training', 20, 'NET +1'),
  ('sam_spade', 'mental_health', -40, 'NET +1'),
  ('sam_spade', 'team_player', -40, 'NET +1'),
  ('sam_spade', 'ego', 45, 'NET +1'),
  ('sam_spade', 'communication', 0, 'NET +1')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- SHAKA_ZULU
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('shaka_zulu', 'attack', 20, 'NET +15'),
  ('shaka_zulu', 'defense', 15, 'NET +15'),
  ('shaka_zulu', 'speed', 20, 'NET +15'),
  ('shaka_zulu', 'strength', 10, 'NET +15'),
  ('shaka_zulu', 'dexterity', 10, 'NET +15'),
  ('shaka_zulu', 'endurance', 10, 'NET +15'),
  ('shaka_zulu', 'magic_attack', 10, 'NET +15'),
  ('shaka_zulu', 'magic_defense', 10, 'NET +15'),
  ('shaka_zulu', 'intelligence', 15, 'NET +15'),
  ('shaka_zulu', 'wisdom', 0, 'NET +15'),
  ('shaka_zulu', 'spirit', 5, 'NET +15'),
  ('shaka_zulu', 'charisma', 0, 'NET +15'),
  ('shaka_zulu', 'max_health', 15, 'NET +15'),
  ('shaka_zulu', 'max_energy', 25, 'NET +15'),
  ('shaka_zulu', 'max_mana', -40, 'NET +15'),
  ('shaka_zulu', 'training', 10, 'NET +15'),
  ('shaka_zulu', 'mental_health', -40, 'NET +15'),
  ('shaka_zulu', 'team_player', -30, 'NET +15'),
  ('shaka_zulu', 'ego', 40, 'NET +15'),
  ('shaka_zulu', 'communication', -10, 'NET +15')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- HOLMES
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('holmes', 'attack', 15, 'NET 0'),
  ('holmes', 'defense', 5, 'NET 0'),
  ('holmes', 'speed', 10, 'NET 0'),
  ('holmes', 'strength', -5, 'NET 0'),
  ('holmes', 'dexterity', 10, 'NET 0'),
  ('holmes', 'endurance', 5, 'NET 0'),
  ('holmes', 'magic_attack', -30, 'NET 0'),
  ('holmes', 'magic_defense', -20, 'NET 0'),
  ('holmes', 'intelligence', 50, 'NET 0'),
  ('holmes', 'wisdom', 20, 'NET 0'),
  ('holmes', 'spirit', 5, 'NET 0'),
  ('holmes', 'charisma', 10, 'NET 0'),
  ('holmes', 'max_health', 15, 'NET 0'),
  ('holmes', 'max_energy', 60, 'NET 0'),
  ('holmes', 'max_mana', -50, 'NET 0'),
  ('holmes', 'training', 30, 'NET 0'),
  ('holmes', 'mental_health', -30, 'NET 0'),
  ('holmes', 'team_player', -30, 'NET 0'),
  ('holmes', 'ego', 60, 'NET 0'),
  ('holmes', 'communication', -10, 'NET 0')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- SPACE_CYBORG
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('space_cyborg', 'attack', 20, 'NET -5'),
  ('space_cyborg', 'defense', 30, 'NET -5'),
  ('space_cyborg', 'speed', 10, 'NET -5'),
  ('space_cyborg', 'strength', 20, 'NET -5'),
  ('space_cyborg', 'dexterity', 10, 'NET -5'),
  ('space_cyborg', 'endurance', 30, 'NET -5'),
  ('space_cyborg', 'magic_attack', -30, 'NET -5'),
  ('space_cyborg', 'magic_defense', -20, 'NET -5'),
  ('space_cyborg', 'intelligence', 10, 'NET -5'),
  ('space_cyborg', 'wisdom', -20, 'NET -5'),
  ('space_cyborg', 'spirit', -10, 'NET -5'),
  ('space_cyborg', 'charisma', -30, 'NET -5'),
  ('space_cyborg', 'max_health', 30, 'NET -5'),
  ('space_cyborg', 'max_energy', 40, 'NET -5'),
  ('space_cyborg', 'max_mana', -20, 'NET -5'),
  ('space_cyborg', 'training', 10, 'NET -5'),
  ('space_cyborg', 'mental_health', -35, 'NET -5'),
  ('space_cyborg', 'team_player', -20, 'NET -5'),
  ('space_cyborg', 'ego', 20, 'NET -5'),
  ('space_cyborg', 'communication', -10, 'NET -5')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- SUN_WUKONG
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('sun_wukong', 'attack', 15, 'NET -10'),
  ('sun_wukong', 'defense', 5, 'NET -10'),
  ('sun_wukong', 'speed', 25, 'NET -10'),
  ('sun_wukong', 'strength', 10, 'NET -10'),
  ('sun_wukong', 'dexterity', 20, 'NET -10'),
  ('sun_wukong', 'endurance', -10, 'NET -10'),
  ('sun_wukong', 'magic_attack', 15, 'NET -10'),
  ('sun_wukong', 'magic_defense', 15, 'NET -10'),
  ('sun_wukong', 'intelligence', 20, 'NET -10'),
  ('sun_wukong', 'wisdom', -20, 'NET -10'),
  ('sun_wukong', 'spirit', 10, 'NET -10'),
  ('sun_wukong', 'charisma', 10, 'NET -10'),
  ('sun_wukong', 'max_health', 15, 'NET -10'),
  ('sun_wukong', 'max_energy', 20, 'NET -10'),
  ('sun_wukong', 'max_mana', 20, 'NET -10'),
  ('sun_wukong', 'training', -30, 'NET -10'),
  ('sun_wukong', 'mental_health', -50, 'NET -10'),
  ('sun_wukong', 'team_player', -30, 'NET -10'),
  ('sun_wukong', 'ego', 60, 'NET -10'),
  ('sun_wukong', 'communication', -10, 'NET -10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- UNICORN
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('unicorn', 'attack', 20, 'NET +10'),
  ('unicorn', 'defense', 5, 'NET +10'),
  ('unicorn', 'speed', 20, 'NET +10'),
  ('unicorn', 'strength', 10, 'NET +10'),
  ('unicorn', 'dexterity', 20, 'NET +10'),
  ('unicorn', 'endurance', 10, 'NET +10'),
  ('unicorn', 'magic_attack', 20, 'NET +10'),
  ('unicorn', 'magic_defense', 20, 'NET +10'),
  ('unicorn', 'intelligence', -10, 'NET +10'),
  ('unicorn', 'wisdom', 10, 'NET +10'),
  ('unicorn', 'spirit', 10, 'NET +10'),
  ('unicorn', 'charisma', -10, 'NET +10'),
  ('unicorn', 'max_health', 30, 'NET +10'),
  ('unicorn', 'max_energy', 25, 'NET +10'),
  ('unicorn', 'max_mana', 30, 'NET +10'),
  ('unicorn', 'training', -40, 'NET +10'),
  ('unicorn', 'mental_health', -40, 'NET +10'),
  ('unicorn', 'team_player', -40, 'NET +10'),
  ('unicorn', 'ego', 60, 'NET +10'),
  ('unicorn', 'communication', -20, 'NET +10')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

-- VELOCIRAPTOR
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier, notes) VALUES
  ('velociraptor', 'attack', 30, 'NET +20'),
  ('velociraptor', 'defense', 10, 'NET +20'),
  ('velociraptor', 'speed', 35, 'NET +20'),
  ('velociraptor', 'strength', 20, 'NET +20'),
  ('velociraptor', 'dexterity', 30, 'NET +20'),
  ('velociraptor', 'endurance', 10, 'NET +20'),
  ('velociraptor', 'magic_attack', -15, 'NET +20'),
  ('velociraptor', 'magic_defense', -20, 'NET +20'),
  ('velociraptor', 'intelligence', 10, 'NET +20'),
  ('velociraptor', 'wisdom', -10, 'NET +20'),
  ('velociraptor', 'spirit', -10, 'NET +20'),
  ('velociraptor', 'charisma', -20, 'NET +20'),
  ('velociraptor', 'max_health', 30, 'NET +20'),
  ('velociraptor', 'max_energy', 50, 'NET +20'),
  ('velociraptor', 'max_mana', -10, 'NET +20'),
  ('velociraptor', 'training', -10, 'NET +20'),
  ('velociraptor', 'mental_health', -30, 'NET +20'),
  ('velociraptor', 'team_player', -30, 'NET +20'),
  ('velociraptor', 'ego', 40, 'NET +20'),
  ('velociraptor', 'communication', -10, 'NET +20')
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier, notes = EXCLUDED.notes;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Species modifiers count: ' || COUNT(*) FROM species_attribute_modifiers;
SELECT 'Signature modifiers count: ' || COUNT(*) FROM signature_attribute_modifiers;
SELECT 'Expected: 280 species rows (14 species x 20 attributes)';
SELECT 'Expected: 660 signature rows (33 characters x 20 attributes)';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (189, '189_populate_species_and_signature_modifier_tables')
ON CONFLICT (version) DO NOTHING;
