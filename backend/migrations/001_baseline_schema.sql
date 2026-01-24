-- =====================================================
-- Blank Wars - Baseline Migration
-- Generated: 2025-10-15
--
-- This baseline migration includes:
-- - All 59 production tables from Railway
-- - 5 local-only development tables  
-- - All constraints, indexes, triggers, and functions
-- - Custom types and extensions
--
-- Total: 64 tables
-- =====================================================

BEGIN;

-- Create migration tracking tables
CREATE TABLE migration_log (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE migration_meta (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PRODUCTION SCHEMA (Railway)
-- =====================================================

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: character_rarity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.character_rarity AS ENUM (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
);


--
-- Name: update_challenge_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_challenge_leaderboard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update winner stats
  IF NEW.winner_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_challenges_won, total_top_3_finishes, current_win_streak)
    VALUES (NEW.winner_character_id, 1, 1, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_challenges_won = challenge_leaderboard.total_challenges_won + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = challenge_leaderboard.current_win_streak + 1,
      best_win_streak = GREATEST(challenge_leaderboard.best_win_streak, challenge_leaderboard.current_win_streak + 1),
      updated_at = NOW();
  END IF;

  -- Update second place stats
  IF NEW.second_place_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_top_3_finishes)
    VALUES (NEW.second_place_character_id, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = 0,
      updated_at = NOW();
  END IF;

  -- Update third place stats
  IF NEW.third_place_character_id IS NOT NULL THEN
    INSERT INTO challenge_leaderboard (user_character_id, total_challenges_entered, total_top_3_finishes)
    VALUES (NEW.third_place_character_id, 1, 1)
    ON CONFLICT (user_character_id) DO UPDATE SET
      total_challenges_entered = challenge_leaderboard.total_challenges_entered + 1,
      total_top_3_finishes = challenge_leaderboard.total_top_3_finishes + 1,
      current_win_streak = 0,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_internal_mail_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_internal_mail_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_leaderboard_rewards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_leaderboard_rewards() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.currency_amount IS NOT NULL THEN
    UPDATE challenge_leaderboard
    SET total_currency_earned = total_currency_earned + NEW.currency_amount,
        updated_at = NOW()
    WHERE user_character_id = NEW.user_character_id;
  END IF;

  IF NEW.item_id IS NOT NULL THEN
    UPDATE challenge_leaderboard
    SET total_items_won = total_items_won + 1,
        updated_at = NOW()
    WHERE user_character_id = NEW.user_character_id;
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_template_id uuid,
    user_id text,
    status character varying(20) DEFAULT 'registration'::character varying NOT NULL,
    registration_deadline timestamp with time zone,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    game_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT active_challenges_game_state_check CHECK ((jsonb_typeof(game_state) = 'object'::text)),
    CONSTRAINT active_challenges_status_check CHECK (((status)::text = ANY ((ARRAY['registration'::character varying, 'ready'::character varying, 'in_progress'::character varying, 'voting'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: battles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battles (
    id text NOT NULL,
    player1_id text NOT NULL,
    player2_id text NOT NULL,
    character1_id text NOT NULL,
    character2_id text NOT NULL,
    status text DEFAULT 'matchmaking'::text,
    current_round integer DEFAULT 1,
    turn_count integer DEFAULT 0,
    p1_strategy text,
    p2_strategy text,
    winner_id text,
    end_reason text,
    combat_log text DEFAULT '[]'::text,
    chat_logs text DEFAULT '[]'::text,
    xp_gained integer DEFAULT 0,
    bond_gained integer DEFAULT 0,
    currency_gained integer DEFAULT 0,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp without time zone,
    CONSTRAINT battles_p1_strategy_check CHECK ((p1_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]))),
    CONSTRAINT battles_p2_strategy_check CHECK ((p2_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]))),
    CONSTRAINT battles_status_check CHECK ((status = ANY (ARRAY['matchmaking'::text, 'active'::text, 'paused'::text, 'completed'::text])))
);


--
-- Name: card_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_packs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    pack_type character varying(50) NOT NULL,
    guaranteed_contents jsonb DEFAULT '[]'::jsonb,
    possible_contents jsonb DEFAULT '[]'::jsonb,
    total_cards integer DEFAULT 5,
    rarity_weights jsonb DEFAULT '{}'::jsonb,
    cost_credits integer DEFAULT 0,
    cost_real_money numeric(10,2) DEFAULT 0.00,
    is_purchasable boolean DEFAULT true,
    requires_level integer DEFAULT 1,
    available_from timestamp without time zone,
    available_until timestamp without time zone,
    max_purchases_per_user integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: challenge_alliances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_alliances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    active_challenge_id uuid,
    alliance_name character varying(100),
    leader_character_id text,
    member_character_ids text[],
    is_active boolean DEFAULT true NOT NULL,
    formed_at timestamp with time zone DEFAULT now() NOT NULL,
    dissolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: challenge_leaderboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_leaderboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_character_id text,
    total_challenges_entered integer DEFAULT 0 NOT NULL,
    total_challenges_won integer DEFAULT 0 NOT NULL,
    total_top_3_finishes integer DEFAULT 0 NOT NULL,
    wins_by_type jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_currency_earned integer DEFAULT 0 NOT NULL,
    total_items_won integer DEFAULT 0 NOT NULL,
    current_win_streak integer DEFAULT 0 NOT NULL,
    best_win_streak integer DEFAULT 0 NOT NULL,
    overall_rank integer,
    elo_rating integer DEFAULT 1000 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_leaderboard_best_win_streak_check CHECK ((best_win_streak >= 0)),
    CONSTRAINT challenge_leaderboard_current_win_streak_check CHECK ((current_win_streak >= 0)),
    CONSTRAINT challenge_leaderboard_elo_rating_check CHECK ((elo_rating >= 0)),
    CONSTRAINT challenge_leaderboard_overall_rank_check CHECK ((overall_rank > 0)),
    CONSTRAINT challenge_leaderboard_total_challenges_entered_check CHECK ((total_challenges_entered >= 0)),
    CONSTRAINT challenge_leaderboard_total_challenges_won_check CHECK ((total_challenges_won >= 0)),
    CONSTRAINT challenge_leaderboard_total_currency_earned_check CHECK ((total_currency_earned >= 0)),
    CONSTRAINT challenge_leaderboard_total_items_won_check CHECK ((total_items_won >= 0)),
    CONSTRAINT challenge_leaderboard_total_top_3_finishes_check CHECK ((total_top_3_finishes >= 0)),
    CONSTRAINT challenge_leaderboard_wins_by_type_check CHECK ((jsonb_typeof(wins_by_type) = 'object'::text))
);


--
-- Name: challenge_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    active_challenge_id uuid,
    user_character_id text,
    registration_time timestamp with time zone DEFAULT now() NOT NULL,
    team_assignment character varying(50),
    performance_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    final_score numeric(10,2),
    placement integer,
    is_eliminated boolean DEFAULT false NOT NULL,
    elimination_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_participants_final_score_check CHECK ((final_score >= (0)::numeric)),
    CONSTRAINT challenge_participants_performance_metrics_check CHECK ((jsonb_typeof(performance_metrics) = 'object'::text)),
    CONSTRAINT challenge_participants_placement_check CHECK ((placement > 0))
);


--
-- Name: challenge_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    active_challenge_id uuid,
    challenge_template_id uuid,
    winner_character_id text,
    second_place_character_id text,
    third_place_character_id text,
    total_participants integer NOT NULL,
    completion_time_minutes integer,
    full_results jsonb NOT NULL,
    highlight_moments text[],
    total_rewards_given jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_results_completion_time_minutes_check CHECK ((completion_time_minutes > 0)),
    CONSTRAINT challenge_results_full_results_check CHECK ((jsonb_typeof(full_results) = 'object'::text)),
    CONSTRAINT challenge_results_total_participants_check CHECK ((total_participants > 0)),
    CONSTRAINT challenge_results_total_rewards_given_check CHECK ((jsonb_typeof(total_rewards_given) = 'object'::text))
);


--
-- Name: challenge_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_template_id uuid,
    reward_type character varying(50) NOT NULL,
    reward_config jsonb NOT NULL,
    placement_required character varying(20) NOT NULL,
    is_guaranteed boolean DEFAULT false NOT NULL,
    probability numeric(3,2) DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_rewards_placement_required_check CHECK (((placement_required)::text = ANY ((ARRAY['winner'::character varying, 'top_3'::character varying, 'participant'::character varying, 'loser'::character varying])::text[]))),
    CONSTRAINT challenge_rewards_probability_check CHECK (((probability >= 0.0) AND (probability <= 1.0))),
    CONSTRAINT challenge_rewards_reward_config_check CHECK ((jsonb_typeof(reward_config) = 'object'::text)),
    CONSTRAINT challenge_rewards_reward_type_check CHECK (((reward_type)::text = ANY ((ARRAY['currency'::character varying, 'equipment'::character varying, 'battle_boost'::character varying, 'special_item'::character varying, 'training_bonus'::character varying, 'healing_discount'::character varying, 'unlock'::character varying, 'immunity'::character varying, 'advantage'::character varying])::text[])))
);


--
-- Name: challenge_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    challenge_type character varying(50) NOT NULL,
    min_participants integer DEFAULT 1 NOT NULL,
    max_participants integer DEFAULT 10 NOT NULL,
    requires_team boolean DEFAULT false,
    mechanics jsonb DEFAULT '{}'::jsonb NOT NULL,
    difficulty character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    estimated_duration_minutes integer DEFAULT 30 NOT NULL,
    reality_show_parody character varying(100),
    theme_tags text[],
    base_currency_reward integer DEFAULT 1000 NOT NULL,
    reward_scaling jsonb DEFAULT '{"first": 1.0, "third": 0.3, "second": 0.6}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT challenge_templates_base_currency_reward_check CHECK ((base_currency_reward >= 0)),
    CONSTRAINT challenge_templates_challenge_type_check CHECK (((challenge_type)::text = ANY ((ARRAY['physical'::character varying, 'mental'::character varying, 'social'::character varying, 'cooking'::character varying, 'talent'::character varying, 'survival'::character varying, 'creative'::character varying, 'team'::character varying, 'individual'::character varying, 'hybrid'::character varying])::text[]))),
    CONSTRAINT challenge_templates_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying, 'extreme'::character varying])::text[]))),
    CONSTRAINT challenge_templates_estimated_duration_minutes_check CHECK ((estimated_duration_minutes > 0)),
    CONSTRAINT challenge_templates_mechanics_check CHECK ((jsonb_typeof(mechanics) = 'object'::text)),
    CONSTRAINT challenge_templates_reward_scaling_check CHECK ((jsonb_typeof(reward_scaling) = 'object'::text))
);


