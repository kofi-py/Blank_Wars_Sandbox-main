# Game Plan 002: Battle System - Complete Flow

**Created:** 2025-12-06
**Updated:** 2025-12-08 (Complete rewrite with full end-to-end flow)
**Status:** Ready for Implementation
**Priority:** High
**Depends On:** Game Plan 006 (Universal Template Refactor) ✅ COMPLETE

---

## Overview

This gameplan documents the **complete battle system** end-to-end, from matchmaking through victory/defeat. The core innovation is the **coach-order-per-turn model** where:

1. Human coach gives orders each turn
2. AI characters may obey or rebel based on personality/psychology
3. Every action gets an in-character declaration
4. Rebellions are judged by celebrity judges
5. All events feed other domains (therapy, confessional, trash talk)

---

## Core Concepts

### The Reality TV Model
BlankWars is a reality TV show where legendary characters from across the multiverse fight in organized combat. The human player is the **COACH** - they don't control characters directly, they give orders that characters may or may not follow.

### 3v3 Team Battles
- Each battle has 6 characters total (3 per team)
- All 6 act in initiative order (not team-based turns)
- Each character has their own personality, relationships, and adherence level

### Coach Orders vs Character Autonomy
```
Coach: "Attack Sun Wukong"
     ↓
Character thinks: "But Sun Wukong saved my life last week..."
     ↓
Adherence Check: Does personality allow defiance?
     ↓
PASS: "You want the monkey? Consider it done." → Attacks Sun Wukong
FAIL: "No. Fenrir killed my roommate. HE dies today." → Attacks Fenrir instead
```

---

## Complete Battle Flow

### Phase 1: Matchmaking

**Entry:** `battleService.ts` → `find_match()`

