# Blank Wars 2026 - Complete Onboarding File List
**Files Required to Get Fully Up to Speed**

Generated: 2025-11-24

---

## 1. CARDANO INTEGRATION DOCUMENTATION

### ✅ PRIMARY MANUAL (EXISTS)
- **`/backend/docs/CARDANO_INTEGRATION_MANUAL.md`** ⭐ CANONICAL SPEC
  - Twin-system architecture
  - CIP-68 metadata plan
  - NFT tier system
  - Wallet / adherence / identity layer
  - Interaction between DB and chain

### ✅ RELATED CARDANO FILES
- `/new_chat_logs/cc_11_24_25_2.57pm_cardano_integration.md` - Recent Cardano integration session
- `/backend/migrations/124_add_cardano_wallet_to_users.sql` - Wallet integration
- `/backend/migrations/127_cardano_card_sets.sql` - Card sets schema
- `/backend/migrations/128_cardano_nft_metadata.sql` - NFT metadata schema
- `/backend/migrations/130_cardano_staking.sql` - Staking system

### ✅ CARDANO SERVICES (Backend)
- `/backend/src/services/cardano/CardanoProviderService.ts` - Blockchain provider
- `/backend/src/services/cardano/CardanoMintingService.ts` - NFT minting
- `/backend/src/services/cardano/CardanoStakingService.ts` - Staking logic
- `/backend/src/services/cardano/InfluencerMintService.ts` - Influencer NFT system
- `/backend/src/routes/cardanoRoutes.ts` - API endpoints

### ✅ CARDANO COMPONENTS (Frontend)
- `/frontend/src/components/cardano/` - Cardano UI components

### 🔴 MISSING CARDANO FILES
- No Aiken/Helios smart contract code found (may be in separate repo)
- No validator scripts found in codebase

---

## 2. GAME ARCHITECTURE & TECH STACK DOCUMENTATION

### ✅ PRIMARY ARCHITECTURE DOCS
- **`/Blank_Wars_Tech_and_Design_Brief.md`** ⭐ MAIN TECH OVERVIEW
- **`/README.md`** - Project overview
- `/AGENT_CODING_GUIDE.md` - Coding standards for AI agents
- `/INSTRUCTIONS_FOR_NEXT_AGENT.md` - Handoff instructions

### ✅ FRONTEND ARCHITECTURE (Next.js 15, React 19)
**Tech Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Socket.IO client
- TailwindCSS

**Key Files:**
- `/frontend/package.json` - Dependencies
- `/frontend/next.config.mjs` - Next.js config
- `/frontend/src/app/` - App router pages
- `/frontend/src/components/` - React components
- `/frontend/src/services/` - API services
- `/frontend/src/utils/` - Utility functions
- `/frontend/src/types/` - TypeScript types

### ✅ BACKEND ARCHITECTURE (Node.js, Express, Socket.IO)
**Tech Stack:**
- Node.js
- Express.js
- Socket.IO server
- PostgreSQL (Neon)
- OpenAI API
- LocalAI/LocalAGI integration

**Key Files:**
- `/backend/package.json` - Dependencies
- `/backend/src/server.ts` - Main server entry
- `/backend/src/routes/` - API routes
- `/backend/src/services/` - Business logic services
- `/backend/src/types/` - TypeScript types

### ✅ AI INTEGRATION
- `/LOCALAI_TO_OPENAI_MIGRATION_REPORT.md` - AI migration notes
- `/backend/src/services/ai/` - AI service layer (if exists)
- OpenAI API used for character personalities, battles, therapy

### ✅ EVENT BUS & REAL-TIME
- Socket.IO for real-time events
- `/backend/src/services/eventBus.ts` (if exists)
- `/frontend/src/types/socket.ts` - Socket event types

### ✅ SESSION STATE & MEMORY
- `/backend/src/services/sessionService.ts` (if exists)
- Character memory stored in `user_characters.conversation_memory`
- Session state in PostgreSQL

### 🔴 MISSING ARCHITECTURE FILES
- No dedicated "Event Bus Architecture" document
- No "Session State Flow Diagram"
- No "Data Dictionary" (but types cover this)

