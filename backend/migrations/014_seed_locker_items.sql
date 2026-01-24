-- Migration 014: Seed Lost & Found Wars Items
-- Adds starter item catalog (50+ items across all categories)


-- ============================================
-- CREATE TABLE (Moved from 074 to support seeding)
-- ============================================

CREATE TABLE IF NOT EXISTS locker_item_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  base_value INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  condition TEXT DEFAULT 'fair',
  icon TEXT,
  model_3d_path TEXT,
  is_equipment BOOLEAN DEFAULT FALSE,
  equipment_id TEXT REFERENCES equipment(id),
  grant_xp INTEGER DEFAULT 0,
  special_effect TEXT,
  backstory TEXT,
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
-- JUNK TIER ITEMS ($0-5)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('single_sock', 'Single Sock', 'Just one sock. Where did the other one go?', 'junk', 0, 'junk', 'poor', '🧦', 0.5, 0.9, 0.4, 0.8, 0.1, 0.3, 0.6),
('broken_phone_charger', 'Broken Phone Charger', 'Frayed and non-functional.', 'junk', 0, 'junk', 'broken', '🔌', 0.7, 0.8, 0.6, 0.9, 0.3, 0.2, 0.4),
('expired_gum', 'Pack of Expired Gum', 'Best by date: 2019. Rock hard.', 'junk', 0, 'junk', 'poor', '🍬', 0.3, 0.7, 0.2, 0.5, 0.1, 0.4, 0.8),
('mystery_stain', 'Item with Mystery Stain', 'You don''t want to know.', 'junk', 0, 'junk', 'poor', '🤢', 0.2, 0.6, 0.8, 0.7, 0.3, 0.5, 0.6),
('plastic_fork', 'Plastic Fork', 'Single-use utensil. Used once.', 'junk', 0, 'junk', 'poor', '🍴', 0.1, 0.4, 0.3, 0.6, 0.1, 0.7, 0.9),
('old_lottery_ticket', 'Old Lottery Ticket', 'Definitely not a winner.', 'junk', 0, 'junk', 'poor', '🎟️', 0.3, 0.6, 0.2, 0.4, 0.2, 0.3, 0.8),
('torn_magazine', 'Torn Magazine', 'From 2015, water damaged.', 'junk', 1, 'junk', 'poor', '📰', 0.4, 0.7, 0.5, 0.6, 0.2, 0.4, 0.7),
('broken_sunglasses', 'Broken Sunglasses', 'One lens missing, frame cracked.', 'junk', 2, 'junk', 'broken', '🕶️', 0.6, 0.5, 0.7, 0.4, 0.3, 0.8, 0.5);

-- ============================================
-- COMMON TIER ITEMS ($5-50)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('used_backpack', 'Used Backpack', 'Sturdy canvas backpack with some wear.', 'clothing', 15, 'common', 'fair', '🎒', 0.7, 0.8, 0.3, 0.9, 0.4, 0.5, 0.6),
('paperback_books', 'Box of Paperback Books', 'Mixed fiction and non-fiction.', 'documents', 12, 'common', 'fair', '📚', 0.5, 0.6, 0.4, 0.9, 0.3, 0.2, 0.7),
('cheap_headphones', 'Cheap Headphones', 'Budget earbuds, still work.', 'electronics', 8, 'common', 'fair', '🎧', 0.6, 0.7, 0.5, 0.8, 0.3, 0.4, 0.5),
('coffee_maker', 'Basic Coffee Maker', 'Standard drip coffee maker.', 'electronics', 25, 'common', 'good', '☕', 0.4, 0.3, 0.6, 0.7, 0.2, 0.1, 0.5),
('winter_coat', 'Winter Coat', 'Heavy winter jacket, generic brand.', 'clothing', 30, 'common', 'good', '🧥', 0.5, 0.6, 0.4, 0.5, 0.5, 0.3, 0.7),
('toolbox_basic', 'Basic Tool Set', 'Hammer, screwdrivers, wrench.', 'equipment', 35, 'common', 'fair', '🔧', 0.3, 0.4, 0.2, 0.3, 0.6, 0.4, 0.9),
('sports_shoes', 'Athletic Shoes', 'Generic running shoes, lightly used.', 'clothing', 20, 'common', 'fair', '👟', 0.4, 0.6, 0.3, 0.8, 0.2, 0.5, 0.5),
('bedding_set', 'Bedding Set', 'Sheets, pillowcases, comforter.', 'furniture', 28, 'common', 'fair', '🛏️', 0.3, 0.2, 0.7, 0.8, 0.1, 0.2, 0.4),
('kitchen_utensils', 'Kitchen Utensil Set', 'Spatulas, spoons, ladles.', 'equipment', 18, 'common', 'good', '🍴', 0.2, 0.3, 0.6, 0.7, 0.1, 0.2, 0.6),
('old_laptop_bag', 'Laptop Bag', 'Padded computer bag, no laptop.', 'clothing', 22, 'common', 'fair', '💼', 0.8, 0.7, 0.6, 0.8, 0.4, 0.2, 0.5);