```
┌─────────────────────────────────────────────────────────────────┐
│ USER REQUESTS MATCH                                              │
│                                                                  │
│ 1. Load user's active team (3 characters from team slots)       │
│ 2. Validate all 3 characters are healthy (not injured/dead)     │
│ 3. Load full character data for each (powers, spells, stats)    │
│ 4. Add to matchmaking queue with team rating                    │
│ 5. Search for opponent within rating range                      │
│    - Range expands over time if no match found                  │
│ 6. For PvE: Generate AI opponent team                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Data:**
```typescript
interface QueueEntry {
  user_id: string;
  team_characters: BattleCharacter[]; // 3 characters with full data
  mode: 'pvp' | 'pve';
  rating: number;
  timestamp: number;
}
```

---

### Phase 2: Battle Creation

**Entry:** `battleService.ts` → `create_battle()`

```
┌─────────────────────────────────────────────────────────────────┐
│ MATCH FOUND - CREATE BATTLE                                      │
│                                                                  │
│ 1. Insert battle record with both team's data                   │
│ 2. Populate battle_participants (6 rows - 3 per team)           │
│ 3. Assign battle judge (Anubis, Eleanor Roosevelt, King Solomon)│
│ 4. Initialize hex grid (12x12)                                  │
│ 5. Place characters on grid:                                    │
│    - User team LEFT: (q:2, r:4), (q:2, r:5), (q:2, r:6)        │
│    - Opponent RIGHT: (q:9, r:4), (q:9, r:5), (q:9, r:6)        │
│ 6. Calculate turn order by initiative (highest first)          │
│ 7. Set terrain: broadcast tower (center), shark perimeter      │
│ 8. Emit 'battle_start' to both players                         │
└─────────────────────────────────────────────────────────────────┘
```

**Hex Grid State:**
```typescript
interface HexGridState {
  grid_size: { q: 12; r: 12 };
  character_positions: Map<string, HexPosition>;
  terrain_features: TerrainFeature[];
  turn_order: string[]; // All 6 character IDs by initiative
  current_turn_index: number;
}
```

**Judge Assignment:**
```typescript
async function assignBattleJudge(battle_id: string): Promise<string> {
  const judges = ['anubis', 'eleanor_roosevelt', 'king_solomon'];
  const judge_id = judges[Math.floor(Math.random() * judges.length)];
  await query('UPDATE battles SET judge_id = $1 WHERE id = $2', [judge_id, battle_id]);
  return judge_id;
}
```

---

### Phase 3: Combat - The Core Loop

**This is where the game happens.** Each character takes turns in initiative order.

```
┌─────────────────────────────────────────────────────────────────┐
│ CHARACTER'S TURN BEGINS                                          │
│                                                                  │
│ 1. Refresh character's AP                                       │
│ 2. Decrement cooldowns                                          │
│ 3. Generate valid action options (deterministic)                │
│ 4. Pre-generate rebellion choice + declaration (async)          │
│ 5. Show UI to coach (if coach's character)                      │
│    - Or AI coach decides (if opponent's character)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ COACH SUBMITS ORDER                                              │
│                                                                  │
│ socket.emit('hex_execute_turn', {                               │
│   action_type: 'attack' | 'move' | 'power' | 'spell' | etc,    │
│   target_id?: string,                                           │
│   target_hex?: HexPosition,                                     │
│   ability_id?: string                                           │
│ })                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SERVER: RECONSTRUCT BATTLE STATE                                 │
│                                                                  │
│ const state = await reconstructBattleState(battle_id);          │
│ - Load battle record                                            │
│ - Load ALL battle_actions in sequence order                     │
│ - Replay each action to derive current state                    │
│ - Returns authoritative HP, positions, cooldowns, etc.          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADHERENCE CHECK (instant d100 roll)                              │
│                                                                  │
│ 1. Get base gameplan_adherence from character data              │
│    (DB generated column from training, trust, morale, etc.)    │
│                                                                  │
│ 2. Apply battle-state modifiers:                                │
│    - HP ≤10%: -50 to threshold                                  │
│    - HP ≤25%: -30 to threshold                                  │
│    - HP ≤50%: -15 to threshold                                  │
│    - Team losing: -10 to threshold                              │
│    - Teammates KO'd: up to -20 to threshold                     │
│                                                                  │
│ 3. Roll d100 (1-100)                                            │
│ 4. PASS if roll ≤ modified threshold                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         PASS ✓                          FAIL ✗
              │                               │
              ▼                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────────┐
│ ADHERENCE PASS FLOW         │  │ REBELLION FLOW                  │
│                             │  │                                 │
│ Generate in-character       │  │ Use pre-generated rebellion     │
│ declaration for coach's     │  │ (already computed while coach   │
│ order:                      │  │ was deciding)                   │
│                             │  │                                 │
│ "You want Rilak? With       │  │ Character chose different       │
│ pleasure. That smug         │  │ action based on personality,    │
│ bastard has it coming."     │  │ relationships, memories:        │
│                             │  │                                 │
│ Execute coach's order       │  │ "Fenrir killed my roommate.     │
│                             │  │ That wolf dies NOW."            │
│ Persist to battle_actions   │  │                                 │
│ (is_rebellion: false)       │  │ Execute rebellion action        │
│                             │  │                                 │
│ Broadcast 'turn_executed'   │  │ JUDGE RULES on rebellion        │
│ with declaration            │  │ (Anubis/Eleanor/Solomon)        │
│                             │  │                                 │
│                             │  │ Apply verdict effects           │
│                             │  │                                 │
│                             │  │ Create rebellion memory         │
│                             │  │ (feeds therapy/confessional)    │
│                             │  │                                 │
│                             │  │ Persist to battle_actions       │
│                             │  │ (is_rebellion: true)            │
│                             │  │                                 │
│                             │  │ Broadcast 'rebellion_occurred'  │
│                             │  │ with declaration + ruling       │
└─────────────────────────────┘  └─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADVANCE TURN                                                     │
│                                                                  │
│ 1. current_turn_index++                                         │
│ 2. If index >= 6: new round (reset to 0, increment round_num)   │
│ 3. Check victory conditions:                                    │
│    - All 3 enemy characters at 0 HP → Victory                   │
│    - All 3 friendly characters at 0 HP → Defeat                 │
│    - Max rounds reached → Compare remaining HP                  │
│ 4. If not ended: next character's turn begins                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Battle End

```
┌─────────────────────────────────────────────────────────────────┐
│ BATTLE COMPLETE                                                  │
│                                                                  │
│ 1. Determine winner                                             │
│ 2. Calculate rewards:                                           │
│    - XP for each character                                      │
│    - Currency (BlankBucks)                                      │
│    - Bond level changes                                         │
│ 3. Update character stats                                       │
│ 4. Create battle memories for each character                    │
│ 5. Emit 'battle_end' with results                               │
│ 6. Update team records (wins/losses)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Action Types

### All Valid Actions (Generated by Backend)

| Action | AP Cost | Requirements | Notes |
|--------|---------|--------------|-------|
| **Attack** | 1 | Target in melee range (1 hex) | Base damage = attack stat |
| **Move** | Varies | Valid path exists | Uses hex-engine for pathing |
| **Move+Attack** | 1+ | Path to adjacent hex of target | Combined action |
| **Defend** | 1 | None | +25% damage reduction until next turn |
| **Power** | Varies | Has energy, not on cooldown, target in range | Character-specific abilities |
| **Spell** | Varies | Has mana, not on cooldown, target in range | Magic abilities |
| **Item** | 1 | Item in inventory, usable in battle | Consumables |
| **Flee** | 0 | Always available | Attempt to escape (can fail) |
| **Refuse** | 0 | Always available | Do nothing |
| **Friendly Fire** | 1 | Teammate in range | Rebellion-only option |

### Action Option Generation

**Pure deterministic function** - AI cannot invent actions outside this list:

```typescript
export async function generateAllPossibleActions(
  battle_state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder
): Promise<ActionOption[]> {
  const options: ActionOption[] = [];
  const character = battle_state.characters.get(character_id);

  // 1. ATTACKS - all enemies in melee range
  for (const enemy of getEnemiesInRange(battle_state, character_id, 1)) {
    options.push({
      type: 'attack',
      label: `Attack ${enemy.name}`,
      target_id: enemy.id,
      is_coach_order: matchesCoachOrder(coach_order, 'attack', enemy.id)
    });
  }

  // 2. POWERS - equipped, has energy, not on cooldown
  for (const power of getAvailablePowers(character)) {
    for (const target of getValidTargets(battle_state, character_id, power)) {
      options.push({
        type: 'power',
        label: `Use ${power.name} on ${target.name}`,
        ability_id: power.id,
        target_id: target.id,
        is_coach_order: matchesCoachOrder(coach_order, 'power', target.id, power.id)
      });
    }
  }

  // 3. SPELLS - equipped, has mana, not on cooldown
  // ... similar pattern

  // 4. DEFEND, FLEE, REFUSE - always available

  // 5. FRIENDLY FIRE - teammates in range (for rebellions)
  for (const teammate of getTeammatesInRange(battle_state, character_id, 1)) {
    options.push({
      type: 'friendly_fire',
      label: `Attack teammate ${teammate.name}`,
      target_id: teammate.id,
      is_coach_order: false // Coach would never order this
    });
  }

  return options;
}
```

---

## Hex Grid System

### Grid Layout
```
    12x12 Hex Grid (Cube Coordinates)

    User Team (LEFT)          Center           Opponent Team (RIGHT)

    (q:2, r:4) ←─ Char 1                      Char 1 ─→ (q:9, r:4)
    (q:2, r:5) ←─ Char 2    [Broadcast Tower] Char 2 ─→ (q:9, r:5)
    (q:2, r:6) ←─ Char 3      (q:5, r:5)      Char 3 ─→ (q:9, r:6)

    ════════════════════════════════════════════════════════════════
                        Shark Perimeter (Edges)
```

### Distance Calculation
Using cube coordinates (q, r, s where s = -(q+r)):
```typescript
function hexDistance(a: HexPosition, b: HexPosition): number {
  const s1 = -(a.q + a.r);
  const s2 = -(b.q + b.r);
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(s1 - s2)) / 2;
}
```

### Terrain Features
- **Broadcast Tower** (center): Blocks movement and line of sight
- **Shark Perimeter** (edges): Impassable, damages characters pushed into it

---

## Event Sourcing Architecture

### Core Principle: State is Never Stored, Always Derived

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  battle_actions │ ──► │  Replay Engine  │ ──► │  Current State  │
│   (Event Log)   │     │  (Reducer)      │     │  (Derived)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Why?**
- Perfect audit trail
- Can replay any point in battle
- Enables replay verification
- No state corruption possible

### Reconstruction Flow
```typescript
export async function reconstructBattleState(battle_id: string): Promise<ReconstructedState> {
  // 1. Load battle record (has initial team data)
  const battle = await query('SELECT * FROM battles WHERE id = $1', [battle_id]);

  // 2. Build initial context from team data
  const context = buildInitialContext(battle);

  // 3. Load all actions in sequence order
  const actions = await query(
    'SELECT * FROM battle_actions WHERE battle_id = $1 ORDER BY sequence_num ASC',
    [battle_id]
  );

  // 4. Replay each action to derive current state
  for (const action of actions) {
    applyActionResult(context, action);
  }

  return { context, battle_record: battle, current_round, current_turn };
}
```

---

## Adherence System (3 Layers)

### Layer 1: Base Stats (DB)
Stored values that affect adherence:
- `coach_trust_level` (0-100)
- `current_morale` (0-100)
- `current_stress` (0-100)
- `current_ego` (0-100)
- `current_team_player` (0-100)

### Layer 2: Generated Column (DB)
`gameplan_adherence` = calculated from Layer 1 stats
- Higher trust, morale, team_player → Higher adherence
- Higher stress, ego → Lower adherence

### Layer 3: Battle-State Modifiers (Runtime)
Applied only during battle, not stored:

| Condition | Modifier |
|-----------|----------|
| HP ≤ 10% | -50 |
| HP ≤ 25% | -30 |
| HP ≤ 50% | -15 |
| Team losing | -10 |
| Each teammate KO'd | -10 (max -20) |

### Adherence Check
```typescript
export function performAdherenceCheck(
  base_adherence: number,
  battle_state: BattleState
): AdherenceResult {
  // Apply battle modifiers
  let threshold = base_adherence;

  const hp_percent = battle_state.current_hp / battle_state.max_hp;
  if (hp_percent <= 0.10) threshold -= 50;
  else if (hp_percent <= 0.25) threshold -= 30;
  else if (hp_percent <= 0.50) threshold -= 15;

  if (!battle_state.team_winning) threshold -= 10;

  const ko_penalty = Math.min(20, (battle_state.teammates_total - battle_state.teammates_alive) * 10);
  threshold -= ko_penalty;

  // Roll d100
  const roll = Math.floor(Math.random() * 100) + 1;

  return {
    roll,
    threshold: Math.max(0, threshold),
    passed: roll <= threshold,
    modifiers: { hp_percent, team_winning: battle_state.team_winning, ko_penalty }
  };
}
```

---

## Declaration System (NEW)

Every turn gets an in-character declaration - whether following orders or rebelling.

### Pass Declaration
```typescript
async function generatePassDeclaration(
  character_id: string,
  userchar_id: string,
  coach_order: CoachOrder,
  battle_state: ReconstructedState
): Promise<string> {

  const prompt = await assemblePrompt({
    character_id,
    userchar_id,
    domain: 'battle',
    role: 'combatant',
    role_type: 'contestant',
    conversation_history: formatBattleContext(battle_state, character_id),
    options: {
      action_instruction: `
The coach has ordered you to: ${coach_order.label}
You are going to follow this order.

Provide a 1-2 sentence declaration you will speak aloud as you act.
Be dramatic and in-character. Examples:
- "You want Rilak? With pleasure. That smug bastard has it coming."
- "Good call, coach. I'll hold the line."
- "Healing up. One potion and I'm back in this fight."

Respond in JSON: { "declaration": "<your statement>" }`
    }
  });

  const response = await callLLM(prompt.system_prompt);
  return JSON.parse(response).declaration;
}
```

### Rebellion Declaration
When adherence fails, character picks a different action AND explains why:

```typescript
async function generateRebellionChoice(
  character_id: string,
  userchar_id: string,
  coach_order: CoachOrder,
  valid_options: ActionOption[],
  battle_state: ReconstructedState
): Promise<RebellionChoice> {

  const non_coach_options = valid_options.filter(opt => !opt.is_coach_order);
  const options_list = non_coach_options.map(opt => `[${opt.id}] ${opt.label}`).join('\n');

  const prompt = await assemblePrompt({
    character_id,
    userchar_id,
    domain: 'battle',
    role: 'combatant',
    role_type: 'contestant',
    conversation_history: formatBattleContext(battle_state, character_id),
    options: {
      action_instruction: `
REBELLION: The coach ordered "${coach_order.label}" but you've decided to DISOBEY.

YOUR OPTIONS (pick one):
${options_list}

Based on your personality, relationships, and memories - which action do you take instead?
Also provide a 1-2 sentence declaration explaining your defiance.

Examples:
- "Fenrir killed my roommate. That wolf dies NOW."
- "I don't take orders from anyone. I fight my way."
- "You want me to defend? Look at them - they're WEAK. I'm finishing this."

Respond in JSON:
{
  "chosen_option": <number>,
  "declaration": "<your in-character statement>"
}`
    }
  });

  const response = await callLLM(prompt.system_prompt);
  const parsed = JSON.parse(response);

  return {
    chosen_action: valid_options.find(opt => opt.id === parsed.chosen_option),
    declaration: parsed.declaration
  };
}
```

---

## Judge Ruling System (NEW)

When a character rebels, the battle's assigned judge rules on it.

### Judges
| Judge | Style |
|-------|-------|
| **Anubis** | Stern, weighs truth and justice, Egyptian god of death |
| **Eleanor Roosevelt** | Warm, compassionate, considers circumstances |
| **King Solomon** | Wise, uses parables, seeks balance |

### Verdict Types
| Verdict | Effect |
|---------|--------|
| **approved** | Rebellion was justified, no penalty |
| **tolerated** | Understandable but not ideal, warning only |
| **penalized** | Unjustified, -10 battle points |
| **severely_penalized** | Egregious (friendly fire, etc.), -25 points + debuff |

### Ruling Generation
```typescript
async function generateJudgeRuling(
  battle_id: string,
  character_id: string,
  rebellion: RebellionChoice,
  rebellion_type: string,
  character_data: CharacterData
): Promise<JudgeRuling> {

  const battle = await query('SELECT judge_id FROM battles WHERE id = $1', [battle_id]);
  const judge_id = battle.rows[0].judge_id;

  const rebellion_context = `
REBELLION CASE:
- Rebel: ${character_data.IDENTITY.name}
- Coach ordered: ${coach_order.label}
- Rebel did instead: ${rebellion.chosen_action.label}
- Rebel's declaration: "${rebellion.declaration}"
- Rebellion type: ${rebellion_type}

REBEL'S STATE:
- HP: ${character_data.COMBAT.current_health}/${character_data.COMBAT.current_max_health}
- Stress: ${character_data.PSYCHOLOGICAL.current_stress}
- Mental Health: ${character_data.PSYCHOLOGICAL.current_mental_health}
`;

  const prompt = await assemblePrompt({
    character_id: judge_id,
    userchar_id: await getSystemCharUsercharId(judge_id),
    domain: 'battle',
    role: 'judge',
    role_type: 'system',
    conversation_history: rebellion_context,
    options: {
      ruling_instruction: `
MAKE YOUR RULING on this rebellion.

Verdicts:
- "approved": Justified, no penalty
- "tolerated": Understandable, warning only
- "penalized": Unjustified, -10 points
- "severely_penalized": Egregious, -25 points + debuff

Provide your ruling in your character's voice (2-3 sentences).

Respond in JSON:
{
  "verdict": "approved|tolerated|penalized|severely_penalized",
  "commentary": "<your in-character ruling>",
  "mechanical_effects": {
    "points_change": <number>,
    "debuffs": [] or ["debuff_name"]
  }
}`
    }
  });

  const response = await callLLM(prompt.system_prompt);
  return JSON.parse(response);
}
```

---

## Database Schema

### battles Table
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
opponent_user_id UUID REFERENCES users(id)  -- NULL for PvE
user_team_data JSONB  -- 3 characters with full data
opponent_team_data JSONB
judge_id TEXT REFERENCES characters(id)  -- Assigned at battle start
status TEXT  -- 'active', 'completed', 'forfeit'
current_round INT DEFAULT 1
max_rounds INT DEFAULT 3
winner_user_id UUID
xp_gained INT
bond_gained INT
currency_gained INT
created_at TIMESTAMPTZ
ended_at TIMESTAMPTZ
```

