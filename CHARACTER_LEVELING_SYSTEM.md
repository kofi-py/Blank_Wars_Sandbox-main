# Character Leveling and Points System

## Overview
The character leveling system grants characters experience points (XP) which accumulate to trigger level-ups. Each level-up automatically grants character_points that can be spent on unlocking and ranking up powers and spells.

---

## System Components

### 1. Experience & Leveling

**Database Schema:**
- Table: `user_characters`
- Columns:
  - `level` (integer, default: 1)
  - `experience` (integer, default: 0)
  - `character_points` (integer, default: 0)

**XP Award Endpoint:**
```
POST /api/character-progression/:characterId/award-xp
Body: { amount, source, description, multiplier }
```

**Service:**
- Location: `backend/src/services/characterProgressionService.ts`
- Method: `CharacterProgressionService.awardExperience()`
- Auto-detects level-ups when XP threshold reached
- XP formula: Progressive scaling per level

---

### 2. Character Points System

**Unified Currency:**
- Single `character_points` column replaces deprecated tier-specific points
- Used for BOTH powers AND spells
- Encourages strategic saving and planning

**Points Granted on Level-Up:**
- **2 character_points per level**
- Automatically added when character levels up
- Code location: `characterProgressionService.ts:460-466`

**Design Philosophy:**
- Forces strategic saving for higher-tier abilities
- Prevents immediate signature power unlocks
- Encourages gradual progression

---

## Ability Cost Structure

### Formula
```
Unlock Cost = Tier × 2 + PowerLevel - 1
Rank 2 Cost = Unlock Cost + Tier
Rank 3 Cost = Unlock Cost + (2 × Tier)
```

### Powers Cost Table

| Tier | Power Level | Unlock | Rank 2 | Rank 3 | Levels to Save |
|------|-------------|--------|--------|--------|----------------|
| **Skill (1)** | Level 1 | 2 | 3 | 4 | 1 level |
| | Level 2 | 3 | 4 | 5 | 1-2 levels |
| | Level 3 | 4 | 5 | 6 | 2 levels |
| **Ability (2)** | Level 1 | 4 | 6 | 8 | 2 levels |
| | Level 2 | 5 | 7 | 9 | 2-3 levels |
| | Level 3 | 6 | 8 | 10 | 3 levels |
| **Species (3)** | Level 1 | 6 | 9 | 12 | 3 levels |
| | Level 2 | 7 | 10 | 13 | 3-4 levels |
| | Level 3 | 8 | 11 | 14 | 4 levels |
| **Signature (4)** | Level 1 | 8 | 12 | 16 | 4 levels |
| | Level 2 | 9 | 13 | 17 | 4-5 levels |
| | Level 3 | 10 | 14 | 18 | 5 levels |

### Spells Cost Table

| Tier | Power Level | Unlock | Rank 2 | Rank 3 | Levels to Save |
|------|-------------|--------|--------|--------|----------------|
| **Universal (1)** | Level 1 | 2 | 3 | 4 | 1 level |
| | Level 2 | 3 | 4 | 5 | 1-2 levels |
| | Level 3 | 4 | 5 | 6 | 2 levels |
| **Archetype (2)** | Level 1 | 4 | 6 | 8 | 2 levels |
| | Level 2 | 5 | 7 | 9 | 2-3 levels |
| | Level 3 | 6 | 8 | 10 | 3 levels |
| **Species (3)** | Level 1 | 6 | 9 | 12 | 3 levels |
| | Level 2 | 7 | 10 | 13 | 3-4 levels |
| | Level 3 | 8 | 11 | 14 | 4 levels |
| **Signature (4)** | Level 1 | 8 | 12 | 16 | 4 levels |
| | Level 2 | 9 | 13 | 17 | 4-5 levels |
| | Level 3 | 10 | 14 | 18 | 5 levels |

---

## Power & Spell Management

### Unlock Endpoints

**Powers:**
```
POST /api/powers/unlock
Body: { characterId, powerId }
Returns: { success, message }
```

**Spells:**
```
POST /api/spells/unlock
Body: { characterId, spellId }
Returns: { success, message }
```

### Rank Up Endpoints

**Powers:**
```
POST /api/powers/rank-up
Body: { characterId, powerId }
Returns: { success, message }
```

**Spells:**
```
POST /api/spells/rank-up
Body: { characterId, spellId }
Returns: { success, message }
```

### Frontend Integration

**Services:**
- `frontend/src/services/powerAPI.ts` - `unlockPower()`, `rankUpPower()`
- `frontend/src/services/spellAPI.ts` - `unlockSpell()`, `rankUpSpell()`

**Components:**
- `PowerManager.tsx` - Displays powers with costs, unlock/rank buttons
- `SpellManager.tsx` - Displays spells with costs, unlock/rank buttons
- Both automatically call API on button click
- Points deducted from `character_points` column

---

## Power Level System