--
-- Name: character_abilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_abilities (
    id text NOT NULL,
    character_id text,
    ability_id text NOT NULL,
    ability_name text NOT NULL,
    rank integer DEFAULT 1,
    max_rank integer DEFAULT 5,
    unlocked boolean DEFAULT false,
    unlocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: character_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_equipment (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    character_id text NOT NULL,
    equipment_id text NOT NULL,
    is_equipped boolean DEFAULT false,
    equipped_at timestamp without time zone,
    acquired_from text DEFAULT 'gift'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: character_experience_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_experience_log (
    id text NOT NULL,
    character_id text,
    source text NOT NULL,
    amount integer NOT NULL,
    multiplier numeric(3,2) DEFAULT 1.0,
    description text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT character_experience_log_source_check CHECK ((source = ANY (ARRAY['battle'::text, 'training'::text, 'quest'::text, 'achievement'::text, 'daily'::text, 'event'::text])))
);


--
-- Name: character_healing_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_healing_sessions (
    id text NOT NULL,
    character_id text NOT NULL,
    facility_id text NOT NULL,
    session_type text NOT NULL,
    start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estimated_completion_time timestamp without time zone NOT NULL,
    currency_paid integer DEFAULT 0,
    premium_paid integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT character_healing_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['injury_healing'::text, 'resurrection'::text])))
);


--
-- Name: character_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    character_id text NOT NULL,
    item_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    acquired_from text DEFAULT 'gift'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT character_items_quantity_check CHECK ((quantity >= 0))
);


--
-- Name: character_living_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_living_context (
    id integer NOT NULL,
    character_id character varying(255),
    team_id character varying(255),
    sleeps_on_floor boolean DEFAULT false,
    sleeps_on_couch boolean DEFAULT false,
    sleeps_under_table boolean DEFAULT false,
    room_overcrowded boolean DEFAULT false,
    floor_sleeper_count integer DEFAULT 0,
    roommate_count integer DEFAULT 1,
    current_mood character varying(50) DEFAULT 'neutral'::character varying,
    current_energy_level integer DEFAULT 100,
    last_sleep_quality character varying(20) DEFAULT 'good'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT character_living_context_current_energy_level_check CHECK (((current_energy_level >= 0) AND (current_energy_level <= 100))),
    CONSTRAINT character_living_context_last_sleep_quality_check CHECK (((last_sleep_quality)::text = ANY ((ARRAY['poor'::character varying, 'fair'::character varying, 'good'::character varying, 'excellent'::character varying])::text[])))
);


--
-- Name: character_living_context_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_living_context_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: character_living_context_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_living_context_id_seq OWNED BY public.character_living_context.id;


--
-- Name: character_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_memories (
    id character varying(255) NOT NULL,
    character_id character varying(255) NOT NULL,
    event_id character varying(255),
    content text NOT NULL,
    emotion_type character varying(50),
    intensity integer DEFAULT 5,
    valence integer DEFAULT 5,
    importance integer DEFAULT 5,
    created_at timestamp with time zone NOT NULL,
    last_recalled timestamp with time zone DEFAULT now(),
    recall_count integer DEFAULT 0,
    associated_characters text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    decay_rate numeric DEFAULT 1.0,
    chat_context jsonb,
    cross_reference_data jsonb,
    financial_metadata jsonb,
    therapy_metadata jsonb,
    confessional_metadata jsonb
);


--
-- Name: character_progression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_progression (
    character_id text NOT NULL,
    stat_points integer DEFAULT 0,
    skill_points integer DEFAULT 0,
    ability_points integer DEFAULT 0,
    tier text DEFAULT 'novice'::text,
    title text DEFAULT 'Novice'::text,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: character_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_skills (
    id text NOT NULL,
    character_id text,
    skill_id text NOT NULL,
    skill_name text NOT NULL,
    level integer DEFAULT 1,
    experience integer DEFAULT 0,
    max_level integer DEFAULT 10,
    unlocked boolean DEFAULT false,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.characters (
    id text NOT NULL,
    name text NOT NULL,
    title text,
    archetype text,
    origin_era text,
    rarity text,
    base_health integer NOT NULL,
    base_attack integer NOT NULL,
    base_defense integer NOT NULL,
    base_speed integer NOT NULL,
    base_special integer NOT NULL,
    personality_traits text,
    conversation_style text,
    backstory text,
    conversation_topics text,
    avatar_emoji text,
    artwork_url text,
    abilities text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    training integer DEFAULT 50,
    team_player integer DEFAULT 50,
    ego integer DEFAULT 50,
    mental_health integer DEFAULT 80,
    communication integer DEFAULT 50,
    gameplan_adherence_level integer DEFAULT 75,
    current_mental_health integer DEFAULT 80,
    stress_level integer DEFAULT 25,
    team_trust integer DEFAULT 85,
    battle_focus integer DEFAULT 90,
    starting_wallet integer DEFAULT 0,
    default_mood character varying(50) DEFAULT 'neutral'::character varying,
    default_energy_level integer DEFAULT 100,
    comedian_name text,
    comedy_style text,
    role character varying(50),
    species character varying(50) NOT NULL,
    comedian_style_id integer,
    CONSTRAINT characters_archetype_check CHECK ((archetype = ANY (ARRAY['warrior'::text, 'scholar'::text, 'trickster'::text, 'beast'::text, 'leader'::text, 'mage'::text, 'mystic'::text, 'tank'::text, 'assassin'::text, 'system'::text]))),
    CONSTRAINT characters_default_energy_level_check CHECK (((default_energy_level >= 0) AND (default_energy_level <= 100))),
    CONSTRAINT characters_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id text NOT NULL,
    user_id text NOT NULL,
    character_id text NOT NULL,
    battle_id text,
    player_message text NOT NULL,
    character_response text NOT NULL,
    message_context text,
    model_used text,
    tokens_used integer,
    response_time_ms integer,
    bond_increase boolean DEFAULT false,
    memory_saved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id integer NOT NULL,
    session_id character varying(255),
    chat_id character varying(255),
    user_id uuid,
    character_id character varying(255),
    current_turn_count integer DEFAULT 0,
    last_character_response text,
    session_complete boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_sessions_id_seq OWNED BY public.chat_sessions.id;


--
-- Name: claimable_pack_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claimable_pack_contents (
    id text DEFAULT gen_random_uuid() NOT NULL,
    claimable_pack_id text NOT NULL,
    character_id text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rarity public.character_rarity DEFAULT 'common'::public.character_rarity NOT NULL
);


--
-- Name: claimable_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claimable_packs (
    id text NOT NULL,
    pack_type character varying(50) NOT NULL,
    is_claimed boolean DEFAULT false,
    claimed_by_user_id text,
    claimed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: coach_progression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_progression (
    user_id text NOT NULL,
    coach_level integer DEFAULT 1,
    coach_experience integer DEFAULT 0,
    coach_title text DEFAULT 'Rookie Coach'::text,
    psychology_skill_points integer DEFAULT 0,
    battle_strategy_skill_points integer DEFAULT 0,
    character_development_skill_points integer DEFAULT 0,
    total_battles_coached integer DEFAULT 0,
    total_wins_coached integer DEFAULT 0,
    psychology_interventions integer DEFAULT 0,
    successful_interventions integer DEFAULT 0,
    gameplan_adherence_rate real DEFAULT 0.0,
    team_chemistry_improvements integer DEFAULT 0,
    character_developments integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    financial_advice_given integer DEFAULT 0,
    successful_financial_advice integer DEFAULT 0,
    spirals_prevented integer DEFAULT 0,
    financial_conflicts_resolved integer DEFAULT 0
);


--
-- Name: coach_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_skills (
    id text NOT NULL,
    user_id text NOT NULL,
    skill_tree text NOT NULL,
    skill_name text NOT NULL,
    skill_level integer DEFAULT 1,
    unlocked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coach_skills_skill_tree_check CHECK ((skill_tree = ANY (ARRAY['psychology_mastery'::text, 'battle_strategy'::text, 'character_development'::text])))
);


--
-- Name: coach_xp_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_xp_events (
    id text NOT NULL,
    user_id text NOT NULL,
    event_type text NOT NULL,
    event_subtype text,
    xp_gained integer NOT NULL,
    description text,
    battle_id text,
    character_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coach_xp_events_event_type_check CHECK ((event_type = ANY (ARRAY['battle_win'::text, 'battle_loss'::text, 'psychology_management'::text, 'character_development'::text, 'financial_coaching'::text])))
);


--
-- Name: comedian_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comedian_styles (
    id integer NOT NULL,
    category character varying(20) NOT NULL,
    comedian_name character varying(100),
    birth_year integer,
    death_year integer,
    era character varying(50),
    comedy_style text NOT NULL,
    example_material text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comedian_name_required CHECK ((comedian_name IS NOT NULL)),
    CONSTRAINT comedian_styles_category_check CHECK (((category)::text = ANY ((ARRAY['public_domain'::character varying, 'inspired'::character varying])::text[])))
);


--
-- Name: comedian_styles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comedian_styles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comedian_styles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comedian_styles_id_seq OWNED BY public.comedian_styles.id;


--
-- Name: cron_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_logs (
    id bigint NOT NULL,
    job_type text NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    duration_ms integer DEFAULT 0 NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    error_message text,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cron_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cron_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cron_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cron_logs_id_seq OWNED BY public.cron_logs.id;


--
-- Name: distributed_challenge_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distributed_challenge_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_result_id uuid,
    user_character_id text,
    reward_type character varying(50) NOT NULL,
    reward_config jsonb NOT NULL,
    currency_amount integer,
    equipment_id text,
    boost_effect jsonb,
    boost_expires_at timestamp with time zone,
    item_id uuid,
    claimed boolean DEFAULT false NOT NULL,
    claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT distributed_challenge_rewards_boost_effect_check CHECK ((jsonb_typeof(boost_effect) = 'object'::text)),
    CONSTRAINT distributed_challenge_rewards_currency_amount_check CHECK ((currency_amount >= 0)),
    CONSTRAINT distributed_challenge_rewards_reward_config_check CHECK ((jsonb_typeof(reward_config) = 'object'::text))
);


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    restriction_type text NOT NULL,
    restriction_value text,
    slot text NOT NULL,
    equipment_type text,
    rarity text NOT NULL,
    required_level integer DEFAULT 1,
    stats text DEFAULT '{}'::text NOT NULL,
    effects text DEFAULT '[]'::text NOT NULL,
    prompt_addition text,
    icon text,
    is_starter_item boolean DEFAULT false,
    starter_for_character text,
    shop_price integer,
    pack_rarity text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text]))),
    CONSTRAINT equipment_restriction_type_check CHECK ((restriction_type = ANY (ARRAY['character'::text, 'class'::text, 'generic'::text])))
);


