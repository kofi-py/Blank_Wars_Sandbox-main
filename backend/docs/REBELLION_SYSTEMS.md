# Rebellion Systems: Equipment & Power

## Overview

The rebellion system handles autonomous character decision-making when adherence checks fail. Characters can rebel against coach suggestions for both equipment choices and power selections, making permanent or temporary decisions based on their personality.

---

## Core Concept: Adherence-Based Control

### When Adherence Check PASSES:
- **Coach's choice is executed directly**
- No AI involvement
- Character obeys the coach's decision

### When Adherence Check FAILS:
- **AI makes the decision for the character**
- Character rebels and picks based on personality
- Coach loses control temporarily

---

## Equipment Rebellion System

### Characteristics
- **Reversible**: Equipment can be unequipped and changed later
- **Temporary**: When adherence rises, coach can make new equipment decisions
- **No Resource Spent**: Swapping equipment is free

### How It Works

#### 1. Adherence Check
```typescript
if (currentAdherence > threshold) {
  // Coach's choice equipped directly
  equip(coachEquipmentChoice);
} else {
  // Character rebels - AI picks different equipment
  const decision = await getAIEquipmentChoice({
    characterName,
    coachChoice,
    availableChoices, // Alternatives in same slot
    adherenceScore,
    bondLevel,
    personality
  });
  equip(decision.choice);
}
```

#### 2. AI Decision Process
- **Input**: Structured array of equipment objects
  ```typescript
  {
    id: string;
    name: string;
    description: string;
    slot: string;
  }
  ```
- **Prompt Format**: Multiple choice with letters (A, B, C, D, E, F)
- **AI Response**:
  ```json
  {
    "choice": "A",
    "dialogue": "Natural conversational explanation"
  }
  ```
- **Selection**: Letter mapped to index → equipment ID returned

#### 3. Key Rules
- Only alternatives in the **same slot** as coach's choice
- Maximum 6 options presented to AI
- Dialogue must be natural and conversational (not formal)
- No self-introduction in dialogue

#### 4. Equipment Eligibility (4-Tier System)
Equipment is filtered by tier before being presented:

**Tier 1: Universal**
- Anyone can use
- Most common

**Tier 2: Archetype**
- Requires matching archetype (warrior, mage, etc.)
- Role-specific gear

**Tier 3: Species**
- Requires matching species (human, vampire, etc.)
- Biology-dependent

**Tier 4: Character**
- Only specific character can use
- Legendary artifacts

### Code Location
- Main function: `checkAdherenceAndEquip()` in `autonomousDecisionService.ts`
- AI decision: `getAIEquipmentChoice()` in `autonomousDecisionService.ts`
- Eligibility: `checkEquipmentEligibility()` in `equipmentEligibility.ts`

---

## Power Rebellion System

### Characteristics
- **Irreversible**: Once unlocked/ranked, cannot be undone
- **Permanent**: Points are spent and gone forever
- **Resource Cost**: Consumes points from specific pools
- **More Serious**: Shapes character's development permanently

### How It Works

#### 1. Point Granting with Adherence Check
```typescript
async function grantPoints(characterId, pointsEarned, source) {
  // Add points to character's pools
  addPoints(characterId, pointsEarned);

  // Check adherence
  if (currentAdherence > threshold) {
    // Coach has control
    // Points available for coach to spend manually
  } else {
    // Character rebels - AI auto-spends points
    await rebellionAutoSpendPoints({
      characterId,
      pointsEarned
    });
  }
}
```

#### 2. Four Point Pools (4-Tier System)

**Tier 1: Skill Points**
- Universal powers anyone can learn
- Cost: 1 point to unlock, 1 per rank
- Max rank: 10
- Examples: Swordsmanship, Leadership, Meditation

**Tier 2: Archetype Points**
- Role-specific abilities
- Cost: 2 points to unlock, 1 per rank
- Max rank: 3
- Examples: Shield Bash (warrior), Fireball (mage)

**Tier 3: Species Points**
- Biology-based powers
- Cost: 3 points to unlock, 2 per rank
- Max rank: 3
- Examples: Blood Drain (vampire), Adaptability (human)

**Tier 4: Signature Points**
- Character-unique legendary powers
- Cost: 5 points to unlock, 3 per rank
- Max rank: 1-3
- Examples: Wrath of Achilles, Merlin's Time Stop