-- ============================================
-- DECENT TIER ITEMS ($50-200)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('designer_jeans', 'Designer Jeans', 'Brand-name denim, good condition.', 'clothing', 80, 'decent', 'good', '👖', 0.5, 0.4, 0.8, 0.6, 0.3, 0.2, 0.3),
('bluetooth_speaker', 'Bluetooth Speaker', 'Portable wireless speaker, works.', 'electronics', 65, 'decent', 'good', '🔊', 0.6, 0.5, 0.7, 0.8, 0.4, 0.6, 0.4),
('vintage_camera', 'Vintage Film Camera', '35mm camera from the 1980s.', 'collectibles', 120, 'decent', 'fair', '📷', 0.7, 0.5, 0.6, 0.4, 0.5, 0.3, 0.5),
('electric_guitar', 'Electric Guitar', 'Starter guitar, needs new strings.', 'musical', 150, 'decent', 'fair', '🎸', 0.4, 0.7, 0.5, 0.8, 0.6, 0.3, 0.4),
('office_chair', 'Ergonomic Office Chair', 'Adjustable desk chair, slight wear.', 'furniture', 90, 'decent', 'fair', '🪑', 0.3, 0.2, 0.5, 0.7, 0.2, 0.1, 0.3),
('tablet_device', 'Tablet Computer', 'Older model tablet, still functional.', 'electronics', 110, 'decent', 'fair', '📱', 0.8, 0.6, 0.7, 0.8, 0.5, 0.3, 0.4),
('leather_jacket', 'Leather Jacket', 'Classic leather biker jacket.', 'clothing', 135, 'decent', 'good', '🧥', 0.5, 0.6, 0.7, 0.5, 0.7, 0.4, 0.6),
('telescope', 'Amateur Telescope', 'Beginner astronomy telescope.', 'equipment', 95, 'decent', 'good', '🔭', 0.4, 0.3, 0.4, 0.7, 0.3, 0.2, 0.3),
('signed_sports_memorabilia', 'Signed Baseball', 'Autographed by local player.', 'collectibles', 75, 'decent', 'good', '⚾', 0.3, 0.4, 0.5, 0.4, 0.2, 0.6, 0.4),
('professional_blender', 'Professional Blender', 'High-power kitchen blender.', 'electronics', 85, 'decent', 'good', '🫙', 0.3, 0.2, 0.6, 0.5, 0.1, 0.2, 0.4);