--
-- Name: financial_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_character_id text NOT NULL,
    decision_type text NOT NULL,
    amount_cents integer NOT NULL,
    payment_method text,
    wallet_delta_cents integer DEFAULT 0,
    debt_delta_cents integer DEFAULT 0,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_method_check CHECK (((payment_method = ANY (ARRAY['cash'::text, 'debt'::text])) OR (payment_method IS NULL)))
);


--
-- Name: game_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_events (
    id character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    source character varying(100) NOT NULL,
    primary_character_id character varying(255) NOT NULL,
    secondary_character_ids text[],
    severity character varying(20) DEFAULT 'medium'::character varying,
    category character varying(50) NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    importance integer DEFAULT 5,
    "timestamp" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: headquarters_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.headquarters_rooms (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    headquarters_id text NOT NULL,
    room_id text NOT NULL,
    room_type text NOT NULL,
    capacity integer DEFAULT 2,
    occupied_slots integer DEFAULT 0,
    theme text DEFAULT 'default'::text,
    furniture jsonb DEFAULT '[]'::jsonb,
    position_x integer DEFAULT 0,
    position_y integer DEFAULT 0,
    width integer DEFAULT 1,
    height integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT headquarters_rooms_capacity_check CHECK ((capacity > 0)),
    CONSTRAINT headquarters_rooms_height_check CHECK (((height > 0) AND (height <= 10))),
    CONSTRAINT headquarters_rooms_occupied_slots_check CHECK ((occupied_slots >= 0)),
    CONSTRAINT headquarters_rooms_room_type_check CHECK ((room_type = ANY (ARRAY['bedroom'::text, 'kitchen'::text, 'training_room'::text, 'lounge'::text, 'office'::text, 'storage'::text, 'medical_bay'::text, 'trophy_room'::text, 'library'::text, 'workshop'::text]))),
    CONSTRAINT headquarters_rooms_width_check CHECK (((width > 0) AND (width <= 10))),
    CONSTRAINT valid_occupancy CHECK ((occupied_slots <= capacity)),
    CONSTRAINT valid_room_size CHECK (((width > 0) AND (height > 0) AND (width <= 10) AND (height <= 10)))
);


--
-- Name: healing_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.healing_facilities (
    id text NOT NULL,
    name text NOT NULL,
    facility_type text NOT NULL,
    healing_rate_multiplier numeric(3,2) DEFAULT 1.0,
    currency_cost_per_hour integer DEFAULT 0,
    premium_cost_per_hour integer DEFAULT 0,
    max_injury_severity text,
    headquarters_tier_required text,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT healing_facilities_facility_type_check CHECK ((facility_type = ANY (ARRAY['basic_medical'::text, 'advanced_medical'::text, 'premium_medical'::text, 'resurrection_chamber'::text]))),
    CONSTRAINT healing_facilities_max_injury_severity_check CHECK ((max_injury_severity = ANY (ARRAY['light'::text, 'moderate'::text, 'severe'::text, 'critical'::text, 'dead'::text])))
);


--
-- Name: internal_mail_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_mail_messages (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    recipient_user_id text NOT NULL,
    sender_user_id text,
    sender_username character varying(100),
    subject character varying(255) NOT NULL,
    content text NOT NULL,
    message_type character varying(20) NOT NULL,
    category character varying(20) NOT NULL,
    priority character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    sender_signature text,
    reply_to_mail_id text,
    has_attachment boolean DEFAULT false NOT NULL,
    attachment_data jsonb,
    attachment_claimed boolean DEFAULT false NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_mail_messages_category_check CHECK (((category)::text = ANY ((ARRAY['system'::character varying, 'notification'::character varying, 'reward'::character varying, 'achievement'::character varying, 'coach_message'::character varying, 'team'::character varying])::text[]))),
    CONSTRAINT internal_mail_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['coach_mail'::character varying, 'system_mail'::character varying])::text[]))),
    CONSTRAINT internal_mail_messages_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::text[])))
);


--
-- Name: inventory_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transfers (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    from_owner_type text NOT NULL,
    from_owner_id text NOT NULL,
    to_owner_type text NOT NULL,
    to_owner_id text NOT NULL,
    item_type text NOT NULL,
    item_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    transfer_reason text DEFAULT 'manual'::text,
    transferred_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    transferred_by text,
    CONSTRAINT inventory_transfers_from_owner_type_check CHECK ((from_owner_type = ANY (ARRAY['coach'::text, 'character'::text]))),
    CONSTRAINT inventory_transfers_item_type_check CHECK ((item_type = ANY (ARRAY['equipment'::text, 'item'::text]))),
    CONSTRAINT inventory_transfers_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT inventory_transfers_to_owner_type_check CHECK ((to_owner_type = ANY (ARRAY['coach'::text, 'character'::text])))
);


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    item_type text NOT NULL,
    sub_type text,
    rarity text NOT NULL,
    consumable boolean DEFAULT false,
    stackable boolean DEFAULT true,
    max_stack integer DEFAULT 99,
    effects text DEFAULT '[]'::text NOT NULL,
    usage_context text DEFAULT 'anytime'::text,
    cooldown_turns integer DEFAULT 0,
    shop_price integer,
    vendor_sell_price integer,
    icon text,
    flavor_text text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT items_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text]))),
    CONSTRAINT items_type_check CHECK ((item_type = ANY (ARRAY['consumable'::text, 'material'::text, 'utility'::text])))
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    item_type text NOT NULL,
    item_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    cost_coins integer DEFAULT 0,
    cost_battle_tokens integer DEFAULT 0,
    cost_premium_currency integer DEFAULT 0,
    transaction_status text DEFAULT 'completed'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    notes text,
    CONSTRAINT purchases_cost_battle_tokens_check CHECK ((cost_battle_tokens >= 0)),
    CONSTRAINT purchases_cost_coins_check CHECK ((cost_coins >= 0)),
    CONSTRAINT purchases_cost_premium_currency_check CHECK ((cost_premium_currency >= 0)),
    CONSTRAINT purchases_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT purchases_transaction_status_check CHECK ((transaction_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: scene_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_triggers (
    id integer NOT NULL,
    scene_type character varying(20),
    hq_tier character varying(50),
    trigger_text text NOT NULL,
    weight integer DEFAULT 1,
    domain character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scene_triggers_hq_tier_check CHECK (((hq_tier)::text = ANY ((ARRAY['spartan_apartment'::character varying, 'basic_house'::character varying, 'team_mansion'::character varying, 'elite_compound'::character varying])::text[]))),
    CONSTRAINT scene_triggers_scene_type_check CHECK (((scene_type)::text = ANY ((ARRAY['mundane'::character varying, 'conflict'::character varying, 'chaos'::character varying])::text[])))
);


--
-- Name: scene_triggers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scene_triggers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scene_triggers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scene_triggers_id_seq OWNED BY public.scene_triggers.id;


--
-- Name: session_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_state (
    sid text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    ts_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_chat_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_chat_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    speaker_character_id text NOT NULL,
    message text NOT NULL,
    message_type character varying(20) DEFAULT 'chat'::character varying,
    coach_triggered boolean DEFAULT false,
    topic character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_context (
    id integer NOT NULL,
    hq_tier character varying(50) DEFAULT 'basic_house'::character varying,
    current_scene_type character varying(20) DEFAULT 'mundane'::character varying,
    current_time_of_day character varying(20) DEFAULT 'afternoon'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    master_bed_character_id character varying(255),
    team_id uuid,
    active_teammates text[] DEFAULT '{}'::text[],
    CONSTRAINT team_context_current_scene_type_check CHECK (((current_scene_type)::text = ANY ((ARRAY['mundane'::character varying, 'conflict'::character varying, 'chaos'::character varying])::text[]))),
    CONSTRAINT team_context_current_time_of_day_check CHECK (((current_time_of_day)::text = ANY ((ARRAY['morning'::character varying, 'afternoon'::character varying, 'evening'::character varying, 'night'::character varying])::text[]))),
    CONSTRAINT team_context_hq_tier_check CHECK (((hq_tier)::text = ANY ((ARRAY['spartan_apartment'::character varying, 'basic_house'::character varying, 'team_mansion'::character varying, 'elite_compound'::character varying])::text[]))),
    CONSTRAINT team_context_scene_type_check CHECK (((current_scene_type)::text = ANY ((ARRAY['mundane'::character varying, 'conflict'::character varying, 'chaos'::character varying])::text[]))),
    CONSTRAINT team_context_time_of_day_check CHECK (((current_time_of_day)::text = ANY ((ARRAY['morning'::character varying, 'afternoon'::character varying, 'evening'::character varying, 'night'::character varying])::text[])))
);


--
-- Name: team_context_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_context_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_context_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_context_id_seq OWNED BY public.team_context.id;


--
-- Name: team_equipment_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_equipment_pool (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    equipment_id text NOT NULL,
    is_available boolean DEFAULT true,
    loaned_to_character_id text,
    loaned_at timestamp without time zone,
    acquired_from text DEFAULT 'coach_purchase'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_equipment_shared; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_equipment_shared (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    equipment_id text NOT NULL,
    currently_held_by text,
    last_transferred_at timestamp without time zone,
    transfer_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    event_description text NOT NULL,
    impact_on_chemistry integer DEFAULT 0,
    characters_involved text[] NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    chemistry_score integer DEFAULT 50,
    total_battles integer DEFAULT 0,
    total_victories integer DEFAULT 0,
    conflicts_resolved integer DEFAULT 0,
    conflicts_unresolved integer DEFAULT 0,
    shared_activities integer DEFAULT 0,
    relationship_bonuses jsonb DEFAULT '{}'::jsonb,
    relationship_penalties jsonb DEFAULT '{}'::jsonb,
    last_activity_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_relationships_chemistry_score_check CHECK (((chemistry_score >= 0) AND (chemistry_score <= 100)))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    team_name character varying(100),
    character_slot_1 text,
    character_slot_2 text,
    character_slot_3 text,
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ticket_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_transactions (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    transaction_type character varying(20) NOT NULL,
    amount integer NOT NULL,
    source character varying(50) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ticket_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['earned'::character varying, 'purchased'::character varying, 'spent'::character varying, 'daily_reset'::character varying, 'hourly_refresh'::character varying])::text[])))
);


--
-- Name: user_character_echoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_character_echoes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id text NOT NULL,
    character_template_id character varying(50) NOT NULL,
    echo_count integer DEFAULT 0,
    total_echoes_ever integer DEFAULT 0,
    last_conversion_at timestamp without time zone,
    total_converted_to_currency integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_character_echoes_echo_count_check CHECK ((echo_count >= 0))
);


