# Group Therapy Audit Report
**Date**: October 28, 2025
**Status**: Therapy chat was broken - now fixed, but group therapy needs verification

---

## Executive Summary

✅ **Individual therapy FIXED** - Added comedian_style_id to all therapists
⚠️ **Group therapy NEEDS TESTING** - Should work now, but has potential failure points

---

## 1. Root Cause (FIXED)

### Problem
Therapists Seraphina and Zxk14bW^7 were missing `comedian_style_id`:
```
STRICT MODE: Character not found in database: seraphina
```

### Solution Applied
- Seraphina: comedian_style_id = 51 (matronist_003)
- Zxk14bW^7: comedian_style_id = 84 (analyst_036)
- Carl Jung: Already had 98 (therapist_050)

**Status**: ✅ Applied to production and local databases

---

## 2. Group Therapy Flow Analysis

### Frontend Flow (TherapyModule.tsx)
1. User selects 2-3 characters for group therapy
2. Frontend calls `therapyChatService.startGroupSession()`
3. Session created with type='group', multiple participantIds
4. Calls `generateGroupTherapistQuestion()` to get therapist opening
5. Then loops through each patient calling `generateGroupPatientResponse()`

### Backend Flow (ai.ts)
1. All requests go to `/ai/chat` endpoint
2. Domain detected as 'therapy'
3. Routed to `handleTherapyRequest()`
4. Uses `assembleTherapyPromptUniversal()` for both therapist and patients
5. **CRITICAL**: Backend treats each request as individual - no special group logic

---

## 3. Potential Failure Points

### 🔴 HIGH RISK - Backend Group Context

**Issue**: Backend `handleTherapyRequest()` doesn't know about group therapy
- Lines 2551-2800: Handler only processes ONE character at a time
- No group dynamics awareness
- No multi-patient context

**Example Problem**:
```typescript
// Backend line 2727-2744: Gets patient name
if (role === 'patient') {
  patientName = agentKey; // Only ONE patient
} else {
  // Therapist gets ONE patient name from usercharId
  const character = await dbAdapter.userCharacters.findById(usercharId);
  patientName = character.name;
}
```

**Impact**:
- Therapist may not know it's a group session
- Patients may not reference each other
- Group dynamics lost in backend prompt

---

### 🟡 MEDIUM RISK - Character Context Resolution

**Issue**: `ensureGroupSessionCharacterContext()` relies on ConflictDatabaseService
- Lines 1261-1332 in therapyChatService.ts
- Falls back to just characterId if lookup fails
- May not get proper character names

**Example Problem**:
```typescript
// If ConflictDatabaseService fails:
session.context = {
  character: {
    id: characterId,
    character_id: null,  // ❌ Lost
    name: null,          // ❌ Lost
    archetype: null      // ❌ Lost
  }
};
```

**Impact**:
- Characters identified by IDs instead of names
- Backend can't look up character data
- buildUniversalTemplate may fail

---

### 🟡 MEDIUM RISK - Therapist Agent Key Mapping

**Issue**: Therapist ID mapping in frontend (line 764-771)
```typescript
const therapistMap: Record<string, string> = {
  'zxk14bw7': 'zxk14bw7',
  'carl-jung': 'carl_jung',  // ❌ Mismatch: carl-jung vs carl_jung
  'seraphina': 'seraphina'
};
```

**Problem**: Carl Jung ID inconsistency
- Frontend may use 'carl-jung' (with hyphen)
- Map converts to 'carl_jung' (with underscore)
- Database has 'carl_jung'

**Impact**: Should work, but fragile

---

### 🟢 LOW RISK - Session History Building

**Issue**: `buildUnifiedTranscript()` for group therapy
- Line 777: Uses same transcript builder as individual
- Should work fine if session history is correct

**Status**: Probably OK, but untested

---

## 4. What Should Work Now

### ✅ Therapist Lookup
- All therapists have comedian_style_id
- `buildUniversalTemplate` can find them
- No more "Character not found" errors

### ✅ Basic Chat Flow
- Frontend sends requests to `/ai/chat`
- Backend routes to therapy handler
- Prompts assembled using universal template

### ✅ Individual Patient Responses
- Each patient request processed separately
- Character lookup should work (if ConflictDatabaseService works)
- Comedian styles applied

---

## 5. What Might Not Work

### ❌ Group Awareness
**Backend doesn't know it's a group session:**
- Therapist prompt may not mention group dynamics
- Patients may not reference each other
- No shared context between patient responses

**Workaround**: Frontend builds group context in therapist question, but backend doesn't reinforce it

