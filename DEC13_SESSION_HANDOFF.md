# December 13, 2024 Session Handoff

## What Was Done This Session

### 1. Fixed (Committed & Pushed)
- **databaseAdapter.ts:966-967** - Removed trailing spaces from user character ID and serial number generation
- Commit: `5697f83f`

### 2. Fixed (Not Committed Yet)
- **CharacterToken.tsx:59-74** - Fixed emoji being used as `<img src>` - now properly displays emoji as text
- **MainTabSystem.tsx:3192** - Fixed colosseum header.png path (renamed file to remove space)
- File renamed: `colosseum header.png` → `colosseum-header.png`

### 3. Database Cleanup Done
- Cleaned 15 records in `user_characters` with malformed `serial_number` values

---

## Outstanding Issues

### HIGH PRIORITY: Battle Turn System Bug

**Problem**: Same character gets repeated turns in battle

**Root Cause**: `MainTabSystem.tsx:205` uses `user_team.characters` for BOTH user and opponent teams, causing duplicate IDs in `turnOrder` array.

**Location**: `frontend/src/components/MainTabSystem.tsx` lines 201-217

**Current Code**:
```typescript
opponent_team={{
  id: 'opponent-team',
  name: 'Test Opponent',
  coach_name: 'AI Coach',
  characters: convertCharactersToTeamCharacters(user_team.characters), // BUG: Same IDs!
  ...
}}
```

**Why It Breaks**:
1. `turnOrder = [...user_characters, ...opponent_characters]` has duplicate IDs
2. `indexOf()` always finds first occurrence
3. Opponent characters never get turns

---

## Proper Fix: Implement PvE Backend Routes

### What Exists
- **Database**: `ai_teams` table (3 active teams), `ai_characters` table (567 chars - but has duplicates)
- **Backend**: `battleService.find_pve_opponent()` private method works
- **Frontend**: `pveAPI.ts` expects endpoints that don't exist

### The 3 AI Teams
| Team | Rating | Characters |
|------|--------|------------|
| The Mythic Beasts | 1000 | Fenrir, Sun Wukong, Unicorn |
| The Legends of Old | 1100 | Merlin, Joan of Arc, Cleopatra VII |
| The Ancient Warriors | 1200 | Achilles, Genghis Khan, Shaka Zulu |

### Data Issue
Each team has ~189 duplicate character entries instead of 3. Need to clean up:
```sql
-- Check the duplication
SELECT team_id, COUNT(*) FROM ai_characters GROUP BY team_id;

-- Should be 3 per team, but it's ~189 per team
```

### Missing Backend Routes
Create `backend/src/routes/pveRoutes.ts`:

1. **GET /pve/characters/:user_id** - Get player's characters
2. **GET /pve/coach/:user_id** - Get coach progression
3. **POST /pve/generate-opponent** - Generate AI opponent (wrap `find_pve_opponent`)
4. **POST /pve/battle** - Create PvE battle

### Implementation Steps

1. **Clean up ai_characters data** - Remove duplicates, keep 3 per team
   ```sql
   -- Keep only one of each character_id per team
   DELETE FROM ai_characters a
   USING ai_characters b
   WHERE a.id > b.id
     AND a.team_id = b.team_id
     AND a.character_id = b.character_id;
   ```

2. **Create pveRoutes.ts**:
   ```typescript
   import { Router } from 'express';
   import { authenticate_token } from '../services/auth';
   import { db_adapter } from '../services/databaseAdapter';

   const router = Router();

   // GET /pve/opponent - Get random AI team with 3 characters
   router.get('/opponent', authenticate_token, async (req, res) => {
     const teamResult = await db_adapter.query(`
       SELECT * FROM ai_teams WHERE is_active = true ORDER BY RANDOM() LIMIT 1
     `);

     const charsResult = await db_adapter.query(`
       SELECT ac.*, c.name, c.title, c.archetype, c.avatar_emoji
       FROM ai_characters ac
       JOIN characters c ON ac.character_id = c.id
       WHERE ac.team_id = $1
       LIMIT 3
     `, [teamResult.rows[0].id]);

     return res.json({
       success: true,
       team: teamResult.rows[0],
       characters: charsResult.rows
     });
   });

   export default router;
   ```

3. **Register in server.ts**:
   ```typescript
   import pveRoutes from './routes/pveRoutes';
   app.use('/api/pve', pveRoutes);
   ```

4. **Update MainTabSystem.tsx** to call `/api/pve/opponent` instead of cloning user team

### Quick Fix Alternative
If proper implementation takes too long, just prefix opponent IDs:
```typescript
characters: convertCharactersToTeamCharacters(user_team.characters).map(c => ({
  ...c,
  id: `opponent_${c.id}`
})),
```

---

## Files Modified (Uncommitted)

1. `frontend/src/components/battle/CharacterToken.tsx` - Emoji fix
2. `frontend/src/components/MainTabSystem.tsx` - Image path fix
3. `frontend/public/images/Battle/colosseum-header.png` - Renamed from "colosseum header.png"

---

## Other Issues Found in Console Logs

1. **Redundant API calls** - `/user/characters` called 6+ times on page load
2. **Progression data undefined** - Shows `undefined` multiple times before loading
3. **Timer auto-acting** - Character acts autonomously when timer expires (may be intentional)

---

## Context Used
This session used significant context on research and investigation. The next AI should be able to implement the PvE routes with the information above.