--
-- Name: user_characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_characters (
    id text NOT NULL,
    user_id text NOT NULL,
    character_id text NOT NULL,
    serial_number text,
    nickname text,
    level integer DEFAULT 1,
    experience integer DEFAULT 0,
    bond_level integer DEFAULT 0,
    total_battles integer DEFAULT 0,
    total_wins integer DEFAULT 0,
    current_health integer NOT NULL,
    max_health integer NOT NULL,
    is_injured boolean DEFAULT false,
    recovery_time timestamp without time zone,
    equipment text DEFAULT '[]'::text,
    enhancements text DEFAULT '[]'::text,
    conversation_memory text DEFAULT '[]'::text,
    significant_memories text DEFAULT '[]'::text,
    personality_drift text DEFAULT '{}'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_battle_at timestamp without time zone,
    wallet integer DEFAULT 0,
    financial_stress integer DEFAULT 0,
    coach_trust_level integer DEFAULT 0,
    is_dead boolean DEFAULT false,
    death_timestamp timestamp without time zone,
    resurrection_available_at timestamp without time zone,
    death_count integer DEFAULT 0,
    pre_death_level integer,
    pre_death_experience integer,
    current_attack integer DEFAULT 50,
    current_defense integer DEFAULT 50,
    current_speed integer DEFAULT 50,
    current_special integer DEFAULT 50,
    current_max_health integer DEFAULT 100,
    current_training integer DEFAULT 75,
    current_team_player integer DEFAULT 70,
    current_ego integer DEFAULT 60,
    current_mental_health integer DEFAULT 85,
    current_communication integer DEFAULT 80,
    stress_level integer DEFAULT 0,
    fatigue_level integer DEFAULT 0,
    morale integer DEFAULT 80,
    starter_gear_given boolean DEFAULT false,
    level_bonus_attack integer DEFAULT 0,
    level_bonus_defense integer DEFAULT 0,
    level_bonus_speed integer DEFAULT 0,
    level_bonus_max_health integer DEFAULT 0,
    level_bonus_special integer DEFAULT 0,
    equipment_budget integer DEFAULT 0,
    consumables_budget integer DEFAULT 0,
    financial_personality jsonb,
    wallet_cents integer DEFAULT 0 NOT NULL,
    debt_principal_cents integer DEFAULT 0 NOT NULL,
    monthly_earnings_cents integer DEFAULT 0 NOT NULL,
    recent_decisions jsonb DEFAULT '[]'::jsonb,
    monthly_earnings integer DEFAULT 0,
    debt integer DEFAULT 0,
    sleeping_arrangement character varying(50) DEFAULT 'bunk_bed'::character varying,
    headquarters_id uuid,
    CONSTRAINT consumables_budget_positive CHECK ((consumables_budget >= 0)),
    CONSTRAINT equipment_budget_positive CHECK ((equipment_budget >= 0)),
    CONSTRAINT user_characters_coach_trust_check CHECK ((coach_trust_level >= 0)),
    CONSTRAINT user_characters_current_communication_check CHECK (((current_communication >= 0) AND (current_communication <= 100))),
    CONSTRAINT user_characters_current_ego_check CHECK (((current_ego >= 0) AND (current_ego <= 100))),
    CONSTRAINT user_characters_current_mental_health_check CHECK (((current_mental_health >= 0) AND (current_mental_health <= 100))),
    CONSTRAINT user_characters_current_team_player_check CHECK (((current_team_player >= 0) AND (current_team_player <= 100))),
    CONSTRAINT user_characters_current_training_check CHECK (((current_training >= 0) AND (current_training <= 100))),
    CONSTRAINT user_characters_fatigue_level_check CHECK (((fatigue_level >= 0) AND (fatigue_level <= 100))),
    CONSTRAINT user_characters_financial_stress_check CHECK ((financial_stress >= 0)),
    CONSTRAINT user_characters_level_bonus_attack_check CHECK ((level_bonus_attack >= 0)),
    CONSTRAINT user_characters_level_bonus_defense_check CHECK ((level_bonus_defense >= 0)),
    CONSTRAINT user_characters_level_bonus_max_health_check CHECK ((level_bonus_max_health >= 0)),
    CONSTRAINT user_characters_level_bonus_special_check CHECK ((level_bonus_special >= 0)),
    CONSTRAINT user_characters_level_bonus_speed_check CHECK ((level_bonus_speed >= 0)),
    CONSTRAINT user_characters_morale_check CHECK (((morale >= 0) AND (morale <= 100))),
    CONSTRAINT user_characters_resurrection_check CHECK (((resurrection_available_at IS NULL) OR (is_dead = true))),
    CONSTRAINT user_characters_stress_level_check CHECK (((stress_level >= 0) AND (stress_level <= 100))),
    CONSTRAINT user_characters_wallet_check CHECK ((wallet >= 0))
);


--
-- Name: user_currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_currency (
    user_id text NOT NULL,
    battle_tokens integer DEFAULT 100,
    premium_currency integer DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    coins integer DEFAULT 1000,
    CONSTRAINT user_currency_coins_check CHECK ((coins >= 0))
);


--
-- Name: user_daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_stats (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    daily_turn_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_daily_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_daily_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_daily_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_daily_stats_id_seq OWNED BY public.user_daily_stats.id;


--
-- Name: user_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_equipment (
    id text NOT NULL,
    user_id text NOT NULL,
    equipment_id text NOT NULL,
    is_equipped boolean DEFAULT false,
    equipped_to_character_id text,
    current_level integer DEFAULT 1,
    enhancement_level integer DEFAULT 0,
    custom_stats text DEFAULT '{}'::text,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acquired_from text,
    purchase_price integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_headquarters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_headquarters (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    tier_id text DEFAULT 'spartan_apartment'::text,
    coins integer DEFAULT 50000,
    gems integer DEFAULT 100,
    unlocked_themes jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_primary boolean DEFAULT true,
    CONSTRAINT user_headquarters_coins_check CHECK ((coins >= 0)),
    CONSTRAINT user_headquarters_gems_check CHECK ((gems >= 0)),
    CONSTRAINT user_headquarters_tier_id_check CHECK ((tier_id = ANY (ARRAY['spartan_apartment'::text, 'luxury_suite'::text, 'team_compound'::text, 'fortress_headquarters'::text])))
);


--
-- Name: user_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    item_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    acquired_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acquired_from text DEFAULT 'shop'::text,
    character_id text,
    CONSTRAINT user_items_quantity_check CHECK ((quantity >= 0))
);


--
-- Name: user_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tickets (
    user_id text NOT NULL,
    current_tickets integer DEFAULT 18,
    last_hourly_refresh timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_daily_reset date DEFAULT CURRENT_DATE,
    total_earned integer DEFAULT 0,
    total_purchased integer DEFAULT 0,
    total_spent integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_tickets_current_tickets_check CHECK ((current_tickets >= 0)),
    CONSTRAINT user_tickets_total_earned_check CHECK ((total_earned >= 0)),
    CONSTRAINT user_tickets_total_purchased_check CHECK ((total_purchased >= 0)),
    CONSTRAINT user_tickets_total_spent_check CHECK ((total_spent >= 0))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text,
    subscription_tier text DEFAULT 'free'::text,
    subscription_expires_at timestamp without time zone,
    level integer DEFAULT 1,
    experience integer DEFAULT 0,
    total_battles integer DEFAULT 0,
    total_wins integer DEFAULT 0,
    rating integer DEFAULT 1000,
    daily_chat_count integer DEFAULT 0,
    daily_chat_reset_date text DEFAULT ''::text,
    daily_image_count integer DEFAULT 0,
    daily_image_reset_date text DEFAULT ''::text,
    daily_battle_count integer DEFAULT 0,
    daily_battle_reset_date text DEFAULT ''::text,
    daily_training_count integer DEFAULT 0,
    daily_training_reset_date text DEFAULT ''::text,
    character_slot_capacity integer DEFAULT 6,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    coins integer DEFAULT 0 NOT NULL,
    lifetime_turn_count integer DEFAULT 0,
    timezone character varying(100) DEFAULT 'America/New_York'::character varying,
    CONSTRAINT users_rating_check CHECK ((rating >= 0)),
    CONSTRAINT users_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'legendary'::text])))
);


--
-- Name: character_living_context id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_living_context ALTER COLUMN id SET DEFAULT nextval('public.character_living_context_id_seq'::regclass);


