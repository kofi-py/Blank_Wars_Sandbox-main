-- Migration 266: Create bond_activity_effects canonical table
--
-- Stores bond changes for each activity type (coach↔character relationship).
-- Moves hardcoded BOND_VALUES from bondTrackingService.ts to database.

BEGIN;

CREATE TABLE IF NOT EXISTS bond_activity_effects (
  activity_type VARCHAR(100) PRIMARY KEY,
  bond_change INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with activity types and their bond effects
-- (migrated from hardcoded BOND_VALUES in bondTrackingService.ts)
INSERT INTO bond_activity_effects (activity_type, bond_change, description) VALUES
  -- Tier 1: Deep Bonding (high positive impact)
  ('therapy_breakthrough', 5, 'Major emotional breakthrough in therapy'),
  ('personal_problems_coaching', 4, 'Coach helped with personal issues'),
  ('group_activity_success', 4, 'Successful group activity together'),
  ('financial_crisis_resolved', 4, 'Resolved a financial crisis with coach help'),

  -- Tier 2: Trust Building (moderate positive impact)
  ('therapy_productive', 3, 'Productive therapy session'),
  ('performance_coaching', 2, 'Coach provided performance guidance'),
  ('battle_victory_together', 2, 'Won a battle with coach guidance'),
  ('financial_win_followed_advice', 3, 'Financial win after following coach advice'),

  -- Tier 3: Routine (small positive impact)
  ('meaningful_conversation', 1, 'Had a meaningful conversation'),
  ('casual_chat', 1, 'Casual chat interaction'),
  ('group_activity_mediocre', 1, 'Group activity with mediocre results'),

  -- Tier 4: Trust Damage (negative impact)
  ('therapy_wasted', -1, 'Wasted therapy session'),
  ('went_rogue_failed', -2, 'Went rogue against coach and failed'),
  ('group_activity_conflict', -2, 'Conflict during group activity'),
  ('ignored_coaching_badly', -3, 'Ignored coaching with bad results'),

  -- Loadout/Equipment decisions (coach↔character relationship)
  ('loadout_reluctant_compliance', 1, 'Character reluctantly followed coach loadout choice'),
  ('loadout_power_rebellion', -2, 'Character rejected coach power loadout'),
  ('loadout_spell_rebellion', -2, 'Character rejected coach spell loadout'),
  ('equipment_reluctant_compliance', 1, 'Character reluctantly accepted coach equipment'),
  ('equipment_autonomous_rebellion', -2, 'Character rejected coach equipment choice')
ON CONFLICT (activity_type) DO NOTHING;

-- Record the migration
INSERT INTO migration_log (version, name)
VALUES (266, '266_create_bond_activity_effects')
ON CONFLICT (version) DO NOTHING;

COMMIT;
