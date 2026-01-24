-- Migration: Create social lounge chat persistence
-- Stores chat messages from the clubhouse social lounge
-- Separate from message board (social_messages) - this is real-time group chat

CREATE TABLE IF NOT EXISTS lounge_messages (
  id TEXT PRIMARY KEY DEFAULT ('lmsg_' || gen_random_uuid()::text),

  -- Sender information (coach = user posting directly, character = posting via owned character)
  sender_type TEXT NOT NULL CHECK (sender_type IN ('coach', 'character', 'system')),
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Always track which user
  sender_character_id TEXT REFERENCES user_characters(id) ON DELETE SET NULL,  -- Set if posting as character
  sender_name TEXT NOT NULL,  -- Cached at write time
  sender_avatar TEXT NOT NULL,  -- Cached at write time

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'action', 'join', 'leave', 'emote')),

  -- Optional references
  mentions TEXT[] DEFAULT '{}',
  referenced_battle_id TEXT REFERENCES battles(id) ON DELETE SET NULL,

  -- AI generation tracking
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_trigger_type TEXT,  -- 'autonomous', 'response', 'battle_reaction', etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track who is currently in the lounge (presence)
CREATE TABLE IF NOT EXISTS lounge_presence (
  id TEXT PRIMARY KEY DEFAULT ('pres_' || gen_random_uuid()::text),

  -- Participant (always link to user, optionally to character if entering as character)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'typing', 'away')),
  mood TEXT DEFAULT 'neutral',
  current_activity TEXT,

  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique indexes: one presence per user as coach, one per character
CREATE UNIQUE INDEX IF NOT EXISTS idx_lounge_presence_user_unique
  ON lounge_presence(user_id) WHERE character_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lounge_presence_char_unique
  ON lounge_presence(character_id) WHERE character_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_lounge_messages_created ON lounge_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lounge_messages_sender_user ON lounge_messages(sender_user_id) WHERE sender_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lounge_messages_sender_char ON lounge_messages(sender_character_id) WHERE sender_character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lounge_presence_user ON lounge_presence(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lounge_presence_character ON lounge_presence(character_id) WHERE character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lounge_presence_status ON lounge_presence(status);

-- Auto-update last_active_at on presence changes
CREATE OR REPLACE FUNCTION update_lounge_presence_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lounge_presence ON lounge_presence;
CREATE TRIGGER trigger_update_lounge_presence
BEFORE UPDATE ON lounge_presence
FOR EACH ROW EXECUTE FUNCTION update_lounge_presence_active();

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (153, '153_create_clubhouse_group_chat')
ON CONFLICT (version) DO NOTHING;