--
-- Name: chat_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.chat_sessions_id_seq'::regclass);


--
-- Name: comedian_styles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comedian_styles ALTER COLUMN id SET DEFAULT nextval('public.comedian_styles_id_seq'::regclass);


--
-- Name: cron_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_logs ALTER COLUMN id SET DEFAULT nextval('public.cron_logs_id_seq'::regclass);


--
-- Name: scene_triggers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_triggers ALTER COLUMN id SET DEFAULT nextval('public.scene_triggers_id_seq'::regclass);


--
-- Name: team_context id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_context ALTER COLUMN id SET DEFAULT nextval('public.team_context_id_seq'::regclass);


--
-- Name: user_daily_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_stats ALTER COLUMN id SET DEFAULT nextval('public.user_daily_stats_id_seq'::regclass);


--
-- Name: active_challenges active_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_challenges
    ADD CONSTRAINT active_challenges_pkey PRIMARY KEY (id);


--
-- Name: battles battles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_pkey PRIMARY KEY (id);


--
-- Name: card_packs card_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_packs
    ADD CONSTRAINT card_packs_pkey PRIMARY KEY (id);


--
-- Name: challenge_alliances challenge_alliances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_alliances
    ADD CONSTRAINT challenge_alliances_pkey PRIMARY KEY (id);


--
-- Name: challenge_leaderboard challenge_leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_leaderboard
    ADD CONSTRAINT challenge_leaderboard_pkey PRIMARY KEY (id);


--
-- Name: challenge_leaderboard challenge_leaderboard_user_character_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_leaderboard
    ADD CONSTRAINT challenge_leaderboard_user_character_id_key UNIQUE (user_character_id);


--
-- Name: challenge_participants challenge_participants_active_challenge_id_user_character_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_active_challenge_id_user_character_i_key UNIQUE (active_challenge_id, user_character_id);


--
-- Name: challenge_participants challenge_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_pkey PRIMARY KEY (id);


--
-- Name: challenge_results challenge_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_pkey PRIMARY KEY (id);


--
-- Name: challenge_rewards challenge_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_rewards
    ADD CONSTRAINT challenge_rewards_pkey PRIMARY KEY (id);


--
-- Name: challenge_templates challenge_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_templates
    ADD CONSTRAINT challenge_templates_pkey PRIMARY KEY (id);


--
-- Name: character_abilities character_abilities_character_id_ability_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_abilities
    ADD CONSTRAINT character_abilities_character_id_ability_id_key UNIQUE (character_id, ability_id);


--
-- Name: character_abilities character_abilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_abilities
    ADD CONSTRAINT character_abilities_pkey PRIMARY KEY (id);


--
-- Name: character_equipment character_equipment_character_id_equipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_equipment
    ADD CONSTRAINT character_equipment_character_id_equipment_id_key UNIQUE (character_id, equipment_id);


--
-- Name: character_equipment character_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_equipment
    ADD CONSTRAINT character_equipment_pkey PRIMARY KEY (id);


--
-- Name: character_experience_log character_experience_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_experience_log
    ADD CONSTRAINT character_experience_log_pkey PRIMARY KEY (id);


--
-- Name: character_healing_sessions character_healing_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_healing_sessions
    ADD CONSTRAINT character_healing_sessions_pkey PRIMARY KEY (id);


--
-- Name: character_items character_items_character_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_items
    ADD CONSTRAINT character_items_character_id_item_id_key UNIQUE (character_id, item_id);


--
-- Name: character_items character_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_items
    ADD CONSTRAINT character_items_pkey PRIMARY KEY (id);


--
-- Name: character_living_context character_living_context_character_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_living_context
    ADD CONSTRAINT character_living_context_character_id_team_id_key UNIQUE (character_id, team_id);


--
-- Name: character_living_context character_living_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_living_context
    ADD CONSTRAINT character_living_context_pkey PRIMARY KEY (id);


--
-- Name: character_memories character_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_memories
    ADD CONSTRAINT character_memories_pkey PRIMARY KEY (id);


--
-- Name: character_progression character_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_progression
    ADD CONSTRAINT character_progression_pkey PRIMARY KEY (character_id);


--
-- Name: character_skills character_skills_character_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skills
    ADD CONSTRAINT character_skills_character_id_skill_id_key UNIQUE (character_id, skill_id);


--
-- Name: character_skills character_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skills
    ADD CONSTRAINT character_skills_pkey PRIMARY KEY (id);