---

## 3. DATABASE SCHEMA / ERD / MIGRATIONS

### ✅ SCHEMA FILES
- **`/blankwars_schema.dbml`** ⭐ DBML SCHEMA DEFINITION
- **`/database-setup.sql`** ⭐ SQL SETUP SCRIPT
- `/backend/migrations/001_baseline_schema.sql` - Initial schema (145 migrations total)
- `/ERD_COMPARISON_REPORT.md` - ERD verification
- `/ERD_VERIFICATION_REPORT.md` - Additional verification
- `/DATABASE_AUDIT_SUMMARY.md` - Database audit

### ✅ CHARACTER MODEL DEFINITION
- **`/shared/types/src/character.ts`** ⭐ AUTHORITATIVE CHARACTER TYPE
- `/backend/src/types/index.ts` - Backend character types
- `/frontend/src/types/user.ts` - Frontend user types

### ✅ ALL MIGRATIONS (145 total)
Located in: `/backend/migrations/`
Key migrations:
- `001_baseline_schema.sql` - Initial tables
- `092_fix_gameplan_adherence_no_cap.sql` - Adherence formula
- `114_make_gameplan_adherence_generated_column.sql` - Generated column
- `124-130_cardano_*.sql` - Cardano integration
- `131-133_*.sql` - Recent battle system updates

### ✅ NFT IDENTITY TABLES
From migrations:
- `cardano_nft_metadata` (Migration 128)
- `cardano_staking_positions` (Migration 130)
- `influencer_mints` - NFT minting tracking
- `users.cardano_wallet_address` (Migration 124)

### ✅ DATABASE DOCUMENTATION
- `/backend/check_schema.ts` - Schema validation
- `/backend/extract_schema.js` - Schema extraction
- `/backend/setup-database.sh` - Setup script

---

## 4. BATTLE SYSTEM FILES

### ✅ BATTLE SYSTEM DOCUMENTATION
- **`/BATTLE_SYSTEM_COMPREHENSIVE_AUDIT.md`** ⭐ COMPREHENSIVE AUDIT
- `/BATTLE_SYSTEM_COMPLETE_UNDERSTANDING.md` - Complete overview
- `/BATTLE_SYSTEM_ANALYSIS.md` - Analysis
- `/BATTLE_SYSTEMS_ANALYSIS.md` - Multi-system analysis
- `/BATTLE_QUICK_REFERENCE.md` - Quick reference
- `/BATTLE_SYSTEM_TESTING.md` - Testing docs
- `/BATTLE_SYSTEM_TEST_REPORT.md` - Test results
- `/BATTLE_FIXES_NEEDED.md` - Known issues
- `/BATTLE_SYSTEM_PROBLEMS.md` - Problem tracking
- `/BATTLE_SYSTEM_FIX_GUIDE.md` - Fix guide
- `/BATTLE_SYSTEM_FIX_PLAN.md` - Fix plan
- `/BATTLE_SYSTEM_FIX_PROPOSAL.md` - Fix proposal
- `/BATTLE_SYSTEM_REFACTOR_PROPOSAL.md` - Refactor proposal
- `/BATTLE_SYSTEM_INTEGRATION_PROPOSAL.md` - Integration proposal

### ✅ BATTLE ENGINE CODE
**Backend Services:**
- `/backend/src/services/battleService.ts` - Main battle orchestration
- `/backend/src/services/battleActionsService.ts` - Action processing
- `/backend/src/services/battleCharacterLoader.ts` - Character loading
- `/backend/src/services/battleMechanicsService.ts` - Combat mechanics
- `/backend/scripts/simulate_battle_flow.ts` - Battle simulation
- `/backend/scripts/test_db_pve.ts` - Database PvE testing

**Frontend Components:**
- `/frontend/src/components/battle/HexBattleArena.tsx` - Hex grid battle UI
- `/frontend/src/data/battleFlow.ts` - Battle flow types
- `/frontend/src/utils/battleCharacterUtils.ts` - Battle utilities

