# Power & Spell System - Complete TODO List

## 🎯 UNIFIED CHARACTER_POINTS SYSTEM - IMPLEMENTED (Oct 28, 2025)

**Major System Refactor Completed:**
- ✅ Database migrated to unified `character_points` currency (migration 061)
- ✅ Cost structure implemented: (1,3,5) / (3,5,7) / (5,7,9) / (7,9,11) for ranks 1/2/3
- ✅ Backend powerService.ts fully updated to use character_points
- ✅ Backend spellService.ts updated to use character_points (NOT coins)
- ✅ Frontend PowerManager updated to show unified character_points display
- ✅ Old deprecated 4-pool system (skill/archetype/species/signature points) removed

**What This Means:**
- Players now spend ONE unified currency on BOTH powers AND spells
- Unlock costs scale by tier: Universal(1), Archetype(3), Species(5), Signature(7)
- Rank-up costs increase: Rank 2 and Rank 3 have different costs per tier
- Strategic trade-offs: max one signature ability OR unlock many universal abilities

## ✅ COMPLETED (Phase 1-4.3)

### Powers System
- ✅ Created Crumbsworth character (toaster species, appliance archetype)
- ✅ Added appliance archetype to database
- ✅ Implemented damage resistance system (migration 015)
- ✅ Implemented status effect system (migration 016)
- ✅ Created battleMechanicsService.ts with all mechanics:
  - Multi-hit attacks
  - Turn priority system
  - Extra actions per turn
  - Buff stealing/copying mechanics
  - Attack redirection
  - Damage type distinction (melee vs ranged)
  - Forced critical hits mechanism
  - Temporary damage immunity
  - Revive fallen ally mechanic
  - Stat sharing between allies
  - AOE targeting system
- ✅ **ALL POWERS IN DATABASE: 278 total**
  - **12 skill-tier powers** (universal)
  - **77 ability-tier powers** (11 archetypes × 7 each)
  - **63 species-tier powers** (9 species × 7 each)
  - **126 signature-tier powers** (18 characters, all with 7 powers)
- ✅ Fixed cyborg_self_repair naming conflict
- ✅ Fixed Achilles powers (removed heel curse, added correct 7)
- ✅ Created feature branch: `feature/power-spell-system-crumbsworth`
- ✅ Committed initial migrations and powers

### Phase 4 Progress
- ✅ 4.1: Crumbsworth equipment designed and inserted
- ✅ 4.2: Power system tested (unlock/rebellion/adherence working)
- ✅ 4.3: **battleMechanicsService INTEGRATED into battleService**
  - Damage calculation uses BattleMechanics.calculateDamageWithResistance()
  - Status effects use BattleMechanics.processStatusEffects()
  - Created POWER_EFFECTS_REFERENCE.md documentation
- ❌ 4.4: Powers in battle (blocked - battle system not operational)

### Phase 5 Progress (Powers UI)
- ✅ 5.1-5.3: **PowerManager UI EXISTS and functional**
  - Power browsing by tier with filters
  - Unlock/rank-up interface working
  - PowerCard component with rebellion tracking
- ✅ 5.4: **Enhanced PowerCard tooltips showing full effects**
  - Displays all effect details from JSON
  - Shows current rank and next rank preview
  - Formatted damage, buffs, debuffs, etc.
- ❌ 5.5: In-battle power activation UI (blocked - battle system not operational)
- ❌ 5.6: Power effect animations (blocked - battle system not operational)

---

## 📋 REMAINING WORK

### **Phase 4: Equipment & Testing**
- [ ] 1. Design equipment for Crumbsworth
- [ ] 2. Test power system implementation
- [ ] 3. Integrate battleMechanicsService into existing battleService
- [ ] 4. Test powers in actual battles

### **Phase 5: POWERS UI (Frontend)**
- [ ] 5. Complete power selection/management interface
- [ ] 6. Build power upgrade/rank-up interface
- [ ] 7. Create in-battle power activation UI
- [ ] 8. Add power tooltips showing effects/cooldowns/costs
- [ ] 9. Implement visual feedback for power effects (animations, particles, etc.)

### **Phase 6: SPELL SYSTEM (Backend)** - ✅ MOSTLY COMPLETE!
- ✅ 10. Design spell tier structure (common, uncommon, rare, epic, legendary)
- ✅ 11. Create spell database schema/migrations (spell_definitions, user_spells, character_spell_loadout tables)
- ✅ 12. **161 SPELLS IN DATABASE:**
  - **20 universal spells** (available to all)
  - **113 archetype-specific spells** (11 archetypes)
    - Warrior: 13 spells
    - Mage: 15 spells
    - Scholar: 15 spells
    - Tank: 15 spells
    - Leader: 15 spells
    - Trickster: 15 spells
    - Assassin: 5 spells
    - Beast: 5 spells
    - Mystic: 5 spells
    - System: 5 spells
    - Appliance: 5 spells
  - **28 species-specific spells:**
    - Cyborg: 5 spells
    - Deity: 4 spells
    - Fairy: 5 spells
    - Golem: 5 spells
    - Toaster: 5 spells
    - Vampire: 4 spells
