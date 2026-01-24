-- Migration 013: Lost & Found Wars Schema
-- Creates tables for the Lost & Found Wars mini-game

-- ============================================
-- ITEM DEFINITIONS (Master Catalog)
-- ============================================

CREATE TABLE IF NOT EXISTS locker_item_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'clothing', 'electronics', 'collectibles', 'junk', 'equipment', 'furniture', 'jewelry', 'documents', 'sports', 'musical', 'mystery'

  -- Value
  base_value INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common', -- 'junk', 'common', 'decent', 'valuable', 'rare', 'legendary'
  condition TEXT DEFAULT 'fair', -- 'broken', 'poor', 'fair', 'good', 'excellent', 'mint'

  -- Visual
  icon TEXT,
  model_3d_path TEXT,

  -- Special Properties
  is_equipment BOOLEAN DEFAULT FALSE,
  equipment_id TEXT REFERENCES equipment(id),
  grant_xp INTEGER DEFAULT 0,
  special_effect TEXT, -- 'unlocks_special_locker', 'bonus_item', etc.

  -- Flavor
  backstory TEXT,

  -- Location weights (0.0 to 1.0, higher = more likely to appear)
  weight_airport DECIMAL(3,2) DEFAULT 0.5,
  weight_subway DECIMAL(3,2) DEFAULT 0.5,
  weight_hotel DECIMAL(3,2) DEFAULT 0.5,
  weight_college DECIMAL(3,2) DEFAULT 0.5,
  weight_police DECIMAL(3,2) DEFAULT 0.5,
  weight_amusement DECIMAL(3,2) DEFAULT 0.5,
  weight_rest_stop DECIMAL(3,2) DEFAULT 0.5,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locker_items_category ON locker_item_definitions(category);
CREATE INDEX IF NOT EXISTS idx_locker_items_rarity ON locker_item_definitions(rarity);
CREATE INDEX IF NOT EXISTS idx_locker_items_value ON locker_item_definitions(base_value);

-- ============================================
-- AUCTION SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS locker_auction_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Location & Locker
  location TEXT NOT NULL, -- 'airport', 'subway', 'hotel', 'college', 'police', 'amusement', 'rest_stop'
  locker_number INTEGER NOT NULL,
  locker_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'

  -- Coach Strategy
  coach_target_min INTEGER,
  coach_target_max INTEGER,
  coach_absolute_cap INTEGER,

  -- Execution Tracking
  followed_strategy BOOLEAN DEFAULT TRUE,
  went_rogue_at_bid INTEGER, -- Which bid number rebellion occurred (NULL if never went rogue)

  -- Auction Results
  won_auction BOOLEAN DEFAULT FALSE,
  final_bid INTEGER,
  winning_bidder TEXT, -- Character name or 'player'

  -- Financial Results
  investment INTEGER DEFAULT 0,
  total_value INTEGER DEFAULT 0,
  net_profit INTEGER DEFAULT 0,

  -- Adherence Tracking
  adherence_before INTEGER,
  adherence_after INTEGER,
  adherence_change INTEGER DEFAULT 0,

  -- Items (stored as JSONB array of item IDs and generated values)
  items JSONB, -- [{id: 'gibson_les_paul', value: 850, condition: 'good'}, ...]
  visible_items JSONB, -- Subset shown during peek
  hints TEXT[], -- Text hints during peek phase

  -- Status
  status TEXT DEFAULT 'created', -- 'created', 'peeking', 'bidding', 'won', 'lost', 'revealed', 'completed'

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  peek_started_at TIMESTAMP,
  bidding_started_at TIMESTAMP,
  auction_ended_at TIMESTAMP,
  reveal_completed_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locker_auctions_user ON locker_auction_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_locker_auctions_character ON locker_auction_sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_locker_auctions_location ON locker_auction_sessions(location);
CREATE INDEX IF NOT EXISTS idx_locker_auctions_status ON locker_auction_sessions(status);
CREATE INDEX IF NOT EXISTS idx_locker_auctions_created ON locker_auction_sessions(created_at DESC);

