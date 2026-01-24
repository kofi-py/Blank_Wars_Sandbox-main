-- Migration 260: Create headquarters_tiers canonical table
-- Purpose: Define tier metadata (capacity, costs, bonuses) as canonical data
-- This replaces hardcoded tier configs with queryable database records

BEGIN;

-- Create the headquarters_tiers table
CREATE TABLE headquarters_tiers (
  tier_id TEXT PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_level INTEGER NOT NULL,  -- 0=worst, 9=best (for sorting/progression)
  max_rooms INTEGER NOT NULL,
  max_beds INTEGER NOT NULL,
  upgrade_cost INTEGER,  -- NULL for starter tiers (can't buy), cost in coins otherwise
  team_coordination_modifier INTEGER DEFAULT 0,
  health_regen_modifier INTEGER DEFAULT 0,
  energy_modifier INTEGER DEFAULT 0,
  defense_modifier INTEGER DEFAULT 0,
  description TEXT
);

-- Insert all 10 tiers with complete metadata
INSERT INTO headquarters_tiers (tier_id, tier_name, tier_level, max_rooms, max_beds, upgrade_cost, team_coordination_modifier, health_regen_modifier, energy_modifier, defense_modifier, description) VALUES
  -- STARTER HOVELS (random assignment, net negative)
  ('your_parents_basement', 'Your Parent''s Basement', 0, 1, 1, NULL, -40, -15, -30, -10, 'Embarrassing cramped basement. Mom keeps unlocking the door.'),
  ('radioactive_roach_motel', 'Radioactive Roach Motel', 0, 1, 2, NULL, -35, -40, -25, -15, 'Literally radioactive and infested. Walls made of asbestos and broken dreams.'),
  ('hobo_camp', 'Hobo Camp', 0, 0, 0, NULL, -30, -35, -20, -25, 'Living under a bridge. Everyone sleeps on the ground.'),

  -- TIER 1: First upgrade
  ('spartan_apartment', 'Spartan Apartment', 1, 2, 3, 75000, -15, -5, -10, 0, 'Small but at least it''s yours. Has a door that locks.'),

  -- TIER 2: Neutral baseline
  ('basic_house', 'Basic House', 2, 2, 4, 150000, 0, 0, 0, 0, 'Normal living conditions. Nothing special but comfortable.'),

  -- TIER 3: First real bonuses
  ('condo', 'Condo', 3, 3, 5, 300000, 10, 15, 15, 10, 'Modern amenities and nice common areas. Security desk.'),

  -- TIER 4: Serious upgrades
  ('mansion', 'Mansion', 4, 4, 8, 600000, 20, 25, 30, 20, 'Multiple team rooms, spa, gym. Gated luxury property.'),

  -- TIER 5: Elite facilities
  ('compound', 'Compound', 5, 6, 15, 1200000, 35, 40, 45, 35, 'Dedicated training facilities, medical bay. Fortified compound.'),

  -- TIER 6: Extreme luxury
  ('super_yacht', 'Super Yacht', 6, 8, 25, 2500000, 45, 50, 55, 30, 'Mobile headquarters with on-board medical staff. Escape to international waters.'),

  -- TIER 7: Ultimate endgame
  ('moon_base', 'Moon Base', 7, 15, 70, 5000000, 60, 70, 80, 100, 'Zero-G recovery chambers. They can''t reach you on the moon.');

-- Add foreign key from user_headquarters to headquarters_tiers
ALTER TABLE user_headquarters
ADD CONSTRAINT user_headquarters_tier_id_fkey
FOREIGN KEY (tier_id) REFERENCES headquarters_tiers(tier_id);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (260, '260_create_headquarters_tiers_table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
