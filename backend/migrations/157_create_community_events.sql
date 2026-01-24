-- Migration: Create community_events table for clubhouse events
-- Supports tournaments, art contests, guild wars, and community activities

CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY DEFAULT 'evt_' || gen_random_uuid()::text,

  -- Event details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('tournament', 'art_contest', 'guild_war', 'community', 'special')),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),

  -- Timing
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Participation
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER,

  -- Rewards stored as JSONB array
  -- Format: [{"rank": "1st Place", "rewards": [{"type": "coins", "amount": 1000}, {"type": "title", "value": "Champion"}]}]
  rewards JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participant tracking
CREATE TABLE IF NOT EXISTS community_event_participants (
  id TEXT PRIMARY KEY DEFAULT 'evtp_' || gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  placement INTEGER,
  score INTEGER DEFAULT 0,
  UNIQUE(event_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_community_events_status ON community_events(status);
CREATE INDEX IF NOT EXISTS idx_community_events_start_date ON community_events(start_date);
CREATE INDEX IF NOT EXISTS idx_community_events_type ON community_events(event_type);
CREATE INDEX IF NOT EXISTS idx_community_event_participants_event ON community_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_community_event_participants_user ON community_event_participants(user_id);

-- Function to auto-update participants_count
CREATE OR REPLACE FUNCTION update_event_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_events SET participants_count = participants_count + 1, updated_at = NOW() WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_events SET participants_count = participants_count - 1, updated_at = NOW() WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_event_participants ON community_event_participants;
CREATE TRIGGER trigger_update_event_participants
  AFTER INSERT OR DELETE ON community_event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participants_count();

-- Function to auto-update event status based on dates
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS void AS $$
BEGIN
  -- Mark upcoming events as active when start_date is reached
  UPDATE community_events
  SET status = 'active', updated_at = NOW()
  WHERE status = 'upcoming' AND start_date <= NOW();

  -- Mark active events as completed when end_date is reached
  UPDATE community_events
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'active' AND end_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (157, '157_create_community_events')
ON CONFLICT (version) DO NOTHING;
