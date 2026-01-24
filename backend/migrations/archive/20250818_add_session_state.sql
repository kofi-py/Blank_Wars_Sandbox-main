CREATE TABLE IF NOT EXISTS session_state (
  sid TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_state_ts ON session_state (ts_updated DESC);
-- Optional helper if you store usercharId inside payload at top-level
-- CREATE INDEX IF NOT EXISTS idx_session_state_userchar ON session_state ((payload->>'usercharId'));