### ✅ EXPERIENCE & LEVELING
- **`/CHARACTER_LEVELING_SYSTEM.md`** ⭐ LEVELING SPEC
- `/backend/src/services/experienceService.ts` (if exists)
- Character XP stored in `user_characters.experience`
- Leveling triggers attribute point gains

### ✅ HEX GRID SYSTEM
- `/HEX_GRID_MIGRATION_AUDIT.md` - Hex grid audit
- `/CODE_REVIEW_HEX_GRID_SYSTEM.md` - Code review

### ✅ PREVIOUS AGENT LOGS (Battle-related)
- `/new_chat_logs/cc_11_12_25_11.04am_battle.md` - Battle fixes
- `/DAMAGE_AUDIT_BAD_AGENT.md` - Bad agent damage issues

---

## 5. FINANCIAL & THERAPY SYSTEM SPECIFICATIONS

### ✅ FINANCIAL SYSTEM
**Documentation:**
- Financial stress is a generated column (Migration 106)
- Linked to adherence system
- Affects character mental health

**Backend Services:**
- `/backend/src/services/financialPersonalityService.ts` - Financial personality logic
- `/backend/src/services/domainUpdaters/financial.ts` - Financial updates
- `/backend/src/services/battleFinancialIntegration.ts` (if exists)

**Database Tables:**
- `user_characters.financial_stress` (generated column)
- `user_characters.financial_personality` (JSONB)
- `user_characters.monthly_earnings`
- `user_characters.wallet`
- `user_characters.debt`
- `financial_decisions` table

**Frontend:**
- `/frontend/src/services/battleFinancialIntegration.ts` - Financial integration

### ✅ THERAPY SYSTEM
**Backend Services:**
- `/backend/src/services/therapy/` - Therapy services (directory)
- `/backend/src/services/domainUpdaters/therapy.ts` - Therapy updates

**Database Tables:**
- `therapy_sessions` table
- `coach_xp_events` table
- Characters with role='therapist': Carl Jung, Zxk14bW^7

**Frontend Components:**
- `/frontend/src/components/TherapyModule.tsx` - Therapy UI
- `/frontend/src/components/PerformanceCoachingChat.tsx` - Coaching chat

**Documentation:**
- `/GROUP_THERAPY_AUDIT_2025-10-28.md` - Group therapy audit

### ✅ JUDGE SYSTEM
**Characters with role='judge':**
- Anubis
- Eleanor Roosevelt
- King Solomon

**Tables:**
- `challenge_results` table tracks judged events

### ✅ EMOTIONAL & STRESS SYSTEMS
**Generated Columns:**
- `gameplan_adherence` - Formula: training*0.4 + mental*0.3 + team*0.2 + (100-ego)*0.1
- `financial_stress` - Calculated from financial personality
- `coach_trust_level` - Bond-based trust formula

**Database Fields:**
- `user_characters.stress_level`
- `user_characters.current_mental_health`
- `user_characters.morale`
- `user_characters.confidence_level`

**Documentation:**
- `/ADHERENCE_SYSTEM_COMPREHENSIVE_AUDIT.md` (see Section 6)

### ✅ PERSONALITY MATRICES
**Fields:**
- `characters.personality_traits` (JSONB array)
- `user_characters.personality_drift` (JSONB)
- `user_characters.financial_personality` (JSONB)

**Documentation:**
- `/NEW_CHARACTER_PERSONALITIES.md` - Personality design

---

## 6. CHARACTER MODEL SPECIFICATION

### ✅ AUTHORITATIVE CHARACTER DEFINITION
- **`/shared/types/src/character.ts`** ⭐ PRIMARY SOURCE
  - Complete type definitions
  - All interfaces
  - Shared between frontend/backend

### ✅ CHARACTER DOCUMENTATION
- **`/CONTESTANT_CHARACTERS.md`** ⭐ ALL 33 CONTESTANTS
- `/CHARACTER_AUDIT_2025-10-28.md` - Character audit
- `/CHARACTER_LEVELING_SYSTEM.md` - Leveling mechanics
- `/CHARACTER_TYPES_PURPOSE_ANALYSIS.md` - Type analysis
- `/CHARACTER_INTERFACES_INVESTIGATION.md` - Interface investigation
- `/CHARACTER_INTERFACE_CONFLICT.md` - Conflict resolution
- `/NEW_CHARACTERS_2025-10-28.md` - New character additions
- `/NEW_CHARACTER_PERSONALITIES.md` - Personality design