#### 3. AI Auto-Spend Process

The AI spends ALL available points across all pools when rebellion occurs:

```typescript
async function rebellionAutoSpendPoints({ characterId, pointsEarned }) {
  // Get character data and available powers
  const { character, powers } = await getCharacterPowers(characterId);
  const personalityTraits = JSON.parse(character.personality_traits);

  // Separate powers into unlockable and rankable
  const availableToUnlock = powers.filter(p => !p.is_unlocked && p.can_unlock.can);
  const availableToRank = powers.filter(p => p.is_unlocked && p.can_rank_up.can);

  // AI picks powers one at a time until no points left
  while (hasRemainingPoints && hasAffordableOptions) {
    const choice = await getAISinglePowerChoice({
      characterName,
      archetype,
      personalityTraits,
      remainingPoints,
      availableOptions // Both unlock and rank-up combined
    });

    // Execute choice (unlock or rank up)
    if (choice.action === 'unlock') {
      await unlockPower({ characterId, powerId: choice.powerId, triggeredBy: 'character_rebellion' });
    } else {
      await rankUpPower({ characterId, powerId: choice.powerId, triggeredBy: 'character_rebellion' });
    }

    // Deduct points from correct pool based on power tier
    deductPoints(choice, remainingPoints);
  }
}
```

#### 4. AI Decision Format

**Input**: Structured array of power objects
```typescript
{
  id: string;
  name: string;
  description: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  action: 'unlock' | 'rank_up';
  cost: number;
  current_rank?: number;
  max_rank?: number;
}
```

**Prompt Format**: Multiple choice with letters (A, B, C, D, E, F)

Example prompt:
```
POWER OPTIONS (all are affordable with your remaining points):
A) Swordsmanship - Master blade combat techniques [skill, 1 points]
B) Shield Bash (Rank 1/3) - Bash with shield to stun [ability, 1 points]
C) Blood Drain - Drain enemy life force [species, 3 points]
```

**AI Response**:
```json
{
  "choice": "A",
  "reasoning": "Swordsmanship embodies my warrior spirit and allows me to showcase my courage on the battlefield."
}
```

**Selection**: Letter mapped to index → power ID returned

#### 5. Key Rules
- AI picks **one power at a time** until points exhausted
- Only shows **affordable options** (can pay with remaining points)
- Maximum **6 options** per choice
- Points deducted from **correct pool** based on tier:
  - skill tier → skill_points
  - ability tier → archetype_points
  - species tier → species_points
  - signature tier → signature_points
- Unlocked powers **cannot be undone**
- Ranked powers **cannot be de-ranked**

#### 6. Point Pool Management

Each character has separate point pools:
```sql
CREATE TABLE user_characters (
  skill_points INTEGER DEFAULT 0,
  archetype_points INTEGER DEFAULT 0,
  species_points INTEGER DEFAULT 0,
  signature_points INTEGER DEFAULT 0
);
```

Points are earned from:
- Leveling up
- Battle victories
- Quest completions
- Minigame successes
- Coach rewards

#### 7. Tracking Unlocks

Powers are tracked with their source:
```sql
CREATE TABLE character_powers (
  character_id UUID,
  power_id TEXT,
  current_rank INTEGER,
  unlocked_by TEXT, -- 'coach_suggestion' or 'character_rebellion'
  unlocked_at TIMESTAMP
);
```

### Code Location
- Main function: `rebellionAutoSpendPoints()` in `powerRebellionService.ts`
- AI decision: `getAISinglePowerChoice()` in `powerRebellionService.ts`
- Power operations: `unlockPower()`, `rankUpPower()` in `powerService.ts`
- Point granting: `grantPoints()` in `powerService.ts`

---

## Shared Patterns

Both systems use identical AI decision patterns:

### 1. Multiple Choice Format
- Letters A-F for up to 6 options
- Structured data objects (not text parsing)
- Clear option descriptions

### 2. OpenAI Configuration
```typescript
const response = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL, // 'gpt-4o-mini' or 'gpt-4'
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.8, // Higher for personality variance
  response_format: { type: 'json_object' }
});
```

### 3. Personality Context
Both systems use character personality for decisions:
```typescript
personality: {
  archetype: string;        // warrior, mage, etc.
  traits: string[];         // ["Honorable", "Wrathful", "Courageous"]
  backstory?: string;
  conversationStyle?: string;
}
```

