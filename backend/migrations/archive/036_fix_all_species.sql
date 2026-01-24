-- Migration: Fix species for all non-human characters
-- Purpose: Complete species assignment for gods, magical beings, constructs, etc.

-- Deities
UPDATE characters SET species = 'deity' WHERE id = 'anubis';
UPDATE characters SET species = 'deity' WHERE id = 'sun_wukong';

-- Magical beings
UPDATE characters SET species = 'fairy' WHERE id = 'seraphina';

-- Constructs and artificial beings
UPDATE characters SET species = 'golem' WHERE id = 'frankenstein_monster';
UPDATE characters SET species = 'robot' WHERE id = 'hostmaster_v8_72';
UPDATE characters SET species = 'robot' WHERE id = 'lmb_3000_robot_lady_macbeth';
