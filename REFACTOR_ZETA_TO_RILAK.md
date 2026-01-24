# Character Rename Refactor: zeta_reticulan → rilak_trelkar

## Mission Objective
Rename the alien Grey character from `zeta_reticulan` to `rilak_trelkar` throughout the entire codebase. This is a comprehensive refactoring task that touches backend code, frontend code, database references, image files, and configuration files.

## Why This Refactor Is Needed
The current character is named "Zeta Reticulan" which is actually the name of the alien SPECIES (Grey aliens from the Zeta Reticuli star system in UFO lore). This is poor worldbuilding - equivalent to naming a human character "Homo Sapien".

The character needs a proper individual name: **Rilak-Trelkar** (or "Rilak" for short).

## Database Changes (ALREADY COMPLETED)
The database has already been migrated:
- Character ID renamed: `zeta_reticulan` → `rilak_trelkar`
- Species column added with value: `zeta_reticulan_grey`
- Migration files: `/Users/gabrielgreenstein/blank-wars-clean/backend/migrations/035_add_species_column.sql`

## Codebase Refactor Scope

### 1. Backend Files to Update
Search and replace all instances of `zeta_reticulan` with `rilak_trelkar` in these locations:

**Primary Backend Files:**
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/aiChatService.ts` (character mappings, missing agents list)
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/agentResolver.ts` (agent ID mappings)
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/localAGIService.ts` (character prompts, personality definitions)
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/CardPackService.ts` (financial personality data)
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/prewarmAgents.retired.ts` (agent list)

**Configuration Files:**
- Search `/Users/gabrielgreenstein/blank-wars-clean/backend/` for all `.ts` files containing `zeta_reticulan`

### 2. Frontend Files to Update

**Character Data:**
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/characters.ts` (main character database - UPDATE character object key and all references)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/therapyAgentResolver.ts` (therapy character mappings)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/therapyChatService.ts` (therapy character lookups)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/legendaryAbilities.ts` (character abilities)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/historical_weapons.ts` (preferred character references)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/equipmentIntegrationTest.ts` (test data)

**UI/Display Files:**
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/utils/battleImageMapper.ts` (image path mappings)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/utils/characterImageUtils.ts` (character image utilities)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/lib/chat/agentKeys.ts` (chat agent mappings)

**Facility/Housing Data:**
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/headquartersData.ts` (suitable characters for facilities)

### 3. Image Files to Rename

**IMPORTANT:** All image files must be renamed from `zeta` or `alien_grey` to `rilak` or `rilak_trelkar`.

Search for image files in:
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/public/images/`
- Look for files containing: `zeta`, `alien_grey`, `Zeta`, `AlienGrey`

Rename pattern:
- `zeta.png` → `rilak.png`
- `alien_grey_battle.png` → `rilak_battle.png`
- etc.

**After renaming images, update these image mapping files:**
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/constants/equipmentImages.ts` (update equipment image paths)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/utils/battleImageMapper.ts` (already noted above)
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/utils/characterImageUtils.ts` (already noted above)

### 4. Display Name Updates

**Character Display Name:**
The character's display name should be updated from "Zeta Reticulan" to "Rilak-Trelkar" in:
- Character data objects (`name` field)
- UI display components
- Any hardcoded strings

**Nickname/Short Form:**
- Short form can be "Rilak" for casual references
- Full formal name: "Rilak-Trelkar"

### 5. Special Cases to Watch For

**Alias Mappings:**
In agent resolver files, ADD new aliases for the character:
```typescript
"rilak_trelkar": "rilak_trelkar",
"rilak": "rilak_trelkar",
"alien grey": "rilak_trelkar",  // Keep this for legacy support
"grey alien": "rilak_trelkar",
"zeta reticulan": "rilak_trelkar",  // Keep this for legacy support
```

**DO NOT change these:**
- Species name `zeta_reticulan_grey` should remain as-is
- Any references to the Zeta Reticuli star system in lore/backstory
- Database species column values

## Process Steps

1. **Search Phase:**
   - Use `grep -r "zeta_reticulan" /Users/gabrielgreenstein/blank-wars-clean/` to find all occurrences
   - Document every file that contains references
   - Create a checklist of files to update

2. **Backend Updates:**
   - Update all TypeScript files with character ID changes
   - Update agent resolver mappings
   - Update personality/prompt definitions
   - Test that backend compiles without errors

3. **Frontend Updates:**
   - Update character data objects
   - Update all UI/display references
   - Update image mapper utilities
   - Test that frontend compiles without errors

4. **Image Renames:**
   - Identify all image files
   - Rename systematically
   - Update all image path references in code
   - Verify images load correctly in UI

5. **Testing Phase:**
   - Test character selection in UI
   - Test therapy sessions with Rilak-Trelkar
   - Test battle system with Rilak-Trelkar
   - Test real estate agent interactions (mentions of character)
   - Test equipment/abilities loading
   - Verify all images display correctly

6. **Commit and Deploy:**
   - Create comprehensive commit message
   - Push to GitHub
   - Verify Railway deployment succeeds
   - Test in production environment

## Research Materials

**Key Files for Context:**
- `/Users/gabrielgreenstein/blank-wars-clean/Chat_Log/cc_10_5_25_6.17pm.md` - This session's chat log with full context
- `/Users/gabrielgreenstein/blank-wars-clean/backend/migrations/035_add_species_column.sql` - Database migration with rename
- `/Users/gabrielgreenstein/blank-wars-clean/frontend/src/data/characters.ts` - Main character data structure

**Testing Endpoints:**
- Character selection: Check character appears with correct name
- Therapy: Test therapy session initiation
- Battle: Test character in battle
- Images: Visual verification in UI

## Expected Outcomes

After completion:
1. ✅ Character searchable by "Rilak-Trelkar" or "Rilak" in all systems
2. ✅ All images display correctly with new filenames
3. ✅ No broken references to `zeta_reticulan` character ID
4. ✅ Backward compatibility maintained through alias mappings
5. ✅ Species system intact with `zeta_reticulan_grey` as species name
6. ✅ All game systems (therapy, battle, chat, facilities) work correctly

## Validation Checklist

- [ ] Backend compiles without errors
- [ ] Frontend compiles without errors
- [ ] No `zeta_reticulan` character ID references remain (except in alias maps and species)
- [ ] All images renamed and loading correctly
- [ ] Character appears in character selection
- [ ] Therapy sessions work
- [ ] Battle system works
- [ ] Real estate agents reference character correctly
- [ ] Equipment/abilities load correctly
- [ ] Production deployment successful

## Notes for Next Agent

- This is a COMPLETE refactor - every reference must be found and updated
- Use global search to ensure nothing is missed
- Test thoroughly before deploying
- Image renames are critical - verify with Brittany if needed
- Maintain alias mappings for backward compatibility
- DO NOT change species-related references to `zeta_reticulan_grey`