-- ============================================
-- VALUABLE TIER ITEMS ($200-1000)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('designer_handbag', 'Designer Handbag', 'Luxury brand purse, authentic.', 'clothing', 450, 'valuable', 'excellent', '👜', 0.7, 0.3, 0.9, 0.4, 0.5, 0.2, 0.2),
('gibson_les_paul', 'Gibson Les Paul Guitar', 'Classic rock guitar, well-maintained.', 'musical', 850, 'valuable', 'good', '🎸', 0.3, 0.8, 0.4, 0.9, 0.5, 0.2, 0.3),
('gaming_laptop', 'Gaming Laptop', 'High-performance laptop, 2 years old.', 'electronics', 650, 'valuable', 'good', '💻', 0.7, 0.5, 0.7, 0.9, 0.6, 0.3, 0.4),
('gold_bracelet', 'Gold Bracelet', '14k gold chain bracelet.', 'jewelry', 380, 'valuable', 'excellent', '📿', 0.6, 0.4, 0.9, 0.3, 0.8, 0.3, 0.2),
('professional_camera', 'Professional DSLR Camera', 'Canon 5D with kit lens.', 'electronics', 720, 'valuable', 'good', '📷', 0.8, 0.4, 0.6, 0.6, 0.5, 0.4, 0.3),
('antique_pocket_watch', 'Antique Pocket Watch', 'Working pocket watch from 1920s.', 'collectibles', 520, 'valuable', 'excellent', '⌚', 0.5, 0.3, 0.7, 0.2, 0.6, 0.3, 0.4),
('designer_suit', 'Designer Suit', 'Tailored business suit, Italian.', 'clothing', 580, 'valuable', 'excellent', '🤵', 0.7, 0.2, 0.9, 0.3, 0.4, 0.1, 0.2),
('synthesizer', 'Analog Synthesizer', 'Vintage electronic music synth.', 'musical', 680, 'valuable', 'good', '🎹', 0.4, 0.6, 0.5, 0.8, 0.5, 0.3, 0.3),
('luxury_watch', 'Luxury Watch', 'Swiss-made automatic watch.', 'jewelry', 950, 'valuable', 'excellent', '⌚', 0.8, 0.3, 0.9, 0.2, 0.7, 0.2, 0.3),
('rare_vinyl_collection', 'Rare Vinyl Records', 'First pressings of classic albums.', 'collectibles', 420, 'valuable', 'good', '💿', 0.3, 0.5, 0.6, 0.7, 0.4, 0.3, 0.5);

-- ============================================
-- RARE TIER ITEMS ($1000-5000)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('diamond_engagement_ring', 'Diamond Engagement Ring', 'Beautiful 1.5 carat diamond ring.', 'jewelry', 2400, 'rare', 'excellent', '💍', 0.6, 0.4, 0.9, 0.2, 0.8, 0.3, 0.1),
('original_artwork', 'Original Painting', 'Oil painting by known local artist.', 'collectibles', 1800, 'rare', 'excellent', '🖼️', 0.5, 0.3, 0.8, 0.4, 0.6, 0.2, 0.2),
('rare_comic_books', 'Rare Comic Book Collection', 'First editions, mint condition.', 'collectibles', 1450, 'rare', 'mint', '📚', 0.3, 0.4, 0.5, 0.6, 0.5, 0.4, 0.3),
('professional_drone', 'Professional Drone', 'High-end camera drone with controller.', 'electronics', 1200, 'rare', 'excellent', '🚁', 0.7, 0.2, 0.6, 0.7, 0.4, 0.3, 0.3),
('gold_coins', 'Gold Coin Collection', 'Collectable gold coins from various eras.', 'collectibles', 2800, 'rare', 'excellent', '🪙', 0.4, 0.2, 0.7, 0.3, 0.7, 0.2, 0.2),
('vintage_guitar', 'Vintage Fender Stratocaster', '1965 Fender in original case.', 'musical', 3200, 'rare', 'excellent', '🎸', 0.3, 0.5, 0.6, 0.5, 0.6, 0.2, 0.3),
('prototype_tech', 'Prototype Device', 'Early version of consumer tech product.', 'electronics', 1600, 'rare', 'good', '📱', 0.8, 0.3, 0.7, 0.8, 0.5, 0.2, 0.2),
('rare_stamps', 'Rare Stamp Collection', 'Valuable stamps from around the world.', 'collectibles', 1350, 'rare', 'mint', '📮', 0.5, 0.3, 0.6, 0.4, 0.5, 0.2, 0.4),
('jade_sculpture', 'Jade Sculpture', 'Hand-carved jade figurine.', 'collectibles', 2100, 'rare', 'excellent', '🗿', 0.6, 0.2, 0.8, 0.3, 0.6, 0.3, 0.2),
('designer_luggage_set', 'Designer Luggage Set', 'Complete Louis Vuitton luggage set.', 'clothing', 1900, 'rare', 'excellent', '🧳', 0.9, 0.2, 0.9, 0.2, 0.4, 0.1, 0.3);