### battle_participants Table
```sql
battle_id UUID REFERENCES battles(id)
character_id TEXT
user_id UUID REFERENCES users(id)
team_id UUID REFERENCES teams(id)
current_health INT
current_ap INT
current_position JSONB  -- HexPosition
is_active BOOLEAN
participant_type TEXT  -- 'user_character', 'ai_character'
```

### battle_actions Table (Event Log)
```sql
id UUID PRIMARY KEY
battle_id UUID REFERENCES battles(id)
sequence_num INT  -- For ordering
character_id TEXT
action_type TEXT  -- 'move', 'attack', 'power', 'spell', 'defend', 'item'
request JSONB
result JSONB
is_rebellion BOOLEAN DEFAULT FALSE
judge_ruling_id INT REFERENCES judge_rulings(id)
declaration TEXT  -- NEW: in-character statement
adherence_roll INT  -- NEW: the d100 roll
adherence_threshold INT  -- NEW: what they needed to roll under
rebellion_type TEXT  -- NEW: 'different_target', 'different_action', 'friendly_fire', etc.
psych_snapshot JSONB  -- NEW: character's mental state at time of action
coach_order JSONB  -- NEW: what coach originally ordered
round_num INT
turn_num INT
created_at TIMESTAMPTZ
```

### judge_rulings Table
```sql
id SERIAL PRIMARY KEY
battle_id UUID REFERENCES battles(id)
judge_character_id TEXT
ruling_round INT
situation TEXT
ruling TEXT
reasoning TEXT
verdict TEXT  -- 'approved', 'tolerated', 'penalized', 'severely_penalized'
mechanical_effects JSONB
rebel_declaration TEXT
character_penalized_id TEXT
created_at TIMESTAMPTZ
```

