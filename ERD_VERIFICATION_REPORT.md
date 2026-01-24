# Entity Relationship Diagram (ERD) Verification Report
**Database:** blankwars
**Generated:** 2025-10-04
**Total Tables:** 47
**Total Foreign Key Relationships:** 47

---

## 1. ROOT TABLES (No Foreign Keys - Origin Points)

These 18 tables should appear as independent or origin nodes in the ERD:

| Table Name | Purpose | Should Connect To |
|------------|---------|-------------------|
| **users** | Coach/player accounts | Everything user-related |
| **characters** | AI character templates | user_characters, claimable_pack_contents, character_living_context, team_context |
| **challenge_templates** | Reality show challenge definitions | active_challenges, challenge_rewards, challenge_results |
| **healing_facilities** | HQ healing/therapy facilities | character_healing_sessions |
| **card_packs** | Gacha pack definitions | (Referenced by claimable_packs via pack_template_id) |
| **game_events** | Event bus persistence | character_memories |
| **chat_sessions** | Chat conversation groups | (No references - possible orphan) |
| **scene_triggers** | Story/drama triggers | (No references - possible orphan) |
| **memory_entries** | Key-value memory store | (No references - possible orphan) |
| **events** | Generic events table | (No references - possible orphan) |
| **facts** | Knowledge base facts | (No references - possible orphan) |
| **user_daily_stats** | Daily activity tracking | (No references - possible orphan) |
| **session_state** | Session management | (No references - possible orphan) |
| **state_digest** | State snapshots | (No references - possible orphan) |
| **migration_log** | System: migration tracking | N/A |
| **migration_meta** | System: migration metadata | N/A |
| **cron_logs** | System: scheduled job logs | N/A |
| **tmp_user_characters_backup** | System: temporary backup | N/A |

---

## 2. COMPLETE FOREIGN KEY RELATIONSHIPS

### Users Hub (Main Coach Table)
The **users** table is the central hub with 14 direct relationships:

1. active_challenges.user_id → users.id
2. battles.user1_id → users.id
3. battles.user2_id → users.id
4. battles.winner_id → users.id
5. chat_messages.user_id → users.id
6. claimable_packs.claimed_by_user_id → users.id
7. coach_progression.user_id → users.id
8. coach_skills.user_id → users.id
9. coach_xp_events.user_id → users.id
10. purchases.user_id → users.id
11. user_characters.user_id → users.id
12. user_currency.user_id → users.id
13. user_equipment.user_id → users.id
14. user_headquarters.user_id → users.id
15. user_items.user_id → users.id

### User Characters Hub (Player's AI Roster)
The **user_characters** table has 13 relationships (receives from 11 tables):

**Outbound (2):**
- user_characters.user_id → users.id
- user_characters.character_id → characters.id

**Inbound (11 tables reference user_characters):**
1. battles.user_character1_id → user_characters.id
2. battles.user_character2_id → user_characters.id
3. challenge_alliances.leader_character_id → user_characters.id
4. challenge_leaderboard.user_character_id → user_characters.id
5. challenge_participants.user_character_id → user_characters.id
6. challenge_results.winner_character_id → user_characters.id
7. challenge_results.second_place_character_id → user_characters.id
8. challenge_results.third_place_character_id → user_characters.id
9. character_abilities.character_id → user_characters.id
10. character_experience_log.character_id → user_characters.id
11. character_healing_sessions.character_id → user_characters.id
12. character_progression.character_id → user_characters.id
13. character_skills.character_id → user_characters.id
14. chat_messages.character_id → user_characters.id
15. coach_xp_events.character_id → user_characters.id
16. financial_decisions.user_character_id → user_characters.id

### Challenge System (Reality Show Competition)

**challenge_templates** (root) spawns:
- active_challenges.challenge_template_id → challenge_templates.id
- challenge_rewards.challenge_template_id → challenge_templates.id
- challenge_results.challenge_template_id → challenge_templates.id

**active_challenges** connects to:
- active_challenges.user_id → users.id (who started it)
- challenge_alliances.active_challenge_id → active_challenges.id
- challenge_participants.active_challenge_id → active_challenges.id
- challenge_results.active_challenge_id → active_challenges.id

**challenge_participants** connects to:
- challenge_participants.active_challenge_id → active_challenges.id
- challenge_participants.user_character_id → user_characters.id

**challenge_results** connects to:
- challenge_results.active_challenge_id → active_challenges.id
- challenge_results.challenge_template_id → challenge_templates.id
- challenge_results.winner_character_id → user_characters.id
- challenge_results.second_place_character_id → user_characters.id
- challenge_results.third_place_character_id → user_characters.id

### Battle System

**battles** table (5 foreign keys):
- battles.user1_id → users.id
- battles.user2_id → users.id
- battles.user_character1_id → user_characters.id
- battles.user_character2_id → user_characters.id
- battles.winner_id → users.id

**Referenced by:**
- chat_messages.battle_id → battles.id
- coach_xp_events.battle_id → battles.id

### Character Templates & Living

**characters** table is referenced by:
- character_living_context.character_id → characters.id
- claimable_pack_contents.character_id → characters.id
- team_context.master_bed_character_id → characters.id
- user_characters.character_id → characters.id

### HQ & Facilities System

**user_headquarters** receives from:
- user_headquarters.user_id → users.id

