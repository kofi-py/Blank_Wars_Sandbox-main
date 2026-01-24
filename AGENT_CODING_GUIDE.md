# Agent Coding Guide - Blank Wars 2026

## Project Overview
TypeScript/React frontend with snake_case naming convention for variables, properties, and interface members. Converting from legacy camelCase to snake_case systematically.

---

## File Exclusions

**NEVER modify these files/directories:**
- `archived_components/` - Legacy archived code
- `_BACKUP/` - Backup files
- `_ORIGINAL/` - Original file backups
- `/archive/` - Archived components within src
- `test-3d/` - 3D testing code
- Any file with `_BACKUP` or `_ORIGINAL` in the name

**Grep exclusion pattern:**
```bash
grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d\|/archive/"
```

---

## Naming Conventions

### ✅ Convert to snake_case:
1. **State variables** (first part of useState):
   ```typescript
   const [player_team, set_player_team] = useState<Team>([]);
   const [current_round, set_current_round] = useState(1);
   ```

2. **Local variables**:
   ```typescript
   const character_id = "achilles";
   const team_chemistry = calculateChemistry();
   ```

3. **Function parameters**:
   ```typescript
   function updateCharacter(character_id: string, new_stats: Stats) {
     // ...
   }
   ```

4. **Interface/Type properties**:
   ```typescript
   interface Character {
     character_id: string;
     max_health: number;
     team_trust: number;
   }
   ```

5. **Object literal properties**:
   ```typescript
   const character = {
     character_id: "achilles",
     max_health: 100,
     current_health: 85
   };
   ```

### ❌ NEVER convert (keep camelCase):
1. **React setter functions**:
   ```typescript
   const [playerTeam, setPlayerTeam] = useState([]); // setPlayerTeam stays camelCase
   ```

2. **Function/method names**:
   ```typescript
   function calculateTeamPower() { } // Keep camelCase
   const handleClick = () => { };    // Keep camelCase
   ```

3. **Event handlers**:
   ```typescript
   onClick={handleClick}
   onChange={handleChange}
   ```

4. **React props (DOM/library)**:
   ```typescript
   className="battle-hud"
   ```

5. **Framer Motion props**:
   ```typescript
   whileHover={{ scale: 1.05 }}
   whileTap={{ scale: 0.95 }}
   ```

6. **Import/Export names** (unless renaming):
   ```typescript
   import { TeamCharacter } from '@/data/teamBattleSystem';
   ```

---

## TypeScript Error Fixing Patterns

### TS2561 (Object Literal Properties)

**Pattern:** Object literal property name doesn't match interface

**Fix:** Convert property keys to snake_case

```typescript
// BEFORE (Error)
const team = {
  teamName: "Warriors",
  currentMorale: 75
};

// AFTER (Fixed)
const team = {
  team_name: "Warriors",
  current_morale: 75
};
```

**ES6 Shorthand Fix:**
```typescript
// BEFORE (Error)
const teamName = "Warriors";
return { teamName };

// AFTER (Fixed)
const teamName = "Warriors";
return { team_name: teamName };
```

### TS2304 (Cannot find name)

**Pattern:** Variable referenced with wrong case

**Fix:** Convert variable references to snake_case

```typescript
// BEFORE (Error)
const character_relationships = {};
characterRelationships[id] = data; // ❌ Error

// AFTER (Fixed)
const character_relationships = {};
character_relationships[id] = data; // ✅ Correct
```

### TS2339 (Property does not exist)

**Pattern:** Property missing from interface

**Fix:** Add missing properties as optional with appropriate types

```typescript
// BEFORE (Error)
interface Character {
  id: string;
  name: string;
}
// Usage: character.max_health ❌ Error

// AFTER (Fixed)
interface Character {
  id: string;
  name: string;
  max_health?: number;  // Add as optional
  attack?: number;
  defense?: number;
}
```

**CamelCase Compatibility Pattern:**
```typescript
interface BattleHUDProps {
  // Both cases for compatibility
  is_announcer_enabled?: boolean;
  isAnnouncerEnabled?: boolean;

  player_currency?: number;
  playerCurrency?: number;
}
```

### TS2551 (Property with "Did you mean")

**Pattern:** Property access with wrong case

**Fix:** Use the suggested snake_case property

```typescript
// Error: Property 'teamLevel' does not exist. Did you mean 'team_level'?
const level = opponent.teamLevel; // ❌

// Fixed
const level = opponent.team_level; // ✅
```

---

## Code Conversion Rules

### 1. Variable Declarations
```typescript
// ❌ Wrong
const playerTeam = [];
const currentRound = 1;

// ✅ Correct
const player_team = [];
const current_round = 1;
```

### 2. Function Parameters
```typescript
// ❌ Wrong
function updateCharacter(characterId: string, newStats: Stats) { }

// ✅ Correct
function updateCharacter(character_id: string, new_stats: Stats) { }
```

