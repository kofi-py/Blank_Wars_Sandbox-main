-- Battle Actions Table (Event Sourcing)
-- Each action is persisted immediately for:
-- 1. Zero data loss on crash/disconnect
-- 2. Complete audit trail
-- 3. Battle replay/resume capability
-- 4. Single source of truth (DB, not memory)

CREATE TABLE IF NOT EXISTS battle_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  sequence_num INT NOT NULL,

  -- Who acted
  character_id TEXT NOT NULL,

  -- What they did (discriminated union key)
  action_type TEXT NOT NULL CHECK (action_type IN ('move', 'attack', 'power', 'spell', 'defend', 'item', 'end_turn')),

  -- Full action request (varies by type)
  request JSONB NOT NULL,

  -- Full action result (varies by type)
  result JSONB NOT NULL,

  -- Was this a rebellion action? (character ignored coach orders)
  is_rebellion BOOLEAN NOT NULL DEFAULT FALSE,

  -- Judge ruling if rebellion occurred
  judge_ruling_id INTEGER REFERENCES judge_rulings(id),

  -- Round/turn tracking
  round_num INT NOT NULL,
  turn_num INT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure actions are ordered within a battle
  UNIQUE(battle_id, sequence_num)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_battle_actions_battle_id ON battle_actions(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_actions_character_id ON battle_actions(character_id);
CREATE INDEX IF NOT EXISTS idx_battle_actions_battle_round ON battle_actions(battle_id, round_num);

-- Comment for documentation
COMMENT ON TABLE battle_actions IS 'Event-sourced battle actions. State is reconstructed by replaying actions in sequence_num order.';
COMMENT ON COLUMN battle_actions.sequence_num IS 'Monotonically increasing within a battle. Used to replay actions in order.';
COMMENT ON COLUMN battle_actions.request IS 'The full BattleActionRequest that was submitted';
COMMENT ON COLUMN battle_actions.result IS 'The full BattleActionResult returned by the executor';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (159, '159_create_battle_actions')
ON CONFLICT (version) DO NOTHING;