### ✅ CHARACTER FIELD BREAKDOWN

**Core Identity:**
- `id` - Unique identifier
- `character_id` - Base character template
- `user_id` - Owner
- `serial_number` - Instance number
- `nickname` - Custom name

**Stats (Base from characters table):**
- `base_health`, `base_attack`, `base_defense`, `base_speed`, `base_special`
- `strength`, `dexterity`, `intelligence`, `wisdom`, `charisma`, `spirit`
- `critical_chance`, `critical_damage`, `accuracy`, `evasion`

**Current Stats (user_characters table):**
- `current_health`, `max_health`
- `current_attack`, `current_defense`, `current_speed`
- `current_training`, `current_team_player`, `current_ego`, `current_mental_health`
- `current_energy`, `max_energy`
- `current_mana`, `max_mana`

**Progression:**
- `level` - Character level
- `experience` - Current XP
- `bond_level` - Relationship with coach
- `total_battles`, `total_wins`, `total_losses`
- `attribute_points` - Unspent attribute points
- `attribute_allocations` - Allocated attribute bonuses (JSONB)

**Psychological Stats (Generated/Dynamic):**
- `gameplan_adherence` - GENERATED: Adherence to coach's plan
- `financial_stress` - GENERATED: Financial pressure
- `coach_trust_level` - GENERATED: Trust in coach
- `stress_level` - Manual: Overall stress
- `morale` - Manual: Team morale
- `confidence_level` - Manual: Self-confidence

**Financial:**
- `wallet` - In-game currency
- `debt` - Current debt
- `monthly_earnings` - Passive income
- `financial_personality` - JSONB personality matrix
- `recent_decisions` - JSONB decision log

**Memory & Personality:**
- `conversation_memory` - JSONB conversation log
- `significant_memories` - JSONB key memories
- `personality_drift` - JSONB personality changes over time
- `personality_traits` - Array from base character

**Visual/UI:**
- `avatar_emoji` - Character emoji
- `artwork_url` - Image URL
- `battle_image_name` - Battle sprite
- `battle_image_variants` - Alternative sprites

**Titles & Status:**
- `title` - Character title (e.g., "Hero of Troy")
- `archetype` - Role type (warrior, mage, etc.)
- `rarity` - Legendary, Epic, Rare, etc.
- `species` - Human, deity, cyborg, etc.
- `is_dead`, `death_count`, `death_timestamp`
- `resurrection_available_at`

**Rivalries & Relationships:**
- Tracked in separate tables
- `team_trust` - Trust in team members

**Equipment & Powers:**
- `equipment` - JSONB equipped items
- Separate tables: `character_equipment`, `character_powers`, `character_spells`

**Meta:**
- `acquired_at` - When character was obtained
- `last_battle_at` - Last battle timestamp
- `starter_gear_given` - Boolean flag

### ✅ CHARACTER BEHAVIOR STATES
From AI integration:
- Adherence-based rebellion (low adherence = refuses orders)
- Personality-driven dialogue
- Memory-influenced responses
- Stress-affected performance

---

## 7. SMART CONTRACT & CARDANO CODE

### ✅ CARDANO SERVICES (TypeScript/Node.js)
- `/backend/src/services/cardano/CardanoProviderService.ts`
- `/backend/src/services/cardano/CardanoMintingService.ts`
- `/backend/src/services/cardano/CardanoStakingService.ts`
- `/backend/src/services/cardano/InfluencerMintService.ts`

### ✅ CARDANO TESTS
- `/backend/src/services/cardano/__tests__/CardanoProviderService.test.ts`
- `/backend/src/services/cardano/__tests__/CardanoMintingService.test.ts`
- `/backend/src/services/cardano/__tests__/CardanoStakingService.test.ts`
- `/backend/src/services/cardano/__tests__/InfluencerMintService.test.ts`
- `/backend/src/services/cardano/__tests__/database.constraints.test.ts`