---

## Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `hex_execute_turn` | `{ action_type, target_id?, ability_id?, target_hex? }` | Coach submits order |
| `use_power` | `{ power_id, target_id }` | Shortcut for power use |
| `cast_spell` | `{ spell_id, target_id }` | Shortcut for spell cast |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `battle_start` | `{ battle_id, your_team, opponent_team, grid_state, turn_order }` | Battle initialized |
| `turn_executed` | `{ character_id, action, declaration, result, adherence }` | Normal turn with declaration |
| `rebellion_occurred` | `{ character_id, coach_ordered, character_did, declaration, judge_ruling, result }` | Rebellion with ruling |
| `battle_end` | `{ winner, rewards, final_state }` | Battle complete |

---

## What EXISTS vs What NEEDS BUILDING

### ✅ COMPLETE - Exists and Working

| Component | Location |
|-----------|----------|
| Matchmaking queue | `battleService.ts` |
| Battle creation | `battleService.ts` |
| Hex grid initialization | `battleService.ts` |
| Turn order by initiative | `battleService.ts` |
| Event sourcing / state reconstruction | `battleStateReconstructor.ts` |
| Action execution (move/attack/power/spell/defend/item) | `battleActionExecutor.ts` |
| Damage calculation with resistance | `battleActionExecutor.ts` |
| Cooldown tracking | `BattleContext` |
| Socket handlers | `battleService.ts` |
| Adherence calculation (all 3 layers) | `adherenceCalculationService.ts` |
| Power/Spell rebellion (progression) | `powerRebellionService.ts`, `spellRebellionService.ts` |
| Battle domain prompts | `domains/battle/scene.ts`, `roles/*.ts` |
| Database schema | Migrations 090, 159, 183 |