### 3. Destructuring
```typescript
// ❌ Wrong
const { playerTeam, opponentTeam } = battleState;

// ✅ Correct
const { player_team, opponent_team } = battleState;
```

### 4. Object Properties
```typescript
// ❌ Wrong
const config = {
  maxRounds: 10,
  teamSize: 5
};

// ✅ Correct
const config = {
  max_rounds: 10,
  team_size: 5
};
```

---

## Git Commit Guidelines

### Commit Message Format
```
fix: <brief description>

<detailed explanation>

Changes:
- <change 1>
- <change 2>

Fixed X errors (Y → Z remaining)
Total errors reduced: A → B
```

### Example Commit Messages

**Good:**
```
fix: convert 83 object literal properties to snake_case

Fixed TS2561 errors by converting ES6 shorthand properties to explicit
syntax with correct property names.

Changes:
- ES6 shorthand: refreshToken → refresh_token: refreshToken
- Regular syntax: propertyName: value → property_name: value
- Fixed 83 TS2561 errors (all non-archive errors resolved)

Total errors reduced: 3,647 → 3,574 (73 errors fixed)
```

**Bad:**
```
fixed stuff
updated files
changes
```

### Commit Frequency
- Commit every 50-100 errors fixed
- Commit by logical grouping (by interface type, error type, etc.)
- Always commit before trying risky changes
- Push after every 2-3 commits

---

## Automated Fixing Scripts

### Script Locations
- `/tmp/fix_ts2561_errors.js` - Object literal property fixes
- `/tmp/fix_ts2304_errors.js` - Undefined variable fixes
- `/tmp/batch_replace.js` - Property access pattern fixes

### Running Scripts
```bash
cd /home/user/Blank_Wars_2026/frontend
node /tmp/fix_ts2561_errors.js
```

### Script Patterns

**Object Literal Fixer:**
- Converts `propertyName:` → `property_name:`
- Converts ES6 shorthand: `propertyName` → `property_name: propertyName`

**Variable Reference Fixer:**
- Converts camelCase variable refs → snake_case
- Uses TypeScript errors to identify wrong references

---

## Testing & Verification

### Check TypeScript Errors
```bash
cd /home/user/Blank_Wars_2026/frontend
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d" | wc -l
```

### Check Specific Error Type
```bash
npx tsc --noEmit 2>&1 | grep "error TS2339" | grep -v "archived_components\|_BACKUP\|_ORIGINAL\|test-3d" | wc -l
```

### Verify Changes
```bash
# Check git diff
git diff --stat

# View specific file changes
git diff src/components/BattleHUD.tsx

# Check for corruption (binary garbage)
git diff | grep "��"
```

---

## Common Pitfalls

### ❌ DON'T:
1. Convert React setter functions to snake_case
2. Convert function names to snake_case
3. Modify files in excluded directories
4. Use UTF-8 special characters in bash/sed scripts
5. Commit without verifying the changes
6. Make git operations without permission
7. Change camelCase → snake_case then reference old camelCase name
8. Convert Framer Motion props (whileHover, etc.)

### ✅ DO:
1. Always verify with `git diff` before committing
2. Run TypeScript checks after changes
3. Add properties as optional (`?`) when uncertain
4. Use `any` type when type is unclear
5. Commit frequently with descriptive messages
6. Test regex patterns on small samples first
7. Keep both camelCase and snake_case variants for compatibility
8. Ask permission before git push/revert operations

---

## Directory Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── data/           # Data models, interfaces, business logic
│   ├── services/       # API clients, external services
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React contexts
│   ├── systems/        # Game systems (battle, training, etc.)
│   ├── utils/          # Utility functions
│   ├── lib/            # Shared libraries
│   └── types/          # Type definitions
├── archive/            # ❌ Don't modify
├── archived_components/ # ❌ Don't modify
└── test-3d/           # ❌ Don't modify
```

---

## Quick Reference

### Most Common Conversions
```
camelCase        → snake_case
---------          -----------
teamName         → team_name
maxHealth        → max_health
currentRound     → current_round
playerTeam       → player_team
characterId      → character_id
battleState      → battle_state
isConnected      → is_connected
hasError         → has_error
```

### Property Type Defaults
- Boolean: `boolean`
- Numbers: `number`
- Strings: `string`
- Objects: `any` (when structure unknown)
- Arrays: `any[]` (when element type unknown)
- Functions: `(...args: any[]) => any` (when signature unknown)

---

## Contact & Help

- Main branch: `claude/continue-previous-session-01KiUrV7gWvrggn4HY2inYRc`
- TypeScript version: 5.9.3
- Frontend directory: `/home/user/Blank_Wars_2026/frontend`

**Before starting work:**
1. Read this guide completely
2. Run TypeScript check to get baseline error count
3. Identify error types to fix
4. Create a plan
5. Work systematically
6. Commit frequently
7. Report progress

Good luck! 🎯