### 🔴 MISSING: AIKEN/HELIOS VALIDATORS
- No on-chain validator code found in this repository
- May exist in separate smart contract repository
- CIP-68 metadata standard implementation not visible

**Note:** The TypeScript services handle off-chain logic (minting requests, metadata prep, staking tracking), but on-chain validators would be in a separate Cardano-specific repo.

---

## 8. PREVIOUS AI AGENT LOGS

### ✅ RECENT CHAT LOGS (Last 2 Weeks)
Located in: `/new_chat_logs/`

**Critical Sessions:**
- `cc_11_24_25_12.36pm_columns.md` - Database column fixes (THIS SESSION)
- `cc_11_24_25_2.57pm_cardano_integration.md` - Cardano integration
- `cc_11_23_25_2.16pm_attributes.md` - Attributes system
- `cc_11_23_25_9.17pm.md` - General fixes
- `cc_11_24_25_1.50am_migration_fail.md` - Migration failure troubleshooting

**Battle System Logs:**
- `cc_11_12_25_11.04am_battle.md` - Battle fixes
- Various logs from 11/12-11/17 dealing with TypeScript errors and battle issues

**TypeScript Error Resolution:**
- `cc_11_16_25_3.19am_ts_fixes.md`
- `cc_11_16_25_9.49pm_ts_defeated.md`
- `cc_11_17_25_1.54am_ts.md`
- Multiple logs tracking TS error cleanup

**Full log list** (40+ logs available in `/new_chat_logs/`)

### ✅ LEGACY DOCUMENTATION
- `/claude_web_ts_prompt_round*.md` (rounds 1-7) - Claude web sessions
- `/claude_cli_*_assignment_round7.md` - CLI assignments

### ✅ IMPLEMENTATION HISTORY DOCS
- `/DAMAGE_AUDIT_BAD_AGENT.md` ⚠️ Bad agent that broke damage system
- `/CRITICAL_BUGS_PRODUCTION.md` - Production bug tracking
- `/BUGS_FIXED_NOV_1.md` - Bug fixes from November 1
- `/REPAIR_VERIFICATION.md` - Repair verification
- `/CHANGELOG_*.md` - Multiple changelogs

---

## 9. ADHERENCE SYSTEM (Complete Documentation)

### ✅ ADHERENCE SYSTEM DOCS
- `/ADHERENCE_SYSTEM_COMPREHENSIVE_AUDIT.md` ⭐ COMPREHENSIVE AUDIT (created this session)
- `/ADHERENCE_SYSTEM_ASSESSMENT.md` - System assessment
- `/ADHERENCE_SYSTEM_CORRECTED.md` - Corrections
- `/ADHERENCE_SYSTEM_IMPLEMENTATION_PLAN.md` - Implementation plan
- `/ADHERENCE_SYSTEM_SESSION_SUMMARY.md` - Session summary
- `/ADHERENCE_SYSTEM_STATUS.md` - Current status

---

## 10. PROGRESSION SYSTEMS

### ✅ POWERS & SPELLS
- `/SPELL_POWER_ABILITIES_RESEARCH.md` - Research doc
- `/SPELL_SYSTEM_DESIGN.md` - Spell design
- `/SPELL_MANA_SYSTEM_PROPOSAL.md` - Mana system
- `/TODO_POWER_SPELL_SYSTEM.md` - Implementation todos
- `/POWER_LEVEL_CATEGORIZATION.md` - Power categorization
- `/SIGNATURE_POWER_CATEGORIZATION.md` - Signature powers
- `/SPELL_ARCHETYPE_AUDIT.md` - Spell archetype audit
- `/SPELL_TYPE_ANALYSIS.md` - Type analysis
- `/SPELL_REFACTOR_VERIFICATION.md` - Refactor verification

**Backend Services:**
- `/backend/src/services/loadoutAdherenceService.ts` - Loadout adherence (rebellion)
- `/backend/src/routes/powers.ts` - Power API
- `/backend/src/routes/spells.ts` - Spell API (if exists)