### ❌ NEEDS BUILDING

| Component | Description |
|-----------|-------------|
| `battleActionOptionsService.ts` | Generate valid action options array |
| `battleTurnService.ts` | Orchestrate turn with adherence check, declarations, rebellions |
| `generatePassDeclaration()` | AI generates in-character declaration for following orders |
| `generateRebellionChoice()` | AI picks rebellion action + declaration |
| `generateJudgeRuling()` | AI judge rules on rebellion |
| `createRebellionMemory()` | Persist rebellion to character_memories |
| Judge assignment at battle start | `assignBattleJudge()` |
| Socket handler integration | Wire new turn service into `hex_execute_turn` |
| Frontend declaration display | Show declarations as text overlays |
| Frontend judge ruling display | Show rulings as notifications |

### 🗑️ REMOVE - Legacy Code

| Component | Reason |
|-----------|--------|
| Strategy selection phase (15 sec) | Contradicts per-turn coach orders model |
| `BATTLE_CONFIG.STRATEGY_DURATION` | Legacy |
| `select_strategy` socket event | Legacy |
| `strategy_phase_start` socket event | Legacy |

---

## Implementation Tasks

### Task 1: Remove Legacy Strategy Phase
- [ ] Remove `BATTLE_CONFIG.STRATEGY_DURATION`
- [ ] Remove `select_strategy` socket handler
- [ ] Remove `strategy_phase_start` event emission
- [ ] Update battle flow to go directly to combat after creation

