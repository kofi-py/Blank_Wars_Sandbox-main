-- Migration: 001_initial_schema
-- Description: Initial database schema for Blank Wars
-- Created: 2025-07-22
-- PostgreSQL 15+ recommended

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'legendary');
CREATE TYPE character_archetype AS ENUM ('warrior', 'mage', 'assassin', 'tank', 'support', 'beast', 'trickster', 'mystic', 'elementalist', 'berserker', 'scholar');
CREATE TYPE character_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');
CREATE TYPE battle_status AS ENUM ('matchmaking', 'active', 'paused', 'completed');
CREATE TYPE battle_strategy AS ENUM ('aggressive', 'defensive', 'balanced');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration', 'active', 'completed');
CREATE TYPE tournament_format AS ENUM ('single_elimination', 'swiss', 'round_robin');
CREATE TYPE battle_phase AS ENUM ('pre_battle_huddle', 'combat', 'coaching_timeout', 'post_battle_analysis');
CREATE TYPE event_source AS ENUM ('kitchen_chat', 'clubhouse_lounge', 'team_headquarters', 'battle_arena', 'training_facility', 'drama_board', 'ai_drama_board');

-- =====================================================
-- USER SYSTEM TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(20),
    oauth_id VARCHAR(255),

    -- Subscription info
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),

    -- Play time tracking
    daily_play_seconds INTEGER DEFAULT 0,
    last_play_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- User stats
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    total_battles INTEGER DEFAULT 0 CHECK (total_battles >= 0),
    total_wins INTEGER DEFAULT 0 CHECK (total_wins >= 0),
    character_slot_capacity INTEGER DEFAULT 12,

    -- Profile data
    avatar VARCHAR(255),
    title VARCHAR(100),
    player_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    characters_owned INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_subscription ON users (subscription_tier);
CREATE INDEX idx_users_level ON users (level);

-- Refresh tokens for JWT auth
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- =====================================================
-- CHARACTER SYSTEM TABLES
-- =====================================================

-- Master characters table (templates)
CREATE TABLE characters (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'achilles', 'cleopatra'
    name VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    archetype character_archetype NOT NULL,
    rarity character_rarity NOT NULL,
    origin_story TEXT,
    source_material VARCHAR(100), -- 'Greek Mythology', 'Egyptian History', etc.

    -- Core combat stats
    base_attack INTEGER NOT NULL DEFAULT 100,
    base_defense INTEGER NOT NULL DEFAULT 100,
    base_speed INTEGER NOT NULL DEFAULT 100,
    base_max_health INTEGER NOT NULL DEFAULT 1000,

    -- Mental stats
    base_mental_health INTEGER DEFAULT 100,
    base_stress_resistance INTEGER DEFAULT 50,
    base_confidence INTEGER DEFAULT 50,
    base_teamwork INTEGER DEFAULT 50,

    -- Character traits
    personality_traits JSONB DEFAULT '[]'::jsonb,
    motivations JSONB DEFAULT '[]'::jsonb,
    fears JSONB DEFAULT '[]'::jsonb,
    background_story TEXT,

    -- Equipment and abilities
    signature_abilities JSONB DEFAULT '[]'::jsonb,
    equipment_slots JSONB DEFAULT '{"weapon": null, "armor": null, "accessory": null}'::jsonb,

    -- Visual data
    avatar VARCHAR(255),
    artwork JSONB DEFAULT '{}'::jsonb,
    color_scheme VARCHAR(7), -- hex color

    -- Game mechanics
    level_scaling JSONB DEFAULT '{}'::jsonb,
    unlock_requirements JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_characters_archetype ON characters (archetype);
CREATE INDEX idx_characters_rarity ON characters (rarity);
CREATE INDEX idx_characters_source ON characters (source_material);

-- User-owned character instances
CREATE TABLE user_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id VARCHAR(50) NOT NULL REFERENCES characters(id),

    -- Instance-specific stats (can be upgraded)
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    bond_level INTEGER DEFAULT 1 CHECK (bond_level >= 1 AND bond_level <= 10),

    -- Current combat stats (base + upgrades + equipment)
    current_attack INTEGER NOT NULL,
    current_defense INTEGER NOT NULL,
    current_speed INTEGER NOT NULL,
    current_max_health INTEGER NOT NULL,
    current_health INTEGER NOT NULL,

    -- Current mental stats
    current_mental_health INTEGER DEFAULT 100,
    stress INTEGER DEFAULT 0,
    confidence INTEGER DEFAULT 50,
    battle_focus INTEGER DEFAULT 50,
    team_trust INTEGER DEFAULT 50,
    strategy_deviation_risk INTEGER DEFAULT 30,
    gameplan_adherence INTEGER DEFAULT 70,

    -- Equipment
    equipped_weapon_id UUID,
    equipped_armor_id UUID,
    equipped_accessory_id UUID,

    -- Training and progression
    skill_points INTEGER DEFAULT 0,
    training_sessions_completed INTEGER DEFAULT 0,
    battles_participated INTEGER DEFAULT 0,
    battles_won INTEGER DEFAULT 0,

    -- Performance tracking
    total_damage_dealt INTEGER DEFAULT 0,
    total_damage_taken INTEGER DEFAULT 0,
    total_healing_given INTEGER DEFAULT 0,
    critical_hits INTEGER DEFAULT 0,
    abilities_used INTEGER DEFAULT 0,
    successful_hits INTEGER DEFAULT 0,
    strategy_deviations INTEGER DEFAULT 0,
    teamplay_actions INTEGER DEFAULT 0,

    -- Relationship modifiers
    relationship_modifiers JSONB DEFAULT '[]'::jsonb,

    -- Acquisition data
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acquired_from VARCHAR(50), -- 'pack_opening', 'purchase', 'reward', etc.

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_battle_at TIMESTAMP,

    UNIQUE(user_id, character_id) -- One instance per character per user
);

CREATE INDEX idx_user_characters_user ON user_characters (user_id);
CREATE INDEX idx_user_characters_character ON user_characters (character_id);
CREATE INDEX idx_user_characters_level ON user_characters (current_level);
CREATE INDEX idx_user_characters_bond ON user_characters (bond_level);
CREATE INDEX idx_user_characters_active ON user_characters (is_active);

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (1, '001_initial_schema') ON CONFLICT (version) DO NOTHING;

COMMIT;
