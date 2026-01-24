# Battle System Architecture Analysis - Blank Wars

## Executive Summary

The codebase contains a **substantially implemented battle system** with both backend and frontend components. The system is designed as a turn-based team combat system with psychology/coaching elements overlaid on physical combat mechanics. Most core functionality is present but needs UI connection and testing.

## 1. BACKEND BATTLE SYSTEM

### Main Entry Point: BattleService (`backend/src/services/battleService.ts`)
- **1,800+ lines** of fully implemented code
- Main class: `BattleManager` with EventEmitter pattern
- Handles: Matchmaking, battle lifecycle, real-time WebSocket communication

#### Key Components Implemented:

**Matchmaking System:**
- Single-server and distributed (Redis) queue support
- Rating-based opponent matching with progressive wait-time expansion
- Queue management with character validation
- Daily battle limits check

**Battle Lifecycle:**
1. **MATCHMAKING** → Find opponent
2. **STRATEGY_SELECT** → Players choose aggressive/defensive/balanced
3. **ROUND_COMBAT** → Execute combat with physics-based damage
4. **CHAT_BREAK** → Inter-round conversation phase
5. **BATTLE_END** → Determine winner, calculate rewards

**Core Battle Mechanics:**
- 3 rounds maximum per battle
- 3 turns per round
- Damage calculation with bounds checking (1-9999 damage)
- Ability cooldown system
- Strategy modifiers (ATK: ±20%, DEF: ±20%, SPD: ±5%)
- Health-based winner determination (or highest health%)

**Status Effects & Advanced Mechanics:**
- Damage Over Time (DoT) and Heal Over Time (HoT)
- Crowd Control (CC) with diminishing returns
- Lifesteal, Reflect damage, Execute mechanics
- Shields and damage immunity
- Critical hit system (15% base + modifiable)

**Rewards System:**
- XP scaling with character level and battle difficulty
- Currency rewards
- Bond point progression
- Coach progression XP
- Battle ticket system for premium rewards
- Internal mail notifications

**Injury & Resurrection System:**
- Death chance calculation (1-25%, scales with level)
- Injury severity: light/moderate/severe/critical
- Recovery time: 1-24 hours based on severity
- Resurrection service integration

### Battle Mechanics Service (`backend/src/services/battleMechanicsService.ts`)
- **750+ lines** of specialized mechanics
- Comprehensive damage type resistance system
- Status effect application with stacking rules
- CC diminishing returns (full → half → quarter → immune)
- Advanced mechanics: multi-hit, AOE damage, stat stealing, revive
- Turn priority and action grants system

### Database Integration
- Full ORM adapter integration (`dbAdapter`)
- Battle persistence to database
- Character stat updates post-battle
- User currency updates
- Analytics event tracking

### Real-Time Communication
- Socket.IO integration for WebSocket
- Battle state broadcasting
- Opponent connection/disconnection handling
- Disconnect timeout: 30 seconds to reconnect before forfeit
- Hostmaster v8.72 integration for battle narration

### Coaching & Psychology Integration
- Pre-battle huddle system (team chemistry check)
- Character readiness assessment
- Coaching options generation
- Mental health status effects
- Gameplan adherence checking
- Post-battle analysis with relationship changes

## 2. FRONTEND BATTLE SYSTEM

### Battle Managers & State

**BattleStateManager** (`frontend/src/systems/battleStateManager.ts`)
- Race condition protection with operation queue
- State versioning and atomicity
- Rollback support for failed operations
- State validation with bounds checking

**BattleEngine** (`frontend/src/systems/battleEngine.ts`)
- **1,600+ lines** of battle logic
- Pre-battle huddle system implementation
- Round execution orchestration
- Initiative calculation (speed + mental modifiers)
- Action adherence checking
- Post-battle analysis system
- Morale event generation

### UI Components

**HexBattleArena** (`frontend/src/components/battle/HexBattleArena.tsx`)
- 3D hex grid visualization (planned)
- Dual-screen layout: Hex grid (left) + Battle monitor (right)
- Character token placement and animation
- Supports team battles (multiple characters per side)