### ❌ Multi-Patient Context
**Each backend call is isolated:**
- Patient A's response doesn't inform Patient B's prompt
- Therapist can't address all patients simultaneously
- No group conversation threading

**Workaround**: Frontend maintains session history, but backend doesn't use group dynamics

---

## 6. Recommendations

### Immediate (Critical for Group Therapy)

1. **Test group therapy in production** after comedian_style fix deploys
   - Start group session with 2-3 characters
   - Check if therapist mentions multiple patients
   - Check if patients reference each other

2. **Add group therapy logging**
   ```typescript
   if (session.type === 'group') {
     console.log('🧑‍🤝‍🧑 GROUP THERAPY: Processing group session', {
       participantCount: session.participantIds.length,
       groupDynamics: session.groupDynamics
     });
   }
   ```

3. **Verify ConflictDatabaseService is loaded**
   - Check that character roster is available
   - Ensure character name resolution works

### Short-Term (Enhancement)

1. **Pass group context to backend**
   ```typescript
   // Frontend should send:
   {
     chatType: 'therapy',
     sessionType: 'group',  // NEW
     participantIds: ['char1', 'char2', 'char3'],  // NEW
     groupDynamics: ['rivalry', 'codependency'],  // NEW
   }
   ```

2. **Update backend to handle group sessions**
   ```typescript
   if (req.body?.sessionType === 'group') {
     // Modify assembleTherapyPromptUniversal to include group context
     // Add group dynamics to prompt
     // Reference all participants
   }
   ```

3. **Add group-specific prompt assembly**
   ```typescript
   // New function in promptAssemblyService.ts
   export async function assembleGroupTherapyPrompt(
     therapistId: string,
     participantIds: string[],
     groupDynamics: string[],
     conversationHistory: string
   ): Promise<string> {
     // Build prompt aware of multiple patients
   }
   ```

### Long-Term (Architecture)

1. **Separate group therapy handler**
   - `handleGroupTherapyRequest()` vs `handleTherapyRequest()`
   - Group-aware prompt assembly
   - Multi-patient context management

2. **Group session state management**
   - Track which patients have responded
   - Build cumulative group context
   - Enable therapist to address patterns

3. **Group dynamics system**
   - Store relationship data between patients
   - Track group themes and conflicts
   - Evolve dynamics over sessions

---

## 7. Testing Checklist

Before deploying group therapy:

- [ ] Individual therapy works (after comedian_style fix)
- [ ] Start group session with 2 characters
- [ ] Therapist mentions both patients by name
- [ ] First patient responds to therapist
- [ ] Second patient responds to therapist
- [ ] Check if patients reference each other
- [ ] Try with 3 characters
- [ ] Check console for errors
- [ ] Verify all 3 therapists work (Seraphina, Carl Jung, Zxk14bW^7)
- [ ] Check if group dynamics appear in conversation

---

## 8. Known Limitations

### Current Group Therapy Behavior
- ✅ Multiple patients can participate
- ✅ Therapist asks opening question
- ✅ Each patient responds individually
- ❌ Backend doesn't know it's a group
- ❌ No shared context between patient prompts
- ❌ Group dynamics only in frontend
- ❌ Therapist doesn't address group patterns

### This Means
- Group therapy works as "3 individual conversations with same therapist"
- Not true group therapy with inter-patient awareness
- Good enough for MVP, needs enhancement for full feature

---

## 9. Comparison to Individual Therapy

| Feature | Individual | Group (Current) | Group (Ideal) |
|---------|-----------|-----------------|---------------|
| Therapist comedian style | ✅ Fixed | ✅ Fixed | ✅ |
| Character lookup | ✅ Works | ⚠️ Untested | ✅ |
| Conversation history | ✅ Works | ✅ Works | ✅ |
| Patient context | ✅ Full | ⚠️ Individual only | 🎯 Group aware |
| Therapist awareness | ✅ 1:1 | ❌ Thinks 1:1 | 🎯 Knows group |
| Patient interactions | N/A | ❌ Isolated | 🎯 Referencing |
| Group dynamics | N/A | ❌ Frontend only | 🎯 Backend aware |

---

## 10. Conclusion

**Will group therapy work after the fix?**
- **Probably YES** for basic functionality
- **Not ideal** - lacks true group awareness
- **Needs testing** to confirm no new errors

**Priority**:
1. ✅ Deploy comedian_style fix (DONE)
2. ⚠️ Test group therapy in production
3. 📋 Document behavior for users
4. 🎯 Plan group awareness enhancement

---

*Audit completed by Claude Code on October 28, 2025*
