# TEXT → UUID Migration Analysis
**Date**: 2025-12-21
**Context**: Massive refactoring 2 days ago to convert columns from TEXT to UUID
**Issue**: Many tables still have TEXT columns storing UUID values, causing JOIN failures

---

## Executive Summary

**Root Cause of Current Crash**:
- `get_full_character_data()` function fails at line 559 (migration 242)
- JOIN: `battles.id` (UUID) = `battle_participants.battle_id` (TEXT) with no cast
- Error: "operator does not exist: uuid = text"

**Key Finding**:
- `user_characters.id` = UUID (user-specific character instances)
- `characters.id` = TEXT (canonical character names like "dracula", "achilles")
- Many tables store UUID values in TEXT columns, breaking type-safe JOINs

---

## Schema Design Principles

### When to use UUID (user_characters.id)
Store UUID when tracking:
- Specific user character instances with individual stats/levels
- Data that varies per user (Bob's Dracula vs Alice's Dracula)
- Battle participants, equipment, decisions, memories, etc.

### When to use TEXT (characters.id)
Store TEXT canonical names when tracking:
- Character templates/definitions (power_definitions, spell_definitions)
- Character-type bonuses (therapist_bonuses, judge_bonuses)
- Generic character data (domain_context)

---

## Tables Requiring TEXT → UUID Conversion

### CRITICAL (Breaking get_full_character_data)

#### battle_participants
- **Column**: `character_id` (TEXT) → should be UUID
- **Column**: `battle_id` (TEXT) → should be UUID
- **Current values**: UUIDs (verified 18/18 match user_characters.id)
- **References**: user_characters.id, battles.id
- **Impact**: Breaks recent_opponents query in get_full_character_data

#### battle_actions
- **Column**: `character_id` (TEXT) → should be UUID
- **Column**: `battle_id` (TEXT) → should be UUID
- **Current values**: Empty table
- **References**: user_characters.id, battles.id
- **Impact**: Future battle action tracking will fail

### HIGH PRIORITY (Breaking therapy/character functionality)

#### character_decisions
- **Column**: `character_id` (TEXT) → should be UUID
- **Current values**: Empty table
- **References**: user_characters.id
- **Impact**: Breaks recent_decisions query in get_full_character_data
- **Note**: Function tries to cast with `character_id::uuid`

#### character_memories.user_character_id
- **Column**: `user_character_id` (TEXT) → should be UUID
- **Current values**: Empty (orphaned data deleted)
- **References**: user_characters.id
- **Impact**: Breaks recent_memories query in get_full_character_data
- **Note**: Function tries to cast with `user_character_id::uuid`

#### chat_sessions
- **Column**: `character_id` (character varying) → should be UUID
- **Current values**: Unknown (need to check)
- **References**: user_characters.id
- **Impact**: Chat history tracking

#### domain_context
- **Column**: `character_id` (character varying) → **KEEP AS TEXT**
- **Current values**: TEXT canonical names ("kangaroo", "karna")
- **References**: characters.id (canonical)
- **Impact**: None - this is correct as TEXT

#### signature_attribute_modifiers
- **Column**: `character_id` (character varying) → **KEEP AS TEXT**
- **Current values**: Need to verify
- **References**: Likely characters.id (canonical)
- **Impact**: Need investigation

### MEDIUM PRIORITY (User-specific data)

#### user_equipment.equipped_to_character_id
- **Column**: `equipped_to_character_id` (TEXT) → should be UUID
- **References**: user_characters.id
- **Impact**: Equipment tracking per character instance

#### user_characters.current_battle_id
- **Column**: `current_battle_id` (TEXT) → should be UUID
- **References**: battles.id
- **Impact**: Active battle tracking

#### user_items.character_id
- **Column**: `character_id` (TEXT) → should be UUID
- **References**: user_characters.id
- **Impact**: Item ownership tracking

### BATTLE-RELATED

#### chat_messages.battle_id
- **Column**: `battle_id` (TEXT) → should be UUID
- **References**: battles.id

#### coach_xp_events.battle_id
- **Column**: `battle_id` (TEXT) → should be UUID
- **References**: battles.id