--
-- Name: characters characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_chat_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_chat_id_unique UNIQUE (chat_id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_session_id_key UNIQUE (session_id);


--
-- Name: claimable_pack_contents claimable_pack_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claimable_pack_contents
    ADD CONSTRAINT claimable_pack_contents_pkey PRIMARY KEY (id);


--
-- Name: claimable_packs claimable_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claimable_packs
    ADD CONSTRAINT claimable_packs_pkey PRIMARY KEY (id);


--
-- Name: coach_progression coach_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_progression
    ADD CONSTRAINT coach_progression_pkey PRIMARY KEY (user_id);


--
-- Name: coach_skills coach_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_skills
    ADD CONSTRAINT coach_skills_pkey PRIMARY KEY (id);


--
-- Name: coach_xp_events coach_xp_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_xp_events
    ADD CONSTRAINT coach_xp_events_pkey PRIMARY KEY (id);


--
-- Name: comedian_styles comedian_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comedian_styles
    ADD CONSTRAINT comedian_styles_pkey PRIMARY KEY (id);


--
-- Name: cron_logs cron_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_logs
    ADD CONSTRAINT cron_logs_pkey PRIMARY KEY (id);


--
-- Name: distributed_challenge_rewards distributed_challenge_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributed_challenge_rewards
    ADD CONSTRAINT distributed_challenge_rewards_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: financial_decisions financial_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_decisions
    ADD CONSTRAINT financial_decisions_pkey PRIMARY KEY (id);


--
-- Name: game_events game_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_events
    ADD CONSTRAINT game_events_pkey PRIMARY KEY (id);


--
-- Name: headquarters_rooms headquarters_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headquarters_rooms
    ADD CONSTRAINT headquarters_rooms_pkey PRIMARY KEY (id);


--
-- Name: healing_facilities healing_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healing_facilities
    ADD CONSTRAINT healing_facilities_pkey PRIMARY KEY (id);


--
-- Name: internal_mail_messages internal_mail_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_mail_messages
    ADD CONSTRAINT internal_mail_messages_pkey PRIMARY KEY (id);


--
-- Name: inventory_transfers inventory_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: scene_triggers scene_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_triggers
    ADD CONSTRAINT scene_triggers_pkey PRIMARY KEY (id);


--
-- Name: session_state session_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_state
    ADD CONSTRAINT session_state_pkey PRIMARY KEY (sid);


--
-- Name: team_chat_logs team_chat_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat_logs
    ADD CONSTRAINT team_chat_logs_pkey PRIMARY KEY (id);


--
-- Name: team_context team_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_context
    ADD CONSTRAINT team_context_pkey PRIMARY KEY (id);


--
-- Name: team_context team_context_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_context
    ADD CONSTRAINT team_context_team_id_key UNIQUE (team_id);


--
-- Name: team_equipment_pool team_equipment_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_pool
    ADD CONSTRAINT team_equipment_pool_pkey PRIMARY KEY (id);


--
-- Name: team_equipment_pool team_equipment_pool_user_id_equipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_pool
    ADD CONSTRAINT team_equipment_pool_user_id_equipment_id_key UNIQUE (user_id, equipment_id);


--
-- Name: team_equipment_shared team_equipment_shared_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_shared
    ADD CONSTRAINT team_equipment_shared_pkey PRIMARY KEY (id);


--
-- Name: team_events team_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_events
    ADD CONSTRAINT team_events_pkey PRIMARY KEY (id);


--
-- Name: team_relationships team_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_relationships
    ADD CONSTRAINT team_relationships_pkey PRIMARY KEY (id);


--
-- Name: team_relationships team_relationships_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_relationships
    ADD CONSTRAINT team_relationships_team_id_key UNIQUE (team_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: ticket_transactions ticket_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_transactions
    ADD CONSTRAINT ticket_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_character_echoes user_character_echoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_character_echoes
    ADD CONSTRAINT user_character_echoes_pkey PRIMARY KEY (id);


--
-- Name: user_character_echoes user_character_echoes_user_id_character_template_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_character_echoes
    ADD CONSTRAINT user_character_echoes_user_id_character_template_id_key UNIQUE (user_id, character_template_id);


--
-- Name: user_characters user_characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_pkey PRIMARY KEY (id);


--
-- Name: user_characters user_characters_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_serial_number_key UNIQUE (serial_number);


--
-- Name: user_currency user_currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT user_currency_pkey PRIMARY KEY (user_id);


--
-- Name: user_daily_stats user_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_stats
    ADD CONSTRAINT user_daily_stats_pkey PRIMARY KEY (id);


--
-- Name: user_daily_stats user_daily_stats_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_stats
    ADD CONSTRAINT user_daily_stats_user_id_date_key UNIQUE (user_id, date);


--
-- Name: user_equipment user_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_pkey PRIMARY KEY (id);


--
-- Name: user_headquarters user_headquarters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_headquarters
    ADD CONSTRAINT user_headquarters_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_item_id_key UNIQUE (user_id, item_id);


--
-- Name: user_tickets user_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tickets
    ADD CONSTRAINT user_tickets_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_active_challenges_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_challenges_status ON public.active_challenges USING btree (status);


--
-- Name: idx_active_challenges_timing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_challenges_timing ON public.active_challenges USING btree (start_time, end_time);


--
-- Name: idx_active_challenges_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_challenges_user ON public.active_challenges USING btree (user_id);


--
-- Name: idx_alliances_challenge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alliances_challenge ON public.challenge_alliances USING btree (active_challenge_id);


--
-- Name: idx_alliances_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alliances_leader ON public.challenge_alliances USING btree (leader_character_id);


--
-- Name: idx_battles_player1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battles_player1 ON public.battles USING btree (player1_id);


--
-- Name: idx_battles_player2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battles_player2 ON public.battles USING btree (player2_id);


--
-- Name: idx_battles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battles_status ON public.battles USING btree (status);


--
-- Name: idx_challenge_participants_challenge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants USING btree (active_challenge_id);


--
-- Name: idx_challenge_participants_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_participants_character ON public.challenge_participants USING btree (user_character_id);


--
-- Name: idx_challenge_participants_placement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_participants_placement ON public.challenge_participants USING btree (active_challenge_id, placement);


--
-- Name: idx_challenge_results_completion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_results_completion ON public.challenge_results USING btree (completed_at);


--
-- Name: idx_challenge_results_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_results_template ON public.challenge_results USING btree (challenge_template_id);


--
-- Name: idx_challenge_results_winner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_results_winner ON public.challenge_results USING btree (winner_character_id);


--
-- Name: idx_challenge_rewards_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_rewards_template ON public.challenge_rewards USING btree (challenge_template_id);


--
-- Name: idx_challenge_rewards_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_rewards_type ON public.challenge_rewards USING btree (reward_type);


--
-- Name: idx_challenge_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_templates_active ON public.challenge_templates USING btree (is_active);


--
-- Name: idx_challenge_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_templates_type ON public.challenge_templates USING btree (challenge_type);


--
-- Name: idx_character_abilities_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_abilities_character_id ON public.character_abilities USING btree (character_id);


--
-- Name: idx_character_equipment_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_equipment_character ON public.character_equipment USING btree (character_id);


--
-- Name: idx_character_equipment_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_equipment_equipment ON public.character_equipment USING btree (equipment_id);


--
-- Name: idx_character_equipment_equipped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_equipment_equipped ON public.character_equipment USING btree (is_equipped);


--
-- Name: idx_character_experience_log_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_experience_log_character_id ON public.character_experience_log USING btree (character_id);


--
-- Name: idx_character_experience_log_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_experience_log_timestamp ON public.character_experience_log USING btree ("timestamp" DESC);


--
-- Name: idx_character_items_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_items_character ON public.character_items USING btree (character_id);


--
-- Name: idx_character_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_items_item ON public.character_items USING btree (item_id);


--
-- Name: idx_character_living_context_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_living_context_character_id ON public.character_living_context USING btree (character_id);


--
-- Name: idx_character_living_context_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_living_context_team_id ON public.character_living_context USING btree (team_id);


--
-- Name: idx_character_memories_char_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_memories_char_id ON public.character_memories USING btree (character_id);


--
-- Name: idx_character_memories_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_memories_created_at ON public.character_memories USING btree (created_at);


--
-- Name: idx_character_memories_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_memories_event_id ON public.character_memories USING btree (event_id);


--
-- Name: idx_character_memories_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_memories_importance ON public.character_memories USING btree (importance);


--
-- Name: idx_character_skills_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_skills_character_id ON public.character_skills USING btree (character_id);


--
-- Name: idx_characters_origin_era; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_origin_era ON public.characters USING btree (origin_era);


--
-- Name: idx_characters_psychstats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_psychstats ON public.characters USING btree (training, team_player, ego, mental_health, communication);


--
-- Name: idx_chat_messages_battle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_battle ON public.chat_messages USING btree (battle_id);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_user_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_user_character ON public.chat_messages USING btree (user_id, character_id);


--
-- Name: idx_claimable_packs_claimed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claimable_packs_claimed_by ON public.claimable_packs USING btree (claimed_by_user_id);


--
-- Name: idx_claimable_packs_pack_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claimable_packs_pack_type ON public.claimable_packs USING btree (pack_type);


--
-- Name: idx_coach_progression_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_progression_level ON public.coach_progression USING btree (coach_level);


--
-- Name: idx_coach_progression_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_progression_user_id ON public.coach_progression USING btree (user_id);


--
-- Name: idx_coach_skills_tree; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_skills_tree ON public.coach_skills USING btree (skill_tree);


--
-- Name: idx_coach_skills_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_skills_user_id ON public.coach_skills USING btree (user_id);


--
-- Name: idx_coach_xp_events_battle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_xp_events_battle ON public.coach_xp_events USING btree (battle_id);


--
-- Name: idx_coach_xp_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_xp_events_type ON public.coach_xp_events USING btree (event_type);


--
-- Name: idx_coach_xp_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_xp_events_user_id ON public.coach_xp_events USING btree (user_id);


--
-- Name: idx_comedian_styles_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comedian_styles_category ON public.comedian_styles USING btree (category);


--
-- Name: idx_comedian_styles_era; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comedian_styles_era ON public.comedian_styles USING btree (era);


--
-- Name: idx_cron_logs_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_logs_executed_at ON public.cron_logs USING btree (executed_at DESC);


--
-- Name: idx_cron_logs_job_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_logs_job_type ON public.cron_logs USING btree (job_type);


--
-- Name: idx_distributed_rewards_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distributed_rewards_character ON public.distributed_challenge_rewards USING btree (user_character_id);


--
-- Name: idx_distributed_rewards_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distributed_rewards_result ON public.distributed_challenge_rewards USING btree (challenge_result_id);


--
-- Name: idx_distributed_rewards_unclaimed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distributed_rewards_unclaimed ON public.distributed_challenge_rewards USING btree (claimed) WHERE (claimed = false);


--
-- Name: idx_equipment_rarity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_rarity ON public.equipment USING btree (rarity);


--
-- Name: idx_equipment_restriction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_restriction ON public.equipment USING btree (restriction_type, restriction_value);


--
-- Name: idx_equipment_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_shop ON public.equipment USING btree (shop_price) WHERE (shop_price IS NOT NULL);


--
-- Name: idx_equipment_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_slot ON public.equipment USING btree (slot);


--
-- Name: idx_equipment_starter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_starter ON public.equipment USING btree (is_starter_item, starter_for_character) WHERE (is_starter_item = true);


--
-- Name: idx_financial_decisions_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_decisions_character ON public.financial_decisions USING btree (user_character_id, created_at DESC);


--
-- Name: idx_game_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_events_category ON public.game_events USING btree (category);


--
-- Name: idx_game_events_primary_char; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_events_primary_char ON public.game_events USING btree (primary_character_id);


--
-- Name: idx_game_events_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_events_timestamp ON public.game_events USING btree ("timestamp");


--
-- Name: idx_game_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_events_type ON public.game_events USING btree (type);


--
-- Name: idx_headquarters_rooms_headquarters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_headquarters_rooms_headquarters ON public.headquarters_rooms USING btree (headquarters_id);


--
-- Name: idx_headquarters_rooms_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_headquarters_rooms_type ON public.headquarters_rooms USING btree (room_type);


--
-- Name: idx_healing_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_healing_sessions_active ON public.character_healing_sessions USING btree (is_active);


--
-- Name: idx_healing_sessions_completion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_healing_sessions_completion ON public.character_healing_sessions USING btree (estimated_completion_time);


--
-- Name: idx_internal_mail_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_category ON public.internal_mail_messages USING btree (category);


--
-- Name: idx_internal_mail_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_created_at ON public.internal_mail_messages USING btree (created_at);


--
-- Name: idx_internal_mail_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_is_deleted ON public.internal_mail_messages USING btree (is_deleted);


--
-- Name: idx_internal_mail_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_is_read ON public.internal_mail_messages USING btree (is_read);


--
-- Name: idx_internal_mail_message_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_message_type ON public.internal_mail_messages USING btree (message_type);


--
-- Name: idx_internal_mail_recipient_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_recipient_user_id ON public.internal_mail_messages USING btree (recipient_user_id);


--
-- Name: idx_internal_mail_sender_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_sender_user_id ON public.internal_mail_messages USING btree (sender_user_id);


--
-- Name: idx_internal_mail_user_read_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_mail_user_read_deleted ON public.internal_mail_messages USING btree (recipient_user_id, is_read, is_deleted);


--
-- Name: idx_items_rarity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_rarity ON public.items USING btree (rarity);


--
-- Name: idx_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_shop ON public.items USING btree (shop_price) WHERE (shop_price IS NOT NULL);


--
-- Name: idx_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_type ON public.items USING btree (item_type, sub_type);


--
-- Name: idx_leaderboard_elo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_elo ON public.challenge_leaderboard USING btree (elo_rating DESC);


--
-- Name: idx_leaderboard_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_rank ON public.challenge_leaderboard USING btree (overall_rank);


--
-- Name: idx_one_active_team_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_active_team_per_user ON public.teams USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_one_primary_hq_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_primary_hq_per_user ON public.user_headquarters USING btree (user_id) WHERE (is_primary = true);


--
-- Name: idx_purchases_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_created ON public.purchases USING btree (created_at);


--
-- Name: idx_purchases_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_item ON public.purchases USING btree (item_type, item_id);


--
-- Name: idx_purchases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_status ON public.purchases USING btree (transaction_status);


--
-- Name: idx_purchases_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_user ON public.purchases USING btree (user_id);


--
-- Name: idx_scene_triggers_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_triggers_domain ON public.scene_triggers USING btree (domain);


--
-- Name: idx_scene_triggers_hq_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_triggers_hq_tier ON public.scene_triggers USING btree (hq_tier);


--
-- Name: idx_scene_triggers_scene_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_triggers_scene_type ON public.scene_triggers USING btree (scene_type);


--
-- Name: idx_session_state_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_state_ts ON public.session_state USING btree (ts_updated DESC);


--
-- Name: idx_team_chat_speaker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_speaker ON public.team_chat_logs USING btree (speaker_character_id);


--
-- Name: idx_team_chat_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_chat_team ON public.team_chat_logs USING btree (team_id, created_at DESC);


--
-- Name: idx_team_context_master_bed_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_context_master_bed_character ON public.team_context USING btree (master_bed_character_id);


--
-- Name: idx_team_context_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_context_team_id ON public.team_context USING btree (team_id);


--
-- Name: idx_team_equipment_holder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_holder ON public.team_equipment_shared USING btree (currently_held_by);


--
-- Name: idx_team_equipment_pool_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_pool_available ON public.team_equipment_pool USING btree (is_available);


--
-- Name: idx_team_equipment_pool_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_pool_equipment ON public.team_equipment_pool USING btree (equipment_id);


--
-- Name: idx_team_equipment_pool_loaned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_pool_loaned_to ON public.team_equipment_pool USING btree (loaned_to_character_id);


--
-- Name: idx_team_equipment_pool_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_pool_user ON public.team_equipment_pool USING btree (user_id);


--
-- Name: idx_team_equipment_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_equipment_team ON public.team_equipment_shared USING btree (team_id);


--
-- Name: idx_team_events_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_events_team ON public.team_events USING btree (team_id, created_at DESC);


--
-- Name: idx_team_relationships_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_relationships_team ON public.team_relationships USING btree (team_id);


--
-- Name: idx_teams_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_active ON public.teams USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_teams_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_user_id ON public.teams USING btree (user_id);


--
-- Name: idx_ticket_transactions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_transactions_created ON public.ticket_transactions USING btree (created_at);


--
-- Name: idx_ticket_transactions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_transactions_source ON public.ticket_transactions USING btree (source);


--
-- Name: idx_ticket_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_transactions_type ON public.ticket_transactions USING btree (transaction_type);


--
-- Name: idx_ticket_transactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_transactions_user ON public.ticket_transactions USING btree (user_id);


--
-- Name: idx_ticket_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_transactions_user_created ON public.ticket_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_user_character_echoes_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_character_echoes_character ON public.user_character_echoes USING btree (character_template_id);


--
-- Name: idx_user_character_echoes_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_character_echoes_count ON public.user_character_echoes USING btree (echo_count);


--
-- Name: idx_user_character_echoes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_character_echoes_user ON public.user_character_echoes USING btree (user_id);


--
-- Name: idx_user_characters_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_character_id ON public.user_characters USING btree (character_id);


--
-- Name: idx_user_characters_hq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_hq ON public.user_characters USING btree (headquarters_id);


--
-- Name: idx_user_characters_is_dead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_is_dead ON public.user_characters USING btree (is_dead);


--
-- Name: idx_user_characters_level_bonuses; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_level_bonuses ON public.user_characters USING btree (level_bonus_attack, level_bonus_defense, level_bonus_speed, level_bonus_max_health);


--
-- Name: idx_user_characters_nickname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_nickname ON public.user_characters USING btree (nickname);


--
-- Name: idx_user_characters_psychstats; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_psychstats ON public.user_characters USING btree (current_mental_health, stress_level, fatigue_level, morale);


--
-- Name: idx_user_characters_resurrection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_resurrection ON public.user_characters USING btree (resurrection_available_at);


--
-- Name: idx_user_characters_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_serial ON public.user_characters USING btree (serial_number);


--
-- Name: idx_user_characters_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_characters_user_id ON public.user_characters USING btree (user_id);


--
-- Name: idx_user_currency_premium; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_currency_premium ON public.user_currency USING btree (premium_currency);


--
-- Name: idx_user_currency_tokens; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_currency_tokens ON public.user_currency USING btree (battle_tokens);


--
-- Name: idx_user_currency_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_currency_user_id ON public.user_currency USING btree (user_id);


--
-- Name: idx_user_equipment_character_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_equipment_character_slot ON public.user_equipment USING btree (equipped_to_character_id, is_equipped) WHERE (is_equipped = true);


--
-- Name: idx_user_equipment_equipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_equipment_equipment ON public.user_equipment USING btree (equipment_id);


--
-- Name: idx_user_equipment_equipped; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_equipment_equipped ON public.user_equipment USING btree (equipped_to_character_id) WHERE (equipped_to_character_id IS NOT NULL);


--
-- Name: idx_user_equipment_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_equipment_user ON public.user_equipment USING btree (user_id);


--
-- Name: idx_user_headquarters_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_headquarters_tier ON public.user_headquarters USING btree (tier_id);


--
-- Name: idx_user_headquarters_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_headquarters_user ON public.user_headquarters USING btree (user_id);


--
-- Name: idx_user_items_acquired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_items_acquired ON public.user_items USING btree (acquired_at);


--
-- Name: idx_user_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_items_item ON public.user_items USING btree (item_id);


--
-- Name: idx_user_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_items_user ON public.user_items USING btree (user_id);


--
-- Name: idx_user_tickets_refresh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tickets_refresh ON public.user_tickets USING btree (last_hourly_refresh);


--
-- Name: idx_user_tickets_reset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tickets_reset ON public.user_tickets USING btree (last_daily_reset);


--
-- Name: idx_user_tickets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tickets_user ON public.user_tickets USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_rating ON public.users USING btree (rating);


--
-- Name: idx_users_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_training ON public.users USING btree (daily_training_count, daily_training_reset_date);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: uniq_financial_decisions_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_financial_decisions_client_id ON public.financial_decisions USING btree (user_character_id, ((metadata ->> 'client_decision_id'::text))) WHERE (metadata ? 'client_decision_id'::text);


--
-- Name: challenge_results trigger_update_challenge_leaderboard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_challenge_leaderboard AFTER INSERT ON public.challenge_results FOR EACH ROW EXECUTE FUNCTION public.update_challenge_leaderboard();


--
-- Name: distributed_challenge_rewards trigger_update_leaderboard_rewards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_leaderboard_rewards AFTER INSERT ON public.distributed_challenge_rewards FOR EACH ROW EXECUTE FUNCTION public.update_leaderboard_rewards();


--
-- Name: internal_mail_messages update_internal_mail_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_internal_mail_updated_at BEFORE UPDATE ON public.internal_mail_messages FOR EACH ROW EXECUTE FUNCTION public.update_internal_mail_updated_at();


--
-- Name: active_challenges active_challenges_challenge_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_challenges
    ADD CONSTRAINT active_challenges_challenge_template_id_fkey FOREIGN KEY (challenge_template_id) REFERENCES public.challenge_templates(id) ON DELETE CASCADE;


--
-- Name: active_challenges active_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_challenges
    ADD CONSTRAINT active_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: battles battles_character1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_character1_id_fkey FOREIGN KEY (character1_id) REFERENCES public.user_characters(id);


--
-- Name: battles battles_character2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_character2_id_fkey FOREIGN KEY (character2_id) REFERENCES public.user_characters(id);


--
-- Name: battles battles_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.users(id);


--
-- Name: battles battles_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.users(id);


--
-- Name: battles battles_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id);


--
-- Name: challenge_alliances challenge_alliances_active_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_alliances
    ADD CONSTRAINT challenge_alliances_active_challenge_id_fkey FOREIGN KEY (active_challenge_id) REFERENCES public.active_challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_alliances challenge_alliances_leader_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_alliances
    ADD CONSTRAINT challenge_alliances_leader_character_id_fkey FOREIGN KEY (leader_character_id) REFERENCES public.user_characters(id);


--
-- Name: challenge_leaderboard challenge_leaderboard_user_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_leaderboard
    ADD CONSTRAINT challenge_leaderboard_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: challenge_participants challenge_participants_active_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_active_challenge_id_fkey FOREIGN KEY (active_challenge_id) REFERENCES public.active_challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_participants challenge_participants_user_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_participants
    ADD CONSTRAINT challenge_participants_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: challenge_results challenge_results_active_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_active_challenge_id_fkey FOREIGN KEY (active_challenge_id) REFERENCES public.active_challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_results challenge_results_challenge_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_challenge_template_id_fkey FOREIGN KEY (challenge_template_id) REFERENCES public.challenge_templates(id);


--
-- Name: challenge_results challenge_results_second_place_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_second_place_character_id_fkey FOREIGN KEY (second_place_character_id) REFERENCES public.user_characters(id);


--
-- Name: challenge_results challenge_results_third_place_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_third_place_character_id_fkey FOREIGN KEY (third_place_character_id) REFERENCES public.user_characters(id);


--
-- Name: challenge_results challenge_results_winner_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_results
    ADD CONSTRAINT challenge_results_winner_character_id_fkey FOREIGN KEY (winner_character_id) REFERENCES public.user_characters(id);


--
-- Name: challenge_rewards challenge_rewards_challenge_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_rewards
    ADD CONSTRAINT challenge_rewards_challenge_template_id_fkey FOREIGN KEY (challenge_template_id) REFERENCES public.challenge_templates(id) ON DELETE CASCADE;


--
-- Name: character_abilities character_abilities_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_abilities
    ADD CONSTRAINT character_abilities_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_equipment character_equipment_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_equipment
    ADD CONSTRAINT character_equipment_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_equipment character_equipment_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_equipment
    ADD CONSTRAINT character_equipment_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: character_experience_log character_experience_log_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_experience_log
    ADD CONSTRAINT character_experience_log_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_healing_sessions character_healing_sessions_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_healing_sessions
    ADD CONSTRAINT character_healing_sessions_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_healing_sessions character_healing_sessions_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_healing_sessions
    ADD CONSTRAINT character_healing_sessions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.healing_facilities(id);


--
-- Name: character_items character_items_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_items
    ADD CONSTRAINT character_items_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_items character_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_items
    ADD CONSTRAINT character_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: character_living_context character_living_context_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_living_context
    ADD CONSTRAINT character_living_context_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id);


