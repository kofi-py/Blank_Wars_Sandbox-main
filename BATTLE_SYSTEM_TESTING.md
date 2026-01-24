# Battle System Testing Guide

**Status:** Ready for Testing
**Date:** October 31, 2025

---

## Quick Summary

The battle system is now operational with:
- ✅ Real character loading from database (fixed filtering bug)
- ✅ Visual placeholders (colored tokens with HP bars, names, and stats)
- ✅ XP/rewards integration (already implemented in backend)
- ✅ Character conversion utilities (with backward compatibility)

---

## How to Test

### 1. Start the Battle System

1. Navigate to: `http://localhost:3007/game?tab=battles`
2. The page should load your actual characters from the database
3. Check the browser console for logs:
   - `🔄 [characterAPI] Extracted characters count: X` (should be > 0)
   - `🎮 HexBattleArena mounted`

### 2. Start a Battle

1. Select 1-3 characters from your roster for your team
2. Click "Start Battle" or similar button
3. The system will:
   - Create a player team from your selected characters
   - Generate an AI opponent team from available characters
   - Initialize the hex grid battle arena

### 3. Visual Elements to Verify

**Character Tokens:**
- Blue circles = Your team
- Red circles = Opponent team
- Character names below tokens
- HP bars (green/yellow/red based on health)
- HP text showing current/max (e.g., "100/120")
- Yellow pulsing dot = Active character's turn

**Battle Grid:**
- Hex grid layout visible
- Characters positioned correctly (user team on left, opponent on right)
- Hover effects on hexes
- Click to select characters

### 4. Battle Flow

The battle should proceed through these phases:
1. **Team Selection** - Pick your characters
2. **Pre-Battle Huddle** - Strategy selection phase
3. **Combat** - Turn-based hex grid battles
4. **Round Results** - Damage, effects, psychology
5. **Battle End** - Winner declared, XP awarded

### 5. Check XP Rewards

After a battle completes:
1. Check browser console for: `Awarding XP to character...`
2. Backend calls `CharacterProgressionService.awardExperience()`
3. Characters should gain XP (2 character_points per level)
4. Check database:
```sql
SELECT id, name, level, experience, character_points
FROM user_characters
WHERE user_id = 'your-user-id';
```

---

## Common Issues & Solutions

### Issue: "No characters available"
**Solution:** The character filtering bug has been fixed. If you still see this:
1. Check that you have characters in the database
2. Check browser console for API errors
3. Verify authentication token is valid

### Issue: Battle doesn't start
**Solution:** Check console for errors. Ensure:
1. WebSocket connection to port 4000 is active
2. BattleService is running on backend
3. No TypeScript errors in browser console

### Issue: Characters don't move/attack
**Solution:** The hex grid battle system may need additional wiring:
1. Check that turn order is initializing (console logs)
2. Verify action handlers are connected
3. Test with simpler demo mode first

---

## Technical Details

### Backend Integration Points

**Battle Service:**
- Location: `/backend/src/services/battleService.ts`
- XP Awards: Line 1524-1551
- Rewards: Handled automatically after battle completion

**Character Progression:**
- Location: `/backend/src/services/characterProgressionService.ts`
- Level-up: Auto-grants 2 character_points per level
- XP Calculation: Based on opponent level and battle performance

**API Endpoints:**
- `POST /api/battles/start` - Start a new battle
- `GET /api/user/characters` - Load user's characters (FIXED)
- `POST /api/character-progression/:id/award-xp` - Award XP

### Frontend Components

**Main Battle Arena:**
- File: `/frontend/src/components/ImprovedBattleArena.tsx`
- Real Characters: Line 525-560 (`createAIOpponentTeam()`)
- Team Selection: Line 1164-1202

**Hex Battle Grid:**
- File: `/frontend/src/components/battle/HexBattleArena.tsx`
- Character Tokens: `/frontend/src/components/battle/CharacterToken.tsx`
- Grid System: `/frontend/src/systems/hexGridSystem.ts`

**Character Conversion:**
- File: `/frontend/src/utils/characterConversion.ts`
- Converts database Character → TeamCharacter format
- Adds convenience properties (strength, speed, stamina)

---

## Next Steps

If battles work but need enhancements:

1. **Add Battle Events/Memories**
   - Create memorable moments from battles
   - Publish to event system for character development

2. **Improve AI Opponent Selection**
   - Match based on weight class
   - Consider team composition
   - Balance difficulty

3. **Add More Visual Feedback**
   - Damage numbers floating up
   - Hit effects and animations
   - Status effect icons

4. **Integrate with Larger Game Loop**
   - Unlock battles through story progression
   - Gate rewards based on headquarters tier
   - Add battle-specific equipment drops

---

## Debugging Commands

### Check Database for Test User
```sql
-- Find test user
SELECT id, email, username FROM users WHERE email LIKE '%test%';

-- Check their characters
SELECT uc.id, uc.level, uc.experience, uc.character_points, c.name
FROM user_characters uc
JOIN characters c ON uc.character_id = c.id
WHERE uc.user_id = 'USER_ID_HERE';
```

### Create Dev Session for Testing
```bash
curl -c /tmp/test_cookies.txt -X POST http://localhost:4000/auth/dev-session
curl -b /tmp/test_cookies.txt -s http://localhost:4000/api/user/characters | jq
```

### Check Backend Logs
```bash
# Backend should be running on port 4000
curl http://localhost:4000/health

# Check WebSocket connection
# Browser console should show: "Connected to battle server"
```

---

## Summary of Fixes Applied

1. **Fixed character filtering** (apiClient.ts)
   - Removed overly strict validation
   - Now returns database characters as-is

2. **Added character conversion** (characterConversion.ts)
   - Converts Character → TeamCharacter
   - Adds backward-compatible properties

3. **Verified XP integration** (battleService.ts)
   - Already implemented on line 1524
   - Awards XP automatically after battles

4. **Visual system complete** (CharacterToken.tsx)
   - Colored circles (blue/red)
   - HP bars and labels
   - Turn indicators

---

**The battle system is ready to test!** 🎮
