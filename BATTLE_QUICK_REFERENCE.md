# Battle System - Quick Reference Guide

## Key Files to Know

### BACKEND (Battle Logic - 95% Complete)
1. **`backend/src/services/battleService.ts`** (1,800 lines)
   - Main entry point: `BattleManager` class
   - Handles: matchmaking, battle lifecycle, WebSocket communication
   - Key methods: `findMatch()`, `createBattle()`, `simulateCombat()`, `endBattle()`

2. **`backend/src/services/battleMechanicsService.ts`** (750 lines)
   - Advanced combat mechanics
   - Key exports: `calculateDamageWithResistance()`, `applyStatusEffect()`, `processStatusEffects()`

3. **`backend/src/routes/battleRoutes.ts`** (73 lines)
   - REST endpoints for battle queries
   - WebSocket integration via battleManager

### FRONTEND (UI/State - 70% Complete)
1. **`frontend/src/systems/battleEngine.ts`** (1,600 lines)
   - Battle simulation logic
   - Key methods: `executeRound()`, `calculateInitiative()`, `conductPostBattleAnalysis()`

2. **`frontend/src/systems/battleStateManager.ts`** (191 lines)
   - Race condition protection
   - Atomic state operations with rollback

3. **`frontend/src/services/battleWebSocket.ts`** (200+ lines)
   - Socket.IO client
   - Handles all real-time battle events

4. **`frontend/src/components/battle/HexBattleArena.tsx`** (300+ lines)
   - Main UI component (needs visual implementation)
   - Hex grid battle arena rendering

5. **`frontend/src/data/battleFlow.ts`** (400+ lines)
   - TypeScript type definitions for entire battle system
   - Data models for battles, characters, effects, psychology

## Battle Phases (Backend)

```
MATCHMAKING
    ↓
STRATEGY_SELECT (15 sec) - Choose: aggressive/defensive/balanced
    ↓
ROUND_COMBAT (automatic) - Execute 3 turns, broadcast events
    ↓
CHAT_BREAK (45 sec) - Inter-round conversation
    ↓
[Repeat for 3 rounds, then...]
    ↓
BATTLE_END - Calculate rewards, update stats, send mail
```

## Quick Stats Reference

### Character Stats Used in Battle
- `attack` / `defense` - Damage calculation
- `speed` - Initiative order
- `max_health` / `current_health` - Health pool
- `magic_attack` / `magic_defense` - Magic damage
- `abilities[]` - Array of attack abilities with cooldowns

### Psychology Stats (Modifiers)
- `mentalState.stress` - Affects speed (-0.2 per point)
- `mentalState.confidence` - Affects speed (+0.1 per point above 50)
- `mentalState.battleFocus` - Affects speed (+0.15 per point above 50)
- `mentalState.teamTrust` - Affects gameplan adherence
- `gameplanAdherence` - Chance character follows coach strategy

### Post-Battle Changes
- `experience` += battle XP (scaled by level, outcome)
- `current_health` = remaining health from battle
- `total_battles` += 1
- `total_wins` += 1 (if won)
- `is_injured` = true (if health drops to 0)
- `recovery_time` = calculated based on injury severity

## Damage Calculation Formula

```
Base Damage = (attack * ability_power * strategy_mod) - (defense * strategy_mod * 0.5)
Apply Variance: damage * (0.85 + random(0))
Check Critical: 15% base chance (* crit_multiplier 2.0)
Apply Resistance: damage * (1 - resistance/100)
Final: max(1, min(9999, round(final_damage)))
```

## Status Effects

### Categories
- `buff` - Positive effects
- `debuff` - Negative effects
- `cc` (crowd control) - Prevents action (stun, paralyze, fear, etc.)
- `dot` - Damage over time
- `hot` - Heal over time

### CC Diminishing Returns
```
1st application: Full duration
2nd application: Half duration
3rd application: Quarter duration
4th+: Immune
```

## WebSocket Events Flow

