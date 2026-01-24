-- Migration 009: Add basic pack templates
-- This creates the missing pack templates that the pack service expects

INSERT INTO card_packs (id, name, description, pack_type, total_cards, cost_credits, is_purchasable, requires_level, rarity_weights) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Standard Starter Pack',
  'A basic starter pack containing 3 characters to begin your journey.',
  'standard_starter',
  3,
  0,
  true,
  1,
  '{"common": 70, "uncommon": 25, "rare": 5}'::jsonb
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  'Premium Starter Pack',
  'An enhanced starter pack with guaranteed rare character.',
  'premium_starter',
  5,
  0,
  true,
  1,
  '{"common": 50, "uncommon": 30, "rare": 15, "epic": 5}'::jsonb
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  'Standard Pack',
  'A standard pack containing 5 random characters.',
  'standard',
  5,
  100,
  true,
  1,
  '{"common": 60, "uncommon": 30, "rare": 8, "epic": 2}'::jsonb
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d482',
  'Premium Pack',
  'A premium pack with better odds and guaranteed rare.',
  'premium',
  5,
  250,
  true,
  5,
  '{"common": 40, "uncommon": 35, "rare": 20, "epic": 5}'::jsonb
);
