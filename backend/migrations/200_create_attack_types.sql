-- Migration 200: Universal Attack Types System
-- All characters can perform these basic attacks regardless of powers/spells
-- Attack type determines AP cost, damage multiplier, and accuracy modifier

BEGIN;

-- ============================================================================
-- ATTACK TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attack_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  flavor_text TEXT,

  -- Costs
  ap_cost INTEGER NOT NULL,
  energy_cost INTEGER NOT NULL DEFAULT 0,

  -- Combat modifiers
  damage_multiplier NUMERIC(3,2) NOT NULL,  -- 0.50 = 50%, 1.75 = 175%
  accuracy_modifier INTEGER NOT NULL DEFAULT 0,  -- +10, -20, etc.
  crit_chance_modifier INTEGER NOT NULL DEFAULT 0,  -- Bonus crit chance

  -- Consequences (for high-commitment attacks)
  defense_penalty_next_turn INTEGER DEFAULT 0,  -- Vulnerability after all-out
  can_be_countered BOOLEAN DEFAULT false,  -- Heavy attacks can be countered

  -- Requirements
  min_level INTEGER DEFAULT 1,  -- Character level required
  requires_melee_range BOOLEAN DEFAULT true,

  -- UI/Animation
  icon TEXT,
  animation_id TEXT,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEED UNIVERSAL ATTACK TYPES
-- ============================================================================

-- Jab: Quick, low damage, good for finishing or conserving AP
INSERT INTO attack_types (id, name, description, flavor_text, ap_cost, damage_multiplier, accuracy_modifier, crit_chance_modifier, sort_order)
VALUES (
  'jab',
  'Jab',
  'A quick, light attack. Low damage but costs minimal action points.',
  'Sometimes a poke is all you need.',
  1,
  0.50,
  10,
  -5,
  1
);

-- Strike: Standard attack, balanced
INSERT INTO attack_types (id, name, description, flavor_text, ap_cost, damage_multiplier, accuracy_modifier, sort_order)
VALUES (
  'strike',
  'Strike',
  'A standard attack with balanced damage and accuracy.',
  'The bread and butter of combat.',
  2,
  1.00,
  0,
  2
);

-- Heavy: Powerful but slower, can be countered
INSERT INTO attack_types (id, name, description, flavor_text, ap_cost, damage_multiplier, accuracy_modifier, crit_chance_modifier, can_be_countered, sort_order)
VALUES (
  'heavy',
  'Heavy Attack',
  'A powerful wind-up attack. Higher damage but easier to dodge or counter.',
  'Put your weight behind it!',
  3,
  1.75,
  -10,
  10,
  true,
  3
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_attack_types_ap_cost ON attack_types(ap_cost);
CREATE INDEX idx_attack_types_sort ON attack_types(sort_order);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE attack_types IS 'Universal attack types available to all characters. Separate from powers/spells.';
COMMENT ON COLUMN attack_types.damage_multiplier IS 'Multiplier applied to base damage. 1.00 = 100%, 2.50 = 250%';
COMMENT ON COLUMN attack_types.accuracy_modifier IS 'Added to hit chance. +10 = easier to hit, -20 = harder to hit';
COMMENT ON COLUMN attack_types.defense_penalty_next_turn IS 'Defense reduction (%) applied next turn after using this attack';
COMMENT ON COLUMN attack_types.can_be_countered IS 'If true, defender can use counter abilities against this attack';

-- ============================================================================
-- MIGRATION LOG
-- ============================================================================
INSERT INTO migration_log (version, name) VALUES (200, '200_create_attack_types')
ON CONFLICT (version) DO NOTHING;

COMMIT;
