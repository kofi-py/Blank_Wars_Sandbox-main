# Live Database Schema

> Generated: 2025-11-30T23:11:14.353Z
> Tables: 109

---

## Table of Contents

- [active_challenges](#active-challenges)
- [ai_characters](#ai-characters)
- [ai_coaches](#ai-coaches)
- [ai_teams](#ai-teams)
- [archetype_attribute_modifiers](#archetype-attribute-modifiers)
- [archetype_relationships](#archetype-relationships)
- [archetypes](#archetypes)
- [battle_queue](#battle-queue)
- [battles](#battles)
- [bond_activity_log](#bond-activity-log)
- [card_packs](#card-packs)
- [cardano_card_sets](#cardano-card-sets)
- [cardano_nft_metadata](#cardano-nft-metadata)
- [cardano_staking_positions](#cardano-staking-positions)
- [challenge_alliances](#challenge-alliances)
- [challenge_leaderboard](#challenge-leaderboard)
- [challenge_participants](#challenge-participants)
- [challenge_results](#challenge-results)
- [challenge_rewards](#challenge-rewards)
- [challenge_templates](#challenge-templates)
- [character_abilities](#character-abilities)
- [character_category_preferences](#character-category-preferences)
- [character_decisions](#character-decisions)
- [character_equipment](#character-equipment)
- [character_experience_log](#character-experience-log)
- [character_healing_sessions](#character-healing-sessions)
- [character_items](#character-items)
- [character_living_context](#character-living-context)
- [character_memories](#character-memories)
- [character_power_loadout](#character-power-loadout)
- [character_powers](#character-powers)
- [character_progression](#character-progression)
- [character_relationships](#character-relationships)
- [character_skills](#character-skills)
- [character_spell_loadout](#character-spell-loadout)
- [character_spells](#character-spells)
- [character_temporary_buffs](#character-temporary-buffs)
- [characters](#characters)
- [chat_messages](#chat-messages)
- [chat_sessions](#chat-sessions)
- [claimable_pack_contents](#claimable-pack-contents)
- [claimable_packs](#claimable-packs)
- [coach_progression](#coach-progression)
- [coach_skills](#coach-skills)
- [coach_xp_events](#coach-xp-events)
- [comedian_styles](#comedian-styles)
- [cron_logs](#cron-logs)
- [damage_type_reference](#damage-type-reference)
- [distributed_challenge_rewards](#distributed-challenge-rewards)
- [equipment](#equipment)
- [events](#events)
- [facts](#facts)
- [financial_decisions](#financial-decisions)
- [game_events](#game-events)
- [headquarters_rooms](#headquarters-rooms)
- [healing_facilities](#healing-facilities)
- [influencer_mint_allowlist](#influencer-mint-allowlist)
- [influencer_mints](#influencer-mints)
- [internal_mail_messages](#internal-mail-messages)
- [inventory_transfers](#inventory-transfers)
- [items](#items)
- [judge_rulings](#judge-rulings)
- [locker_achievements](#locker-achievements)
- [locker_auction_sessions](#locker-auction-sessions)
- [locker_bid_history](#locker-bid-history)
- [locker_daily_locations](#locker-daily-locations)
- [locker_item_definitions](#locker-item-definitions)
- [locker_leaderboards](#locker-leaderboards)
- [locker_rogue_decisions](#locker-rogue-decisions)
- [memory_entries](#memory-entries)
- [migration_log](#migration-log)
- [migration_meta](#migration-meta)
- [milestone_rewards](#milestone-rewards)
- [power_definitions](#power-definitions)
- [power_unlock_log](#power-unlock-log)
- [purchases](#purchases)
- [scene_triggers](#scene-triggers)
- [session_state](#session-state)
- [signature_attribute_modifiers](#signature-attribute-modifiers)
- [social_message_reactions](#social-message-reactions)
- [social_message_replies](#social-message-replies)
- [social_messages](#social-messages)
- [species_attribute_modifiers](#species-attribute-modifiers)
- [species_relationships](#species-relationships)
- [spell_definitions](#spell-definitions)
- [staking_tier_config](#staking-tier-config)
- [state_digest](#state-digest)
- [status_effect_types](#status-effect-types)
- [team_chat_logs](#team-chat-logs)
- [team_context](#team-context)
- [team_equipment_pool](#team-equipment-pool)
- [team_equipment_shared](#team-equipment-shared)
- [team_events](#team-events)
- [team_relationships](#team-relationships)
- [teams](#teams)
- [ticket_transactions](#ticket-transactions)
- [tmp_user_characters_backup](#tmp-user-characters-backup)
- [universal_attribute_base](#universal-attribute-base)
- [user_character_echoes](#user-character-echoes)
- [user_characters](#user-characters)
- [user_characters_old](#user-characters-old)
- [user_currency](#user-currency)
- [user_daily_stats](#user-daily-stats)
- [user_equipment](#user-equipment)
- [user_headquarters](#user-headquarters)
- [user_items](#user-items)
- [user_spells](#user-spells)
- [user_tickets](#user-tickets)
- [users](#users)

---

## active_challenges

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| challenge_template_id | UUID | YES | - | - |
| user_id | TEXT | YES | - | - |
| status | CHARACTER VARYING(20) | NO | `'registration'::character varying` | - |
| registration_deadline | TIMESTAMP WITH TIME ZONE | YES | - | - |
| start_time | TIMESTAMP WITH TIME ZONE | YES | - | - |
| end_time | TIMESTAMP WITH TIME ZONE | YES | - | - |
| game_state | JSONB | NO | `'{}'::jsonb` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| challenge_template_id | challenge_templates(id) | CASCADE | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_active_challenges_status | status | NO | btree |
| idx_active_challenges_timing | start_time, end_time | NO | btree |
| idx_active_challenges_user | user_id | NO | btree |

### Constraints

- **active_challenges_game_state_check**: `CHECK ((jsonb_typeof(game_state) = 'object'::text))`
- **active_challenges_status_check**: `CHECK (((status)::text = ANY (ARRAY[('registration'::character varying)::text, ('ready'::character varying)::text, ('in_progress'::character varying)::text, ('voting'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))`

---

## ai_characters

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| team_id | UUID | NO | - | - |
| character_id | TEXT | NO | - | - |
| level | INTEGER | NO | `1` | - |
| experience | INTEGER | YES | `0` | - |
| current_health | INTEGER | NO | - | - |
| max_health | INTEGER | NO | - | - |
| current_mana | INTEGER | NO | - | - |
| max_mana | INTEGER | NO | - | - |
| current_energy | INTEGER | NO | - | - |
| max_energy | INTEGER | NO | - | - |
| attack | INTEGER | NO | - | - |
| defense | INTEGER | NO | - | - |
| speed | INTEGER | NO | - | - |
| magic_attack | INTEGER | NO | - | - |
| magic_defense | INTEGER | NO | - | - |
| abilities | TEXT | YES | `'[]'::text` | - |
| personality_traits | TEXT | YES | `'[]'::text` | - |
| equipment | TEXT | YES | `'[]'::text` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | NO ACTION | NO ACTION |
| team_id | ai_teams(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_ai_characters_team | team_id | NO | btree |

---

## ai_coaches

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| name | TEXT | NO | - | - |
| difficulty_tier | TEXT | NO | - | - |
| personality_profile | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Constraints

- **ai_coaches_difficulty_tier_check**: `CHECK ((difficulty_tier = ANY (ARRAY['tutorial'::text, 'easy'::text, 'medium'::text, 'hard'::text, 'elite'::text, 'boss'::text])))`

---

## ai_teams

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| coach_id | UUID | NO | - | - |
| name | TEXT | NO | - | - |
| wins | INTEGER | YES | `0` | - |
| losses | INTEGER | YES | `0` | - |
| rating | INTEGER | YES | `1000` | - |
| is_active | BOOLEAN | YES | `true` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| coach_id | ai_coaches(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_ai_teams_coach | coach_id | NO | btree |
| idx_ai_teams_rating | rating | NO | btree |

---

## archetype_attribute_modifiers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| archetype **PK** | CHARACTER VARYING(50) | NO | - | - |
| attribute_name **PK** | CHARACTER VARYING(50) | NO | - | - |
| modifier | INTEGER | NO | - | - |
| notes | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** archetype, attribute_name

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_archetype_modifiers_archetype | archetype | NO | btree |
| idx_archetype_modifiers_attribute | attribute_name | NO | btree |

---

## archetype_relationships

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| archetype1 **PK** | CHARACTER VARYING(50) | NO | - | - |
| archetype2 **PK** | CHARACTER VARYING(50) | NO | - | - |
| base_modifier | INTEGER | YES | `0` | - |
| description | TEXT | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** archetype1, archetype2

---

## archetypes

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| base_adherence_mod | INTEGER | YES | `0` | - |

**Primary Key:** id

---

## battle_queue

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| queue_type | CHARACTER VARYING(50) | NO | - | - |
| preferred_strategy | TEXT | YES | - | - |
| team_composition | JSONB | NO | - | - |
| min_opponent_level | INTEGER | YES | - | - |
| max_opponent_level | INTEGER | YES | - | - |
| estimated_wait_time | INTEGER | YES | - | - |
| status | CHARACTER VARYING(20) | YES | `'waiting'::character varying` | - |
| matched_battle_id | TEXT | YES | - | - |
| joined_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| matched_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| expires_at | TIMESTAMP WITHOUT TIME ZONE | YES | `(CURRENT_TIMESTAMP + '00:10:00'::interval)` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| matched_battle_id | battles(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_battle_queue_expires | expires_at | NO | btree |
| idx_battle_queue_status | status | NO | btree |
| idx_battle_queue_type | queue_type | NO | btree |
| idx_battle_queue_user | user_id | NO | btree |

---

## battles

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| opponent_user_id | TEXT | YES | - | - |
| user_character_id | TEXT | YES | - | - |
| opponent_character_id | TEXT | YES | - | - |
| status | TEXT | YES | `'matchmaking'::text` | - |
| current_round | INTEGER | YES | `1` | - |
| turn_count | INTEGER | YES | `0` | - |
| user_strategy | TEXT | YES | - | - |
| opponent_strategy | TEXT | YES | - | - |
| winner_id | TEXT | YES | - | - |
| end_reason | TEXT | YES | - | - |
| combat_log | TEXT | YES | `'[]'::text` | - |
| chat_logs | TEXT | YES | `'[]'::text` | - |
| xp_gained | INTEGER | YES | `0` | - |
| bond_gained | INTEGER | YES | `0` | - |
| currency_gained | INTEGER | YES | `0` | - |
| started_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| ended_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| opponent_ai_coach_id | UUID | YES | - | - |
| opponent_ai_team_id | UUID | YES | - | - |
| opponent_ai_character_id | UUID | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| opponent_ai_character_id | ai_characters(id) | NO ACTION | NO ACTION |
| opponent_ai_coach_id | ai_coaches(id) | NO ACTION | NO ACTION |
| opponent_ai_team_id | ai_teams(id) | NO ACTION | NO ACTION |
| opponent_character_id | user_characters(id) | NO ACTION | NO ACTION |
| opponent_user_id | users(id) | NO ACTION | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | NO ACTION | NO ACTION |
| winner_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_battles_opponent | opponent_user_id | NO | btree |
| idx_battles_status | status | NO | btree |
| idx_battles_user | user_id | NO | btree |

### Constraints

- **battles_opponent_strategy_check**: `CHECK (((opponent_strategy IS NULL) OR (opponent_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]))))`
- **battles_status_check**: `CHECK ((status = ANY (ARRAY['matchmaking'::text, 'active'::text, 'paused'::text, 'completed'::text])))`
- **battles_user_strategy_check**: `CHECK (((user_strategy IS NULL) OR (user_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]))))`
- **check_opponent_exists**: `CHECK (((opponent_user_id IS NOT NULL) OR (opponent_ai_coach_id IS NOT NULL)))`

---

## bond_activity_log

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_character_id | TEXT | NO | - | - |
| activity_type | TEXT | NO | - | - |
| bond_change | INTEGER | NO | - | - |
| bond_level_before | INTEGER | NO | - | - |
| bond_level_after | INTEGER | NO | - | - |
| context | JSONB | YES | `'{}'::jsonb` | - |
| source | TEXT | NO | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_bond_activity_log_character | user_character_id, created_at | NO | btree |
| idx_bond_activity_log_source | source | NO | btree |
| idx_bond_activity_log_type | activity_type | NO | btree |

---

## card_packs

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| name | CHARACTER VARYING(100) | NO | - | - |
| description | TEXT | YES | - | - |
| pack_type | CHARACTER VARYING(50) | NO | - | - |
| guaranteed_contents | JSONB | YES | `'[]'::jsonb` | - |
| possible_contents | JSONB | YES | `'[]'::jsonb` | - |
| total_cards | INTEGER | YES | `5` | - |
| rarity_weights | JSONB | YES | `'{}'::jsonb` | - |
| cost_credits | INTEGER | YES | `0` | - |
| cost_real_money | NUMERIC | YES | `0.00` | - |
| is_purchasable | BOOLEAN | YES | `true` | - |
| requires_level | INTEGER | YES | `1` | - |
| available_from | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| available_until | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| max_purchases_per_user | INTEGER | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| created_by | UUID | YES | - | - |
| is_active | BOOLEAN | YES | `true` | - |

**Primary Key:** id

---

## cardano_card_sets

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| card_pack_id | UUID | YES | - | - |
| distribution_type | USER-DEFINED | NO | - | - |
| policy_id | TEXT | YES | - | - |
| policy_script | JSONB | YES | - | - |
| cip68_enabled | BOOLEAN | NO | `true` | - |
| metadata_schema_version | TEXT | NO | `'1.0.0'::text` | - |
| max_supply | INTEGER | YES | - | - |
| current_minted | INTEGER | NO | `0` | - |
| minting_active | BOOLEAN | NO | `false` | - |
| minting_starts_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| minting_ends_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| card_pack_id | card_packs(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_cardano_sets_card_pack | card_pack_id | NO | btree |
| idx_cardano_sets_distribution | distribution_type | NO | btree |
| idx_cardano_sets_minting_active | minting_active | NO | btree |
| idx_cardano_sets_policy | policy_id | NO | btree |

### Constraints

- **max_supply_enforced**: `CHECK (((max_supply IS NULL) OR (current_minted <= max_supply)))`
- **minting_window_valid**: `CHECK (((minting_starts_at IS NULL) OR (minting_ends_at IS NULL) OR (minting_starts_at < minting_ends_at)))`
- **policy_required_for_onchain**: `CHECK (((distribution_type = 'WEB2_ONLY'::cardano_distribution_type) OR ((policy_id IS NOT NULL) AND (length(policy_id) = 56))))`

---

## cardano_nft_metadata

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| user_character_id | TEXT | NO | - | - |
| policy_id | TEXT | NO | - | - |
| asset_name | TEXT | NO | - | - |
| asset_fingerprint | TEXT | NO | - | - |
| reference_token_utxo | TEXT | YES | - | - |
| metadata_token_utxo | TEXT | YES | - | - |
| on_chain_metadata | JSONB | NO | - | - |
| last_synced_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |
| sync_tx_hash | TEXT | YES | - | - |
| is_minted | BOOLEAN | NO | `false` | - |
| minted_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| minted_by_user_id | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| minted_by_user_id | users(id) | NO ACTION | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| cardano_nft_metadata_asset_fingerprint_key | asset_fingerprint | YES | btree |
| cardano_nft_metadata_user_character_id_key | user_character_id | YES | btree |
| idx_nft_meta_character | user_character_id | NO | btree |
| idx_nft_meta_fingerprint | asset_fingerprint | NO | btree |
| idx_nft_meta_minted | is_minted | NO | btree |
| idx_nft_meta_policy_asset | policy_id, asset_name | NO | btree |
| idx_nft_meta_user | minted_by_user_id | NO | btree |
| unique_asset | policy_id, asset_name | YES | btree |

### Constraints

- **minting_consistency**: `CHECK ((((is_minted = false) AND (minted_at IS NULL) AND (minted_by_user_id IS NULL)) OR ((is_minted = true) AND (minted_at IS NOT NULL) AND (minted_by_user_id IS NOT NULL))))`
- **valid_fingerprint**: `CHECK ((asset_fingerprint ~ '^asset1[a-z0-9]{38}$'::text))`
- **valid_policy**: `CHECK (((length(policy_id) = 56) AND (policy_id ~ '^[0-9a-f]{56}$'::text)))`

---

## cardano_staking_positions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| user_id | TEXT | NO | - | - |
| user_character_id | TEXT | NO | - | - |
| policy_id | TEXT | NO | - | - |
| asset_name | TEXT | NO | - | - |
| staked_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |
| unstaked_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| status | USER-DEFINED | NO | `'ACTIVE'::staking_status` | - |
| tier | USER-DEFINED | NO | - | - |
| base_rewards_per_day | INTEGER | NO | - | - |
| xp_multiplier | NUMERIC | NO | `1.00` | - |
| total_rewards_accrued | INTEGER | NO | `0` | - |
| last_reward_calculated_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |
| total_rewards_claimed | INTEGER | NO | `0` | - |
| last_claimed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| stake_tx_hash | TEXT | YES | - | - |
| unstake_tx_hash | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_staking_active | status | NO | btree |
| idx_staking_character | user_character_id | NO | btree |
| idx_staking_policy_asset | policy_id, asset_name | NO | btree |
| idx_staking_status | status | NO | btree |
| idx_staking_user | user_id | NO | btree |

### Constraints

- **positive_rewards**: `CHECK ((base_rewards_per_day > 0))`
- **rewards_non_negative**: `CHECK ((total_rewards_accrued >= total_rewards_claimed))`
- **status_consistency**: `CHECK ((((status = 'ACTIVE'::staking_status) AND (unstaked_at IS NULL)) OR ((status <> 'ACTIVE'::staking_status) AND (unstaked_at IS NOT NULL))))`
- **valid_policy**: `CHECK (((length(policy_id) = 56) AND (policy_id ~ '^[0-9a-f]{56}$'::text)))`
- **valid_xp_multiplier**: `CHECK (((xp_multiplier >= 1.00) AND (xp_multiplier <= 3.00)))`

---

## challenge_alliances

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| active_challenge_id | UUID | YES | - | - |
| alliance_name | CHARACTER VARYING(100) | YES | - | - |
| leader_character_id | TEXT | YES | - | - |
| member_character_ids | ARRAY | YES | - | - |
| is_active | BOOLEAN | NO | `true` | - |
| formed_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| dissolved_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| active_challenge_id | active_challenges(id) | CASCADE | NO ACTION |
| leader_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_alliances_challenge | active_challenge_id | NO | btree |
| idx_alliances_leader | leader_character_id | NO | btree |

---

## challenge_leaderboard

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_character_id | TEXT | YES | - | - |
| total_challenges_entered | INTEGER | NO | `0` | - |
| total_challenges_won | INTEGER | NO | `0` | - |
| total_top_3_finishes | INTEGER | NO | `0` | - |
| wins_by_type | JSONB | NO | `'{}'::jsonb` | - |
| total_currency_earned | INTEGER | NO | `0` | - |
| total_items_won | INTEGER | NO | `0` | - |
| current_win_streak | INTEGER | NO | `0` | - |
| best_win_streak | INTEGER | NO | `0` | - |
| overall_rank | INTEGER | YES | - | - |
| elo_rating | INTEGER | NO | `1000` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| total_challenges_lost | INTEGER | YES | `0` | - |
| challenge_win_percentage | REAL | YES | `0.0` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| challenge_leaderboard_user_character_id_key | user_character_id | YES | btree |
| idx_leaderboard_elo | elo_rating | NO | btree |
| idx_leaderboard_rank | overall_rank | NO | btree |

### Constraints

- **challenge_leaderboard_best_win_streak_check**: `CHECK ((best_win_streak >= 0))`
- **challenge_leaderboard_challenge_win_percentage_check**: `CHECK (((challenge_win_percentage >= (0.0)::double precision) AND (challenge_win_percentage <= (100.0)::double precision)))`
- **challenge_leaderboard_current_win_streak_check**: `CHECK ((current_win_streak >= 0))`
- **challenge_leaderboard_elo_rating_check**: `CHECK ((elo_rating >= 0))`
- **challenge_leaderboard_overall_rank_check**: `CHECK ((overall_rank > 0))`
- **challenge_leaderboard_total_challenges_entered_check**: `CHECK ((total_challenges_entered >= 0))`
- **challenge_leaderboard_total_challenges_lost_check**: `CHECK ((total_challenges_lost >= 0))`
- **challenge_leaderboard_total_challenges_won_check**: `CHECK ((total_challenges_won >= 0))`
- **challenge_leaderboard_total_currency_earned_check**: `CHECK ((total_currency_earned >= 0))`
- **challenge_leaderboard_total_items_won_check**: `CHECK ((total_items_won >= 0))`
- **challenge_leaderboard_total_top_3_finishes_check**: `CHECK ((total_top_3_finishes >= 0))`
- **challenge_leaderboard_wins_by_type_check**: `CHECK ((jsonb_typeof(wins_by_type) = 'object'::text))`

---

## challenge_participants

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| active_challenge_id | UUID | YES | - | - |
| user_character_id | TEXT | YES | - | - |
| registration_time | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| team_assignment | CHARACTER VARYING(50) | YES | - | - |
| performance_metrics | JSONB | NO | `'{}'::jsonb` | - |
| final_score | NUMERIC | YES | - | - |
| placement | INTEGER | YES | - | - |
| is_eliminated | BOOLEAN | NO | `false` | - |
| elimination_time | TIMESTAMP WITH TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| active_challenge_id | active_challenges(id) | CASCADE | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| challenge_participants_active_challenge_id_user_character_i_key | active_challenge_id, user_character_id | YES | btree |
| idx_challenge_participants_challenge | active_challenge_id | NO | btree |
| idx_challenge_participants_character | user_character_id | NO | btree |
| idx_challenge_participants_placement | active_challenge_id, placement | NO | btree |

### Constraints

- **challenge_participants_final_score_check**: `CHECK ((final_score >= (0)::numeric))`
- **challenge_participants_performance_metrics_check**: `CHECK ((jsonb_typeof(performance_metrics) = 'object'::text))`
- **challenge_participants_placement_check**: `CHECK ((placement > 0))`

---

## challenge_results

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| active_challenge_id | UUID | YES | - | - |
| challenge_template_id | UUID | YES | - | - |
| winner_character_id | TEXT | YES | - | - |
| second_place_character_id | TEXT | YES | - | - |
| third_place_character_id | TEXT | YES | - | - |
| total_participants | INTEGER | NO | - | - |
| completion_time_minutes | INTEGER | YES | - | - |
| full_results | JSONB | NO | - | - |
| highlight_moments | ARRAY | YES | - | - |
| total_rewards_given | JSONB | NO | `'{}'::jsonb` | - |
| completed_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| active_challenge_id | active_challenges(id) | CASCADE | NO ACTION |
| challenge_template_id | challenge_templates(id) | NO ACTION | NO ACTION |
| second_place_character_id | user_characters(id) | NO ACTION | NO ACTION |
| third_place_character_id | user_characters(id) | NO ACTION | NO ACTION |
| winner_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_challenge_results_completion | completed_at | NO | btree |
| idx_challenge_results_template | challenge_template_id | NO | btree |
| idx_challenge_results_winner | winner_character_id | NO | btree |

### Constraints

- **challenge_results_completion_time_minutes_check**: `CHECK ((completion_time_minutes > 0))`
- **challenge_results_full_results_check**: `CHECK ((jsonb_typeof(full_results) = 'object'::text))`
- **challenge_results_total_participants_check**: `CHECK ((total_participants > 0))`
- **challenge_results_total_rewards_given_check**: `CHECK ((jsonb_typeof(total_rewards_given) = 'object'::text))`

---

## challenge_rewards

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| challenge_template_id | UUID | YES | - | - |
| reward_type | CHARACTER VARYING(50) | NO | - | - |
| reward_config | JSONB | NO | - | - |
| placement_required | CHARACTER VARYING(20) | NO | - | - |
| is_guaranteed | BOOLEAN | NO | `false` | - |
| probability | NUMERIC | NO | `1.0` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| challenge_template_id | challenge_templates(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_challenge_rewards_template | challenge_template_id | NO | btree |
| idx_challenge_rewards_type | reward_type | NO | btree |

### Constraints

- **challenge_rewards_placement_required_check**: `CHECK (((placement_required)::text = ANY (ARRAY[('winner'::character varying)::text, ('top_3'::character varying)::text, ('participant'::character varying)::text, ('loser'::character varying)::text])))`
- **challenge_rewards_probability_check**: `CHECK (((probability >= 0.0) AND (probability <= 1.0)))`
- **challenge_rewards_reward_config_check**: `CHECK ((jsonb_typeof(reward_config) = 'object'::text))`
- **challenge_rewards_reward_type_check**: `CHECK (((reward_type)::text = ANY (ARRAY[('currency'::character varying)::text, ('equipment'::character varying)::text, ('battle_boost'::character varying)::text, ('special_item'::character varying)::text, ('training_bonus'::character varying)::text, ('healing_discount'::character varying)::text, ('unlock'::character varying)::text, ('immunity'::character varying)::text, ('advantage'::character varying)::text])))`

---

## challenge_templates

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| name | CHARACTER VARYING(255) | NO | - | - |
| description | TEXT | NO | - | - |
| challenge_type | CHARACTER VARYING(50) | NO | - | - |
| min_participants | INTEGER | NO | `1` | - |
| max_participants | INTEGER | NO | `10` | - |
| requires_team | BOOLEAN | YES | `false` | - |
| mechanics | JSONB | NO | `'{}'::jsonb` | - |
| difficulty | CHARACTER VARYING(20) | NO | `'medium'::character varying` | - |
| estimated_duration_minutes | INTEGER | NO | `30` | - |
| reality_show_parody | CHARACTER VARYING(100) | YES | - | - |
| theme_tags | ARRAY | YES | - | - |
| base_currency_reward | INTEGER | NO | `1000` | - |
| reward_scaling | JSONB | NO | `'{"first": 1.0, "third": 0.3, "second": 0.6}'::jso...` | - |
| is_active | BOOLEAN | NO | `true` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_challenge_templates_active | is_active | NO | btree |
| idx_challenge_templates_type | challenge_type | NO | btree |

### Constraints

- **challenge_templates_base_currency_reward_check**: `CHECK ((base_currency_reward >= 0))`
- **challenge_templates_challenge_type_check**: `CHECK (((challenge_type)::text = ANY (ARRAY[('physical'::character varying)::text, ('mental'::character varying)::text, ('social'::character varying)::text, ('cooking'::character varying)::text, ('talent'::character varying)::text, ('survival'::character varying)::text, ('creative'::character varying)::text, ('team'::character varying)::text, ('individual'::character varying)::text, ('hybrid'::character varying)::text])))`
- **challenge_templates_difficulty_check**: `CHECK (((difficulty)::text = ANY (ARRAY[('easy'::character varying)::text, ('medium'::character varying)::text, ('hard'::character varying)::text, ('extreme'::character varying)::text])))`
- **challenge_templates_estimated_duration_minutes_check**: `CHECK ((estimated_duration_minutes > 0))`
- **challenge_templates_mechanics_check**: `CHECK ((jsonb_typeof(mechanics) = 'object'::text))`
- **challenge_templates_reward_scaling_check**: `CHECK ((jsonb_typeof(reward_scaling) = 'object'::text))`

---

## character_abilities

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| character_id | TEXT | YES | - | - |
| ability_id | TEXT | NO | - | - |
| ability_name | TEXT | NO | - | - |
| rank | INTEGER | YES | `1` | - |
| max_rank | INTEGER | YES | `5` | - |
| unlocked | BOOLEAN | YES | `false` | - |
| unlocked_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_abilities_character_id_ability_id_key | character_id, ability_id | YES | btree |
| idx_character_abilities_character_id | character_id | NO | btree |

---

## character_category_preferences

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| character_id | TEXT | NO | - | - |
| category_type | TEXT | NO | - | - |
| category_value | TEXT | NO | - | - |
| preference_score | INTEGER | NO | `0` | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_category_preference_character_id_category_type_ca_key | character_id, category_type, category_value | YES | btree |
| idx_char_cat_pref_char | character_id | NO | btree |
| idx_char_cat_pref_type | category_type, category_value | NO | btree |

### Constraints

- **character_category_preferences_preference_score_check**: `CHECK (((preference_score >= '-100'::integer) AND (preference_score <= 100)))`

---

## character_decisions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| character_id | TEXT | NO | - | - |
| domain | TEXT | NO | - | - |
| decision_type | TEXT | NO | - | - |
| description | TEXT | NO | - | - |
| amount | INTEGER | YES | - | - |
| timestamp | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| coach_advice | TEXT | YES | - | - |
| coach_decision | TEXT | YES | - | - |
| followed_advice | BOOLEAN | YES | - | - |
| outcome | TEXT | YES | - | - |
| financial_impact | INTEGER | YES | - | - |
| stress_impact | INTEGER | YES | - | - |
| relationship_impact | INTEGER | YES | - | - |
| urgency | TEXT | YES | - | - |
| status | TEXT | YES | `'pending'::text` | - |
| metadata | JSONB | YES | `'{}'::jsonb` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_character_decisions_character_id | character_id | NO | btree |
| idx_character_decisions_domain | domain | NO | btree |
| idx_character_decisions_domain_type | domain, decision_type | NO | btree |
| idx_character_decisions_status | status | NO | btree |
| idx_character_decisions_timestamp | timestamp | NO | btree |

### Constraints

- **character_decisions_domain_check**: `CHECK ((domain = ANY (ARRAY['financial'::text, 'therapy'::text, 'training'::text, 'battle'::text, 'relationship'::text, 'career'::text])))`
- **character_decisions_status_check**: `CHECK ((status = ANY (ARRAY['pending'::text, 'decided'::text, 'completed'::text, 'cancelled'::text])))`
- **character_decisions_urgency_check**: `CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))`

---

## character_equipment

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| character_id | TEXT | NO | - | - |
| equipment_id | TEXT | NO | - | - |
| is_equipped | BOOLEAN | YES | `false` | - |
| equipped_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| acquired_from | TEXT | YES | `'gift'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| equipment_id | equipment(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_equipment_character_id_equipment_id_key | character_id, equipment_id | YES | btree |
| idx_character_equipment_character | character_id | NO | btree |
| idx_character_equipment_equipment | equipment_id | NO | btree |
| idx_character_equipment_equipped | is_equipped | NO | btree |

---

## character_experience_log

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| character_id | TEXT | YES | - | - |
| source | TEXT | NO | - | - |
| amount | INTEGER | NO | - | - |
| multiplier | NUMERIC | YES | `1.0` | - |
| description | TEXT | YES | - | - |
| timestamp | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_character_experience_log_character_id | character_id | NO | btree |
| idx_character_experience_log_timestamp | timestamp | NO | btree |

### Constraints

- **character_experience_log_source_check**: `CHECK ((source = ANY (ARRAY['battle'::text, 'training'::text, 'quest'::text, 'achievement'::text, 'daily'::text, 'event'::text])))`

---

## character_healing_sessions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| facility_id | TEXT | NO | - | - |
| session_type | TEXT | NO | - | - |
| start_time | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| estimated_completion_time | TIMESTAMP WITHOUT TIME ZONE | NO | - | - |
| currency_paid | INTEGER | YES | `0` | - |
| premium_paid | INTEGER | YES | `0` | - |
| is_active | BOOLEAN | YES | `true` | - |
| is_completed | BOOLEAN | YES | `false` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| facility_id | healing_facilities(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_healing_sessions_active | is_active | NO | btree |
| idx_healing_sessions_completion | estimated_completion_time | NO | btree |

### Constraints

- **character_healing_sessions_session_type_check**: `CHECK ((session_type = ANY (ARRAY['injury_healing'::text, 'resurrection'::text])))`

---

## character_items

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| character_id | TEXT | NO | - | - |
| item_id | TEXT | NO | - | - |
| quantity | INTEGER | NO | `1` | - |
| acquired_from | TEXT | YES | `'gift'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| item_id | items(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_items_character_id_item_id_key | character_id, item_id | YES | btree |
| idx_character_items_character | character_id | NO | btree |
| idx_character_items_item | item_id | NO | btree |

### Constraints

- **character_items_quantity_check**: `CHECK ((quantity >= 0))`

---

## character_living_context

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('character_living_context_id_seq'::regclas...` | - |
| character_id | CHARACTER VARYING(255) | YES | - | - |
| team_id | CHARACTER VARYING(255) | YES | - | - |
| sleeps_on_floor | BOOLEAN | YES | `false` | - |
| sleeps_on_couch | BOOLEAN | YES | `false` | - |
| sleeps_under_table | BOOLEAN | YES | `false` | - |
| room_overcrowded | BOOLEAN | YES | `false` | - |
| floor_sleeper_count | INTEGER | YES | `0` | - |
| roommate_count | INTEGER | YES | `1` | - |
| current_mood | CHARACTER VARYING(50) | YES | `'neutral'::character varying` | - |
| current_energy_level | INTEGER | YES | `100` | - |
| last_sleep_quality | CHARACTER VARYING(20) | YES | `'good'::character varying` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_living_context_character_id_team_id_key | character_id, team_id | YES | btree |
| idx_character_living_context_character_id | character_id | NO | btree |
| idx_character_living_context_team_id | team_id | NO | btree |

### Constraints

- **character_living_context_current_energy_level_check**: `CHECK (((current_energy_level >= 0) AND (current_energy_level <= 100)))`
- **character_living_context_last_sleep_quality_check**: `CHECK (((last_sleep_quality)::text = ANY (ARRAY[('poor'::character varying)::text, ('fair'::character varying)::text, ('good'::character varying)::text, ('excellent'::character varying)::text])))`

---

## character_memories

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | CHARACTER VARYING(255) | NO | - | - |
| character_id | CHARACTER VARYING(255) | NO | - | - |
| event_id | CHARACTER VARYING(255) | YES | - | - |
| content | TEXT | NO | - | - |
| emotion_type | CHARACTER VARYING(50) | YES | - | - |
| intensity | INTEGER | YES | `5` | - |
| valence | INTEGER | YES | `5` | - |
| importance | INTEGER | YES | `5` | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | - | - |
| last_recalled | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |
| recall_count | INTEGER | YES | `0` | - |
| associated_characters | ARRAY | YES | `'{}'::text[]` | - |
| tags | ARRAY | YES | `'{}'::text[]` | - |
| decay_rate | NUMERIC | YES | `1.0` | - |
| chat_context | JSONB | YES | - | - |
| cross_reference_data | JSONB | YES | - | - |
| financial_metadata | JSONB | YES | - | - |
| therapy_metadata | JSONB | YES | - | - |
| confessional_metadata | JSONB | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| event_id | game_events(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_character_memories_char_id | character_id | NO | btree |
| idx_character_memories_created_at | created_at | NO | btree |
| idx_character_memories_event_id | event_id | NO | btree |
| idx_character_memories_importance | importance | NO | btree |

---

## character_power_loadout

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_character_id | TEXT | NO | - | - |
| power_id | TEXT | NO | - | - |
| slot_number | INTEGER | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| power_id | power_definitions(id) | CASCADE | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_power_loadout_user_character_id_power_id_key | user_character_id, power_id | YES | btree |
| character_power_loadout_user_character_id_slot_number_key | user_character_id, slot_number | YES | btree |
| idx_character_power_loadout_character | user_character_id | NO | btree |
| idx_character_power_loadout_power | power_id | NO | btree |

### Constraints

- **character_power_loadout_slot_number_check**: `CHECK (((slot_number >= 1) AND (slot_number <= 8)))`

---

## character_powers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `((('charpow_'::text || (EXTRACT(epoch FROM now()))...` | - |
| character_id | TEXT | NO | - | - |
| power_id | TEXT | NO | - | - |
| current_rank | INTEGER | NO | `1` | - |
| experience | INTEGER | NO | `0` | - |
| unlocked | BOOLEAN | NO | `false` | - |
| unlocked_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| unlocked_by | TEXT | YES | - | - |
| times_used | INTEGER | NO | `0` | - |
| last_used_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| on_cooldown | BOOLEAN | YES | `false` | - |
| cooldown_expires_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| power_id | power_definitions(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_powers_character_id_power_id_key | character_id, power_id | YES | btree |
| idx_character_powers_character | character_id | NO | btree |
| idx_character_powers_power | power_id | NO | btree |
| idx_character_powers_tier | power_id | NO | btree |
| idx_character_powers_unlocked | unlocked | NO | btree |

---

## character_progression

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| character_id **PK** | TEXT | NO | - | - |
| stat_points | INTEGER | YES | `0` | - |
| skill_points | INTEGER | YES | `0` | - |
| ability_points | INTEGER | YES | `0` | - |
| tier | TEXT | YES | `'novice'::text` | - |
| title | TEXT | YES | `'Novice'::text` | - |
| last_updated | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** character_id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |

---

## character_relationships

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('character_relationships_id_seq'::regclass...` | - |
| character1_id | CHARACTER VARYING(255) | NO | - | - |
| character2_id | CHARACTER VARYING(255) | NO | - | - |
| species_modifier | INTEGER | YES | `0` | - |
| archetype_modifier | INTEGER | YES | `0` | - |
| personal_vendetta | BOOLEAN | YES | `false` | - |
| vendetta_description | TEXT | YES | - | - |
| base_disposition | INTEGER | YES | `0` | - |
| current_trust | INTEGER | YES | `0` | - |
| current_respect | INTEGER | YES | `0` | - |
| current_affection | INTEGER | YES | `0` | - |
| current_rivalry | INTEGER | YES | `0` | - |
| relationship_status | CHARACTER VARYING(50) | YES | - | - |
| trajectory | CHARACTER VARYING(20) | YES | - | - |
| progress_score | INTEGER | YES | `0` | - |
| shared_battles | INTEGER | YES | `0` | - |
| conflicts_resolved | INTEGER | YES | `0` | - |
| therapy_sessions_together | INTEGER | YES | `0` | - |
| positive_interactions | INTEGER | YES | `0` | - |
| negative_interactions | INTEGER | YES | `0` | - |
| shared_experiences | ARRAY | YES | `'{}'::text[]` | - |
| last_interaction | TIMESTAMP WITH TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_relationships_character1_id_character2_id_key | character1_id, character2_id | YES | btree |
| idx_character_relationships_char1 | character1_id | NO | btree |
| idx_character_relationships_char2 | character2_id | NO | btree |
| idx_character_relationships_status | relationship_status | NO | btree |
| idx_character_relationships_updated | updated_at | NO | btree |

---

## character_skills

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| character_id | TEXT | YES | - | - |
| skill_id | TEXT | NO | - | - |
| skill_name | TEXT | NO | - | - |
| level | INTEGER | YES | `1` | - |
| experience | INTEGER | YES | `0` | - |
| max_level | INTEGER | YES | `10` | - |
| unlocked | BOOLEAN | YES | `false` | - |
| last_updated | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_skills_character_id_skill_id_key | character_id, skill_id | YES | btree |
| idx_character_skills_character_id | character_id | NO | btree |

---

## character_spell_loadout

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_character_id | TEXT | NO | - | - |
| spell_id | TEXT | NO | - | - |
| slot_number | INTEGER | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| spell_id | spell_definitions(id) | CASCADE | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_spell_loadout_user_character_id_slot_number_key | user_character_id, slot_number | YES | btree |
| character_spell_loadout_user_character_id_spell_id_key | user_character_id, spell_id | YES | btree |
| idx_character_spell_loadout_character | user_character_id | NO | btree |
| idx_character_spell_loadout_spell | spell_id | NO | btree |

### Constraints

- **character_spell_loadout_slot_number_check**: `CHECK (((slot_number >= 1) AND (slot_number <= 10)))`

---

## character_spells

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| character_id | TEXT | NO | - | - |
| spell_id | TEXT | NO | - | - |
| current_rank | INTEGER | NO | `1` | - |
| unlocked | BOOLEAN | NO | `false` | - |
| unlocked_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| unlocked_by | TEXT | YES | - | - |
| times_cast | INTEGER | NO | `0` | - |
| last_cast_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| on_cooldown | BOOLEAN | NO | `false` | - |
| cooldown_expires_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| total_damage_dealt | INTEGER | NO | `0` | - |
| total_healing_done | INTEGER | NO | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| experience | INTEGER | NO | `0` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| spell_id | spell_definitions(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| character_spells_character_id_spell_id_key | character_id, spell_id | YES | btree |
| idx_character_spells_character | character_id | NO | btree |
| idx_character_spells_spell | spell_id | NO | btree |
| idx_character_spells_unlocked | character_id, unlocked | NO | btree |

### Constraints

- **character_spells_current_rank_check**: `CHECK (((current_rank >= 1) AND (current_rank <= 3)))`
- **character_spells_unlocked_by_check**: `CHECK ((unlocked_by = ANY (ARRAY['level_up'::text, 'point_spend'::text, 'challenge_complete'::text, 'auto'::text, 'rebellion'::text])))`

---

## character_temporary_buffs

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| character_id | TEXT | NO | - | - |
| stat_name | TEXT | NO | - | - |
| value | INTEGER | NO | - | - |
| source | TEXT | NO | - | - |
| source_id | TEXT | YES | - | - |
| description | TEXT | YES | - | - |
| applied_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| expires_at | TIMESTAMP WITH TIME ZONE | NO | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_character_temporary_buffs_character_id | character_id | NO | btree |
| idx_character_temporary_buffs_expires_at | expires_at | NO | btree |

---

## characters

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| title | TEXT | YES | - | - |
| archetype | TEXT | YES | - | - |
| origin_era | TEXT | YES | - | - |
| rarity | TEXT | YES | - | - |
| max_health | INTEGER | NO | - | - |
| attack | INTEGER | NO | - | - |
| defense | INTEGER | NO | - | - |
| speed | INTEGER | NO | - | - |
| magic_attack | INTEGER | NO | - | - |
| personality_traits | TEXT | YES | - | - |
| conversation_style | TEXT | YES | - | - |
| backstory | TEXT | YES | - | - |
| conversation_topics | TEXT | YES | - | - |
| avatar_emoji | TEXT | YES | - | - |
| artwork_url | TEXT | YES | - | - |
| abilities | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| training | INTEGER | YES | `50` | - |
| team_player | INTEGER | YES | `50` | - |
| ego | INTEGER | YES | `50` | - |
| mental_health | INTEGER | YES | `80` | - |
| communication | INTEGER | YES | `50` | - |
| gameplan_adherence | INTEGER | YES | - | - |
| current_mental_health | INTEGER | YES | `80` | - |
| stress_level | INTEGER | YES | `25` | - |
| team_trust | INTEGER | YES | `85` | - |
| battle_focus | INTEGER | YES | `90` | - |
| starting_wallet | INTEGER | YES | `0` | - |
| default_mood | CHARACTER VARYING(50) | YES | `'neutral'::character varying` | - |
| default_energy_level | INTEGER | YES | `100` | - |
| comedian_name | TEXT | YES | - | - |
| comedy_style | TEXT | YES | - | - |
| role | CHARACTER VARYING(50) | YES | - | - |
| species | CHARACTER VARYING(50) | NO | `'human'::character varying` | - |
| comedian_style_id | INTEGER | YES | - | - |
| weapon_proficiencies | ARRAY | YES | - | - |
| preferred_weapons | ARRAY | YES | - | - |
| armor_proficiency | TEXT | YES | - | - |
| preferred_armor_type | TEXT | YES | - | - |
| equipment_notes | TEXT | YES | - | - |
| magic_defense | INTEGER | NO | `50` | - |
| strength | INTEGER | NO | `50` | - |
| dexterity | INTEGER | NO | `50` | - |
| max_energy | INTEGER | NO | `50` | - |
| intelligence | INTEGER | NO | `50` | - |
| wisdom | INTEGER | NO | `50` | - |
| charisma | INTEGER | NO | `50` | - |
| spirit | INTEGER | NO | `50` | - |
| critical_chance | INTEGER | NO | `5` | - |
| critical_damage | INTEGER | NO | `150` | - |
| accuracy | INTEGER | NO | `85` | - |
| evasion | INTEGER | NO | `10` | - |
| max_mana | INTEGER | NO | `100` | - |
| energy_regen | INTEGER | NO | `10` | - |
| physical_resistance | INTEGER | YES | `0` | - |
| magical_resistance | INTEGER | YES | `0` | - |
| elemental_resistance | INTEGER | YES | `0` | - |
| secondary_species | TEXT | YES | - | - |
| spending_style | TEXT | YES | `'moderate'::text` | - |
| money_motivations | ARRAY | YES | `'{}'::text[]` | - |
| financial_wisdom | INTEGER | YES | `50` | - |
| risk_tolerance | INTEGER | YES | `50` | - |
| luxury_desire | INTEGER | YES | `50` | - |
| generosity | INTEGER | YES | `50` | - |
| financial_traumas | ARRAY | YES | `'{}'::text[]` | - |
| money_beliefs | ARRAY | YES | `'{}'::text[]` | - |
| battle_image_name | CHARACTER VARYING(100) | NO | - | - |
| battle_image_variants | INTEGER | NO | `7` | - |
| base_action_points | INTEGER | YES | `3` | - |
| endurance | INTEGER | NO | `50` | - |
| scene_image_slug | CHARACTER VARYING(100) | NO | - | - |
| initiative | INTEGER | YES | - | YES: `(floor((((((COALESCE(speed, 0)...` |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| comedian_style_id | comedian_styles(id) | SET NULL | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_characters_attribute_stats | strength, dexterity, intelligence | NO | btree |
| idx_characters_battle_image | battle_image_name | NO | btree |
| idx_characters_combat_stats | max_health, attack, defense | NO | btree |
| idx_characters_initiative | initiative | NO | btree |
| idx_characters_origin_era | origin_era | NO | btree |
| idx_characters_psych_stats | mental_health, stress_level, gameplan_adherence | NO | btree |
| idx_characters_psychstats | training, team_player, ego, mental_health, communication | NO | btree |
| idx_characters_scene_image_slug | scene_image_slug | NO | btree |
| idx_characters_secondary_species | secondary_species | NO | btree |

### Constraints

- **characters_default_energy_level_check**: `CHECK (((default_energy_level >= 0) AND (default_energy_level <= 100)))`
- **characters_elemental_resistance_check**: `CHECK (((elemental_resistance >= 0) AND (elemental_resistance <= 100)))`
- **characters_magical_resistance_check**: `CHECK (((magical_resistance >= 0) AND (magical_resistance <= 100)))`
- **characters_physical_resistance_check**: `CHECK (((physical_resistance >= 0) AND (physical_resistance <= 100)))`
- **characters_rarity_check**: `CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text])))`

---

## chat_messages

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| battle_id | TEXT | YES | - | - |
| player_message | TEXT | NO | - | - |
| character_response | TEXT | NO | - | - |
| message_context | TEXT | YES | - | - |
| model_used | TEXT | YES | - | - |
| tokens_used | INTEGER | YES | - | - |
| response_time_ms | INTEGER | YES | - | - |
| bond_increase | BOOLEAN | YES | `false` | - |
| memory_saved | BOOLEAN | YES | `false` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| battle_id | battles(id) | NO ACTION | NO ACTION |
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_chat_messages_battle | battle_id | NO | btree |
| idx_chat_messages_created | created_at | NO | btree |
| idx_chat_messages_user_character | user_id, character_id | NO | btree |

---

## chat_sessions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('chat_sessions_id_seq'::regclass)` | - |
| session_id | CHARACTER VARYING(255) | YES | - | - |
| chat_id | CHARACTER VARYING(255) | YES | - | - |
| user_id | UUID | YES | - | - |
| character_id | CHARACTER VARYING(255) | YES | - | - |
| current_turn_count | INTEGER | YES | `0` | - |
| last_character_response | TEXT | YES | - | - |
| session_complete | BOOLEAN | YES | `false` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| chat_sessions_chat_id_unique | chat_id | YES | btree |
| chat_sessions_session_id_key | session_id | YES | btree |

---

## claimable_pack_contents

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `gen_random_uuid()` | - |
| claimable_pack_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| rarity | USER-DEFINED | NO | `'common'::character_rarity` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | NO ACTION | NO ACTION |
| claimable_pack_id | claimable_packs(id) | CASCADE | NO ACTION |

---

## claimable_packs

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| pack_type | CHARACTER VARYING(50) | NO | - | - |
| is_claimed | BOOLEAN | YES | `false` | - |
| claimed_by_user_id | TEXT | YES | - | - |
| claimed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| claimed_by_user_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_claimable_packs_claimed_by | claimed_by_user_id | NO | btree |
| idx_claimable_packs_pack_type | pack_type | NO | btree |

---

## coach_progression

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| user_id **PK** | TEXT | NO | - | - |
| coach_level | INTEGER | YES | `1` | - |
| coach_experience | INTEGER | YES | `0` | - |
| coach_title | TEXT | YES | `'Rookie Coach'::text` | - |
| psychology_skill_points | INTEGER | YES | `0` | - |
| battle_strategy_skill_points | INTEGER | YES | `0` | - |
| character_development_skill_points | INTEGER | YES | `0` | - |
| total_battles_coached | INTEGER | YES | `0` | - |
| total_wins_coached | INTEGER | YES | `0` | - |
| psychology_interventions | INTEGER | YES | `0` | - |
| successful_interventions | INTEGER | YES | `0` | - |
| gameplan_adherence_rate | REAL | YES | `0.0` | - |
| team_chemistry_improvements | INTEGER | YES | `0` | - |
| character_developments | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| financial_advice_given | INTEGER | YES | `0` | - |
| successful_financial_advice | INTEGER | YES | `0` | - |
| spirals_prevented | INTEGER | YES | `0` | - |
| financial_conflicts_resolved | INTEGER | YES | `0` | - |
| total_losses_coached | INTEGER | YES | `0` | - |
| win_percentage_coached | REAL | YES | `0.0` | - |

**Primary Key:** user_id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_coach_progression_level | coach_level | NO | btree |
| idx_coach_progression_user_id | user_id | NO | btree |

### Constraints

- **coach_progression_total_losses_coached_check**: `CHECK ((total_losses_coached >= 0))`
- **coach_progression_win_percentage_coached_check**: `CHECK (((win_percentage_coached >= (0.0)::double precision) AND (win_percentage_coached <= (100.0)::double precision)))`

---

## coach_skills

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| skill_tree | TEXT | NO | - | - |
| skill_name | TEXT | NO | - | - |
| skill_level | INTEGER | YES | `1` | - |
| unlocked_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_coach_skills_tree | skill_tree | NO | btree |
| idx_coach_skills_user_id | user_id | NO | btree |

### Constraints

- **coach_skills_skill_tree_check**: `CHECK ((skill_tree = ANY (ARRAY['psychology_mastery'::text, 'battle_strategy'::text, 'character_development'::text])))`

---

## coach_xp_events

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| event_type | TEXT | NO | - | - |
| event_subtype | TEXT | YES | - | - |
| xp_gained | INTEGER | NO | - | - |
| description | TEXT | YES | - | - |
| battle_id | TEXT | YES | - | - |
| character_id | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| battle_id | battles(id) | NO ACTION | NO ACTION |
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_coach_xp_events_battle | battle_id | NO | btree |
| idx_coach_xp_events_type | event_type | NO | btree |
| idx_coach_xp_events_user_id | user_id | NO | btree |

### Constraints

- **coach_xp_events_event_type_check**: `CHECK ((event_type = ANY (ARRAY['battle_win'::text, 'battle_loss'::text, 'psychology_management'::text, 'character_development'::text, 'financial_coaching'::text])))`

---

## comedian_styles

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('comedian_styles_id_seq'::regclass)` | - |
| category | CHARACTER VARYING(20) | NO | - | - |
| comedian_name | CHARACTER VARYING(100) | YES | - | - |
| birth_year | INTEGER | YES | - | - |
| death_year | INTEGER | YES | - | - |
| era | CHARACTER VARYING(50) | YES | - | - |
| comedy_style | TEXT | NO | - | - |
| example_material | TEXT | YES | - | - |
| notes | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_comedian_styles_category | category | NO | btree |
| idx_comedian_styles_era | era | NO | btree |

### Constraints

- **comedian_name_required**: `CHECK ((comedian_name IS NOT NULL))`
- **comedian_styles_category_check**: `CHECK (((category)::text = ANY (ARRAY[('public_domain'::character varying)::text, ('inspired'::character varying)::text])))`

---

## cron_logs

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | BIGINT | NO | `nextval('cron_logs_id_seq'::regclass)` | - |
| job_type | TEXT | NO | - | - |
| success_count | INTEGER | NO | `0` | - |
| error_count | INTEGER | NO | `0` | - |
| duration_ms | INTEGER | NO | `0` | - |
| description | TEXT | YES | - | - |
| metadata | JSONB | YES | `'{}'::jsonb` | - |
| error_message | TEXT | YES | - | - |
| executed_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_cron_logs_executed_at | executed_at | NO | btree |
| idx_cron_logs_job_type | job_type | NO | btree |

---

## damage_type_reference

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| category | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| resistance_stat | TEXT | NO | - | - |
| icon | TEXT | YES | - | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_damage_type_category | category | NO | btree |

### Constraints

- **damage_type_reference_category_check**: `CHECK ((category = ANY (ARRAY['physical'::text, 'magical'::text, 'elemental'::text])))`

---

## distributed_challenge_rewards

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| challenge_result_id | UUID | YES | - | - |
| user_character_id | TEXT | YES | - | - |
| reward_type | CHARACTER VARYING(50) | NO | - | - |
| reward_config | JSONB | NO | - | - |
| currency_amount | INTEGER | YES | - | - |
| equipment_id | TEXT | YES | - | - |
| boost_effect | JSONB | YES | - | - |
| boost_expires_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| item_id | UUID | YES | - | - |
| claimed | BOOLEAN | NO | `false` | - |
| claimed_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| challenge_result_id | challenge_results(id) | CASCADE | NO ACTION |
| equipment_id | equipment(id) | SET NULL | NO ACTION |
| item_id | user_items(id) | SET NULL | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_distributed_rewards_character | user_character_id | NO | btree |
| idx_distributed_rewards_result | challenge_result_id | NO | btree |
| idx_distributed_rewards_unclaimed | claimed | NO | btree |

### Constraints

- **distributed_challenge_rewards_boost_effect_check**: `CHECK ((jsonb_typeof(boost_effect) = 'object'::text))`
- **distributed_challenge_rewards_currency_amount_check**: `CHECK ((currency_amount >= 0))`
- **distributed_challenge_rewards_reward_config_check**: `CHECK ((jsonb_typeof(reward_config) = 'object'::text))`

---

## equipment

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| slot | TEXT | NO | - | - |
| equipment_type | TEXT | YES | - | - |
| rarity | TEXT | NO | - | - |
| required_level | INTEGER | YES | `1` | - |
| stats | TEXT | NO | `'{}'::text` | - |
| effects | TEXT | NO | `'[]'::text` | - |
| prompt_addition | TEXT | YES | - | - |
| icon | TEXT | YES | - | - |
| is_starter_item | BOOLEAN | YES | `false` | - |
| starter_for_character | TEXT | YES | - | - |
| shop_price | INTEGER | YES | - | - |
| pack_rarity | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| restricted_to_character | TEXT | NO | `'universal'::text` | - |
| equipment_tier | TEXT | YES | `'universal'::text` | - |
| restricted_to_archetype | TEXT | YES | - | - |
| restricted_to_species | TEXT | YES | - | - |
| range | INTEGER | YES | `3` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| equipment_id_unique | id | YES | btree |
| idx_equipment_archetype | restricted_to_archetype | NO | btree |
| idx_equipment_rarity | rarity | NO | btree |
| idx_equipment_shop | shop_price | NO | btree |
| idx_equipment_slot | slot | NO | btree |
| idx_equipment_species | restricted_to_species | NO | btree |
| idx_equipment_starter | is_starter_item, starter_for_character | NO | btree |
| idx_equipment_tier | equipment_tier | NO | btree |

### Constraints

- **equipment_equipment_tier_check**: `CHECK ((equipment_tier = ANY (ARRAY['universal'::text, 'archetype'::text, 'species'::text, 'character'::text])))`
- **equipment_rarity_check**: `CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text])))`

---

## events

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | BIGINT | NO | `nextval('events_id_seq'::regclass)` | - |
| session_id | TEXT | NO | - | - |
| type | TEXT | NO | - | - |
| actor | TEXT | YES | - | - |
| target | TEXT | YES | - | - |
| payload | JSONB | YES | - | - |
| ts | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_events_session_id | session_id | NO | btree |
| idx_events_ts | ts | NO | btree |
| idx_events_type | type | NO | btree |

---

## facts

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | BIGINT | NO | `nextval('facts_id_seq'::regclass)` | - |
| session_id | TEXT | NO | - | - |
| type | TEXT | NO | - | - |
| key | TEXT | NO | - | - |
| value | TEXT | NO | - | - |
| status | TEXT | NO | - | - |
| started_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |
| resolved_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| expires_at | TIMESTAMP WITH TIME ZONE | YES | - | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_facts_expires_at | expires_at | NO | btree |
| idx_facts_session_id | session_id | NO | btree |
| idx_facts_session_key | session_id, key | YES | btree |
| idx_facts_status | status | NO | btree |

### Constraints

- **facts_status_check**: `CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'expired'::text])))`

---

## financial_decisions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_character_id | TEXT | NO | - | - |
| decision_type | TEXT | NO | - | - |
| amount_cents | INTEGER | NO | - | - |
| payment_method | TEXT | YES | - | - |
| wallet_delta_cents | INTEGER | YES | `0` | - |
| debt_delta_cents | INTEGER | YES | `0` | - |
| description | TEXT | YES | - | - |
| metadata | JSONB | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_character_id | user_characters(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_financial_decisions_character | user_character_id, created_at | NO | btree |
| uniq_financial_decisions_client_id | user_character_id | YES | btree |

### Constraints

- **payment_method_check**: `CHECK (((payment_method = ANY (ARRAY['cash'::text, 'debt'::text])) OR (payment_method IS NULL)))`

---

## game_events

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | CHARACTER VARYING(255) | NO | - | - |
| type | CHARACTER VARYING(100) | NO | - | - |
| source | CHARACTER VARYING(100) | NO | - | - |
| primary_character_id | CHARACTER VARYING(255) | NO | - | - |
| secondary_character_ids | ARRAY | YES | - | - |
| severity | CHARACTER VARYING(20) | YES | `'medium'::character varying` | - |
| category | CHARACTER VARYING(50) | NO | - | - |
| description | TEXT | NO | - | - |
| metadata | JSONB | YES | `'{}'::jsonb` | - |
| tags | ARRAY | YES | `'{}'::text[]` | - |
| importance | INTEGER | YES | `5` | - |
| timestamp | TIMESTAMP WITH TIME ZONE | NO | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_game_events_category | category | NO | btree |
| idx_game_events_primary_char | primary_character_id | NO | btree |
| idx_game_events_timestamp | timestamp | NO | btree |
| idx_game_events_type | type | NO | btree |

---

## headquarters_rooms

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| headquarters_id | TEXT | NO | - | - |
| room_id | TEXT | NO | - | - |
| room_type | TEXT | NO | - | - |
| capacity | INTEGER | YES | `2` | - |
| occupied_slots | INTEGER | YES | `0` | - |
| theme | TEXT | YES | `'default'::text` | - |
| furniture | JSONB | YES | `'[]'::jsonb` | - |
| position_x | INTEGER | YES | `0` | - |
| position_y | INTEGER | YES | `0` | - |
| width | INTEGER | YES | `1` | - |
| height | INTEGER | YES | `1` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| assigned_characters | JSONB | YES | `'[]'::jsonb` | - |
| custom_image_url | TEXT | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| headquarters_id | user_headquarters(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_headquarters_rooms_headquarters | headquarters_id | NO | btree |
| idx_headquarters_rooms_type | room_type | NO | btree |

### Constraints

- **headquarters_rooms_capacity_check**: `CHECK ((capacity > 0))`
- **headquarters_rooms_height_check**: `CHECK (((height > 0) AND (height <= 10)))`
- **headquarters_rooms_occupied_slots_check**: `CHECK ((occupied_slots >= 0))`
- **headquarters_rooms_room_type_check**: `CHECK ((room_type = ANY (ARRAY['bedroom'::text, 'kitchen'::text, 'training_room'::text, 'lounge'::text, 'office'::text, 'storage'::text, 'medical_bay'::text, 'trophy_room'::text, 'library'::text, 'workshop'::text])))`
- **headquarters_rooms_width_check**: `CHECK (((width > 0) AND (width <= 10)))`
- **valid_occupancy**: `CHECK ((occupied_slots <= capacity))`
- **valid_room_size**: `CHECK (((width > 0) AND (height > 0) AND (width <= 10) AND (height <= 10)))`

---

## healing_facilities

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| facility_type | TEXT | NO | - | - |
| healing_rate_multiplier | NUMERIC | YES | `1.0` | - |
| currency_cost_per_hour | INTEGER | YES | `0` | - |
| premium_cost_per_hour | INTEGER | YES | `0` | - |
| max_injury_severity | TEXT | YES | - | - |
| headquarters_tier_required | TEXT | YES | - | - |
| description | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Constraints

- **healing_facilities_facility_type_check**: `CHECK ((facility_type = ANY (ARRAY['basic_medical'::text, 'advanced_medical'::text, 'premium_medical'::text, 'resurrection_chamber'::text])))`
- **healing_facilities_max_injury_severity_check**: `CHECK ((max_injury_severity = ANY (ARRAY['light'::text, 'moderate'::text, 'severe'::text, 'critical'::text, 'dead'::text])))`

---

## influencer_mint_allowlist

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| wallet_address | TEXT | NO | - | - |
| card_set_id | UUID | NO | - | - |
| claim_code | TEXT | NO | - | - |
| status | USER-DEFINED | NO | `'PENDING'::allowlist_status` | - |
| claimed_by_user_id | TEXT | YES | - | - |
| claimed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| allocated_by | TEXT | YES | - | - |
| allocation_reason | TEXT | YES | - | - |
| notes | TEXT | YES | - | - |
| expires_at | TIMESTAMP WITHOUT TIME ZONE | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| card_set_id | cardano_card_sets(id) | CASCADE | NO ACTION |
| claimed_by_user_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_allowlist_card_set | card_set_id | NO | btree |
| idx_allowlist_claim_code | claim_code | NO | btree |
| idx_allowlist_status | status | NO | btree |
| idx_allowlist_wallet | wallet_address | NO | btree |
| influencer_mint_allowlist_claim_code_key | claim_code | YES | btree |

### Constraints

- **claim_consistency**: `CHECK (((status <> 'CLAIMED'::allowlist_status) OR ((claimed_by_user_id IS NOT NULL) AND (claimed_at IS NOT NULL))))`
- **expiry_future**: `CHECK ((expires_at > created_at))`
- **valid_claim_code**: `CHECK ((claim_code ~ '^[A-Z0-9-]{8,32}$'::text))`
- **valid_wallet**: `CHECK ((length(wallet_address) >= 50))`

---

## influencer_mints

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| user_id | TEXT | NO | - | - |
| allowlist_entry_id | UUID | NO | - | - |
| policy_id | TEXT | NO | - | - |
| asset_name | TEXT | NO | - | - |
| tx_hash | TEXT | NO | - | - |
| user_character_id | TEXT | YES | - | - |
| minted_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| allowlist_entry_id | influencer_mint_allowlist(id) | NO ACTION | NO ACTION |
| user_character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_influencer_mints_allowlist | allowlist_entry_id | NO | btree |
| idx_influencer_mints_character | user_character_id | NO | btree |
| idx_influencer_mints_tx | tx_hash | NO | btree |
| idx_influencer_mints_user | user_id | NO | btree |

### Constraints

- **valid_policy**: `CHECK (((length(policy_id) = 56) AND (policy_id ~ '^[0-9a-f]{56}$'::text)))`
- **valid_tx_hash**: `CHECK (((length(tx_hash) = 64) AND (tx_hash ~ '^[0-9a-f]{64}$'::text)))`

---

## internal_mail_messages

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| recipient_user_id | TEXT | NO | - | - |
| sender_user_id | TEXT | YES | - | - |
| sender_username | CHARACTER VARYING(100) | YES | - | - |
| subject | CHARACTER VARYING(255) | NO | - | - |
| content | TEXT | NO | - | - |
| message_type | CHARACTER VARYING(20) | NO | - | - |
| category | CHARACTER VARYING(20) | NO | - | - |
| priority | CHARACTER VARYING(10) | NO | `'normal'::character varying` | - |
| sender_signature | TEXT | YES | - | - |
| reply_to_mail_id | TEXT | YES | - | - |
| has_attachment | BOOLEAN | NO | `false` | - |
| attachment_data | JSONB | YES | - | - |
| attachment_claimed | BOOLEAN | NO | `false` | - |
| is_read | BOOLEAN | NO | `false` | - |
| read_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| is_deleted | BOOLEAN | NO | `false` | - |
| deleted_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |
| expires_at | TIMESTAMP WITH TIME ZONE | YES | - | - |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| recipient_user_id | users(id) | CASCADE | NO ACTION |
| reply_to_mail_id | internal_mail_messages(id) | SET NULL | NO ACTION |
| sender_user_id | users(id) | SET NULL | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_internal_mail_category | category | NO | btree |
| idx_internal_mail_created_at | created_at | NO | btree |
| idx_internal_mail_is_deleted | is_deleted | NO | btree |
| idx_internal_mail_is_read | is_read | NO | btree |
| idx_internal_mail_message_type | message_type | NO | btree |
| idx_internal_mail_recipient_user_id | recipient_user_id | NO | btree |
| idx_internal_mail_sender_user_id | sender_user_id | NO | btree |
| idx_internal_mail_user_read_deleted | recipient_user_id, is_read, is_deleted | NO | btree |

### Constraints

- **internal_mail_messages_category_check**: `CHECK (((category)::text = ANY ((ARRAY['system'::character varying, 'notification'::character varying, 'reward'::character varying, 'achievement'::character varying, 'coach_message'::character varying, 'team'::character varying])::text[])))`
- **internal_mail_messages_message_type_check**: `CHECK (((message_type)::text = ANY ((ARRAY['coach_mail'::character varying, 'system_mail'::character varying])::text[])))`
- **internal_mail_messages_priority_check**: `CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('normal'::character varying)::text, ('high'::character varying)::text])))`

---

## inventory_transfers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| from_owner_type | TEXT | NO | - | - |
| from_owner_id | TEXT | NO | - | - |
| to_owner_type | TEXT | NO | - | - |
| to_owner_id | TEXT | NO | - | - |
| item_type | TEXT | NO | - | - |
| item_id | TEXT | NO | - | - |
| quantity | INTEGER | NO | `1` | - |
| transfer_reason | TEXT | YES | `'manual'::text` | - |
| transferred_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| transferred_by | TEXT | YES | - | - |

**Primary Key:** id

### Constraints

- **inventory_transfers_from_owner_type_check**: `CHECK ((from_owner_type = ANY (ARRAY['coach'::text, 'character'::text])))`
- **inventory_transfers_item_type_check**: `CHECK ((item_type = ANY (ARRAY['equipment'::text, 'item'::text])))`
- **inventory_transfers_quantity_check**: `CHECK ((quantity > 0))`
- **inventory_transfers_to_owner_type_check**: `CHECK ((to_owner_type = ANY (ARRAY['coach'::text, 'character'::text])))`

---

## items

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| item_type | TEXT | NO | - | - |
| sub_type | TEXT | YES | - | - |
| rarity | TEXT | NO | - | - |
| consumable | BOOLEAN | YES | `false` | - |
| stackable | BOOLEAN | YES | `true` | - |
| max_stack | INTEGER | YES | `99` | - |
| effects | TEXT | NO | `'[]'::text` | - |
| usage_context | TEXT | YES | `'anytime'::text` | - |
| cooldown_turns | INTEGER | YES | `0` | - |
| shop_price | INTEGER | YES | - | - |
| vendor_sell_price | INTEGER | YES | - | - |
| icon | TEXT | YES | - | - |
| flavor_text | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_items_rarity | rarity | NO | btree |
| idx_items_shop | shop_price | NO | btree |
| idx_items_type | item_type, sub_type | NO | btree |

### Constraints

- **items_rarity_check**: `CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text])))`
- **items_type_check**: `CHECK ((item_type = ANY (ARRAY['consumable'::text, 'material'::text, 'utility'::text])))`

---

## judge_rulings

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('judge_rulings_id_seq'::regclass)` | - |
| battle_id | TEXT | NO | - | - |
| judge_character_id | TEXT | NO | - | - |
| ruling_round | INTEGER | NO | - | - |
| situation | TEXT | NO | - | - |
| ruling | TEXT | NO | - | - |
| reasoning | TEXT | NO | - | - |
| gameplay_effect | TEXT | NO | - | - |
| narrative_impact | TEXT | NO | - | - |
| character_affected_id | TEXT | YES | - | - |
| character_benefited_id | TEXT | YES | - | - |
| character_penalized_id | TEXT | YES | - | - |
| ruling_type | CHARACTER VARYING(50) | YES | - | - |
| severity | CHARACTER VARYING(20) | YES | - | - |
| was_controversial | BOOLEAN | YES | `false` | - |
| character_reactions | JSONB | YES | `'{}'::jsonb` | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| battle_id | battles(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_judge_rulings_affected | character_affected_id | NO | btree |
| idx_judge_rulings_battle | battle_id | NO | btree |
| idx_judge_rulings_benefited | character_benefited_id | NO | btree |
| idx_judge_rulings_characters | character_affected_id, character_benefited_id, character_penalized_id | NO | btree |
| idx_judge_rulings_created | created_at | NO | btree |
| idx_judge_rulings_judge | judge_character_id | NO | btree |
| idx_judge_rulings_penalized | character_penalized_id | NO | btree |
| idx_judge_rulings_type | ruling_type | NO | btree |

---

## locker_achievements

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| achievement_id | TEXT | NO | - | - |
| achievement_name | TEXT | NO | - | - |
| achievement_description | TEXT | YES | - | - |
| progress | INTEGER | YES | `0` | - |
| required | INTEGER | YES | `1` | - |
| completed | BOOLEAN | YES | `false` | - |
| reward_description | TEXT | YES | - | - |
| unlocked_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_achievements_completed | completed | NO | btree |
| idx_achievements_user | user_id | NO | btree |
| locker_achievements_user_id_achievement_id_key | user_id, achievement_id | YES | btree |

---

## locker_auction_sessions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| location | TEXT | NO | - | - |
| locker_number | INTEGER | NO | - | - |
| locker_size | TEXT | YES | `'medium'::text` | - |
| coach_target_min | INTEGER | YES | - | - |
| coach_target_max | INTEGER | YES | - | - |
| coach_absolute_cap | INTEGER | YES | - | - |
| followed_strategy | BOOLEAN | YES | `true` | - |
| went_rogue_at_bid | INTEGER | YES | - | - |
| won_auction | BOOLEAN | YES | `false` | - |
| final_bid | INTEGER | YES | - | - |
| winning_bidder | TEXT | YES | - | - |
| investment | INTEGER | YES | `0` | - |
| total_value | INTEGER | YES | `0` | - |
| net_profit | INTEGER | YES | `0` | - |
| adherence_before | INTEGER | YES | - | - |
| adherence_after | INTEGER | YES | - | - |
| adherence_change | INTEGER | YES | `0` | - |
| items | JSONB | YES | - | - |
| visible_items | JSONB | YES | - | - |
| hints | ARRAY | YES | - | - |
| status | TEXT | YES | `'created'::text` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |
| peek_started_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| bidding_started_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| auction_ended_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| reveal_completed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| completed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_locker_auctions_character | character_id | NO | btree |
| idx_locker_auctions_created | created_at | NO | btree |
| idx_locker_auctions_location | location | NO | btree |
| idx_locker_auctions_status | status | NO | btree |
| idx_locker_auctions_user | user_id | NO | btree |

---

## locker_bid_history

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| auction_id | TEXT | NO | - | - |
| bid_number | INTEGER | NO | - | - |
| bidder | TEXT | NO | - | - |
| bid_amount | INTEGER | NO | - | - |
| is_player | BOOLEAN | YES | `false` | - |
| adherence_roll | INTEGER | YES | - | - |
| adherence_threshold | INTEGER | YES | - | - |
| adherence_passed | BOOLEAN | YES | - | - |
| was_rogue_bid | BOOLEAN | YES | `false` | - |
| rogue_action | TEXT | YES | - | - |
| rogue_reasoning | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| auction_id | locker_auction_sessions(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_bid_history_auction | auction_id | NO | btree |
| idx_bid_history_bid_number | auction_id, bid_number | NO | btree |

---

## locker_daily_locations

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| date | DATE | NO | - | - |
| location | TEXT | NO | - | - |
| special_modifier | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_daily_locations_date | date | NO | btree |
| locker_daily_locations_date_key | date | YES | btree |

---

## locker_item_definitions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| category | TEXT | NO | - | - |
| base_value | INTEGER | NO | `0` | - |
| rarity | TEXT | NO | `'common'::text` | - |
| condition | TEXT | YES | `'fair'::text` | - |
| icon | TEXT | YES | - | - |
| model_3d_path | TEXT | YES | - | - |
| is_equipment | BOOLEAN | YES | `false` | - |
| equipment_id | TEXT | YES | - | - |
| grant_xp | INTEGER | YES | `0` | - |
| special_effect | TEXT | YES | - | - |
| backstory | TEXT | YES | - | - |
| weight_airport | NUMERIC | YES | `0.5` | - |
| weight_subway | NUMERIC | YES | `0.5` | - |
| weight_hotel | NUMERIC | YES | `0.5` | - |
| weight_college | NUMERIC | YES | `0.5` | - |
| weight_police | NUMERIC | YES | `0.5` | - |
| weight_amusement | NUMERIC | YES | `0.5` | - |
| weight_rest_stop | NUMERIC | YES | `0.5` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| equipment_id | equipment(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_locker_items_category | category | NO | btree |
| idx_locker_items_rarity | rarity | NO | btree |
| idx_locker_items_value | base_value | NO | btree |

---

## locker_leaderboards

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| period | TEXT | NO | - | - |
| period_start | DATE | NO | - | - |
| period_end | DATE | YES | - | - |
| total_profit | INTEGER | YES | `0` | - |
| total_invested | INTEGER | YES | `0` | - |
| lockers_won | INTEGER | YES | `0` | - |
| lockers_lost | INTEGER | YES | `0` | - |
| best_find_value | INTEGER | YES | `0` | - |
| best_profit | INTEGER | YES | `0` | - |
| worst_loss | INTEGER | YES | `0` | - |
| rank | INTEGER | YES | - | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_leaderboards_period | period, period_start | NO | btree |
| idx_leaderboards_rank | period, rank | NO | btree |
| idx_leaderboards_user | user_id | NO | btree |
| locker_leaderboards_user_id_character_id_period_period_star_key | user_id, character_id, period, period_start | YES | btree |

---

## locker_rogue_decisions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| auction_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| current_bid | INTEGER | NO | - | - |
| coach_recommendation | TEXT | YES | - | - |
| adherence_score | INTEGER | NO | - | - |
| bond_level | INTEGER | NO | - | - |
| ai_choice | TEXT | NO | - | - |
| ai_reasoning | TEXT | NO | - | - |
| action_taken | TEXT | NO | - | - |
| amount_bid | INTEGER | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `now()` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| auction_id | locker_auction_sessions(id) | CASCADE | NO ACTION |
| character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_rogue_decisions_auction | auction_id | NO | btree |
| idx_rogue_decisions_character | character_id | NO | btree |

---

## memory_entries

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| character_id | TEXT | NO | - | - |
| session_id | TEXT | NO | - | - |
| key | TEXT | NO | - | - |
| value | TEXT | NO | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_memory_entries_char_sess | character_id, session_id | NO | btree |

---

## migration_log

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| version **PK** | INTEGER | NO | - | - |
| name | CHARACTER VARYING(255) | NO | - | - |
| executed_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** version

---

## migration_meta

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| key **PK** | CHARACTER VARYING(255) | NO | - | - |
| value | TEXT | YES | - | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** key

---

## milestone_rewards

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('milestone_rewards_id_seq'::regclass)` | - |
| level | INTEGER | NO | - | - |
| type | CHARACTER VARYING(50) | NO | - | - |
| name | CHARACTER VARYING(255) | NO | - | - |
| description | TEXT | NO | - | - |
| value | INTEGER | YES | - | - |
| icon | CHARACTER VARYING(10) | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_milestone_rewards_level | level | NO | btree |
| milestone_rewards_level_key | level | YES | btree |

### Constraints

- **milestone_rewards_type_check**: `CHECK (((type)::text = ANY ((ARRAY['ability'::character varying, 'stat_boost'::character varying, 'training_points'::character varying, 'currency'::character varying, 'special'::character varying])::text[])))`

---

## power_definitions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| tier | TEXT | NO | - | - |
| category | TEXT | YES | - | - |
| archetype | TEXT | YES | - | - |
| species | TEXT | YES | - | - |
| character_id | TEXT | YES | - | - |
| description | TEXT | NO | - | - |
| flavor_text | TEXT | YES | - | - |
| icon | TEXT | YES | - | - |
| max_rank | INTEGER | NO | `1` | - |
| rank_bonuses | JSONB | YES | - | - |
| unlock_level | INTEGER | YES | - | - |
| unlock_challenge | TEXT | YES | - | - |
| unlock_cost | INTEGER | YES | - | - |
| prerequisite_power_id | TEXT | YES | - | - |
| power_type | TEXT | YES | - | - |
| effects | JSONB | YES | - | - |
| cooldown | INTEGER | YES | `0` | - |
| energy_cost | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| rank_up_cost | INTEGER | YES | `1` | - |
| rank_up_cost_r3 | INTEGER | YES | - | - |
| power_level | INTEGER | YES | - | - |
| range | INTEGER | YES | `5` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| prerequisite_power_id | power_definitions(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_power_definitions_archetype | archetype | NO | btree |
| idx_power_definitions_category | category | NO | btree |
| idx_power_definitions_character | character_id | NO | btree |
| idx_power_definitions_species | species | NO | btree |
| idx_power_definitions_tier | tier | NO | btree |

### Constraints

- **power_definitions_power_level_check**: `CHECK ((power_level = ANY (ARRAY[1, 2, 3])))`
- **power_definitions_power_type_check**: `CHECK ((power_type = ANY (ARRAY['active'::text, 'passive'::text, 'toggle'::text])))`
- **power_definitions_tier_check**: `CHECK ((tier = ANY (ARRAY['skill'::text, 'ability'::text, 'species'::text, 'signature'::text])))`

---

## power_unlock_log

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `((('powlog_'::text || (EXTRACT(epoch FROM now())):...` | - |
| character_id | TEXT | NO | - | - |
| power_id | TEXT | NO | - | - |
| action | TEXT | NO | - | - |
| from_rank | INTEGER | YES | - | - |
| to_rank | INTEGER | YES | - | - |
| triggered_by | TEXT | YES | - | - |
| points_spent | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | user_characters(id) | NO ACTION | NO ACTION |
| power_id | power_definitions(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_power_unlock_log_action | action | NO | btree |
| idx_power_unlock_log_character | character_id | NO | btree |
| idx_power_unlock_log_power | power_id | NO | btree |

### Constraints

- **power_unlock_log_action_check**: `CHECK ((action = ANY (ARRAY['unlock'::text, 'rank_up'::text, 'use'::text])))`

---

## purchases

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_id | TEXT | NO | - | - |
| item_type | TEXT | NO | - | - |
| item_id | TEXT | NO | - | - |
| quantity | INTEGER | NO | `1` | - |
| cost_coins | INTEGER | YES | `0` | - |
| cost_battle_tokens | INTEGER | YES | `0` | - |
| cost_premium_currency | INTEGER | YES | `0` | - |
| transaction_status | TEXT | YES | `'completed'::text` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| completed_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| notes | TEXT | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_purchases_created | created_at | NO | btree |
| idx_purchases_item | item_type, item_id | NO | btree |
| idx_purchases_status | transaction_status | NO | btree |
| idx_purchases_user | user_id | NO | btree |

### Constraints

- **purchases_cost_battle_tokens_check**: `CHECK ((cost_battle_tokens >= 0))`
- **purchases_cost_coins_check**: `CHECK ((cost_coins >= 0))`
- **purchases_cost_premium_currency_check**: `CHECK ((cost_premium_currency >= 0))`
- **purchases_quantity_check**: `CHECK ((quantity > 0))`
- **purchases_transaction_status_check**: `CHECK ((transaction_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])))`

---

## scene_triggers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('scene_triggers_id_seq'::regclass)` | - |
| scene_type | CHARACTER VARYING(20) | YES | - | - |
| hq_tier | CHARACTER VARYING(50) | YES | - | - |
| trigger_text | TEXT | NO | - | - |
| weight | INTEGER | YES | `1` | - |
| domain | CHARACTER VARYING(50) | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_scene_triggers_domain | domain | NO | btree |
| idx_scene_triggers_hq_tier | hq_tier | NO | btree |
| idx_scene_triggers_scene_type | scene_type | NO | btree |

### Constraints

- **scene_triggers_hq_tier_check**: `CHECK (((hq_tier)::text = ANY (ARRAY[('spartan_apartment'::character varying)::text, ('basic_house'::character varying)::text, ('team_mansion'::character varying)::text, ('elite_compound'::character varying)::text])))`
- **scene_triggers_scene_type_check**: `CHECK (((scene_type)::text = ANY (ARRAY[('mundane'::character varying)::text, ('conflict'::character varying)::text, ('chaos'::character varying)::text])))`

---

## session_state

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| sid **PK** | TEXT | NO | - | - |
| payload | JSONB | NO | `'{}'::jsonb` | - |
| ts_updated | TIMESTAMP WITH TIME ZONE | NO | `now()` | - |

**Primary Key:** sid

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_session_state_ts | ts_updated | NO | btree |

---

## signature_attribute_modifiers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| character_id **PK** | CHARACTER VARYING(50) | NO | - | - |
| attribute_name **PK** | CHARACTER VARYING(50) | NO | - | - |
| modifier | INTEGER | NO | - | - |
| source **PK** | CHARACTER VARYING(100) | NO | - | - |
| notes | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** character_id, attribute_name, source

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_signature_modifiers_attribute | attribute_name | NO | btree |
| idx_signature_modifiers_character | character_id | NO | btree |

---

## social_message_reactions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `('reaction_'::text || (gen_random_uuid())::text)` | - |
| message_id | TEXT | YES | - | - |
| reply_id | TEXT | YES | - | - |
| user_id | TEXT | YES | - | - |
| reaction_type | TEXT | NO | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| message_id | social_messages(id) | CASCADE | NO ACTION |
| reply_id | social_message_replies(id) | CASCADE | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_social_reactions_message | message_id | NO | btree |
| idx_social_reactions_user | user_id | NO | btree |
| social_message_reactions_message_id_user_id_reaction_type_key | message_id, user_id, reaction_type | YES | btree |
| social_message_reactions_reply_id_user_id_reaction_type_key | reply_id, user_id, reaction_type | YES | btree |

### Constraints

- **social_message_reactions_check**: `CHECK ((((message_id IS NOT NULL) AND (reply_id IS NULL)) OR ((message_id IS NULL) AND (reply_id IS NOT NULL))))`
- **social_message_reactions_reaction_type_check**: `CHECK ((reaction_type = ANY (ARRAY['like'::text, 'flame'::text])))`

---

## social_message_replies

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `('reply_'::text || (gen_random_uuid())::text)` | - |
| message_id | TEXT | NO | - | - |
| author_type | TEXT | NO | - | - |
| author_user_id | TEXT | YES | - | - |
| author_character_id | TEXT | YES | - | - |
| author_name | TEXT | NO | - | - |
| author_avatar | TEXT | YES | - | - |
| content | TEXT | NO | - | - |
| likes | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| author_character_id | user_characters(id) | NO ACTION | NO ACTION |
| author_user_id | users(id) | CASCADE | NO ACTION |
| message_id | social_messages(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_social_replies_message | message_id | NO | btree |

### Constraints

- **social_message_replies_author_type_check**: `CHECK ((author_type = ANY (ARRAY['coach'::text, 'character'::text, 'ai'::text])))`

---

## social_messages

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `('msg_'::text || (gen_random_uuid())::text)` | - |
| author_type | TEXT | NO | - | - |
| author_user_id | TEXT | YES | - | - |
| author_character_id | TEXT | YES | - | - |
| author_name | TEXT | NO | - | - |
| author_avatar | TEXT | YES | - | - |
| content | TEXT | NO | - | - |
| message_type | TEXT | NO | - | - |
| battle_id | TEXT | YES | - | - |
| target_character_id | TEXT | YES | - | - |
| target_character_name | TEXT | YES | - | - |
| likes | INTEGER | YES | `0` | - |
| flames | INTEGER | YES | `0` | - |
| reply_count | INTEGER | YES | `0` | - |
| is_pinned | BOOLEAN | YES | `false` | - |
| is_ai_generated | BOOLEAN | YES | `false` | - |
| tags | ARRAY | YES | `'{}'::text[]` | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| author_character_id | user_characters(id) | NO ACTION | NO ACTION |
| author_user_id | users(id) | CASCADE | NO ACTION |
| battle_id | battles(id) | SET NULL | NO ACTION |
| target_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_social_messages_author_char | author_character_id | NO | btree |
| idx_social_messages_author_user | author_user_id | NO | btree |
| idx_social_messages_battle | battle_id | NO | btree |
| idx_social_messages_created | created_at | NO | btree |
| idx_social_messages_type | message_type | NO | btree |

### Constraints

- **social_messages_author_type_check**: `CHECK ((author_type = ANY (ARRAY['coach'::text, 'character'::text, 'ai'::text])))`
- **social_messages_message_type_check**: `CHECK ((message_type = ANY (ARRAY['general'::text, 'trash_talk'::text, 'victory_lap'::text, 'challenge'::text, 'strategy'::text, 'complaint'::text, 'defense'::text, 'coach_announcement'::text])))`

---

## species_attribute_modifiers

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| species **PK** | CHARACTER VARYING(50) | NO | - | - |
| attribute_name **PK** | CHARACTER VARYING(50) | NO | - | - |
| modifier | INTEGER | NO | - | - |
| notes | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** species, attribute_name

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_species_modifiers_attribute | attribute_name | NO | btree |
| idx_species_modifiers_species | species | NO | btree |

---

## species_relationships

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| species1 **PK** | CHARACTER VARYING(50) | NO | - | - |
| species2 **PK** | CHARACTER VARYING(50) | NO | - | - |
| base_modifier | INTEGER | YES | `0` | - |
| description | TEXT | YES | - | - |
| created_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** species1, species2

---

## spell_definitions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| description | TEXT | NO | - | - |
| flavor_text | TEXT | YES | - | - |
| archetype | TEXT | YES | - | - |
| species | TEXT | YES | - | - |
| unlock_cost_coins | INTEGER | NO | `100` | - |
| learn_time_seconds | INTEGER | NO | `0` | - |
| required_level | INTEGER | NO | `1` | - |
| mana_cost | INTEGER | NO | `10` | - |
| cooldown_turns | INTEGER | NO | `1` | - |
| charges_per_battle | INTEGER | YES | - | - |
| effects | JSONB | NO | `'{}'::jsonb` | - |
| icon | TEXT | YES | - | - |
| animation | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| max_rank | INTEGER | YES | `1` | - |
| character_id | TEXT | YES | - | - |
| unlock_cost | INTEGER | YES | - | - |
| rank_up_cost | INTEGER | YES | - | - |
| rank_up_cost_r3 | INTEGER | YES | - | - |
| category | TEXT | YES | - | - |
| tier | TEXT | NO | `'universal'::text` | - |
| power_level | INTEGER | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_spell_definitions_archetype | archetype | NO | btree |
| idx_spell_definitions_category | category | NO | btree |
| idx_spell_definitions_character | character_id | NO | btree |
| idx_spell_definitions_level | required_level | NO | btree |
| idx_spell_definitions_species | species | NO | btree |
| idx_spell_definitions_tier | tier | NO | btree |

### Constraints

- **spell_definitions_power_level_check**: `CHECK ((power_level = ANY (ARRAY[1, 2, 3])))`
- **spell_definitions_tier_check**: `CHECK ((tier = ANY (ARRAY['universal'::text, 'archetype'::text, 'species'::text, 'signature'::text])))`

---

## staking_tier_config

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| tier **PK** | USER-DEFINED | NO | - | - |
| min_rarity | TEXT | NO | - | - |
| min_level | INTEGER | NO | `1` | - |
| base_rewards_per_day | INTEGER | NO | - | - |
| xp_multiplier | NUMERIC | NO | - | - |
| unlock_requirements | JSONB | NO | `'{}'::jsonb` | - |
| display_name | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| icon_url | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | NO | `now()` | - |

**Primary Key:** tier

### Constraints

- **positive_tier_rewards**: `CHECK ((base_rewards_per_day > 0))`
- **valid_tier_multiplier**: `CHECK (((xp_multiplier >= 1.00) AND (xp_multiplier <= 3.00)))`

---

## state_digest

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| session_id **PK** | TEXT | NO | - | - |
| text | TEXT | NO | - | - |
| version | TEXT | NO | - | - |
| token_count | INTEGER | NO | - | - |
| updated_at | TIMESTAMP WITH TIME ZONE | YES | `now()` | - |

**Primary Key:** session_id

---

## status_effect_types

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| name | TEXT | NO | - | - |
| category | TEXT | NO | - | - |
| description | TEXT | YES | - | - |
| icon | TEXT | YES | - | - |
| stackable | BOOLEAN | YES | `false` | - |
| cc_diminishing | BOOLEAN | YES | `false` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_status_effect_category | category | NO | btree |

### Constraints

- **status_effect_types_category_check**: `CHECK ((category = ANY (ARRAY['cc'::text, 'buff'::text, 'debuff'::text, 'dot'::text, 'hot'::text])))`

---

## team_chat_logs

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| team_id | UUID | NO | - | - |
| speaker_character_id | TEXT | NO | - | - |
| message | TEXT | NO | - | - |
| message_type | CHARACTER VARYING(20) | YES | `'chat'::character varying` | - |
| coach_triggered | BOOLEAN | YES | `false` | - |
| topic | CHARACTER VARYING(100) | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| speaker_character_id | user_characters(id) | NO ACTION | NO ACTION |
| team_id | teams(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_chat_speaker | speaker_character_id | NO | btree |
| idx_team_chat_team | team_id, created_at | NO | btree |

---

## team_context

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('team_context_id_seq'::regclass)` | - |
| hq_tier | CHARACTER VARYING(50) | YES | `'basic_house'::character varying` | - |
| current_scene_type | CHARACTER VARYING(20) | YES | `'mundane'::character varying` | - |
| current_time_of_day | CHARACTER VARYING(20) | YES | `'afternoon'::character varying` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| master_bed_character_id | CHARACTER VARYING(255) | YES | - | - |
| team_id | UUID | YES | - | - |
| active_teammates | ARRAY | YES | `'{}'::text[]` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| team_id | teams(id) | CASCADE | NO ACTION |
| master_bed_character_id | characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_context_master_bed_character | master_bed_character_id | NO | btree |
| idx_team_context_team_id | team_id | NO | btree |
| team_context_team_id_key | team_id | YES | btree |

### Constraints

- **team_context_current_scene_type_check**: `CHECK (((current_scene_type)::text = ANY (ARRAY[('mundane'::character varying)::text, ('conflict'::character varying)::text, ('chaos'::character varying)::text])))`
- **team_context_current_time_of_day_check**: `CHECK (((current_time_of_day)::text = ANY (ARRAY[('morning'::character varying)::text, ('afternoon'::character varying)::text, ('evening'::character varying)::text, ('night'::character varying)::text])))`
- **team_context_hq_tier_check**: `CHECK (((hq_tier)::text = ANY (ARRAY[('spartan_apartment'::character varying)::text, ('basic_house'::character varying)::text, ('team_mansion'::character varying)::text, ('elite_compound'::character varying)::text])))`
- **team_context_scene_type_check**: `CHECK (((current_scene_type)::text = ANY (ARRAY[('mundane'::character varying)::text, ('conflict'::character varying)::text, ('chaos'::character varying)::text])))`
- **team_context_time_of_day_check**: `CHECK (((current_time_of_day)::text = ANY (ARRAY[('morning'::character varying)::text, ('afternoon'::character varying)::text, ('evening'::character varying)::text, ('night'::character varying)::text])))`

---

## team_equipment_pool

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| equipment_id | TEXT | NO | - | - |
| is_available | BOOLEAN | YES | `true` | - |
| loaned_to_character_id | TEXT | YES | - | - |
| loaned_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| acquired_from | TEXT | YES | `'coach_purchase'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| equipment_id | equipment(id) | CASCADE | NO ACTION |
| loaned_to_character_id | user_characters(id) | NO ACTION | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_equipment_pool_available | is_available | NO | btree |
| idx_team_equipment_pool_equipment | equipment_id | NO | btree |
| idx_team_equipment_pool_loaned_to | loaned_to_character_id | NO | btree |
| idx_team_equipment_pool_user | user_id | NO | btree |
| team_equipment_pool_user_id_equipment_id_key | user_id, equipment_id | YES | btree |

---

## team_equipment_shared

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| team_id | UUID | NO | - | - |
| equipment_id | TEXT | NO | - | - |
| currently_held_by | TEXT | YES | - | - |
| last_transferred_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| transfer_count | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| currently_held_by | user_characters(id) | NO ACTION | NO ACTION |
| team_id | teams(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_equipment_holder | currently_held_by | NO | btree |
| idx_team_equipment_team | team_id | NO | btree |

---

## team_events

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| team_id | UUID | NO | - | - |
| event_type | CHARACTER VARYING(50) | NO | - | - |
| event_description | TEXT | NO | - | - |
| impact_on_chemistry | INTEGER | YES | `0` | - |
| characters_involved | ARRAY | NO | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| team_id | teams(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_events_team | team_id, created_at | NO | btree |

---

## team_relationships

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| team_id | UUID | NO | - | - |
| chemistry_score | INTEGER | YES | `50` | - |
| total_battles | INTEGER | YES | `0` | - |
| total_victories | INTEGER | YES | `0` | - |
| conflicts_resolved | INTEGER | YES | `0` | - |
| conflicts_unresolved | INTEGER | YES | `0` | - |
| shared_activities | INTEGER | YES | `0` | - |
| relationship_bonuses | JSONB | YES | `'{}'::jsonb` | - |
| relationship_penalties | JSONB | YES | `'{}'::jsonb` | - |
| last_activity_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| total_losses | INTEGER | YES | `0` | - |
| win_percentage | REAL | YES | `0.0` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| team_id | teams(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_team_relationships_team | team_id | NO | btree |
| team_relationships_team_id_key | team_id | YES | btree |

### Constraints

- **team_relationships_chemistry_score_check**: `CHECK (((chemistry_score >= 0) AND (chemistry_score <= 100)))`
- **team_relationships_total_losses_check**: `CHECK ((total_losses >= 0))`
- **team_relationships_win_percentage_check**: `CHECK (((win_percentage >= (0.0)::double precision) AND (win_percentage <= (100.0)::double precision)))`

---

## teams

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_id | TEXT | NO | - | - |
| team_name | CHARACTER VARYING(100) | YES | - | - |
| character_slot_1 | TEXT | YES | - | - |
| character_slot_2 | TEXT | YES | - | - |
| character_slot_3 | TEXT | YES | - | - |
| is_active | BOOLEAN | YES | `false` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| wins | INTEGER | YES | `0` | - |
| losses | INTEGER | YES | `0` | - |
| battles_played | INTEGER | YES | `0` | - |
| last_battle_date | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_slot_1 | user_characters(id) | NO ACTION | NO ACTION |
| character_slot_2 | user_characters(id) | NO ACTION | NO ACTION |
| character_slot_3 | user_characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_one_active_team_per_user | user_id, is_active | YES | btree |
| idx_teams_active | user_id, is_active | NO | btree |
| idx_teams_last_battle_date | last_battle_date | NO | btree |
| idx_teams_user_id | user_id | NO | btree |

### Constraints

- **teams_battles_played_check**: `CHECK ((battles_played >= 0))`
- **teams_losses_check**: `CHECK ((losses >= 0))`
- **teams_wins_check**: `CHECK ((wins >= 0))`

---

## ticket_transactions

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| transaction_type | CHARACTER VARYING(20) | NO | - | - |
| amount | INTEGER | NO | - | - |
| source | CHARACTER VARYING(50) | NO | - | - |
| description | TEXT | YES | - | - |
| metadata | JSONB | YES | `'{}'::jsonb` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_ticket_transactions_created | created_at | NO | btree |
| idx_ticket_transactions_source | source | NO | btree |
| idx_ticket_transactions_type | transaction_type | NO | btree |
| idx_ticket_transactions_user | user_id | NO | btree |
| idx_ticket_transactions_user_created | user_id, created_at | NO | btree |

### Constraints

- **ticket_transactions_transaction_type_check**: `CHECK (((transaction_type)::text = ANY (ARRAY[('earned'::character varying)::text, ('purchased'::character varying)::text, ('spent'::character varying)::text, ('daily_reset'::character varying)::text, ('hourly_refresh'::character varying)::text])))`

---

## tmp_user_characters_backup

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id | TEXT | YES | - | - |
| user_id | TEXT | YES | - | - |
| character_id | TEXT | YES | - | - |
| serial_number | TEXT | YES | - | - |
| nickname | TEXT | YES | - | - |
| level | INTEGER | YES | - | - |
| experience | INTEGER | YES | - | - |
| bond_level | INTEGER | YES | - | - |
| total_battles | INTEGER | YES | - | - |
| total_wins | INTEGER | YES | - | - |
| current_health | INTEGER | YES | - | - |
| max_health | INTEGER | YES | - | - |
| is_injured | BOOLEAN | YES | - | - |
| injury_severity | TEXT | YES | - | - |
| is_dead | BOOLEAN | YES | - | - |
| death_timestamp | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| recovery_time | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| resurrection_available_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| death_count | INTEGER | YES | - | - |
| pre_death_level | INTEGER | YES | - | - |
| pre_death_experience | INTEGER | YES | - | - |
| equipment | TEXT | YES | - | - |
| enhancements | TEXT | YES | - | - |
| conversation_memory | TEXT | YES | - | - |
| significant_memories | TEXT | YES | - | - |
| personality_drift | TEXT | YES | - | - |
| wallet | INTEGER | YES | - | - |
| financial_stress | INTEGER | YES | - | - |
| coach_trust_level | INTEGER | YES | - | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| last_battle_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| gameplan_adherence | INTEGER | YES | - | - |
| current_mental_health | INTEGER | YES | - | - |
| stress_level | INTEGER | YES | - | - |
| team_trust | INTEGER | YES | - | - |
| battle_focus | INTEGER | YES | - | - |
| current_training | INTEGER | YES | - | - |
| current_team_player | INTEGER | YES | - | - |
| current_ego | INTEGER | YES | - | - |
| current_communication | INTEGER | YES | - | - |
| fatigue_level | INTEGER | YES | - | - |
| morale | INTEGER | YES | - | - |
| starter_gear_given | BOOLEAN | YES | - | - |
| level_bonus_attack | INTEGER | YES | - | - |
| level_bonus_defense | INTEGER | YES | - | - |
| level_bonus_speed | INTEGER | YES | - | - |
| level_bonus_max_health | INTEGER | YES | - | - |
| level_bonus_special | INTEGER | YES | - | - |
| agent_key | CHARACTER VARYING(50) | YES | - | - |

---

## universal_attribute_base

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| attribute_name **PK** | CHARACTER VARYING(50) | NO | - | - |
| base_value | INTEGER | NO | `50` | - |
| description | TEXT | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** attribute_name

---

## user_character_echoes

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `uuid_generate_v4()` | - |
| user_id | TEXT | NO | - | - |
| character_template_id | CHARACTER VARYING(50) | NO | - | - |
| echo_count | INTEGER | YES | `0` | - |
| total_echoes_ever | INTEGER | YES | `0` | - |
| last_conversion_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| total_converted_to_currency | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_character_echoes_character | character_template_id | NO | btree |
| idx_user_character_echoes_count | echo_count | NO | btree |
| idx_user_character_echoes_user | user_id | NO | btree |
| user_character_echoes_user_id_character_template_id_key | user_id, character_template_id | YES | btree |

### Constraints

- **user_character_echoes_echo_count_check**: `CHECK ((echo_count >= 0))`

---

## user_characters

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| serial_number | TEXT | YES | - | - |
| nickname | TEXT | YES | - | - |
| level | INTEGER | YES | `1` | - |
| experience | INTEGER | YES | `0` | - |
| bond_level | INTEGER | YES | `0` | - |
| total_battles | INTEGER | YES | `0` | - |
| total_wins | INTEGER | YES | `0` | - |
| current_health | INTEGER | NO | - | - |
| max_health | INTEGER | NO | - | - |
| is_injured | BOOLEAN | YES | `false` | - |
| recovery_time | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| equipment | TEXT | YES | `'[]'::text` | - |
| enhancements | TEXT | YES | `'[]'::text` | - |
| conversation_memory | TEXT | YES | `'[]'::text` | - |
| significant_memories | TEXT | YES | `'[]'::text` | - |
| personality_drift | TEXT | YES | `'{}'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| last_battle_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| wallet | INTEGER | YES | - | - |
| is_dead | BOOLEAN | YES | `false` | - |
| death_timestamp | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| resurrection_available_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| death_count | INTEGER | YES | `0` | - |
| pre_death_level | INTEGER | YES | - | - |
| pre_death_experience | INTEGER | YES | - | - |
| current_attack | INTEGER | YES | `50` | - |
| current_defense | INTEGER | YES | `50` | - |
| current_speed | INTEGER | YES | `50` | - |
| current_special | INTEGER | YES | `50` | - |
| current_max_health | INTEGER | YES | `100` | - |
| current_training | INTEGER | NO | `75` | - |
| current_team_player | INTEGER | NO | `70` | - |
| current_ego | INTEGER | NO | `60` | - |
| current_mental_health | INTEGER | NO | `85` | - |
| current_communication | INTEGER | YES | `80` | - |
| stress_level | INTEGER | YES | `0` | - |
| fatigue_level | INTEGER | YES | `0` | - |
| morale | INTEGER | YES | `80` | - |
| starter_gear_given | BOOLEAN | YES | `false` | - |
| level_bonus_attack | INTEGER | YES | `0` | - |
| level_bonus_defense | INTEGER | YES | `0` | - |
| level_bonus_speed | INTEGER | YES | `0` | - |
| level_bonus_max_health | INTEGER | YES | `0` | - |
| level_bonus_special | INTEGER | YES | `0` | - |
| equipment_budget | INTEGER | YES | `0` | - |
| consumables_budget | INTEGER | YES | `0` | - |
| financial_personality | JSONB | YES | - | - |
| wallet_cents | INTEGER | NO | `0` | - |
| debt_principal_cents | INTEGER | NO | `0` | - |
| monthly_earnings_cents | INTEGER | NO | `0` | - |
| recent_decisions | JSONB | YES | `'[]'::jsonb` | - |
| monthly_earnings | INTEGER | YES | - | - |
| debt | INTEGER | YES | - | - |
| sleeping_arrangement | CHARACTER VARYING(50) | YES | `'bunk_bed'::character varying` | - |
| headquarters_id | UUID | YES | - | - |
| confidence_level | INTEGER | YES | `50` | - |
| skill_points_deprecated | INTEGER | YES | `0` | - |
| archetype_points_deprecated | INTEGER | YES | `0` | - |
| species_points_deprecated | INTEGER | YES | `0` | - |
| signature_points_deprecated | INTEGER | YES | `0` | - |
| current_energy | INTEGER | YES | `100` | - |
| max_energy | INTEGER | YES | `100` | - |
| current_mana | INTEGER | YES | `100` | - |
| max_mana | INTEGER | YES | `100` | - |
| energy_regen_rate | INTEGER | YES | `10` | - |
| mana_regen_rate | INTEGER | YES | `10` | - |
| character_points | INTEGER | YES | `0` | - |
| total_losses | INTEGER | YES | `0` | - |
| win_percentage | REAL | YES | `0.0` | - |
| attribute_points | INTEGER | YES | `0` | - |
| attribute_allocations | JSONB | YES | `'{}'::jsonb` | - |
| attribute_pending_survey | JSONB | YES | - | - |
| financial_stress | INTEGER | YES | - | YES: `LEAST((100)::numeric, GREATEST...` |
| weight_class | INTEGER | YES | - | YES: `((level * 10) + (total_battles...` |
| coach_lockout_until | TIMESTAMP WITH TIME ZONE | YES | - | - |
| coach_trust_level | INTEGER | YES | - | YES: `LEAST((100)::numeric, GREATEST...` |
| base_initiative | INTEGER | YES | - | - |
| current_initiative | INTEGER | YES | - | YES: `GREATEST((1)::numeric, round((...` |
| gameplan_adherence | INTEGER | YES | - | YES: `GREATEST((0)::numeric, LEAST((...` |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_characters_current_initiative | current_initiative | NO | btree |
| idx_user_characters_gameplan_adherence | gameplan_adherence | NO | btree |
| idx_user_characters_lockout | coach_lockout_until | NO | btree |
| idx_user_characters_weight_class | weight_class | NO | btree |
| user_characters_new_character_id_idx | character_id | NO | btree |
| user_characters_new_character_points_idx | character_points | NO | btree |
| user_characters_new_current_energy_idx | current_energy | NO | btree |
| user_characters_new_current_mana_idx | current_mana | NO | btree |
| user_characters_new_current_mental_health_stress_level_fati_idx | current_mental_health, stress_level, fatigue_level, morale | NO | btree |
| user_characters_new_headquarters_id_idx | headquarters_id | NO | btree |
| user_characters_new_is_dead_idx | is_dead | NO | btree |
| user_characters_new_level_bonus_attack_level_bonus_defense__idx | level_bonus_attack, level_bonus_defense, level_bonus_speed, level_bonus_max_health | NO | btree |
| user_characters_new_nickname_idx | nickname | NO | btree |
| user_characters_new_resurrection_available_at_idx | resurrection_available_at | NO | btree |
| user_characters_new_serial_number_idx | serial_number | NO | btree |
| user_characters_new_serial_number_key | serial_number | YES | btree |
| user_characters_new_user_id_idx | user_id | NO | btree |

### Constraints

- **consumables_budget_positive**: `CHECK ((consumables_budget >= 0))`
- **equipment_budget_positive**: `CHECK ((equipment_budget >= 0))`
- **user_characters_archetype_points_check**: `CHECK ((archetype_points_deprecated >= 0))`
- **user_characters_character_points_check**: `CHECK ((character_points >= 0))`
- **user_characters_coach_trust_check**: `CHECK (((coach_trust_level >= 0) AND (coach_trust_level <= 100)))`
- **user_characters_confidence_level_check**: `CHECK ((confidence_level >= 0))`
- **user_characters_current_communication_check**: `CHECK ((current_communication >= 0))`
- **user_characters_current_ego_check**: `CHECK ((current_ego >= 0))`
- **user_characters_current_mental_health_check**: `CHECK ((current_mental_health >= 0))`
- **user_characters_current_team_player_check**: `CHECK ((current_team_player >= 0))`
- **user_characters_current_training_check**: `CHECK ((current_training >= 0))`
- **user_characters_fatigue_level_check**: `CHECK ((fatigue_level >= 0))`
- **user_characters_level_bonus_attack_check**: `CHECK ((level_bonus_attack >= 0))`
- **user_characters_level_bonus_defense_check**: `CHECK ((level_bonus_defense >= 0))`
- **user_characters_level_bonus_max_health_check**: `CHECK ((level_bonus_max_health >= 0))`
- **user_characters_level_bonus_special_check**: `CHECK ((level_bonus_special >= 0))`
- **user_characters_level_bonus_speed_check**: `CHECK ((level_bonus_speed >= 0))`
- **user_characters_morale_check**: `CHECK ((morale >= 0))`
- **user_characters_resurrection_check**: `CHECK (((resurrection_available_at IS NULL) OR (is_dead = true)))`
- **user_characters_signature_points_check**: `CHECK ((signature_points_deprecated >= 0))`
- **user_characters_skill_points_check**: `CHECK ((skill_points_deprecated >= 0))`
- **user_characters_species_points_check**: `CHECK ((species_points_deprecated >= 0))`
- **user_characters_stress_level_check**: `CHECK ((stress_level >= 0))`
- **user_characters_total_losses_check**: `CHECK ((total_losses >= 0))`
- **user_characters_wallet_check**: `CHECK ((wallet >= 0))`
- **user_characters_win_percentage_check**: `CHECK (((win_percentage >= (0.0)::double precision) AND (win_percentage <= (100.0)::double precision)))`

---

## user_characters_old

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| character_id | TEXT | NO | - | - |
| serial_number | TEXT | YES | - | - |
| nickname | TEXT | YES | - | - |
| level | INTEGER | YES | `1` | - |
| experience | INTEGER | YES | `0` | - |
| bond_level | INTEGER | YES | `0` | - |
| total_battles | INTEGER | YES | `0` | - |
| total_wins | INTEGER | YES | `0` | - |
| current_health | INTEGER | NO | - | - |
| max_health | INTEGER | NO | - | - |
| is_injured | BOOLEAN | YES | `false` | - |
| recovery_time | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| equipment | TEXT | YES | `'[]'::text` | - |
| enhancements | TEXT | YES | `'[]'::text` | - |
| conversation_memory | TEXT | YES | `'[]'::text` | - |
| significant_memories | TEXT | YES | `'[]'::text` | - |
| personality_drift | TEXT | YES | `'{}'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| last_battle_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| wallet | INTEGER | YES | - | - |
| is_dead | BOOLEAN | YES | `false` | - |
| death_timestamp | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| resurrection_available_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| death_count | INTEGER | YES | `0` | - |
| pre_death_level | INTEGER | YES | - | - |
| pre_death_experience | INTEGER | YES | - | - |
| current_attack | INTEGER | YES | `50` | - |
| current_defense | INTEGER | YES | `50` | - |
| current_speed | INTEGER | YES | `50` | - |
| current_special | INTEGER | YES | `50` | - |
| current_max_health | INTEGER | YES | `100` | - |
| current_training | INTEGER | NO | `75` | - |
| current_team_player | INTEGER | NO | `70` | - |
| current_ego | INTEGER | NO | `60` | - |
| current_mental_health | INTEGER | NO | `85` | - |
| current_communication | INTEGER | YES | `80` | - |
| stress_level | INTEGER | YES | `0` | - |
| fatigue_level | INTEGER | YES | `0` | - |
| morale | INTEGER | YES | `80` | - |
| starter_gear_given | BOOLEAN | YES | `false` | - |
| level_bonus_attack | INTEGER | YES | `0` | - |
| level_bonus_defense | INTEGER | YES | `0` | - |
| level_bonus_speed | INTEGER | YES | `0` | - |
| level_bonus_max_health | INTEGER | YES | `0` | - |
| level_bonus_special | INTEGER | YES | `0` | - |
| equipment_budget | INTEGER | YES | `0` | - |
| consumables_budget | INTEGER | YES | `0` | - |
| financial_personality | JSONB | YES | - | - |
| wallet_cents | INTEGER | NO | `0` | - |
| debt_principal_cents | INTEGER | NO | `0` | - |
| monthly_earnings_cents | INTEGER | NO | `0` | - |
| recent_decisions | JSONB | YES | `'[]'::jsonb` | - |
| monthly_earnings | INTEGER | YES | - | - |
| debt | INTEGER | YES | - | - |
| sleeping_arrangement | CHARACTER VARYING(50) | YES | `'bunk_bed'::character varying` | - |
| headquarters_id | UUID | YES | - | - |
| confidence_level | INTEGER | YES | `50` | - |
| skill_points_deprecated | INTEGER | YES | `0` | - |
| archetype_points_deprecated | INTEGER | YES | `0` | - |
| species_points_deprecated | INTEGER | YES | `0` | - |
| signature_points_deprecated | INTEGER | YES | `0` | - |
| current_energy | INTEGER | YES | `100` | - |
| max_energy | INTEGER | YES | `100` | - |
| current_mana | INTEGER | YES | `100` | - |
| max_mana | INTEGER | YES | `100` | - |
| energy_regen_rate | INTEGER | YES | `10` | - |
| mana_regen_rate | INTEGER | YES | `10` | - |
| character_points | INTEGER | YES | `0` | - |
| total_losses | INTEGER | YES | `0` | - |
| win_percentage | REAL | YES | `0.0` | - |
| attribute_points | INTEGER | YES | `0` | - |
| attribute_allocations | JSONB | YES | `'{}'::jsonb` | - |
| attribute_pending_survey | JSONB | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| character_id | characters(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_characters_character_id | character_id | NO | btree |
| idx_user_characters_character_points | character_points | NO | btree |
| idx_user_characters_energy | current_energy | NO | btree |
| idx_user_characters_hq | headquarters_id | NO | btree |
| idx_user_characters_is_dead | is_dead | NO | btree |
| idx_user_characters_level_bonuses | level_bonus_attack, level_bonus_defense, level_bonus_speed, level_bonus_max_health | NO | btree |
| idx_user_characters_mana | current_mana | NO | btree |
| idx_user_characters_nickname | nickname | NO | btree |
| idx_user_characters_psychstats | current_mental_health, stress_level, fatigue_level, morale | NO | btree |
| idx_user_characters_resurrection | resurrection_available_at | NO | btree |
| idx_user_characters_serial | serial_number | NO | btree |
| idx_user_characters_user_id | user_id | NO | btree |
| user_characters_serial_number_key | serial_number | YES | btree |

### Constraints

- **consumables_budget_positive**: `CHECK ((consumables_budget >= 0))`
- **equipment_budget_positive**: `CHECK ((equipment_budget >= 0))`
- **user_characters_archetype_points_check**: `CHECK ((archetype_points_deprecated >= 0))`
- **user_characters_character_points_check**: `CHECK ((character_points >= 0))`
- **user_characters_confidence_level_check**: `CHECK ((confidence_level >= 0))`
- **user_characters_current_communication_check**: `CHECK ((current_communication >= 0))`
- **user_characters_current_ego_check**: `CHECK ((current_ego >= 0))`
- **user_characters_current_mental_health_check**: `CHECK ((current_mental_health >= 0))`
- **user_characters_current_team_player_check**: `CHECK ((current_team_player >= 0))`
- **user_characters_current_training_check**: `CHECK ((current_training >= 0))`
- **user_characters_fatigue_level_check**: `CHECK ((fatigue_level >= 0))`
- **user_characters_level_bonus_attack_check**: `CHECK ((level_bonus_attack >= 0))`
- **user_characters_level_bonus_defense_check**: `CHECK ((level_bonus_defense >= 0))`
- **user_characters_level_bonus_max_health_check**: `CHECK ((level_bonus_max_health >= 0))`
- **user_characters_level_bonus_special_check**: `CHECK ((level_bonus_special >= 0))`
- **user_characters_level_bonus_speed_check**: `CHECK ((level_bonus_speed >= 0))`
- **user_characters_morale_check**: `CHECK ((morale >= 0))`
- **user_characters_resurrection_check**: `CHECK (((resurrection_available_at IS NULL) OR (is_dead = true)))`
- **user_characters_signature_points_check**: `CHECK ((signature_points_deprecated >= 0))`
- **user_characters_skill_points_check**: `CHECK ((skill_points_deprecated >= 0))`
- **user_characters_species_points_check**: `CHECK ((species_points_deprecated >= 0))`
- **user_characters_stress_level_check**: `CHECK ((stress_level >= 0))`
- **user_characters_total_losses_check**: `CHECK ((total_losses >= 0))`
- **user_characters_wallet_check**: `CHECK ((wallet >= 0))`
- **user_characters_win_percentage_check**: `CHECK (((win_percentage >= (0.0)::double precision) AND (win_percentage <= (100.0)::double precision)))`

---

## user_currency

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| user_id **PK** | TEXT | NO | - | - |
| battle_tokens | INTEGER | YES | `100` | - |
| premium_currency | INTEGER | YES | `0` | - |
| last_updated | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| coins | INTEGER | YES | `1000` | - |

**Primary Key:** user_id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_currency_premium | premium_currency | NO | btree |
| idx_user_currency_tokens | battle_tokens | NO | btree |
| idx_user_currency_user_id | user_id | NO | btree |

### Constraints

- **user_currency_coins_check**: `CHECK ((coins >= 0))`

---

## user_daily_stats

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | INTEGER | NO | `nextval('user_daily_stats_id_seq'::regclass)` | - |
| user_id | UUID | NO | - | - |
| date | DATE | NO | - | - |
| daily_turn_count | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| user_daily_stats_user_id_date_key | user_id, date | YES | btree |

---

## user_equipment

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| user_id | TEXT | NO | - | - |
| equipment_id | TEXT | NO | - | - |
| is_equipped | BOOLEAN | YES | `false` | - |
| equipped_to_character_id | TEXT | YES | - | - |
| current_level | INTEGER | YES | `1` | - |
| enhancement_level | INTEGER | YES | `0` | - |
| custom_stats | TEXT | YES | `'{}'::text` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| acquired_from | TEXT | YES | - | - |
| purchase_price | INTEGER | YES | - | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| equipment_id | equipment(id) | NO ACTION | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_equipment_character_slot | equipped_to_character_id, is_equipped | NO | btree |
| idx_user_equipment_equipment | equipment_id | NO | btree |
| idx_user_equipment_equipped | equipped_to_character_id | NO | btree |
| idx_user_equipment_user | user_id | NO | btree |

---

## user_headquarters

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| tier_id | TEXT | YES | `'spartan_apartment'::text` | - |
| coins | INTEGER | YES | `50000` | - |
| gems | INTEGER | YES | `100` | - |
| unlocked_themes | JSONB | YES | `'[]'::jsonb` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| is_primary | BOOLEAN | YES | `true` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_one_primary_hq_per_user | user_id | YES | btree |
| idx_user_headquarters_tier | tier_id | NO | btree |
| idx_user_headquarters_user | user_id | NO | btree |

### Constraints

- **user_headquarters_coins_check**: `CHECK ((coins >= 0))`
- **user_headquarters_gems_check**: `CHECK ((gems >= 0))`
- **user_headquarters_tier_id_check**: `CHECK ((tier_id = ANY (ARRAY['spartan_apartment'::text, 'luxury_suite'::text, 'team_compound'::text, 'fortress_headquarters'::text])))`

---

## user_items

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | UUID | NO | `gen_random_uuid()` | - |
| user_id | TEXT | NO | - | - |
| item_id | TEXT | NO | - | - |
| quantity | INTEGER | NO | `1` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| acquired_from | TEXT | YES | `'shop'::text` | - |
| character_id | TEXT | YES | - | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| item_id | items(id) | CASCADE | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_items_acquired | acquired_at | NO | btree |
| idx_user_items_item | item_id | NO | btree |
| idx_user_items_user | user_id | NO | btree |
| user_items_user_id_item_id_key | user_id, item_id | YES | btree |

### Constraints

- **user_items_quantity_check**: `CHECK ((quantity >= 0))`

---

## user_spells

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | `(gen_random_uuid())::text` | - |
| user_id | TEXT | NO | - | - |
| spell_id | TEXT | NO | - | - |
| is_learned | BOOLEAN | NO | `false` | - |
| learning_started_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| learned_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| times_used | INTEGER | NO | `0` | - |
| proficiency_level | INTEGER | NO | `1` | - |
| total_damage_dealt | INTEGER | NO | `0` | - |
| total_healing_done | INTEGER | NO | `0` | - |
| acquired_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| spell_id | spell_definitions(id) | CASCADE | NO ACTION |
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_spells_learned | user_id, is_learned | NO | btree |
| idx_user_spells_learning | user_id, is_learned, learning_started_at | NO | btree |
| idx_user_spells_spell_id | spell_id | NO | btree |
| idx_user_spells_user_id | user_id | NO | btree |
| user_spells_user_id_spell_id_key | user_id, spell_id | YES | btree |

### Constraints

- **user_spells_proficiency_level_check**: `CHECK (((proficiency_level >= 1) AND (proficiency_level <= 10)))`

---

## user_tickets

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| user_id **PK** | TEXT | NO | - | - |
| current_tickets | INTEGER | YES | `18` | - |
| last_hourly_refresh | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| last_daily_reset | DATE | YES | `CURRENT_DATE` | - |
| total_earned | INTEGER | YES | `0` | - |
| total_purchased | INTEGER | YES | `0` | - |
| total_spent | INTEGER | YES | `0` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |

**Primary Key:** user_id

### Foreign Keys

| Column | References | On Delete | On Update |
|--------|------------|-----------|----------|
| user_id | users(id) | CASCADE | NO ACTION |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_user_tickets_refresh | last_hourly_refresh | NO | btree |
| idx_user_tickets_reset | last_daily_reset | NO | btree |
| idx_user_tickets_user | user_id | NO | btree |

### Constraints

- **user_tickets_current_tickets_check**: `CHECK ((current_tickets >= 0))`
- **user_tickets_total_earned_check**: `CHECK ((total_earned >= 0))`
- **user_tickets_total_purchased_check**: `CHECK ((total_purchased >= 0))`
- **user_tickets_total_spent_check**: `CHECK ((total_spent >= 0))`

---

## users

### Columns

| Column | Type | Nullable | Default | Generated |
|--------|------|----------|---------|----------|
| id **PK** | TEXT | NO | - | - |
| username | TEXT | NO | - | - |
| email | TEXT | NO | - | - |
| password_hash | TEXT | YES | - | - |
| subscription_tier | TEXT | YES | `'free'::text` | - |
| subscription_expires_at | TIMESTAMP WITHOUT TIME ZONE | YES | - | - |
| level | INTEGER | YES | `1` | - |
| experience | INTEGER | YES | `0` | - |
| total_battles | INTEGER | YES | `0` | - |
| total_wins | INTEGER | YES | `0` | - |
| rating | INTEGER | YES | `1000` | - |
| daily_chat_count | INTEGER | YES | `0` | - |
| daily_chat_reset_date | TEXT | YES | `''::text` | - |
| daily_image_count | INTEGER | YES | `0` | - |
| daily_image_reset_date | TEXT | YES | `''::text` | - |
| daily_battle_count | INTEGER | YES | `0` | - |
| daily_battle_reset_date | TEXT | YES | `''::text` | - |
| daily_training_count | INTEGER | YES | `0` | - |
| daily_training_reset_date | TEXT | YES | `''::text` | - |
| character_slot_capacity | INTEGER | YES | `6` | - |
| created_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| updated_at | TIMESTAMP WITHOUT TIME ZONE | YES | `CURRENT_TIMESTAMP` | - |
| coins | INTEGER | NO | `0` | - |
| lifetime_turn_count | INTEGER | YES | `0` | - |
| timezone | CHARACTER VARYING(100) | YES | `'America/New_York'::character varying` | - |
| total_losses | INTEGER | YES | `0` | - |
| win_percentage | REAL | YES | `0.0` | - |

**Primary Key:** id

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_users_email | email | NO | btree |
| idx_users_rating | rating | NO | btree |
| idx_users_training | daily_training_count, daily_training_reset_date | NO | btree |
| idx_users_username | username | NO | btree |
| users_email_key | email | YES | btree |
| users_username_key | username | YES | btree |

### Constraints

- **users_rating_check**: `CHECK ((rating >= 0))`
- **users_subscription_tier_check**: `CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'legendary'::text])))`
- **users_total_losses_check**: `CHECK ((total_losses >= 0))`
- **users_win_percentage_check**: `CHECK (((win_percentage >= (0.0)::double precision) AND (win_percentage <= (100.0)::double precision)))`

---