#### guild_war_battles.battle_id
- **Column**: `battle_id` (TEXT) → should be UUID
- **References**: battles.id

#### judge_rulings.battle_id
- **Column**: `battle_id` (TEXT) → should be UUID
- **References**: battles.id

#### judge_rulings.judge_character_id
- **Column**: `judge_character_id` (TEXT) → **KEEP AS TEXT**
- **Current values**: TEXT canonical ("anubis", "eleanor_roosevelt")
- **References**: characters.id (judge templates)

#### battle_queue.matched_battle_id
- **Column**: `matched_battle_id` (TEXT) → should be UUID
- **References**: battles.id

#### lounge_messages.referenced_battle_id
- **Column**: `referenced_battle_id` (TEXT) → should be UUID
- **References**: battles.id

### CHALLENGE/SOCIAL FEATURES

#### challenge_leaderboard.user_character_id
- **Column**: `user_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### challenge_participants.user_character_id
- **Column**: `user_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### challenge_results (multiple columns)
- **Columns**: `winner_character_id`, `second_place_character_id`, `third_place_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### challenge_alliances.leader_character_id
- **Column**: `leader_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### cardano_staking_positions.user_character_id
- **Column**: `user_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### influencer_mints.user_character_id
- **Column**: `user_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

### SOCIAL/MESSAGING