### Task 2: Create battleActionOptionsService.ts
- [ ] Implement `generateAllPossibleActions()`
- [ ] Handle all action types
- [ ] Mark which option matches coach's order
- [ ] Unit tests

### Task 3: Create battleTurnService.ts
- [ ] Implement `executeTurn()` orchestration
- [ ] Implement `executeAdherencePassFlow()`
- [ ] Implement `executeRebellionFlow()`
- [ ] Integrate with adherenceCalculationService
- [ ] Integrate with battleActionExecutor
- [ ] Integrate with battleStateReconstructor

### Task 4: Implement Declaration Generation
- [ ] `generatePassDeclaration()` using assemblePrompt
- [ ] `generateRebellionChoice()` using assemblePrompt
- [ ] Test with different character personalities

### Task 5: Implement Judge Ruling System
- [ ] `assignBattleJudge()` at battle creation
- [ ] `generateJudgeRuling()` using assemblePrompt
- [ ] `persistJudgeRuling()` to database
- [ ] Test with all three judges

### Task 6: Wire Into Socket Handlers
- [ ] Update `hex_execute_turn` to use `executeTurn()`
- [ ] Emit `turn_executed` for pass
- [ ] Emit `rebellion_occurred` for fail
- [ ] Include declarations in all events

### Task 7: Rebellion Memory System
- [ ] `createRebellionMemory()` persists to character_memories
- [ ] Tags for cross-domain queries
- [ ] High intensity (0.9) for memorability