-- ============================================
-- BID HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS locker_bid_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  auction_id TEXT NOT NULL REFERENCES locker_auction_sessions(id) ON DELETE CASCADE,

  -- Bid Info
  bid_number INTEGER NOT NULL,
  bidder TEXT NOT NULL, -- Character name or 'AI:Achilles', 'AI:Tesla', etc.
  bid_amount INTEGER NOT NULL,
  is_player BOOLEAN DEFAULT FALSE,

  -- Adherence Check (for player bids only)
  adherence_roll INTEGER, -- 0-100
  adherence_threshold INTEGER, -- Character's adherence level at time of bid
  adherence_passed BOOLEAN,
  was_rogue_bid BOOLEAN DEFAULT FALSE,

  -- Rogue Decision (if applicable)
  rogue_action TEXT, -- 'bid_conservative', 'bid_aggressive', 'bid_all_in', 'drop_out', 'follow_coach'
  rogue_reasoning TEXT, -- AI's explanation

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bid_history_auction ON locker_bid_history(auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_bid_number ON locker_bid_history(auction_id, bid_number);

-- ============================================
-- ROGUE DECISIONS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS locker_rogue_decisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  auction_id TEXT NOT NULL REFERENCES locker_auction_sessions(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Context
  current_bid INTEGER NOT NULL,
  coach_recommendation TEXT, -- 'bid_to_150', 'drop_out', etc.
  adherence_score INTEGER NOT NULL,
  bond_level INTEGER NOT NULL,

  -- AI Decision
  ai_choice TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  ai_reasoning TEXT NOT NULL,

  -- Outcome
  action_taken TEXT NOT NULL, -- 'bid_conservative', 'bid_aggressive', etc.
  amount_bid INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rogue_decisions_auction ON locker_rogue_decisions(auction_id);
CREATE INDEX IF NOT EXISTS idx_rogue_decisions_character ON locker_rogue_decisions(character_id);

-- ============================================
-- LEADERBOARDS
-- ============================================

CREATE TABLE IF NOT EXISTS locker_leaderboards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Period
  period TEXT NOT NULL, -- 'daily', 'weekly', 'season'
  period_start DATE NOT NULL,
  period_end DATE,

  -- Stats
  total_profit INTEGER DEFAULT 0,
  total_invested INTEGER DEFAULT 0,
  lockers_won INTEGER DEFAULT 0,
  lockers_lost INTEGER DEFAULT 0,
  best_find_value INTEGER DEFAULT 0,
  best_profit INTEGER DEFAULT 0,
  worst_loss INTEGER DEFAULT 0,

  -- Ranking
  rank INTEGER,

  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, character_id, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON locker_leaderboards(period, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON locker_leaderboards(period, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON locker_leaderboards(user_id);

-- ============================================
-- ACHIEVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS locker_achievements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  achievement_id TEXT NOT NULL, -- 'high_roller', 'junk_collector', 'treasure_hunter', etc.
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,

  -- Progress tracking
  progress INTEGER DEFAULT 0,
  required INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT FALSE,

  -- Rewards
  reward_description TEXT,

  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON locker_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_completed ON locker_achievements(completed);

-- ============================================
-- DAILY LOCATION SCHEDULE
-- ============================================

CREATE TABLE IF NOT EXISTS locker_daily_locations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  date DATE NOT NULL UNIQUE,
  location TEXT NOT NULL,
  special_modifier TEXT, -- 'double_cash', 'xp_bonus', 'equipment_focus', 'mystery_day', etc.

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_locations_date ON locker_daily_locations(date DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update leaderboard after auction
CREATE OR REPLACE FUNCTION update_locker_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.won_auction THEN
    -- Update daily leaderboard
    INSERT INTO locker_leaderboards (
      user_id,
      character_id,
      period,
      period_start,
      total_profit,
      total_invested,
      lockers_won,
      best_find_value,
      best_profit
    )
    VALUES (
      NEW.user_id,
      NEW.character_id,
      'daily',
      CURRENT_DATE,
      NEW.net_profit,
      NEW.investment,
      1,
      NEW.total_value,
      NEW.net_profit
    )
    ON CONFLICT (user_id, character_id, period, period_start)
    DO UPDATE SET
      total_profit = locker_leaderboards.total_profit + NEW.net_profit,
      total_invested = locker_leaderboards.total_invested + NEW.investment,
      lockers_won = locker_leaderboards.lockers_won + 1,
      best_find_value = GREATEST(locker_leaderboards.best_find_value, NEW.total_value),
      best_profit = GREATEST(locker_leaderboards.best_profit, NEW.net_profit),
      updated_at = NOW();

    -- Update weekly leaderboard
    INSERT INTO locker_leaderboards (
      user_id,
      character_id,
      period,
      period_start,
      total_profit,
      total_invested,
      lockers_won,
      best_find_value,
      best_profit
    )
    VALUES (
      NEW.user_id,
      NEW.character_id,
      'weekly',
      DATE_TRUNC('week', CURRENT_DATE)::DATE,
      NEW.net_profit,
      NEW.investment,
      1,
      NEW.total_value,
      NEW.net_profit
    )
    ON CONFLICT (user_id, character_id, period, period_start)
    DO UPDATE SET
      total_profit = locker_leaderboards.total_profit + NEW.net_profit,
      total_invested = locker_leaderboards.total_invested + NEW.investment,
      lockers_won = locker_leaderboards.lockers_won + 1,
      best_find_value = GREATEST(locker_leaderboards.best_find_value, NEW.total_value),
      best_profit = GREATEST(locker_leaderboards.best_profit, NEW.net_profit),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_leaderboard') THEN
    CREATE TRIGGER trigger_update_leaderboard
      AFTER UPDATE OF status ON locker_auction_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_locker_leaderboard();
  END IF;
END $$;

-- ============================================
-- SEED DAILY LOCATIONS (Next 30 Days)
-- ============================================

INSERT INTO locker_daily_locations (date, location, special_modifier)
VALUES
  (CURRENT_DATE + INTERVAL '0 days', 'subway', NULL),
  (CURRENT_DATE + INTERVAL '1 days', 'college', 'xp_bonus'),
  (CURRENT_DATE + INTERVAL '2 days', 'rest_stop', 'mystery_day'),
  (CURRENT_DATE + INTERVAL '3 days', 'hotel', 'double_cash'),
  (CURRENT_DATE + INTERVAL '4 days', 'police', 'equipment_focus'),
  (CURRENT_DATE + INTERVAL '5 days', 'amusement', NULL),
  (CURRENT_DATE + INTERVAL '6 days', 'airport', NULL),
  (CURRENT_DATE + INTERVAL '7 days', 'subway', NULL),
  (CURRENT_DATE + INTERVAL '8 days', 'college', NULL),
  (CURRENT_DATE + INTERVAL '9 days', 'rest_stop', NULL),
  (CURRENT_DATE + INTERVAL '10 days', 'hotel', NULL),
  (CURRENT_DATE + INTERVAL '11 days', 'police', NULL),
  (CURRENT_DATE + INTERVAL '12 days', 'amusement', 'mystery_day'),
  (CURRENT_DATE + INTERVAL '13 days', 'airport', 'double_cash'),
  (CURRENT_DATE + INTERVAL '14 days', 'subway', NULL),
  (CURRENT_DATE + INTERVAL '15 days', 'college', 'xp_bonus'),
  (CURRENT_DATE + INTERVAL '16 days', 'rest_stop', NULL),
  (CURRENT_DATE + INTERVAL '17 days', 'hotel', NULL),
  (CURRENT_DATE + INTERVAL '18 days', 'police', 'equipment_focus'),
  (CURRENT_DATE + INTERVAL '19 days', 'amusement', NULL),
  (CURRENT_DATE + INTERVAL '20 days', 'airport', NULL),
  (CURRENT_DATE + INTERVAL '21 days', 'subway', NULL),
  (CURRENT_DATE + INTERVAL '22 days', 'college', NULL),
  (CURRENT_DATE + INTERVAL '23 days', 'rest_stop', 'mystery_day'),
  (CURRENT_DATE + INTERVAL '24 days', 'hotel', 'double_cash'),
  (CURRENT_DATE + INTERVAL '25 days', 'police', NULL),
  (CURRENT_DATE + INTERVAL '26 days', 'amusement', NULL),
  (CURRENT_DATE + INTERVAL '27 days', 'airport', 'equipment_focus'),
  (CURRENT_DATE + INTERVAL '28 days', 'subway', NULL),
  (CURRENT_DATE + INTERVAL '29 days', 'college', 'xp_bonus')
ON CONFLICT (date) DO NOTHING;

COMMENT ON TABLE locker_item_definitions IS 'Master catalog of all items that can appear in lockers';
COMMENT ON TABLE locker_auction_sessions IS 'Individual auction sessions with strategy and results';
COMMENT ON TABLE locker_bid_history IS 'Complete history of every bid in each auction';
COMMENT ON TABLE locker_rogue_decisions IS 'Log of character rogue behavior decisions';
COMMENT ON TABLE locker_leaderboards IS 'Rankings for daily, weekly, and seasonal competitions';
COMMENT ON TABLE locker_achievements IS 'User achievements and progress tracking';
COMMENT ON TABLE locker_daily_locations IS 'Rotating daily location schedule';