**Database Tables:**
- `power_definitions` - Base power templates
- `spell_definitions` - Base spell templates
- `character_powers` - Character-specific powers
- `character_spells` - Character-specific spells
- `character_power_loadout` - Equipped powers
- `character_spell_loadout` - Equipped spells

### ✅ EQUIPMENT
- `/LOADOUT_RESEARCH.md` - Loadout research
- `/frontend/EQUIPMENT_ITEMS_MERGE_ANALYSIS.md` - Equipment merge analysis
- `/frontend/POWER_MANAGER_PROPOSAL.md` - Manager proposal

**Backend:**
- `/backend/src/services/autonomousDecisionService.ts` - Equipment decisions

**Database Tables:**
- `equipment` - Equipment definitions
- `character_equipment` - Character inventory
- `team_equipment_pool` - Team shared equipment

### ✅ ATTRIBUTES
**Backend:**
- `/backend/src/services/attributeService.ts` - Attribute allocation
- `/backend/src/routes/attributes.ts` - Attribute API

**Frontend:**
- `/frontend/src/services/attributesAPI.ts` - Frontend API
- `/frontend/src/components/AttributesTab.tsx` (if exists)

**Database:**
- `user_characters.attribute_points` - Unspent points
- `user_characters.attribute_allocations` - Allocated bonuses (JSONB)

---

## 11. STAT SYSTEMS

### ✅ STAT SYSTEM DOCUMENTATION
- `/STAT_SYSTEM_OVERHAUL_SPEC.md` - Overhaul spec
- `/STAT_SYSTEM_REDESIGN.md` - Redesign proposal
- `/UNIFIED_STAT_SYSTEM.md` - Unified system
- `/GRANULAR_PLANNED_ACTION_DESIGN.md` - Action design

---

## 12. TYPE SYSTEM & SHARED TYPES

### ✅ TYPE CONSOLIDATION
- `/TYPE_CONSOLIDATION_REPORT.md` - Consolidation report
- `/TYPE_CLEANUP_PROGRESS.md` - Cleanup progress
- `/SHARED_TYPES_IMPLEMENTATION.md` - Shared types implementation

**Shared Types Package:**
- `/shared/types/src/character.ts` ⭐ Primary character types
- `/shared/types/src/index.ts` - Shared exports
- `/shared/types/src/generated.ts` - Generated types

---

## 13. DEPLOYMENT & INTEGRATION

### ✅ DEPLOYMENT DOCUMENTATION
- `/DEPLOYMENT_COMPLETE_NOV_1.md` - Deployment status
- `/SESSION_COMPLETE_NOV_1.md` - Session complete
- `/SESSION_COMPLETE.md` - General session notes
- `/FINAL_STATUS.md` - Final status
- `/INTEGRATION_COMPLETE.md` - Integration complete
- `/READY_FOR_INTEGRATION.md` - Ready for integration
- `/VERIFICATION_COMPLETE.md` - Verification complete

---

## 14. TESTING & ERROR TRACKING

### ✅ ERROR REPORTS
- `/TYPESCRIPT_ERROR_REPORT.md` - TypeScript errors
- `/TYPESCRIPT_FIX_SUMMARY.md` - Fix summary
- `/TS_ERROR_ANALYSIS_REPORT.md` - Error analysis
- `/TS_ERROR_SUMMARY.md` - Error summary
- `/EXCLUSION_RULES_FOR_TS_FIXES.md` - Exclusion rules

### ✅ TESTING FILES
- `/backend/src/services/cardano/__tests__/` - Cardano tests
- `/backend/scripts/simulate_battle_flow.ts` - Battle simulation
- `/backend/scripts/test_db_pve.ts` - DB testing

---

## 15. ADDITIONAL SYSTEMS

### ✅ HEADQUARTERS & TEAMS
- `/frontend/src/types/headquarters.ts` - HQ types
- Migration 117: Headquarters schema

### ✅ LOBBIES
- `/backend/src/types/lobby.ts` - Lobby types
- `/frontend/src/types/lobby.ts` - Frontend lobby types