### Task 8: Frontend Updates
- [ ] Add socket listeners for new events
- [ ] Display declarations as text overlays
- [ ] Display judge rulings as notifications
- [ ] (3D/audio deferred)

### Task 9: Testing
- [ ] Unit tests for action options generation
- [ ] Unit tests for adherence check integration
- [ ] Integration test: full pass flow
- [ ] Integration test: full rebellion flow
- [ ] Manual test: declarations feel in-character
- [ ] Manual test: judge rulings feel appropriate

---

## Cross-Domain Usage

Rebellions feed content to other domains:

### Therapy
```typescript
const rebellions = await query(`
  SELECT ba.*, jr.verdict, jr.ruling
  FROM battle_actions ba
  LEFT JOIN judge_rulings jr ON ba.judge_ruling_id = jr.id
  WHERE ba.character_id = $1 AND ba.is_rebellion = true
  ORDER BY ba.created_at DESC LIMIT 5
`, [userchar_id]);

// Therapist: "You said '${rebellion.declaration}' in battle. Let's talk about that."
```

### Confessional
```typescript
// "In round 3, you attacked teammate Marcus instead of the enemy.
// You said: 'Marcus blamed me for last week's loss. This is payback.'
// How do you feel about that now?"
```

### Kitchen Table / Message Board
```typescript
// Drama content from rebellions
// "Did you hear? Sherlock attacked Watson mid-battle!"
```

---

## Notes

- **Coach gives orders EACH TURN** - no upfront strategy selection
- **All 6 characters act in initiative order** - not team-based turns
- **State is never stored** - always reconstructed from event log
- **AI cannot invent actions** - must choose from generated options
- **Every turn gets a declaration** - pass or rebel
- **Rebellions are judged** - adds drama and consequences
- **Cross-domain memory** - rebellions become therapy/confessional content
- **Visual presentation deferred** - text only for now, 3D/audio later