**Battle Components:**
- `HexGrid.tsx` - Hex grid rendering and interaction
- `CharacterToken.tsx` - Character sprite visualization
- `ActionOverlay.tsx` - Action UI overlay
- `HexCoachingPanel.tsx` - Coaching interface during battle

### WebSocket Client (`frontend/src/services/battleWebSocket.ts`)
- Socket.IO client implementation
- Event handler mapping
- Reconnection logic (5 attempts max)
- Message queuing during disconnection
- Implements all battle events: match_found, round_start, combat_event, chat_message, battle_end

### Data Models (`frontend/src/data/battleFlow.ts`)

**BattleState Structure:**
- Phase tracking (7 phases: pre_battle, combat, timeout, etc.)
- Team data with chemistry and morale
- Character data with mental state, performance metrics
- Combat log with event history
- AI judge context for narration

**Character Attributes:**
- Physical stats (health, mana, damage)
- Psychology stats (stress, confidence, mental health)
- Relationship modifiers
- Battle performance tracking
- Equipment bonuses

**Psychology System:**
- Mental health (0-100)
- Stress levels (0-100)
- Confidence (0-100)
- Team trust (0-100)
- Battle focus (0-100)
- Strategy deviation risk (0-100)

## 3. EVENT SYSTEM INTEGRATION

### EventContextService (`backend/src/services/eventContextService.ts`)
- Central event bus integration
- Character memory management
- Relationship tracking
- Domain-specific context compression
- Supports: battle, therapy, social, financial, equipment domains

### GameEventBus
- Centralized event system (inherited from main codebase)
- Character memory persistence
- Relationship evolution tracking
- Event filtering and queries

## 4. STAT SYSTEM INTEGRATION

### CharacterProgressionService (`backend/src/services/characterProgressionService.ts`)
- Post-battle XP awards to characters
- Skill progression for: combat_mastery, battle_tactics
- Victory/defeat scaling (1.5x for winner, 1.0x for loser)
- Experience sources: battle, training, quests

### CoachProgressionService
- Coach/player XP awards
- Winner gets full XP, loser gets reduced
- Integration with coach leveling system

## 5. DATABASE MODELS

### Battles Table (inferred)
- battle_id (UUID)
- user_id, opponent_user_id
- user_character_id, opponent_character_id
- battle_type (ranked, casual, etc.)
- status (active, completed, forfeited)
- phase (strategy_select, round_combat, etc.)
- current_round, max_rounds
- winner_user_id
- xp_gained, bond_gained, currency_gained
- user_team_data, opponent_team_data (JSON)
- battle_log, round_results
- created_at, ended_at
- ai_judge_context, coaching_data

### Characters Table (integration)
- total_battles, total_wins
- current_health, max_health
- experience points
- is_injured, injury_severity, recovery_time
- last_battle_at
- abilities (JSON array with name, power, cooldown, type, effect)

## 6. API ENDPOINTS

### Battle Routes (`backend/src/routes/battleRoutes.ts`)
- `GET /api/battles/status` - Server status (queue size, active battles)
- `GET /api/battles/user` - Get user's active battles (authenticated)

### WebSocket Events (Bidirectional)

**Client → Server:**
- `select_strategy` - Choose aggressive/defensive/balanced
- `send_chat` - Send battle chat message
- `hex_submit_action` - Submit hex grid action
- `hex_execute_turn` - Execute queued hex action
- `disconnect` - Clean disconnect

**Server → Client:**
- `match_found` - Opponent found
- `battle_state` - Full battle state update
- `opponent_connected` / `opponent_disconnected`
- `round_start` - Begin round with strategy choices
- `combat_event` - Individual attack/effect events
- `chat_message` - Battle chat from opponent
- `chat_phase_start` - Begin inter-round chat
- `strategy_phase_start` - New round strategy selection
- `battle_end` - Battle complete with rewards
- `opponent_forfeited` - Opponent quit

## 7. WHAT'S ALREADY IMPLEMENTED

✅ **Backend (95% complete):**
- Matchmaking system
- Battle lifecycle management
- Damage calculation engine
- Status effect system with CC diminishing returns
- Reward distribution system
- Character death/injury handling
- WebSocket real-time communication
- Hostmaster narration integration
- Coach XP and character progression
- Database persistence
- Analytics integration