#### graffiti_art.artist_character_id
- **Column**: `artist_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### guild_messages.sender_character_id
- **Column**: `sender_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### lounge_messages.sender_character_id
- **Column**: `sender_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

#### social_message_replies.author_character_id
- **Column**: `author_character_id` (TEXT) → should be UUID
- **References**: user_characters.id

### LOCKER/AUCTION FEATURES

#### locker_auction_sessions.character_id
- **Column**: `character_id` (TEXT) → **INVESTIGATE**
- **Likely**: UUID (user instances participating in auctions)

#### locker_leaderboards.character_id
- **Column**: `character_id` (TEXT) → **INVESTIGATE**
- **Likely**: UUID (user instances on leaderboards)

#### locker_rogue_decisions.character_id
- **Column**: `character_id` (TEXT) → **INVESTIGATE**
- **Likely**: UUID (user instance decisions)

#### lounge_presence.character_id
- **Column**: `character_id` (TEXT) → **INVESTIGATE**
- **Likely**: UUID (user instances in lounge)

#### memory_entries.character_id
- **Column**: `character_id` (TEXT) → **INVESTIGATE**
- **Likely**: UUID (user instance memories)

### GAME EVENTS

#### game_events.primary_character_id
- **Column**: `primary_character_id` (character varying) → **INVESTIGATE**
- **Likely**: UUID (specific user instance in event)

---

## Tables CORRECTLY Using TEXT (Canonical Names)

These reference `characters.id` (canonical character templates):

### Character Definitions
- **therapist_bonuses.character_id** ✓ (contains "carl_jung", "zxk14bw7", "seraphina")
- **judge_bonuses.character_id** ✓ (contains "anubis", "eleanor_roosevelt", "king_solomon")
- **power_definitions.character_id** ✓ (character-specific powers)
- **spell_definitions.character_id** ✓ (character-specific spells)
- **ai_characters.character_id** ✓ (AI uses character templates)
- **claimable_pack_contents.character_id** ✓ (packs contain character types)
- **user_characters.character_id** ✓ (links instance to template)

### Context/Configuration
- **domain_context.character_id** ✓ (verified: contains "kangaroo", "karna")

---

## Tables Already Correctly Using UUID

These already reference `user_characters.id`:

- character_abilities.character_id ✓
- character_category_preferences.character_id ✓
- character_equipment.character_id ✓
- character_experience_log.character_id ✓
- character_healing_sessions.character_id ✓
- character_items.character_id ✓
- character_powers.character_id ✓
- character_progression.character_id ✓
- character_skills.character_id ✓
- character_spells.character_id ✓
- character_temporary_buffs.character_id ✓
- chat_messages.character_id ✓
- coach_xp_events.character_id ✓
- power_unlock_log.character_id ✓
- room_beds.character_id ✓
- character_modifiers.user_character_id ✓
- character_power_loadout.user_character_id ✓
- character_spell_loadout.user_character_id ✓
- distributed_challenge_rewards.user_character_id ✓
- financial_decisions.user_character_id ✓
- therapy_evaluations.user_character_id ✓
- bond_activity_log.user_character_id ✓
- cardano_nft_metadata.user_character_id ✓
- team_chat_logs.speaker_character_id ✓
- team_equipment_pool.loaned_to_character_id ✓
- social_messages.author_character_id ✓
- social_messages.target_character_id ✓
- social_messages.battle_id ✓
- battles.opponent_ai_character_id ✓
- battles.opponent_character_id ✓
- battles.user_character_id ✓

---

## Migration Priority Order

### Phase 1: CRITICAL (Fix get_full_character_data crash)
1. battle_participants.character_id (TEXT → UUID)
2. battle_participants.battle_id (TEXT → UUID)
3. character_decisions.character_id (TEXT → UUID)
4. character_memories.user_character_id (TEXT → UUID)

### Phase 2: HIGH (Core functionality)
5. battle_actions.character_id (TEXT → UUID)
6. battle_actions.battle_id (TEXT → UUID)
7. user_equipment.equipped_to_character_id (TEXT → UUID)
8. user_characters.current_battle_id (TEXT → UUID)
9. user_items.character_id (TEXT → UUID)

### Phase 3: MEDIUM (Battle system)
10. chat_messages.battle_id (TEXT → UUID)
11. coach_xp_events.battle_id (TEXT → UUID)
12. guild_war_battles.battle_id (TEXT → UUID)
13. judge_rulings.battle_id (TEXT → UUID)
14. battle_queue.matched_battle_id (TEXT → UUID)
15. lounge_messages.referenced_battle_id (TEXT → UUID)

### Phase 4: MEDIUM (Social/Challenge features)
16. challenge_leaderboard.user_character_id (TEXT → UUID)
17. challenge_participants.user_character_id (TEXT → UUID)
18. challenge_results.* (TEXT → UUID)
19. challenge_alliances.leader_character_id (TEXT → UUID)
20. cardano_staking_positions.user_character_id (TEXT → UUID)
21. influencer_mints.user_character_id (TEXT → UUID)
22. graffiti_art.artist_character_id (TEXT → UUID)
23. guild_messages.sender_character_id (TEXT → UUID)
24. lounge_messages.sender_character_id (TEXT → UUID)
25. social_message_replies.author_character_id (TEXT → UUID)

### Phase 5: INVESTIGATE
26. chat_sessions.character_id (character varying → ?)
27. locker_* tables (TEXT → ?)
28. memory_entries.character_id (TEXT → ?)
29. game_events.primary_character_id (character varying → ?)
30. signature_attribute_modifiers.character_id (character varying → ?)

---

## Data Integrity Validation

### Verified Clean Data
- ✓ battle_participants: 18/18 rows are valid UUIDs matching user_characters.id
- ✓ character_decisions: 0 rows (empty, safe to migrate)
- ✓ character_memories: 0 rows (orphaned data deleted, safe to migrate)

### Need Verification
- battle_actions (empty)
- All Phase 3-5 tables need value sampling

---

## Migration Constraints

### No Foreign Key Constraints Blocking
- battle_participants has only composite PRIMARY KEY (battle_id, character_id)
- No foreign key constraints found on the TEXT columns
- Safe to alter column types after data validation

### Potential Issues
- character_memories.character_id is `character varying` (not `text`)
- chat_sessions.character_id is `character varying` (not `text`)
- Several other `character varying` columns need investigation

---

## Next Steps

1. **Immediate**: Create migration 255 for Phase 1 (CRITICAL fixes)
2. **Validate**: Sample data from Phase 3-5 tables
3. **Investigate**: character varying columns and their current usage
4. **Test**: Run migration on staging/development before production
5. **Deploy**: Apply migrations in phase order with monitoring

---

## Notes

- The TEXT→UUID refactoring 2 days ago was incomplete
- Many tables were missed in the original migration
- Current workaround: PostgreSQL function uses `::uuid` casts
- Proper fix: Change column types to match what they store/reference
- No data loss: all verified TEXT columns contain valid UUID values