-- ============================================
-- LEGENDARY TIER ITEMS ($5000+)
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('rolex_watch', 'Rolex Watch', 'Genuine Rolex Submariner in box.', 'jewelry', 8500, 'legendary', 'mint', '⌚', 0.7, 0.1, 0.9, 0.1, 0.7, 0.1, 0.1),
('rare_baseball_card', 'Rare Baseball Card', 'Vintage card in pristine condition.', 'collectibles', 6200, 'legendary', 'mint', '🃏', 0.2, 0.3, 0.4, 0.3, 0.4, 0.5, 0.2),
('platinum_jewelry', 'Platinum Jewelry Set', 'Necklace, earrings, and bracelet.', 'jewelry', 7800, 'legendary', 'mint', '💎', 0.6, 0.1, 0.9, 0.1, 0.8, 0.1, 0.1),
('vintage_movie_prop', 'Vintage Movie Prop', 'Original prop from classic film.', 'collectibles', 5500, 'legendary', 'excellent', '🎬', 0.4, 0.2, 0.7, 0.3, 0.5, 0.3, 0.2),
('cryptocurrency_wallet', 'Crypto Hardware Wallet', 'Contains access to $15,000 in crypto.', 'electronics', 15000, 'legendary', 'excellent', '💰', 0.6, 0.2, 0.7, 0.5, 0.6, 0.1, 0.2);

-- ============================================
-- MYSTERY/SPECIAL ITEMS
-- ============================================

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, special_effect, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('mystery_key', 'Mysterious Key', 'Strange key with cryptic engravings.', 'mystery', 0, 'rare', 'excellent', '🗝️', 'unlocks_special_locker', 0.2, 0.3, 0.4, 0.3, 0.5, 0.4, 0.3),
('treasure_map', 'Old Treasure Map', 'Faded map with X marks the spot.', 'mystery', 0, 'rare', 'poor', '🗺️', 'unlocks_treasure_quest', 0.3, 0.4, 0.5, 0.4, 0.4, 0.5, 0.6),
('lucky_charm', 'Lucky Charm', 'Strange talisman that feels warm.', 'mystery', 0, 'rare', 'good', '🍀', 'increases_luck', 0.3, 0.4, 0.4, 0.4, 0.3, 0.6, 0.4),
('cursed_object', 'Cursed Object', 'Gives you the creeps just looking at it.', 'mystery', 0, 'rare', 'fair', '💀', 'cursed_item', 0.2, 0.3, 0.5, 0.3, 0.6, 0.4, 0.4);

-- ============================================
-- EQUIPMENT ITEMS (Grant in-game equipment)
-- ============================================

-- Note: These reference existing equipment table
-- Will link actual equipment_id values in a future migration once equipment is created

INSERT INTO locker_item_definitions (id, name, description, category, base_value, rarity, condition, icon, is_equipment, grant_xp, weight_airport, weight_subway, weight_hotel, weight_college, weight_police, weight_amusement, weight_rest_stop) VALUES
('training_sword', 'Training Sword', 'Practice sword that improves combat skills.', 'equipment', 120, 'decent', 'good', '⚔️', true, 50, 0.2, 0.3, 0.3, 0.5, 0.6, 0.4, 0.3),
('athletic_gear', 'Professional Athletic Gear', 'High-quality training equipment.', 'equipment', 180, 'valuable', 'excellent', '🏋️', true, 75, 0.4, 0.4, 0.5, 0.8, 0.3, 0.6, 0.4),
('meditation_cushion', 'Meditation Cushion', 'Aids in focus and mental training.', 'equipment', 60, 'common', 'good', '🧘', true, 40, 0.3, 0.4, 0.6, 0.7, 0.2, 0.3, 0.5),
('strategy_books', 'Military Strategy Books', 'Ancient texts on tactics and warfare.', 'equipment', 95, 'decent', 'good', '📖', true, 60, 0.5, 0.3, 0.4, 0.8, 0.4, 0.2, 0.4);

COMMENT ON TABLE locker_item_definitions IS '50+ starter items across all categories and rarity tiers';