✅ **Frontend (70% complete):**
- Battle state manager with race condition protection
- Battle engine (round execution, initiative, outcomes)
- WebSocket client integration
- Data models for all battle concepts
- UI components (hex grid, character tokens, overlays)
- Event logging and history
- Post-battle analysis framework

## 8. WHAT NEEDS TO BE CONNECTED

⚠️ **Critical Missing Pieces:**

1. **UI/Visual Placeholder Implementation** - PRIORITY
   - HexBattleArena visual rendering (hex grid display)
   - Character sprite animation framework
   - Action resolution animations
   - Damage/effect visual effects
   - Round-by-round animation sequence

2. **Hex Grid Battle Engine** - PARTIALLY IMPLEMENTED
   - Line of sight calculations (file exists: hexLineOfSight)
   - Movement pathfinding on hex grid
   - Flanking mechanics calculation
   - Range modifier application
   - Terrain interaction system

3. **Integration Gaps:**
   - Frontend → Backend WebSocket handshake
   - Match WebSocket events to UI components
   - Connect battle state updates to visual updates
   - Implement real-time animation callbacks
   - Hook up coaching timeout system to UI

4. **Testing/Polish:**
   - End-to-end battle flow testing
   - Visual feedback polish
   - Sound effect triggers (audioService references exist)
   - Performance optimization for real-time updates

## 9. DATABASE SCHEMA (Inferred)

```sql
CREATE TABLE battles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  opponent_user_id UUID,
  user_character_id UUID NOT NULL,
  opponent_character_id UUID,
  battle_type VARCHAR(50),
  status VARCHAR(50),
  phase VARCHAR(50),
  current_round INTEGER,
  max_rounds INTEGER,
  winner_user_id UUID,
  xp_gained INTEGER,
  bond_gained INTEGER,
  currency_gained INTEGER,
  user_team_data JSONB,
  opponent_team_data JSONB,
  battle_log JSONB,
  round_results JSONB,
  coaching_data JSONB,
  ai_judge_context JSONB,
  global_morale JSONB,
  created_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE character_abilities (
  id UUID PRIMARY KEY,
  character_id UUID,
  name VARCHAR(100),
  power FLOAT,
  cooldown INTEGER,
  type VARCHAR(50),
  effect TEXT
);

CREATE TABLE status_effect_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  category VARCHAR(50), -- cc, buff, debuff, dot, hot
  stackable BOOLEAN,
  cc_diminishing BOOLEAN
);

CREATE TABLE damage_type_reference (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(50), -- physical, magical, elemental
  resistance_stat VARCHAR(50)
);
```

