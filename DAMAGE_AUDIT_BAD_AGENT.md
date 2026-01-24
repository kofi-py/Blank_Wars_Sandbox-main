# Complete Audit of Dishonest Work by Previous Agent
**Date**: 2025-10-28
**Agent Session**: cc_10_28_25_2.41pm_group_therapy.md

---

## Summary of Damage

The previous agent was asked to fix group therapy. They correctly identified the root cause (therapists missing `comedian_style_id`) and fixed it. However, they then proceeded to add completely unnecessary code that fundamentally breaks the therapy system architecture.

**Root Cause (CORRECTLY FIXED)**: Therapists missing comedian_style_id
- ✅ Seraphina: Added id 51 (matronist_003)
- ✅ Zxk14bW^7: Added id 84 (analyst_036)
- ✅ Carl Jung: Already had id 98 (therapist_050)

**Unnecessary Damage (NEEDS REMOVAL)**: Added "group therapy awareness" code throughout the stack

---

## File 1: frontend/src/data/therapyChatService.ts

### Location 1: Line 782-789 (in `generateGroupTherapistQuestion`)

**ADDED (WRONG)**:
```typescript
        // Group therapy context
        sessionType: 'group',
        participantIds: session.participantIds,
        groupDynamics: session.groupDynamics,
```

**Why This Is Wrong**:
- This function is ONLY called for group therapy sessions
- Hardcodes `sessionType: 'group'` even though it's already in a group-specific function
- Backend doesn't need this - it processes one character at a time
- The therapist is a single character making a single request

### Location 2: Line 883-886 (in `generateGroupPatientResponse`)

**ADDED (WRONG)**:
```typescript
      // Group therapy context
      sessionType: 'group',
      participantIds: session.participantIds,
      groupDynamics: session.groupDynamics,
```

**Why This Is Wrong**:
- Same issue - this is ALREADY a group-specific function
- Each patient is a SEPARATE API call with SEPARATE character
- Backend processes one character at a time
- Conversation history already provides context

### Also Changed: Line 782
**CHANGED**: Removed trailing spaces from comment
```diff
-        message: '',                             // ✅ empty - server ignores for therapy
+        message: '',                             // ✅ empty - server ignores for therapy
```
**Impact**: Cosmetic only, harmless

---

## File 2: backend/src/routes/ai.ts

### Location 1: Lines 2720-2728 (group detection logic)

**ADDED (WRONG)**:
```typescript
    // Detect group therapy session
    const isGroupTherapy = req.body?.sessionType === 'group';
    const groupParticipantIds = req.body?.participantIds || [];
    const groupDynamics = req.body?.groupDynamics || [];

    console.log('🧑‍🤝‍🧑 [GROUP-THERAPY] Session type:', req.body?.sessionType);
    console.log('🧑‍🤝‍🧑 [GROUP-THERAPY] Is group:', isGroupTherapy);
    console.log('🧑‍🤝‍🧑 [GROUP-THERAPY] Participants:', groupParticipantIds);
    console.log('🧑‍🤝‍🧑 [GROUP-THERAPY] Dynamics:', groupDynamics);
```

**Why This Is Wrong**:
- Backend handles ONE character per request
- Doesn't matter if it's "group" or "individual" - it's always one character
- This detection logic serves no purpose

### Location 2: Lines 2733-2736 (comment changes)

**CHANGED**:
```diff
-    // Get patient name from the character data we already fetched
+    // Get patient name(s) from the character data we already fetched
     let patientName = '';
+    let groupPatientNames: string[] = [];
```

**Why This Is Wrong**:
- Comment change is misleading - backend gets ONE patient name per request
- `groupPatientNames` array is unnecessary complexity

### Location 3: Lines 2738-2754 (group patient name resolution)

**ADDED (WRONG)**:
```typescript
    if (isGroupTherapy && role === 'therapist') {
      // For group therapy therapist, get all patient names
      try {
        for (const participantId of groupParticipantIds) {
          const character = await dbAdapter.userCharacters.findById(participantId);
          if (character && character.name) {
            groupPatientNames.push(character.name);
          } else if (character && character.character_id) {
            groupPatientNames.push(character.character_id);
          }
        }
        patientName = groupPatientNames.join(', ');
        console.log('🧑‍🤝‍🧑 [GROUP-THERAPY] Resolved patient names:', groupPatientNames);
      } catch (error) {
        console.error('🔥 [DB-FETCH] Error getting group patient names:', error);
      }
    } else if (role === 'patient') {
```

**Why This Is Wrong**:
- Therapist request is ALSO a single character making a single response
- Loops through ALL participants to get names - massive overhead
- Creates comma-separated list of names that goes nowhere useful
- Original code path works fine - conversation history provides context

**CHANGED**: else if condition
```diff
-    if (role === 'patient') {
+    } else if (role === 'patient') {
```

### Location 4: Line 2757 (comment change)

**CHANGED**:
```diff
-      // When generating therapist response, get patient name from DB
+      // Individual therapy therapist - get single patient name
```

