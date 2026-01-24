-- Migration 280: Log previously unlogged migrations
--
-- These 48 migrations ran successfully but were never logged to migration_log.
-- This migration marks them as applied so they stop re-running on every deploy.
-- The individual migration files have been updated to include their own logging
-- for fresh database clones.

BEGIN;

-- Migrations 150-165
INSERT INTO migration_log (version, name) VALUES
(150, '150_create_character_category_preferences'),
(152, '152_create_graffiti_wall'),
(153, '153_create_clubhouse_group_chat'),
(154, '154_create_guild_system'),
(155, '155_add_win_streak_tracking'),
(156, '156_add_resource_points_system'),
(157, '157_create_community_events'),
(159, '159_create_battle_actions'),
(160, '160_add_progression_columns'),
(161, '161_create_mastery_config'),
(162, '162_create_mastery_triggers'),
(163, '163_auto_unlock_starters'),
(164, '164_seed_starter_flags'),
(165, '165_fix_mastery_trigger')
ON CONFLICT (version) DO NOTHING;

-- Migrations 171-179
INSERT INTO migration_log (version, name) VALUES
(171, '171_create_experience_levels'),
(172, '172_infinite_leveling_func'),
(173, '173_create_coach_experience_levels'),
(174, '174_coach_infinite_leveling_func'),
(175, '175_standardize_currency_names'),
(176, '176_add_is_starter_column'),
(179, '179_create_battle_participants')
ON CONFLICT (version) DO NOTHING;

-- Migrations 184-199
INSERT INTO migration_log (version, name) VALUES
(184, '184_populate_system_character_profiles'),
(185, '185_create_domain_context_table'),
(186, '186_populate_kitchen_table_domain_context'),
(187, '187_populate_argock_trainer_profile'),
(189, '189_populate_species_and_signature_modifier_tables'),
(190, '190_add_elemental_resistance_fields'),
(191, '191_fix_signature_modifiers_schema'),
(192, '192_populate_elemental_resistance_modifiers'),
(193, '193_remove_redundant_resistance_columns'),
(194, '194_create_get_full_character_data_function'),
(195, '195_rename_character_points_to_ability_points'),
(196, '196_add_preference_scoring_system'),
(199, '199_create_get_character_preferences_function')
ON CONFLICT (version) DO NOTHING;

-- Migrations 236-272
INSERT INTO migration_log (version, name) VALUES
(236, '236_fix_missing_columns'),
(247, '247_handle_null_generated_columns'),
(248, '248_fix_trigger_timing'),
(249, '249_prevent_infinite_loop'),
(250, '250_make_current_mood_nullable'),
(251, '251_add_rank_column'),
(252, '252_fix_auto_unlock_starters'),
(253, '253_fix_preference_fk'),
(254, '254_fix_corrupted_system_stats'),
(267, '267_enforce_wallet_debt_not_null'),
(269, '269_add_is_pve_to_battles'),
(270, '270_fix_adherence_calculation'),
(271, '271_populate_starter_loadouts'),
(272, '272_fix_modifier_trigger_uuid_type')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Log this migration
INSERT INTO migration_log (version, name)
VALUES (280, '280_log_previously_unlogged_migrations')
ON CONFLICT (version) DO NOTHING;
