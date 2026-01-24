-- Migration: Create graffiti wall persistence system
-- Stores canvas artwork from the clubhouse graffiti wall

CREATE TABLE IF NOT EXISTS graffiti_art (
  id TEXT PRIMARY KEY DEFAULT ('art_' || gen_random_uuid()::text),

  -- Artist information
  artist_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_character_id TEXT REFERENCES user_characters(id) ON DELETE SET NULL,  -- Optional: posted as character
  artist_name TEXT NOT NULL,  -- Cached at write time
  artist_avatar TEXT NOT NULL,  -- Cached at write time

  -- Artwork content
  title TEXT NOT NULL,
  art_type TEXT NOT NULL CHECK (art_type IN ('tag', 'character_art', 'symbol', 'text', 'battle_scene', 'meme')),

  -- Canvas data (JSONB for strokes, layers, etc.)
  canvas_data JSONB NOT NULL,  -- { width, height, strokes, background, layers }
  thumbnail_url TEXT,  -- Optional pre-rendered thumbnail

  -- Wall position (for wall view mode)
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  display_width INTEGER DEFAULT 200,
  display_height INTEGER DEFAULT 150,
  rotation INTEGER DEFAULT 0,  -- Rotation in degrees
  z_index INTEGER DEFAULT 0,  -- Layer ordering on wall

  -- Artwork metadata
  tags TEXT[] DEFAULT '{}',
  colors_used TEXT[] DEFAULT '{}',
  tools_used TEXT[] DEFAULT '{}',
  time_spent_seconds INTEGER DEFAULT 0,

  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,

  -- Moderation & feature flags
  is_featured BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track likes on graffiti art
CREATE TABLE IF NOT EXISTS graffiti_likes (
  id TEXT PRIMARY KEY DEFAULT ('like_' || gen_random_uuid()::text),
  art_id TEXT NOT NULL REFERENCES graffiti_art(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(art_id, user_id)
);

-- Track views on graffiti art
CREATE TABLE IF NOT EXISTS graffiti_views (
  id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
  art_id TEXT NOT NULL REFERENCES graffiti_art(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,  -- Nullable for anonymous views
  ip_hash TEXT,  -- Hashed IP for anonymous view dedup
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_graffiti_art_artist ON graffiti_art(artist_user_id);
CREATE INDEX IF NOT EXISTS idx_graffiti_art_created ON graffiti_art(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graffiti_art_likes ON graffiti_art(likes DESC);
CREATE INDEX IF NOT EXISTS idx_graffiti_art_featured ON graffiti_art(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_graffiti_art_type ON graffiti_art(art_type);
CREATE INDEX IF NOT EXISTS idx_graffiti_likes_art ON graffiti_likes(art_id);
CREATE INDEX IF NOT EXISTS idx_graffiti_views_art ON graffiti_views(art_id);

-- Trigger to auto-update likes count
CREATE OR REPLACE FUNCTION update_graffiti_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE graffiti_art SET likes = likes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.art_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE graffiti_art SET likes = likes - 1, updated_at = CURRENT_TIMESTAMP WHERE id = OLD.art_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_graffiti_likes ON graffiti_likes;
CREATE TRIGGER trigger_update_graffiti_likes
AFTER INSERT OR DELETE ON graffiti_likes
FOR EACH ROW EXECUTE FUNCTION update_graffiti_likes_count();

-- Trigger to auto-update views count (only count unique per day)
CREATE OR REPLACE FUNCTION update_graffiti_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE graffiti_art SET views = views + 1, updated_at = CURRENT_TIMESTAMP WHERE id = NEW.art_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_graffiti_views ON graffiti_views;
CREATE TRIGGER trigger_update_graffiti_views
AFTER INSERT ON graffiti_views
FOR EACH ROW EXECUTE FUNCTION update_graffiti_views_count();

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (152, '152_create_graffiti_wall')
ON CONFLICT (version) DO NOTHING;