### Categorization
Each power and spell has a `power_level` (1, 2, or 3):
- **Level 1 (Common/⚪):** Weaker, cheaper, more accessible
- **Level 2 (Uncommon/🔵):** Medium strength and cost
- **Level 3 (Rare/🟣):** Strongest, most expensive

### Distribution (Pyramid Structure)
For signature abilities (7 per character):
- 4 × Level 1 (Common)
- 2 × Level 2 (Uncommon)
- 1 × Level 3 (Rare)

### UI Display
- Badges show power level with color coding
- Sorting: Cost → Power Level → Name (ascending)
- Components: `PowerCard.tsx`, `SpellCard.tsx`

---

## Database Verification

**All 376 powers categorized:**
- 12 skill, 70 ability, 63 species, 231 signature
- 100% have power_level assigned
- 0 system archetype powers (deleted)

**All 314 spells categorized:**
- 20 universal, 56 archetype, 84 species, 154 signature
- 100% have power_level assigned

**All 33 characters standardized:**
- Exactly 7 signature powers each
- No redundant abilities

**Cost formula verified:**
- 0 powers with incorrect costs
- 0 spells with incorrect costs
- All match expected formula exactly

---

## Admin Testing Endpoint

**Force Level-Up (Admin Only):**
```
POST /api/level-up/character
Body: { admin_secret, character_id }
```
- Requires valid admin_secret
- Awards exactly enough XP to level up once
- Automatically triggers character_points grant
- Location: `backend/src/routes/levelUpRoutes.ts`

---

## Complete Flow Example

### Scenario: Character Levels from 1 → 5

1. **Level 1 → 2:** Gain 2 points (total: 2)
   - Can unlock 1 skill power (2 pts)

2. **Level 2 → 3:** Gain 2 points (total: 4 or 2 if spent)
   - Can unlock 1 ability power (4 pts)

3. **Level 3 → 4:** Gain 2 points (total: 2)
   - Save for later

4. **Level 4 → 5:** Gain 2 points (total: 4)
   - Continue saving

5. **After more levels:** Accumulate 8 points
   - Can unlock 1 signature power (8 pts)

### Strategic Choices
- Spend immediately on weak abilities for early power spike
- Save for signature powers for late-game strength
- Mix approach: some cheap unlocks + saving for rare abilities

---

## Related Systems

### Rebellion System
- When `gameplan_adherence < 70%`, characters auto-spend points
- Uses AI to choose powers/spells matching personality
- Services:
  - `backend/src/services/powerRebellionService.ts`
  - `backend/src/services/spellRebellionService.ts`
- Triggered by: `POST /api/powers/grant-points`

### Chat Advisors
- `PowerDevelopmentChat.tsx` - Power development advice
- `SpellDevelopmentChat.tsx` - Spell development advice
- Endpoints:
  - `POST /api/coaching/powers`
  - `POST /api/coaching/spells`
- Personality-driven recommendations
- Bond level tracking

---

## Implementation Status

✅ **Fully Operational:**
- XP gain system
- Automatic level-up detection
- Automatic character_points grant (2 per level)
- Power unlock/rank system
- Spell unlock/rank system
- Cost calculations
- UI display with badges and sorting
- Power/spell rebellion on low adherence
- Chat advisor systems

⚠️ **Potential Gap:**
- Battle system integration (XP awards from battles)
- Need to verify battles call `award-xp` endpoint

---

## Key Files Reference

**Backend:**
- `src/services/characterProgressionService.ts` - Core leveling logic
- `src/routes/characterProgressionRoutes.ts` - XP award endpoint
- `src/routes/powers.ts` - Power unlock/rank/grant endpoints
- `src/routes/spells.ts` - Spell unlock/rank endpoints
- `src/routes/coachingRoutes.ts` - Power/spell chat endpoints
- `src/routes/levelUpRoutes.ts` - Admin testing endpoints

**Frontend:**
- `src/components/PowerManager.tsx` - Power UI
- `src/components/SpellManager.tsx` - Spell UI
- `src/components/PowerCard.tsx` - Power display with badges
- `src/components/SpellCard.tsx` - Spell display with badges
- `src/components/PowerDevelopmentChat.tsx` - Power chat
- `src/components/SpellDevelopmentChat.tsx` - Spell chat
- `src/services/powerAPI.ts` - Power API calls
- `src/services/spellAPI.ts` - Spell API calls

**Database:**
- Railway PostgreSQL (hopper.proxy.rlwy.net:53805)
- Production credentials in backend/.env

---

## Change History

**October 30, 2025:**
- Fixed automatic character_points grant on level-up
- Set to 2 points per level (was not implemented)
- Added comprehensive documentation
- Verified all 690 abilities have correct costs
- Deployed to production

**Previous Sessions:**
- Added power_level categorization system
- Standardized all characters to 7 signature powers
- Created spell rebellion system
- Added power/spell development chat
- Removed legacy skill tree system
