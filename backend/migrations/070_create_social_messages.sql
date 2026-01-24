-- Migration: Create unified social message board system
-- Supports coach posts, character posts, and AI-generated trash talk

CREATE TABLE IF NOT EXISTS social_messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()::text),

  -- Author information (either coach OR character)
  author_type TEXT NOT NULL CHECK (author_type IN ('coach', 'character', 'ai')),
  author_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,  -- For coach posts
  author_character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE,  -- For character/AI posts
  author_name TEXT NOT NULL,  -- Cached name for display
  author_avatar TEXT,  -- Cached avatar for display

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('general', 'trash_talk', 'victory_lap', 'challenge', 'strategy', 'complaint', 'defense', 'coach_announcement')),

  -- Optional battle reference for AI trash talk
  battle_id TEXT REFERENCES battles(id) ON DELETE SET NULL,
  target_character_id TEXT REFERENCES user_characters(id) ON DELETE SET NULL,  -- Who is being trash talked
  target_character_name TEXT,  -- Cached for display

  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  flames INTEGER DEFAULT 0,  -- For spicy/controversial posts
  reply_count INTEGER DEFAULT 0,

  -- Metadata
  is_pinned BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Replies/comments on social messages
CREATE TABLE IF NOT EXISTS social_message_replies (
  id TEXT PRIMARY KEY DEFAULT ('reply_' || gen_random_uuid()::text),
  message_id TEXT NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,

  -- Author information
  author_type TEXT NOT NULL CHECK (author_type IN ('coach', 'character', 'ai')),
  author_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  author_character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,

  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track user reactions (likes/flames)
CREATE TABLE IF NOT EXISTS social_message_reactions (
  id TEXT PRIMARY KEY DEFAULT ('reaction_' || gen_random_uuid()::text),
  message_id TEXT REFERENCES social_messages(id) ON DELETE CASCADE,
  reply_id TEXT REFERENCES social_message_replies(id) ON DELETE CASCADE,

  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'flame')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one reaction per user per message/reply
  UNIQUE(message_id, user_id, reaction_type),
  UNIQUE(reply_id, user_id, reaction_type),
  CHECK ((message_id IS NOT NULL AND reply_id IS NULL) OR (message_id IS NULL AND reply_id IS NOT NULL))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_messages_created ON social_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_messages_author_user ON social_messages(author_user_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_author_char ON social_messages(author_character_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_type ON social_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_social_messages_battle ON social_messages(battle_id) WHERE battle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_replies_message ON social_message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_social_reactions_message ON social_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_social_reactions_user ON social_message_reactions(user_id);

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_social_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_messages SET reply_count = reply_count + 1 WHERE id = NEW.message_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_messages SET reply_count = reply_count - 1 WHERE id = OLD.message_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_count
AFTER INSERT OR DELETE ON social_message_replies
FOR EACH ROW EXECUTE FUNCTION update_social_message_reply_count();