### 4. Error Handling
- **No fallbacks**: Errors are thrown, not hidden
- **No fake data**: System fails openly if something is wrong
- **No defaults**: Missing data causes errors

### 5. Adherence Tracking
Both systems affect adherence:
```typescript
// Rebellion decreases adherence
if (rebelled) {
  newAdherence = Math.max(0, baseAdherence - 5);
  await updateAdherence(characterId, newAdherence);
}
```

---

## API Endpoints

### Power System
```
GET  /api/powers/character/:characterId    - Get all powers (unlocked + available)
POST /api/powers/unlock                    - Unlock a power (coach control)
POST /api/powers/rank-up                   - Rank up a power (coach control)
POST /api/powers/grant-points              - Grant points (triggers adherence check)
GET  /api/powers/definitions               - Get power catalog
```

### Equipment System
```
GET  /api/equipment/character/:characterId/inventory  - Get character's equipment
POST /api/equipment/equip                             - Equip item (triggers adherence check)
GET  /api/equipment/eligible/:characterId             - Get eligible equipment by tier
```

---

## Database Schema

### Powers
```sql
-- Power definitions (catalog of all powers)
CREATE TABLE power_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL, -- 'skill', 'ability', 'species', 'signature'
  unlock_cost INTEGER NOT NULL,
  rank_up_cost INTEGER NOT NULL,
  max_rank INTEGER NOT NULL,
  archetype TEXT,     -- For ability tier
  species TEXT,       -- For species tier
  character_id TEXT   -- For signature tier
);

-- Character's unlocked powers
CREATE TABLE character_powers (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL,
  power_id TEXT NOT NULL,
  current_rank INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlocked_by TEXT,  -- 'coach_suggestion' or 'character_rebellion'
  times_used INTEGER DEFAULT 0
);

-- Point pools
ALTER TABLE user_characters ADD COLUMN skill_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN archetype_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN species_points INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN signature_points INTEGER DEFAULT 0;
```

### Equipment
```sql
-- Equipment definitions
CREATE TABLE equipment (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slot TEXT NOT NULL,
  equipment_tier TEXT NOT NULL, -- 'universal', 'archetype', 'species', 'character'
  restricted_to_archetype TEXT,
  restricted_to_species TEXT,
  restricted_to_character TEXT,
  rarity TEXT,
  required_level INTEGER DEFAULT 1
);

-- Character's equipment inventory
CREATE TABLE character_equipment (
  id UUID PRIMARY KEY,
  character_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  is_equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing

### Power System Test
```bash
npx ts-node test_power_system.ts
```

Tests:
1. Get character powers
2. Manual unlock (coach control, high adherence)
3. Grant points (high adherence, no rebellion)
4. Grant points (low adherence, rebellion triggers)
5. Equipment eligibility validation

### Expected Results
- All tests pass without errors
- Powers unlocked by rebellion marked with `unlocked_by: 'character_rebellion'`
- Points correctly deducted from appropriate pools
- AI provides personality-based reasoning for each choice

---

## Design Principles

### 1. Consistency
Both systems use identical patterns:
- Multiple choice format
- Structured data
- Letter-based selection
- JSON responses
- Personality context

### 2. Transparency
- All decisions tracked with source (coach vs rebellion)
- Clear reasoning provided
- No hidden fallbacks

### 3. Permanence Matters
- Equipment: Reversible (can swap later)
- Powers: Irreversible (permanent choices)
- This affects severity and importance

### 4. No Fake Data
- No fallbacks to fake values
- No defaults that hide missing data
- Errors thrown openly when something is wrong

### 5. Personality-Driven
- AI uses character traits for decisions
- Choices align with personality
- Natural conversational style

---

## Future Enhancements

### Planned Features
- [ ] Power prerequisites (unlock X before Y)
- [ ] Power synergies (combos between powers)
- [ ] Equipment set bonuses (matching tier sets)
- [ ] Rebellion dialogue system (character explains rebellion to coach)
- [ ] Power respec system (rare item to undo power choices)
- [ ] Coach influence system (build trust to reduce rebellion)

### Under Consideration
- [ ] Power cooldowns in battle
- [ ] Equipment durability
- [ ] Power mastery beyond max rank
- [ ] Dynamic adherence thresholds based on bond level
