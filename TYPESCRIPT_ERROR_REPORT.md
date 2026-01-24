# TypeScript Error Analysis Report

## Summary
**252 TypeScript errors** detected in frontend, up from 0 errors.

## Root Cause
The errors are caused by a **type mismatch**: code is accessing `temporary_stats` property on variables typed as `UserCharacter`, but `UserCharacter` type doesn't have this property.

## Evidence

### 1. Contestant Interface (HAS temporary_stats)
**File:** `frontend/src/services/apiClient.ts` line 449
```typescript
export interface Contestant {
  // ... other properties ...
  temporary_stats?: TemporaryStats;  // ✅ HAS THIS
}
```

### 2. UserCharacter Type (MISSING temporary_stats)
The `UserCharacter` type is imported from somewhere (need to find the source), but it's MISSING the `temporary_stats` property.

## Affected Files (Top 10)
1. `SafeMotion.tsx` - 42 errors
2. `CombinedEquipmentManager.tsx` - 42 errors
3. `CombinedGroupActivitiesWrapper.tsx` - 55 errors
4. `InventoryManagerWrapper.tsx` - 22 errors
5. `headquartersUtils.ts` - 14 errors
6. `AttributesManagerWrapper.tsx` - 11 errors
7. `FinancialAdvisorChat.tsx` - 7 errors
8. `Clubhouse.tsx` - 7 errors
9. `KitchenTable3D.tsx` - 7 errors
10. `PowerDevelopmentChat.tsx` - 5 errors

## Recent Changes (Potential Causes)
From git log:
1. `f081ce67` - Loadout table fix (backend only)
2. `f41749f3` - spell_type → category refactor (frontend types changed)
3. `e36c3f3b` - Shared types monorepo setup
4. `b18bd92d` - "Remove all data fallbacks and implement attributes handler"

**Most Likely Culprit:** Commit `b18bd92d` or `e36c3f3b` may have changed type definitions.

## Next Steps
1. Find where `UserCharacter` is defined
2. Add `temporary_stats?: TemporaryStats` to UserCharacter type
3. OR: Change code to use `Contestant` type instead of `UserCharacter`