- ✅ 15. Created SQL migrations (037-046 for spell system)
- ❌ 16. Implement spell learning/unlock system backend (API routes needed)
- ❌ 17. Integrate spells into battle system (spell casting, mana/energy costs)

### **Phase 7: SPELLS UI (Frontend)** - ✅ COMPLETE (Oct 28, 2025)
- ✅ 18. Created spellAPI.ts service (all API calls: get, unlock, rank-up, equip, unequip, loadout)
- ✅ 19. Created SpellCard.tsx component (displays spell info, unlock/rank-up buttons, effects, stats)
- ✅ 20. Created SpellManager.tsx component (spell library showing all spells by category)
- ✅ 21. Created SpellLoadout.tsx component (8-slot battle loadout manager with click-to-equip)
- ❌ 22. In-battle spell casting interface (blocked - battle system not operational)
- ❌ 23. Spell visual effects and animations (blocked - battle system not operational)

### **Phase 7.5: POWER LOADOUT SYSTEM** - ✅ COMPLETE (Oct 28, 2025)
- ✅ Created migration 062: `character_power_loadout` table (8 slots, mirroring spell loadout)
- ✅ Added `equipPower()`, `unequipPower()`, `getPowerLoadout()` to powerService.ts
- ✅ Updated `getCharacterPowers()` to include `is_equipped` flag and loadout data
- ✅ Added `/api/powers/equip`, `/api/powers/unequip`, `/api/powers/loadout/:id` routes
- ✅ Updated powerAPI.ts with equip functions and interfaces
- ✅ Created PowerLoadout.tsx component (8-slot battle loadout manager matching spell system)
- ✅ Fixed spell routes to use `unlockSpell`/`rankUpSpell` (removed old coin-based `learnSpell`)
- ✅ **UNIFIED LOADOUT SYSTEM**: Both powers and spells use identical 8-slot loadout mechanics

### **Phase 8: Git Management & Deployment**
- [ ] 23. Final commit with all features
- [ ] 24. Create pull request to merge to main
- [ ] 25. Code review and testing
- [ ] 26. Merge to main and deploy

---

## 📊 Estimated Scope

### Powers:
- **Total Powers**: 124 signature powers ✅ DONE
- **Backend**: Complete ✅
- **Frontend**: Needs completion

### Spells:
- **Total Spells**: **161 spells in database** ✅
  - Universal: 20 spells ✅
  - Archetype-specific: 113 spells ✅
  - Species-specific: 28 spells ✅
  - By tier: Common (23), Uncommon (40), Rare (48), Epic (26), Legendary (24)
- **Backend**: Database complete, API routes needed
- **Frontend**: Not started

---

## 🎯 Current Status (Updated 2025-10-28 - Session Complete)
**Last completed**:
- ✅ Unified character_points system fully implemented (database, backend, frontend)
- ✅ Powers UI complete with fixed rank-up cost display
- ✅ Spells UI complete (SpellManager, SpellCard, SpellLoadout components)
- ✅ **UNIFIED LOADOUT SYSTEM** for both powers and spells (8 slots each)
- ✅ PowerLoadout.tsx and SpellLoadout.tsx components created
- ✅ Backend services completely updated (character_points, no coins)
- ✅ Both systems using unified character_points currency
- ✅ Cost structure: (1,3,5) / (3,5,7) / (5,7,9) / (7,9,11) for ranks 1/2/3

**Current blockers**:
- Phase 4.4, 5.5, 5.6 - Battle system not operational yet (power/spell activation in battle)
- Phase 7.22-23 - In-battle power/spell casting UI (blocked by battle system)

**Next recommended tasks**:
1. **Character self-awareness system**: Add character preferences for powers/spells/equipment
2. **Adherence-based approval**: Loadout changes require adherence check (coach vs character control)
3. Equipment for 10 new characters (design weapons, armor, accessories)
4. Equipment tier system audit (verify consistency with power/spell tiers)
5. When battle system is operational, integrate power/spell activation with loadouts

---

## 📝 Notes
- This is a MASSIVE feature that touches both backend and frontend
- Powers are character-specific and always available
- Spells are learnable/unlockable and can be equipped/unequipped
- Both systems use the same battle mechanics (defined in battleMechanicsService.ts)
- Consider breaking this into smaller PRs if it gets too large