**user_headquarters** spawns:
- headquarters_rooms.headquarters_id → user_headquarters.id

**healing_facilities** (root) spawns:
- character_healing_sessions.facility_id → healing_facilities.id

**character_healing_sessions** connects to:
- character_healing_sessions.character_id → user_characters.id
- character_healing_sessions.facility_id → healing_facilities.id

### Event & Memory System

**game_events** (root - no FK) spawns:
- character_memories.event_id → game_events.id

**character_memories** only connects to:
- character_memories.event_id → game_events.id
- NOTE: character_memories.character_id has NO foreign key constraint (intentional flexibility)

### Gacha/Pack System

**claimable_packs** connects to:
- claimable_packs.claimed_by_user_id → users.id

**claimable_pack_contents** connects to:
- claimable_pack_contents.claimable_pack_id → claimable_packs.id
- claimable_pack_contents.character_id → characters.id

### Economy System

**purchases** connects to:
- purchases.user_id → users.id

**user_currency** connects to:
- user_currency.user_id → users.id

**user_equipment** connects to:
- user_equipment.user_id → users.id

**user_items** connects to:
- user_items.user_id → users.id

**financial_decisions** connects to:
- financial_decisions.user_character_id → user_characters.id

### Chat System

**chat_messages** connects to:
- chat_messages.battle_id → battles.id
- chat_messages.character_id → user_characters.id
- chat_messages.user_id → users.id

### Progression System

**coach_progression** connects to:
- coach_progression.user_id → users.id

**coach_skills** connects to:
- coach_skills.user_id → users.id

**coach_xp_events** connects to:
- coach_xp_events.battle_id → battles.id
- coach_xp_events.character_id → user_characters.id
- coach_xp_events.user_id → users.id

**character_progression** connects to:
- character_progression.character_id → user_characters.id

**character_experience_log** connects to:
- character_experience_log.character_id → user_characters.id

**character_skills** connects to:
- character_skills.character_id → user_characters.id

**character_abilities** connects to:
- character_abilities.character_id → user_characters.id

---

## 3. KNOWN INTENTIONAL DESIGN DECISIONS

### Missing Foreign Keys (Intentional)

1. **game_events.primary_character_id** - NO FK
   - Reason: Supports mixed references to both `characters.id` and `user_characters.id`
   - Allows flexibility for system events, deleted characters, etc.

2. **character_memories.character_id** - NO FK
   - Reason: Same as above - supports both character templates and user-owned characters

3. **game_events.secondary_character_ids** - NO FK
   - Reason: Array field, can reference multiple characters of different types

---

## 4. ERD VERIFICATION CHECKLIST

Use this to verify the SchemaSpy ERD output:

### ✅ Challenge Tables Should Show:
- [ ] challenge_templates as root (no incoming arrows)
- [ ] active_challenges → challenge_templates
- [ ] active_challenges → users
- [ ] challenge_participants → active_challenges
- [ ] challenge_participants → user_characters
- [ ] challenge_results → active_challenges
- [ ] challenge_results → challenge_templates
- [ ] challenge_results → user_characters (3 arrows: winner, 2nd, 3rd)
- [ ] challenge_rewards → challenge_templates
- [ ] challenge_alliances → active_challenges
- [ ] challenge_alliances → user_characters (leader)
- [ ] challenge_leaderboard → user_characters

### ✅ Users Table Should Show:
- [ ] 15 outgoing relationship arrows to other tables
- [ ] No incoming arrows (it's a root table)

### ✅ User Characters Should Show:
- [ ] 2 outgoing arrows (to users, to characters)
- [ ] 16 incoming arrows from other tables

### ✅ Isolated Tables (Expected):
- [ ] game_events - isolated except for 1 arrow to character_memories
- [ ] character_memories - receives from game_events only
- [ ] System tables (migration_log, cron_logs) - completely isolated

### ✅ Possible Orphans to Investigate:
- [ ] chat_sessions - no relationships found
- [ ] scene_triggers - no relationships found
- [ ] memory_entries - no relationships found
- [ ] events - no relationships found
- [ ] facts - no relationships found
- [ ] user_daily_stats - no relationships found
- [ ] session_state - no relationships found
- [ ] state_digest - no relationships found

---

## 5. SUMMARY

**Total Relationship Count:** 47 foreign keys
**Most Connected Table:** users (15 relationships)
**Second Most Connected:** user_characters (18 total - 2 out, 16 in)
**Intentionally Isolated:** game_events, character_memories (by design)
**System Tables (Isolated):** 4 (migration_log, migration_meta, cron_logs, tmp_user_characters_backup)
**Possible Unused/Orphan Tables:** 8 (chat_sessions, scene_triggers, memory_entries, events, facts, user_daily_stats, session_state, state_digest)

---

## 6. ANSWER TO YOUR QUESTION

**"Why do challenge tables appear as the origin for everything?"**

Looking at your screenshots, this appears to be a **layout/rendering issue**, not a schema issue.

The actual schema shows:
- **challenge_templates** is a root table (correct)
- But **users** and **characters** are also root tables
- **challenge_templates** should NOT have more connections than users

If SchemaSpy is showing challenges as central, it's likely because:
1. The challenge tables were added last (migration 031-033)
2. SchemaSpy's layout algorithm prioritized newer tables
3. The graph rendering placed them centrally by accident

**The users table should be the visual center**, not challenge_templates.