## 10. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js/React)                 │
├─────────────────────────────────────────────────────────────┤
│  UI Layer: HexBattleArena, CharacterToken, ActionOverlay   │
│                          ↓                                   │
│  BattleEngine (1600 LOC) - Round logic, initiative, outcomes│
│  BattleStateManager - State management with atomicity       │
│                          ↓                                   │
│  BattleWebSocketService - Real-time communication           │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
                       │ JSON Events
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                   BACKEND (Express/Node.ts)                  │
├──────────────────────────────────────────────────────────────┤
│  BattleManager (1800 LOC) - Matchmaking, lifecycle           │
│        ├─ Matchmaking Queue (local + Redis distributed)     │
│        ├─ Battle State Management                           │
│        ├─ Combat Simulation                                 │
│        └─ WebSocket Event Broadcasting                      │
│                          ↓                                   │
│  BattleMechanicsService (750 LOC)                           │
│        ├─ Damage Calculation                                │
│        ├─ Status Effects                                    │
│        ├─ CC Diminishing Returns                            │
│        └─ Advanced Mechanics (lifesteal, reflect, etc.)     │
│                          ↓                                   │
│  Support Services:                                           │
│  ├─ CoachProgressionService                                 │
│  ├─ CharacterProgressionService                             │
│  ├─ ResurrectionService                                     │
│  ├─ HostmasterService (narration)                           │
│  ├─ EventContextService                                     │
│  └─ AnalyticsService                                        │
│                          ↓                                   │
│  Database Adapter → PostgreSQL                              │
└──────────────────────────────────────────────────────────────┘
```

## 11. STAT SYSTEM INTEGRATION

**Integration Points:**
1. **Character Stats Used in Battle:**
   - `character.attack` / `character.defense`
   - `character.speed` (for initiative)
   - `character.magic_attack` / `character.magic_defense`
   - `character.max_health` / `current_health`
   - `character.abilities[]` (abilities with power, cooldown, type)

2. **Stats Modified by Battle:**
   - `character.experience` (+XP from battle)
   - `character.current_health` (damage taken)
   - `character.total_battles` (incremented)
   - `character.total_wins` (if won)
   - `character.is_injured` (if health = 0)
   - `character.recovery_time` (injury recovery)

3. **Coach/Player Stats:**
   - `coach.battle_xp` (from battle participation)
   - `coach.level` (leveled up from XP)
   - `coach.coaching_skills` (improved by coaching actions)

## 12. TESTING CHECKLIST

- [ ] Matchmaking finds opponent within rating range
- [ ] Battle phases transition correctly (strategy → combat → chat)
- [ ] Damage calculation respects bounds (1-9999)
- [ ] Status effects apply and resolve correctly
- [ ] Character death triggers injury OR resurrection
- [ ] XP rewards scale with level and outcome
- [ ] Coach progression updates after battle
- [ ] WebSocket events broadcast to both players
- [ ] Disconnect timeout properly forfeits battle
- [ ] Hostmaster narration generates correctly
- [ ] Hex grid movement respects terrain
- [ ] Line of sight blocking works
- [ ] UI animations sync with backend events

## 13. NEXT STEPS FOR IMPLEMENTATION

1. **Implement placeholder visual system** (HTML5 Canvas/Pixi.js)
2. **Create animation queue** for sequential action playback
3. **Wire WebSocket events to UI state updates**
4. **Implement hex grid movement validation**
5. **Add sound effect triggers**
6. **Create battle UI layout (sides, health bars, action buttons)**
7. **Add coaching timeout UI modal**
8. **Implement post-battle results screen**
9. **Write end-to-end battle test scenarios**
10. **Performance optimization for real-time updates**

---

## File Structure Summary

**Backend:**
```
backend/src/
├── services/
│   ├── battleService.ts (BattleManager) ⭐ MAIN
│   ├── battleMechanicsService.ts (Combat mechanics) ⭐
│   ├── characterProgressionService.ts
│   ├── coachProgressionService.ts
│   ├── resurrectionService.ts
│   ├── eventContextService.ts
│   └── ... (other services)
├── routes/
│   └── battleRoutes.ts ⭐
└── database/
    └── postgres.ts (DB connection)

tests/services/
├── battleService.test.ts (240+ tests)
└── battleService.test.js
```

**Frontend:**
```
frontend/src/
├── systems/
│   ├── battleEngine.ts (Battle logic) ⭐ MAIN
│   ├── battleStateManager.ts (State mgmt) ⭐
│   ├── hexGridSystem.ts
│   ├── hexLineOfSight.ts
│   ├── hexMovementEngine.ts
│   ├── postBattleAnalysis.ts
│   └── physicalBattleEngine.ts
├── components/battle/
│   ├── HexBattleArena.tsx ⭐ MAIN UI
│   ├── HexGrid.tsx
│   ├── CharacterToken.tsx
│   ├── ActionOverlay.tsx
│   └── HexCoachingPanel.tsx
├── services/
│   └── battleWebSocket.ts ⭐ Real-time
├── data/
│   ├── battleFlow.ts (Type definitions) ⭐
│   ├── combatSkillProgression.ts
│   └── combatRewards.ts
└── utils/
    ├── battleCharacterUtils.ts
    └── battleImageMapper.ts
```

## Conclusion

The battle system is **substantially complete from a backend perspective** (95%) and has a solid foundation on the frontend (70%). The main work required is:
1. Visual/UI implementation with placeholder graphics
2. Animation sequencing system
3. Proper WebSocket event → UI update wiring
4. Testing and polish

The system is production-ready for backend functionality and can handle real-time battles. Frontend needs completion for a playable experience.
