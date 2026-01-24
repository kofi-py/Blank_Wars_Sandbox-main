-- Migration 154: Create Guild System
-- Player alliances for social competition and cross-team drama

-- Core guild table
CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  tag VARCHAR(5) NOT NULL UNIQUE,  -- Short identifier like "WAR", "ARC"
  description TEXT,
  leader_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stats (updated by triggers/scheduled jobs)
  level INTEGER DEFAULT 1,
  total_power INTEGER DEFAULT 0,
  battle_wins INTEGER DEFAULT 0,
  battle_losses INTEGER DEFAULT 0,

  -- Settings
  is_public BOOLEAN DEFAULT true,  -- Anyone can join vs invite-only
  min_level_to_join INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 30,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guild membership
CREATE TABLE IF NOT EXISTS guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution_points INTEGER DEFAULT 0,

  UNIQUE(user_id)  -- One guild per user
);

-- Guild join requests (for private guilds)
CREATE TABLE IF NOT EXISTS guild_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(id),

  UNIQUE(guild_id, user_id)  -- One request per user per guild
);

-- Guild chat messages
CREATE TABLE IF NOT EXISTS guild_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_character_id TEXT REFERENCES user_characters(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guild wars (scheduled competitions between guilds)
CREATE TABLE IF NOT EXISTS guild_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_a_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  guild_b_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  guild_a_score INTEGER DEFAULT 0,
  guild_b_score INTEGER DEFAULT 0,
  winner_guild_id UUID REFERENCES guilds(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual battle contributions to guild wars
CREATE TABLE IF NOT EXISTS guild_war_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id UUID NOT NULL REFERENCES guild_wars(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL,  -- References battles table
  attacker_guild_id UUID NOT NULL REFERENCES guilds(id),
  defender_guild_id UUID NOT NULL REFERENCES guilds(id),
  winner_guild_id UUID REFERENCES guilds(id),
  points_awarded INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guilds_leader ON guilds(leader_user_id);
CREATE INDEX IF NOT EXISTS idx_guilds_public ON guilds(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_guilds_power ON guilds(total_power DESC);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

CREATE INDEX IF NOT EXISTS idx_guild_messages_guild ON guild_messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_messages_created ON guild_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_wars_guilds ON guild_wars(guild_a_id, guild_b_id);
CREATE INDEX IF NOT EXISTS idx_guild_wars_status ON guild_wars(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_guild_join_requests_pending ON guild_join_requests(guild_id, status) WHERE status = 'pending';

-- Function to update guild stats
CREATE OR REPLACE FUNCTION update_guild_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update member count and total power when membership changes
  UPDATE guilds
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.guild_id, OLD.guild_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on membership changes
DROP TRIGGER IF EXISTS trg_guild_membership_change ON guild_members;
CREATE TRIGGER trg_guild_membership_change
  AFTER INSERT OR DELETE ON guild_members
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_stats();

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (154, '154_create_guild_system')
ON CONFLICT (version) DO NOTHING;
