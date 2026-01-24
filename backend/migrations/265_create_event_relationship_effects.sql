-- Migration 265: Create event_relationship_effects canonical table
--
-- Stores relationship changes (trust, respect, affection, rivalry) for each event type.
-- Follows same pattern as archetype_relationships and species_relationships.

BEGIN;

CREATE TABLE IF NOT EXISTS event_relationship_effects (
  event_type VARCHAR(100) PRIMARY KEY,
  trust INTEGER NOT NULL,
  respect INTEGER NOT NULL,
  affection INTEGER NOT NULL,
  rivalry INTEGER NOT NULL,
  is_conflict BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolution BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with event types and their relationship effects
INSERT INTO event_relationship_effects (event_type, trust, respect, affection, rivalry, is_conflict, is_resolution, description) VALUES
  -- Battle events
  ('battle_victory', 3, 2, 0, 0, FALSE, FALSE, 'Winning together builds trust and respect'),
  ('battle_defeat', -1, -1, 0, 0, FALSE, FALSE, 'Losing together slightly damages morale'),

  -- Social/Living events
  ('kitchen_argument', -5, -3, -2, 2, TRUE, FALSE, 'Arguments damage relationships and increase rivalry'),
  ('meal_sharing', 1, 0, 1, 0, FALSE, FALSE, 'Breaking bread together builds trust and affection'),
  ('late_night_conversation', 3, 0, 2, 0, FALSE, FALSE, 'Deep talks build trust and affection'),
  ('group_activity', 1, 0, 2, 0, FALSE, FALSE, 'Shared activities build affection'),

  -- Therapy events
  ('therapy_breakthrough', 2, 1, 0, 0, FALSE, FALSE, 'Breakthroughs in therapy build trust'),

  -- Training events
  ('sparring_session', 1, 4, 0, 0, FALSE, FALSE, 'Sparring builds mutual respect'),

  -- Alliance events
  ('alliance_formed', 5, 3, 2, 0, FALSE, FALSE, 'Forming alliances significantly boosts all positive metrics'),
  ('conflict_resolved', 4, 2, 0, -3, FALSE, TRUE, 'Resolving conflicts rebuilds trust and reduces rivalry'),

  -- Financial events
  ('coach_financial_advice', 2, 1, 0, 0, FALSE, FALSE, 'Good financial advice builds trust'),
  ('trust_gained', 5, 2, 0, 0, FALSE, FALSE, 'Gaining trust has strong positive effects'),
  ('trust_lost', -8, -3, 0, 0, TRUE, FALSE, 'Losing trust has severe negative effects'),
  ('financial_breakthrough', 4, 3, 2, 0, FALSE, TRUE, 'Financial success together builds all positive metrics'),
  ('financial_crisis', -3, -2, 0, 1, TRUE, FALSE, 'Financial crises strain relationships'),
  ('financial_stress_increase', -2, 0, -1, 0, FALSE, FALSE, 'Stress negatively affects trust and affection'),
  ('financial_stress_decrease', 1, 0, 1, 0, FALSE, FALSE, 'Reduced stress improves relationships'),

  -- Financial spiral events
  ('financial_spiral_started', -5, -3, -3, 0, TRUE, FALSE, 'Starting a spiral severely damages relationships'),
  ('financial_spiral_deepening', -3, -2, -2, 2, TRUE, FALSE, 'Deepening spiral continues damage and builds rivalry'),
  ('financial_spiral_broken', 6, 4, 3, 0, FALSE, TRUE, 'Breaking a spiral has strong positive effects'),
  ('financial_intervention_applied', 3, 2, 1, 0, FALSE, FALSE, 'Successful intervention builds trust'),

  -- Battle financial events
  ('financial_wildcard_triggered', -2, -1, -1, 0, FALSE, FALSE, 'Wildcards create uncertainty and strain'),
  ('battle_financial_decision', 1, 1, 0, 0, FALSE, FALSE, 'Making decisions together builds slight trust'),
  ('adrenaline_investment', -3, 2, 0, 1, FALSE, FALSE, 'Risky moves lose trust but gain respect'),
  ('victory_splurge', -1, -2, 3, 0, FALSE, FALSE, 'Splurging loses respect but builds affection'),
  ('defeat_desperation', -4, -3, -2, 0, TRUE, FALSE, 'Desperate moves after defeat damage relationships'),
  ('panic_selling', -2, -2, -1, 0, TRUE, FALSE, 'Panic decisions strain relationships')
ON CONFLICT (event_type) DO NOTHING;

-- Record the migration
INSERT INTO migration_log (version, name)
VALUES (265, '265_create_event_relationship_effects')
ON CONFLICT (version) DO NOTHING;

COMMIT;