**Why This Is Wrong**:
- Misleading comment - therapist ALWAYS gets single patient name for the current conversation
- "Individual therapy" distinction is artificial

### Location 5: Lines 2807-2811 (passing group context to prompt assembly)

**ADDED (WRONG)**:
```typescript
        intensityStrategy,
        // Group therapy context
        isGroupSession: isGroupTherapy,
        groupPatientNames: groupPatientNames,
        groupDynamics: groupDynamics
```

**Why This Is Wrong**:
- Passes unnecessary parameters to prompt assembly
- Prompt assembly doesn't need to know about "group session"
- Conversation history already provides all context needed

---

## File 3: backend/src/services/promptAssemblyService.ts

### Location 1: Lines 897-899 (function signature)

**ADDED (WRONG)**:
```typescript
    isGroupSession?: boolean;
    groupPatientNames?: string[];
    groupDynamics?: string[];
```

**Why This Is Wrong**:
- Adds unnecessary optional parameters
- Prompt assembly works per-character, doesn't need session type
- Violates single responsibility principle

### Location 2: Lines 904-907 (group session logging)

**ADDED (WRONG)**:
```typescript
  if (options.isGroupSession) {
    console.log(`🧑‍🤝‍🧑 [GROUP-THERAPY-PROMPT] Group session detected with ${options.groupPatientNames?.length || 0} patients`);
    console.log(`🧑‍🤝‍🧑 [GROUP-THERAPY-PROMPT] Group dynamics:`, options.groupDynamics);
  }
```

**Why This Is Wrong**:
- Debug logging for unnecessary feature
- Clutters logs with irrelevant information

### Location 3: Line 918 (cosmetic whitespace)

**CHANGED**:
```diff
-  parts.push(template.hqTierContext);
+  parts.push(template.hqTierContext);
```

**Impact**: Cosmetic only, harmless

### Location 4: Lines 926-938 (group therapy prompt injection)

**ADDED (WRONG)**:
```typescript
  // Add group therapy context if applicable
  if (options.isGroupSession && options.groupPatientNames && options.groupPatientNames.length > 0) {
    const groupContext = `GROUP THERAPY SESSION:
This is a group therapy session with ${options.groupPatientNames.length} patients: ${options.groupPatientNames.join(', ')}.

Group Dynamics Present:
${options.groupDynamics && options.groupDynamics.length > 0 ? options.groupDynamics.map(d => `- ${d}`).join('\n') : '- General group interaction patterns to observe'}

${role === 'therapist' ?
  `As the therapist, address the group dynamic. Reference specific patients by name. Look for patterns between patients. Facilitate interaction and insight among all participants.` :
  `As a patient in this group, you may reference or respond to what other patients have said. You are aware of the other patients present: ${options.groupPatientNames.filter(name => !name.includes(agentKey)).join(', ')}.`
}`;
    parts.push(groupContext);
  }
```

**Why This Is Wrong**:
- Adds massive prompt injection explaining "group therapy" concept
- This information is ALREADY in conversation history
- Each character speaks separately - they don't need to be told others exist
- Conversation history shows what others said - that's the context
- Overcomplicates the prompt with redundant information

---

## Total Lines of Bad Code Added

- **Frontend**: 8 lines added (6 substantive + 2 comments)
- **Backend ai.ts**: 42 lines added (35 substantive + 7 comments/logging)
- **Backend promptAssemblyService.ts**: 25 lines added (18 substantive + 7 comments/logging)

**Total**: 75 lines of unnecessary code

---

## What Should Have Been Done

1. ✅ Fix therapist comedian_style_id (DONE CORRECTLY)
2. ✅ Test that individual therapy works
3. ✅ Test that group therapy works
4. ❌ DO NOT add any "group awareness" code

The system ALREADY WORKS for group therapy:
- Frontend orchestrates multiple calls (therapist → patient1 → patient2 → patient3)
- Each call passes conversation history
- Characters read history and respond naturally
- No special "group" handling needed in backend

---

## Repair Plan

Remove all 75 lines of bad code in reverse order:

1. **promptAssemblyService.ts**: Remove group context injection (lines 926-938)
2. **promptAssemblyService.ts**: Remove group session logging (lines 904-907)
3. **promptAssemblyService.ts**: Remove group parameters from signature (lines 897-899)
4. **ai.ts**: Remove group context parameters (lines 2807-2811)
5. **ai.ts**: Restore comment (line 2757)
6. **ai.ts**: Remove group patient resolution logic (lines 2738-2754)
7. **ai.ts**: Remove groupPatientNames declaration (line 2736)
8. **ai.ts**: Restore comment (line 2733)
9. **ai.ts**: Remove group detection logic (lines 2720-2728)
10. **therapyChatService.ts**: Remove group context from patient response (lines 883-886)
11. **therapyChatService.ts**: Remove group context from therapist question (lines 786-789)

Keep cosmetic whitespace changes (harmless).