--
-- Name: character_memories character_memories_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_memories
    ADD CONSTRAINT character_memories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.game_events(id);


--
-- Name: character_progression character_progression_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_progression
    ADD CONSTRAINT character_progression_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: character_skills character_skills_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skills
    ADD CONSTRAINT character_skills_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.battles(id);


--
-- Name: chat_messages chat_messages_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id);


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: claimable_pack_contents claimable_pack_contents_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claimable_pack_contents
    ADD CONSTRAINT claimable_pack_contents_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id);


--
-- Name: claimable_pack_contents claimable_pack_contents_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claimable_pack_contents
    ADD CONSTRAINT claimable_pack_contents_pack_id_fkey FOREIGN KEY (claimable_pack_id) REFERENCES public.claimable_packs(id) ON DELETE CASCADE;


--
-- Name: claimable_packs claimable_packs_claimed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claimable_packs
    ADD CONSTRAINT claimable_packs_claimed_by_user_id_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES public.users(id);


--
-- Name: coach_progression coach_progression_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_progression
    ADD CONSTRAINT coach_progression_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: coach_skills coach_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_skills
    ADD CONSTRAINT coach_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: coach_xp_events coach_xp_events_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_xp_events
    ADD CONSTRAINT coach_xp_events_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.battles(id);