### ✅ SOCIAL & COMMUNICATION
- Tables: `social_messages`, `social_message_replies`, `chat_messages`

### ✅ CHALLENGES
- Tables: `challenge_alliances`, `challenge_leaderboard`, `challenge_participants`, `challenge_results`

---

## PRIORITY READING ORDER FOR NEW AGENTS

### Phase 1: Foundation (Required)
1. `/README.md` - Project overview
2. `/Blank_Wars_Tech_and_Design_Brief.md` - Tech stack
3. `/AGENT_CODING_GUIDE.md` - Coding standards
4. `/shared/types/src/character.ts` - Character model
5. `/backend/docs/CARDANO_INTEGRATION_MANUAL.md` - Cardano spec

### Phase 2: Core Systems (Required)
6. `/blankwars_schema.dbml` - Database schema
7. `/CONTESTANT_CHARACTERS.md` - All 33 characters
8. `/ADHERENCE_SYSTEM_COMPREHENSIVE_AUDIT.md` - Adherence system
9. `/BATTLE_SYSTEM_COMPREHENSIVE_AUDIT.md` - Battle system
10. `/CHARACTER_LEVELING_SYSTEM.md` - Progression

### Phase 3: Detailed Systems (As Needed)
11. `/SPELL_POWER_ABILITIES_RESEARCH.md` - Powers/spells
12. `/STAT_SYSTEM_OVERHAUL_SPEC.md` - Stat system
13. Recent chat logs in `/new_chat_logs/` - Implementation history
14. Service files in `/backend/src/services/` - Backend logic
15. Component files in `/frontend/src/components/` - UI logic

### Phase 4: Troubleshooting (Reference)
16. `/DAMAGE_AUDIT_BAD_AGENT.md` - Known bad implementations
17. `/CRITICAL_BUGS_PRODUCTION.md` - Current bugs
18. `/BATTLE_FIXES_NEEDED.md` - Pending fixes
19. Error reports (`/TYPESCRIPT_ERROR_REPORT.md`, etc.)

---

## FILES THAT DON'T EXIST (But Were Expected)

### 🔴 Missing Documentation
1. **Event Bus Architecture** - No dedicated doc (logic embedded in Socket.IO code)
2. **Session State Flow Diagram** - Not documented (logic in services)
3. **Data Dictionary** - Not formalized (covered by types)
4. **LocalAI/LocalAGI Integration Guide** - Migration report exists, but no setup guide

### 🔴 Missing Smart Contracts
1. **Aiken Validators** - Not in this repo
2. **Helios Scripts** - Not in this repo
3. **CIP-68 Metadata Builders** - May be in TypeScript services only

### 🔴 Missing Tests
1. **Frontend Test Suite** - No Jest/Vitest tests found
2. **E2E Tests** - No Playwright/Cypress tests found
3. **Integration Tests** - Limited to Cardano services

---

## TOTAL FILE COUNT

- **Documentation Files**: 80+ markdown files
- **Migration Files**: 145 SQL migrations
- **TypeScript Service Files**: 50+ backend services
- **React Components**: 100+ frontend components
- **Type Definition Files**: 15+ type files
- **Chat Logs**: 40+ agent conversation logs
- **Database Tables**: 40+ tables (from migrations)

---

## RECOMMENDED NEXT STEPS FOR NEW AGENT

1. **Read** `/backend/docs/CARDANO_INTEGRATION_MANUAL.md` - Cardano canonical spec
2. **Read** `/ADHERENCE_SYSTEM_COMPREHENSIVE_AUDIT.md` - Adherence system (created this session)
3. **Review** `/shared/types/src/character.ts` - Character model
4. **Scan** `/blankwars_schema.dbml` - Database structure
5. **Check** `/new_chat_logs/cc_11_24_25_12.36pm_columns.md` - Latest session (database fixes)
6. **Run** database locally using `/backend/setup-database.sh`
7. **Test** battle system using `/backend/scripts/simulate_battle_flow.ts`

---

*This file list is comprehensive as of 2025-11-24. New files may be added during development.*