### Matchmaking
```
Client: (implicit via HTTP /api/battles/find endpoint)
Server: returns { status: 'waiting' } or { status: 'found', battle_id, opponent }
```

### Battle Start
```
Server → Client: match_found { battleId, opponent }
Client: connects to WebSocket at /battle/{battleId}
Server → Client: battle_state { full state object }
```

### Strategy Phase
```
Client → Server: select_strategy { strategy: 'aggressive'|'defensive'|'balanced' }
[Repeat for other player]
Server → Both: round_start { strategies }
```

### Combat Round
```
Server → Both: combat_event { type, attacker, defender, damage, critical, health }
[Repeats 3+ times per round]
Server → Both: round_end { winner_of_round }
```

### Chat Phase
```
Server → Both: chat_phase_start { duration: 45 }
Client → Server: send_chat { message }
Server → Both: chat_message { userMessage, characterResponse, bondIncreased }
```

### Battle End
```
Server → Both: battle_end { winner, rewards: { xp, currency, bond }, finalStats }
```

## API Endpoints

```
GET    /api/battles/status              - Server info (queue size, active battles)
GET    /api/battles/user                - User's active battles (auth required)
POST   /api/battles/find                - Start matchmaking (returns battle_id or queued status)
WS     /battle/{battleId}               - Battle WebSocket connection
```

## Performance Notes

- Damage calculations have hard bounds: 1-9999
- Health calculations have hard bounds: 0-max_health * 2
- State operations use atomic queue to prevent race conditions
- WebSocket messages are throttled with 500ms delays between combat events
- Hex grid line-of-sight calculations (optimized for performance)

## Key Integrations

### Database
- Battles persisted to `battles` table
- Character stats updated after battle
- User currency updated with battle rewards
- Analytics events tracked

### Events System
- EventContextService logs battle events
- Character memories recorded
- Relationship changes tracked
- Domain: 'battle' events for AI context

### Character Progression
- CharacterProgressionService awards XP
- Coach progression service tracks coach XP
- Skill progression: `combat_mastery` and `battle_tactics`
- Experience multipliers: 1.5x for winner, 1.0x for loser

### External Services
- HostmasterService: Battle narration/commentary
- ResurrectionService: Death/injury handling
- InternalMailService: Victory notifications
- AnalyticsService: Event tracking
- AudioService: Sound effects (references exist)

## Testing Quick Checklist

```
Matchmaking:
- [ ] Rating range expansion over time
- [ ] Queue position tracking
- [ ] Character validation

Combat:
- [ ] Damage within bounds
- [ ] Critical hit chance (15%)
- [ ] Ability cooldown tracking
- [ ] Status effects apply/remove

Battle End:
- [ ] Winner determination (health-based)
- [ ] XP calculation (scaled)
- [ ] Injury system (death chance)
- [ ] Coach XP awarded
- [ ] Database persistence

WebSocket:
- [ ] All events broadcast correctly
- [ ] Disconnect timeout (30 sec)
- [ ] Forfeit on disconnect
- [ ] Reconnection allowed before timeout
```

## Common Issues & Solutions

### Issue: "Battle not found"
- Check: Battle ID in WebSocket URL matches server battle ID
- Check: User has permission to access this battle

### Issue: Damage seems wrong
- Check: Defense modifiers being applied correctly
- Check: Ability power values in character abilities
- Check: Strategy modifiers (±20% ATK, ±20% DEF)
- Check: Bounds checking (1-9999)

### Issue: Status effects not applying
- Check: Effect type is valid
- Check: Character has room for effect (not immune to type)
- Check: CC diminishing returns level

### Issue: WebSocket not connecting
- Check: Backend server URL correct
- Check: CORS configured for socket.io
- Check: Battle ID exists on server
- Check: User authenticated

## Next Priority Tasks

1. **VISUAL**: HexBattleArena hex grid rendering
2. **VISUAL**: Character token placement on grid
3. **ANIM**: Combat action animation queue
4. **WIRE**: WebSocket event → UI state updates
5. **TEST**: End-to-end battle scenario