--
-- Name: coach_xp_events coach_xp_events_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_xp_events
    ADD CONSTRAINT coach_xp_events_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.user_characters(id);


--
-- Name: coach_xp_events coach_xp_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_xp_events
    ADD CONSTRAINT coach_xp_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: distributed_challenge_rewards distributed_challenge_rewards_challenge_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributed_challenge_rewards
    ADD CONSTRAINT distributed_challenge_rewards_challenge_result_id_fkey FOREIGN KEY (challenge_result_id) REFERENCES public.challenge_results(id) ON DELETE CASCADE;


--
-- Name: distributed_challenge_rewards distributed_challenge_rewards_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributed_challenge_rewards
    ADD CONSTRAINT distributed_challenge_rewards_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;


--
-- Name: distributed_challenge_rewards distributed_challenge_rewards_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributed_challenge_rewards
    ADD CONSTRAINT distributed_challenge_rewards_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.user_items(id) ON DELETE SET NULL;


--
-- Name: distributed_challenge_rewards distributed_challenge_rewards_user_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributed_challenge_rewards
    ADD CONSTRAINT distributed_challenge_rewards_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: financial_decisions financial_decisions_user_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_decisions
    ADD CONSTRAINT financial_decisions_user_character_id_fkey FOREIGN KEY (user_character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: characters fk_comedian_style; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT fk_comedian_style FOREIGN KEY (comedian_style_id) REFERENCES public.comedian_styles(id) ON DELETE SET NULL;


--
-- Name: team_context fk_team_context_team; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_context
    ADD CONSTRAINT fk_team_context_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: headquarters_rooms headquarters_rooms_headquarters_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headquarters_rooms
    ADD CONSTRAINT headquarters_rooms_headquarters_id_fkey FOREIGN KEY (headquarters_id) REFERENCES public.user_headquarters(id) ON DELETE CASCADE;


--
-- Name: internal_mail_messages internal_mail_messages_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_mail_messages
    ADD CONSTRAINT internal_mail_messages_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: internal_mail_messages internal_mail_messages_reply_to_mail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_mail_messages
    ADD CONSTRAINT internal_mail_messages_reply_to_mail_id_fkey FOREIGN KEY (reply_to_mail_id) REFERENCES public.internal_mail_messages(id) ON DELETE SET NULL;


--
-- Name: internal_mail_messages internal_mail_messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_mail_messages
    ADD CONSTRAINT internal_mail_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchases purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_chat_logs team_chat_logs_speaker_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat_logs
    ADD CONSTRAINT team_chat_logs_speaker_character_id_fkey FOREIGN KEY (speaker_character_id) REFERENCES public.user_characters(id) ON DELETE CASCADE;


--
-- Name: team_chat_logs team_chat_logs_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_chat_logs
    ADD CONSTRAINT team_chat_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_context team_context_master_bed_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_context
    ADD CONSTRAINT team_context_master_bed_character_id_fkey FOREIGN KEY (master_bed_character_id) REFERENCES public.characters(id);


--
-- Name: team_equipment_pool team_equipment_pool_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_pool
    ADD CONSTRAINT team_equipment_pool_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: team_equipment_pool team_equipment_pool_loaned_to_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_pool
    ADD CONSTRAINT team_equipment_pool_loaned_to_character_id_fkey FOREIGN KEY (loaned_to_character_id) REFERENCES public.user_characters(id) ON DELETE SET NULL;


--
-- Name: team_equipment_shared team_equipment_shared_currently_held_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_shared
    ADD CONSTRAINT team_equipment_shared_currently_held_by_fkey FOREIGN KEY (currently_held_by) REFERENCES public.user_characters(id) ON DELETE SET NULL;


--
-- Name: team_equipment_shared team_equipment_shared_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_equipment_shared
    ADD CONSTRAINT team_equipment_shared_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_events team_events_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_events
    ADD CONSTRAINT team_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_relationships team_relationships_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_relationships
    ADD CONSTRAINT team_relationships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_character_slot_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_character_slot_1_fkey FOREIGN KEY (character_slot_1) REFERENCES public.user_characters(id) ON DELETE SET NULL;


--
-- Name: teams teams_character_slot_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_character_slot_2_fkey FOREIGN KEY (character_slot_2) REFERENCES public.user_characters(id) ON DELETE SET NULL;


--
-- Name: teams teams_character_slot_3_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_character_slot_3_fkey FOREIGN KEY (character_slot_3) REFERENCES public.user_characters(id) ON DELETE SET NULL;


--
-- Name: teams teams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ticket_transactions ticket_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_transactions
    ADD CONSTRAINT ticket_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_character_echoes user_character_echoes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_character_echoes
    ADD CONSTRAINT user_character_echoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_characters user_characters_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id);


--
-- Name: user_characters user_characters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_currency user_currency_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_currency
    ADD CONSTRAINT user_currency_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_equipment user_equipment_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: user_equipment user_equipment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_equipment
    ADD CONSTRAINT user_equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_headquarters user_headquarters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_headquarters
    ADD CONSTRAINT user_headquarters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tickets user_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tickets
    ADD CONSTRAINT user_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


-- =====================================================

-- Helper function for triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- LOCAL-ONLY DEVELOPMENT TABLES

-- Temporary backup table
CREATE TABLE public.tmp_user_characters_backup (
    id text,
    user_id text,
    character_id text,
    serial_number text,
    nickname text,
    level integer,
    experience integer,
    bond_level integer,
    total_battles integer,
    total_wins integer,
    current_health integer,
    max_health integer,
    is_injured boolean,
    injury_severity text,
    is_dead boolean,
    death_timestamp timestamp without time zone,
    recovery_time timestamp without time zone,
    resurrection_available_at timestamp without time zone,
    death_count integer,
    pre_death_level integer,
    pre_death_experience integer,
    equipment text,
    enhancements text,
    conversation_memory text,
    significant_memories text,
    personality_drift text,
    wallet integer,
    financial_stress integer,
    coach_trust_level integer,
    acquired_at timestamp without time zone,
    last_battle_at timestamp without time zone,
    gameplan_adherence_level integer,
    current_mental_health integer,
    stress_level integer,
    team_trust integer,
    battle_focus integer,
    current_training integer,
    current_team_player integer,
    current_ego integer,
    current_communication integer,
    fatigue_level integer,
    morale integer,
    starter_gear_given boolean,
    level_bonus_attack integer,
    level_bonus_defense integer,
    level_bonus_speed integer,
    level_bonus_max_health integer,
    level_bonus_special integer,
    agent_key character varying(50)
);

-- =====================================================

CREATE TABLE public.battle_queue (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    queue_type character varying(50) NOT NULL,
    preferred_strategy text,
    team_composition jsonb NOT NULL,
    min_opponent_level integer,
    max_opponent_level integer,
    estimated_wait_time integer,
    status character varying(20) DEFAULT 'waiting'::character varying,
    matched_battle_id text,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    matched_at timestamp without time zone,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '00:10:00'::interval)
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    session_id text NOT NULL,
    type text NOT NULL,
    actor text,
    target text,
    payload jsonb,
    ts timestamp with time zone DEFAULT now()
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facts (
    id bigint NOT NULL,
    session_id text NOT NULL,
    type text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT facts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'expired'::text])))
);


--
-- Name: facts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facts_id_seq OWNED BY public.facts.id;


--
-- Name: memory_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memory_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id text NOT NULL,
    session_id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: state_digest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_digest (
    session_id text NOT NULL,
    text text NOT NULL,
    version text NOT NULL,
    token_count integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: facts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facts ALTER COLUMN id SET DEFAULT nextval('public.facts_id_seq'::regclass);


--
-- Name: battle_queue battle_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_queue
    ADD CONSTRAINT battle_queue_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: facts facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facts
    ADD CONSTRAINT facts_pkey PRIMARY KEY (id);


--
-- Name: memory_entries memory_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memory_entries
    ADD CONSTRAINT memory_entries_pkey PRIMARY KEY (id);


--
-- Name: state_digest state_digest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_digest
    ADD CONSTRAINT state_digest_pkey PRIMARY KEY (session_id);


--
-- Name: idx_battle_queue_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_queue_expires ON public.battle_queue USING btree (expires_at);


--
-- Name: idx_battle_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_queue_status ON public.battle_queue USING btree (status);


--
-- Name: idx_battle_queue_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_queue_type ON public.battle_queue USING btree (queue_type);


--
-- Name: idx_battle_queue_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_battle_queue_user ON public.battle_queue USING btree (user_id);


--
-- Name: idx_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_session_id ON public.events USING btree (session_id);


--
-- Name: idx_events_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_ts ON public.events USING btree (ts);


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type ON public.events USING btree (type);


--
-- Name: idx_facts_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_expires_at ON public.facts USING btree (expires_at);


--
-- Name: idx_facts_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_session_id ON public.facts USING btree (session_id);


--
-- Name: idx_facts_session_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_facts_session_key ON public.facts USING btree (session_id, key) WHERE (status = 'active'::text);


--
-- Name: idx_facts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facts_status ON public.facts USING btree (status);


--
-- Name: idx_memory_entries_char_sess; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memory_entries_char_sess ON public.memory_entries USING btree (character_id, session_id);


--
-- Name: facts facts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER facts_updated_at BEFORE UPDATE ON public.facts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: state_digest state_digest_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER state_digest_updated_at BEFORE UPDATE ON public.state_digest FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: battle_queue battle_queue_matched_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_queue
    ADD CONSTRAINT battle_queue_matched_battle_id_fkey FOREIGN KEY (matched_battle_id) REFERENCES public.battles(id);


--
-- Name: battle_queue battle_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battle_queue
    ADD CONSTRAINT battle_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;



-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

INSERT INTO public.migration_log (version, name) VALUES (1, '001_baseline_schema');
INSERT INTO public.migration_meta (key, value) VALUES ('last_migration', '1');

COMMIT;
