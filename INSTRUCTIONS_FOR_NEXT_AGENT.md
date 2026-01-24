# Instructions for Next Agent: OpenAI Integration
**Date:** October 11, 2025
**Task:** Replace LocalAI with OpenAI in production domain handlers
**Previous Agent:** Failed by creating abstraction layers and fallback logic (WRONG)

---

## Context & Background

### What the User Actually Wants:
**Original instruction:** "comment out llama and replace it with openAI's API for production"

This means:
1. **Comment out** the existing LocalAI axios calls in domain handlers
2. **Replace** with direct OpenAI SDK calls
3. **Keep commented code** for easy restoration when scale justifies GPU cost (~200 DAU)
4. **NO FALLBACKS** - fail loudly if OpenAI is misconfigured
5. **NO ABSTRACTION LAYERS** - direct replacement only

### Why This Change:
- Current: RunPod GPU costs $568/month fixed
- Proposed: OpenAI API is pay-per-use (~$6-63/month at current scale)
- Breakeven: ~200 daily active users
- Current traffic: Well below breakeven

### What Was Done Wrong (DO NOT REPEAT):
- Created llmProvider.ts abstraction with USE_OPENAI feature flag
- Added fallback from OpenAI to LocalAI on failure (violates explicit config principle)
- Modified 5 handlers (therapy, financial, equipment, skills, kitchen_table)
- These changes are UNCOMMITTED and need to be REVERTED

---

## Files You MUST Read First

### 1. Current Architecture
**File:** `/Users/gabrielgreenstein/blank-wars-clean/backend/src/routes/ai.ts`
**Lines to study:** 1055-1074 (Training handler - UNMODIFIED EXAMPLE)

This shows the current LocalAI pattern used in all 15 domain handlers:
```typescript
const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
const llamaResponse = await axios.post(localaiEndpoint, {
  model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
  messages: [{ role: 'user', content: finalPrompt }],
  temperature: 0.7,
  frequency_penalty: 0.4,
  stop: uniqueStopTokens
}, { timeout: 60000, headers: { 'Content-Type': 'application/json' }});
let responseText = llamaResponse.data.choices[0].message.content.trim();
```

**All 15 Domain Handlers (line numbers):**
1. Line 245: `handleFinancialRequest` - MODIFIED (needs revert)
2. Line 426: `handleEquipmentRequest` - MODIFIED (needs revert)
3. Line 615: `handleSkillsRequest` - MODIFIED (needs revert)
4. Line 788: `handleKitchenTableRequest` - MODIFIED (needs revert)
5. Line 979: `handleTrainingRequest` - UNMODIFIED (use as reference)
6. Line 1138: `handleRealEstateRequest` - UNMODIFIED
7. Line 1294: `handleSocialLoungeRequest` - UNMODIFIED
8. Line 1450: `handleMessageBoardRequest` - UNMODIFIED
9. Line 1606: `handleGroupActivitiesRequest` - UNMODIFIED
10. Line 1762: `handlePerformanceRequest` - UNMODIFIED
11. Line 1922: `handlePersonalProblemsRequest` - UNMODIFIED
12. Line 2082: `handleBattleRequest` - UNMODIFIED
13. Line 2259: `handleDramaBoardRequest` - UNMODIFIED
14. Line 2418: `handleTherapyRequest` - MODIFIED (needs revert)
15. Line 2766: `handleConfessionalRequest` - UNMODIFIED

### 2. Git State
**Backup commit:** `bc080774` - "Add OpenAI integration files before migration"
**Branch:** `pre-openai-migration`
**Uncommitted changes:** 5 modified handlers in ai.ts

### 3. Package Dependencies
**File:** `/Users/gabrielgreenstein/blank-wars-clean/backend/package.json`
**Line 61:** `"openai": "^5.8.2"` - Already installed

### 4. Environment Variables
**File:** `/Users/gabrielgreenstein/blank-wars-clean/backend/.env.example`
**Line 29:** `OPENAI_API_KEY=sk-your-openai-api-key-here` - Already documented

**Current Railway Production:**
- `LOCALAI_URL=https://6t5hu2pzw2x401-8000.proxy.runpod.net` (currently set)
- `OPENAI_API_KEY=` (needs to be added)
- `OPENAI_MODEL=gpt-4o-mini` (optional, defaults to gpt-4o-mini)

---

## Step-by-Step Game Plan

### Phase 1: Clean Up Bad Changes (CRITICAL)

**Step 1.1:** Revert uncommitted changes to ai.ts
```bash
cd /Users/gabrielgreenstein/blank-wars-clean
git checkout backend/src/routes/ai.ts
```

**Step 1.2:** Delete the broken abstraction files
```bash
rm backend/src/services/llmProvider.ts
rm backend/src/services/openaiService.ts
```

**Step 1.3:** Keep the migration report for reference
```bash
# Keep: LOCALAI_TO_OPENAI_MIGRATION_REPORT.md
# It has useful cost analysis but ignore the implementation approach
```

**Step 1.4:** Verify clean state
```bash
git status
# Should show only deleted files: llmProvider.ts, openaiService.ts
```

### Phase 2: Implementation Pattern

**For EACH of the 15 domain handlers**, follow this EXACT pattern:

**BEFORE (current LocalAI code):**
```typescript
const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
const stopTokens = ["\n\n"];
const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

console.log('[HANDLER] Calling LocalAI endpoint:', localaiEndpoint);
const llamaResponse = await axios.post(localaiEndpoint, {
  model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
  messages: [{ role: 'user', content: finalPrompt }],
  temperature: 0.7,
  frequency_penalty: 0.4,
  stop: uniqueStopTokens
}, {
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

let responseText = llamaResponse.data.choices[0].message.content.trim();
```

**AFTER (OpenAI replacement with commented LocalAI for restoration):**
```typescript
// ========== COMMENTED OUT: LocalAI (for restoration at ~200 DAU) ==========
// const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
// const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
// const stopTokens = ["\n\n"];
// const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);
//
// console.log('[HANDLER] Calling LocalAI endpoint:', localaiEndpoint);
// const llamaResponse = await axios.post(localaiEndpoint, {
//   model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
//   messages: [{ role: 'user', content: finalPrompt }],
//   temperature: 0.7,
//   frequency_penalty: 0.4,
//   stop: uniqueStopTokens
// }, {
//   timeout: 60000,
//   headers: { 'Content-Type': 'application/json' }
// });
//
// let responseText = llamaResponse.data.choices[0].message.content.trim();
// ========== END COMMENTED LocalAI CODE ==========

// ========== PRODUCTION: OpenAI API ==========
import OpenAI from 'openai';

const stopTokens = ["\n\n"];
const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
  timeout: 60000,
  maxRetries: 2
});

console.log('[HANDLER] Calling OpenAI API');
console.log('[HANDLER] Model:', process.env.OPENAI_MODEL || 'gpt-4o-mini');

const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  messages: [{ role: 'user', content: finalPrompt }],
  temperature: 0.7,
  frequency_penalty: 0.4,
  stop: uniqueStopTokens
});

let responseText = completion.choices[0]?.message?.content || '';

if (!responseText) {
  throw new Error('OpenAI returned empty response');
}

console.log('[HANDLER] OpenAI response length:', responseText.length);
console.log('[HANDLER] Tokens used:', completion.usage);
// ========== END OpenAI CODE ==========
```

### Phase 3: Handler-Specific Notes

**Important variations to preserve:**

1. **Therapy Handler (line 2418):**
   - Has longer timeout: 300000 (5 minutes)
   - Has complex stop tokens including therapist/patient names
   - Preserve all the stop token logic

2. **Financial Handler (line 245):**
   - Has character name stop tokens
   - Timeout: 120000 (2 minutes)

3. **Kitchen Table Handler (line 788):**
   - Has roommate name stop tokens
   - Important for preventing self-reference

4. **Confessional Handler (line 2766):**
   - Most complex with hostmaster logic
   - Be careful with this one

**For ALL handlers:**
- Keep the exact same stop tokens
- Keep the exact same temperature/frequency_penalty
- Keep all console.log statements (just change "LocalAI" to "OpenAI")
- Preserve all error handling AFTER the LLM call
- Do NOT modify memory patching, turn counting, or response sanitization

### Phase 4: Update Imports

**At the top of ai.ts (around line 2):**

Current imports include `axios` - keep it for now (other parts of the file may still use it)

Add OpenAI import at line 2:
```typescript
import express from 'express';
import axios from 'axios';
import OpenAI from 'openai'; // ADD THIS LINE
import http from 'http';
```

**IMPORTANT:** You'll be importing OpenAI 15 times (once per handler). This is intentional - each handler is self-contained.

### Phase 5: Testing Checklist

After implementation, provide these test instructions:

1. **Build Test:**
```bash
cd backend
npm run build
```
Should compile without TypeScript errors.

2. **Environment Setup:**
Railway needs:
- `OPENAI_API_KEY=sk-proj-...` (user will provide)
- Can remove `LOCALAI_URL` or keep it commented for documentation

3. **Test Order (priority):**
- Therapy chat (highest usage, most critical)
- Financial handler
- Equipment handler
- All others

4. **What to Monitor:**
- Response times (should be <5 seconds, faster than GPU)
- Response quality (comparable to LocalAI)
- OpenAI usage dashboard for costs
- No 500 errors from empty responses

### Phase 6: Commit Strategy

**Commit 1:** Revert bad changes
```bash
git add backend/src/routes/ai.ts
git commit -m "Revert: Remove failed OpenAI abstraction approach

- Revert uncommitted changes to ai.ts from previous agent
- Remove llmProvider.ts (had fallback logic - violates explicit config)
- Remove openaiService.ts (part of failed abstraction)
- Keep LOCALAI_TO_OPENAI_MIGRATION_REPORT.md for cost reference
- Ready for clean OpenAI integration per original requirements
"
```

**Commit 2:** OpenAI integration (do all 15 handlers at once)
```bash
git add backend/src/routes/ai.ts
git commit -m "Replace LocalAI with OpenAI in all 15 domain handlers

Production migration for cost optimization:
- Commented out LocalAI code (preserves restoration path)
- Direct OpenAI SDK integration (no abstractions/fallbacks)
- Explicit configuration (fails loudly if OPENAI_API_KEY missing)
- Maintains all stop tokens, temperatures, error handling

Handlers updated:
- Financial, Equipment, Skills, Kitchen Table, Training
- Real Estate, Social Lounge, Message Board, Group Activities
- Performance, Personal Problems, Battle, Drama Board
- Therapy, Confessional

Cost savings: ~$568/month GPU → ~$6-63/month OpenAI at current scale
Restoration threshold: ~200 daily active users

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"
```

---

## Critical Rules for Implementation

### DO:
1. ✅ Comment out ALL LocalAI code with clear markers
2. ✅ Use direct OpenAI SDK calls (no wrappers)
3. ✅ Fail loudly if OPENAI_API_KEY is missing
4. ✅ Preserve exact stop tokens, temperature, frequency_penalty per handler
5. ✅ Keep all existing error handling AFTER LLM call
6. ✅ Maintain all console.log statements (just change vendor name)
7. ✅ Test build compiles before committing
8. ✅ All 15 handlers in single commit

### DO NOT:
1. ❌ Create abstraction layers (llmProvider, wrapper services, etc.)
2. ❌ Add fallback logic (if OpenAI fails, do NOT fall back to LocalAI)
3. ❌ Use feature flags (USE_OPENAI env var, CHAT_TRANSPORT, etc.)
4. ❌ Modify chatTransport.ts (leave OpenAIAdapter stub as-is)
5. ❌ Change stop tokens, temperatures, or prompt assembly logic
6. ❌ Modify memory patching, turn counting, or response sanitizers
7. ❌ Touch aiChatService.ts (it uses promptAssemblyService, not direct LLM)
8. ❌ Add try/catch around OpenAI calls that mask errors

---

## File Reference Quick List

**Must Read:**
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/routes/ai.ts` (line 1055-1074 for pattern)
- `/Users/gabrielgreenstein/blank-wars-clean/backend/package.json` (verify OpenAI installed)
- `/Users/gabrielgreenstein/blank-wars-clean/LOCALAI_TO_OPENAI_MIGRATION_REPORT.md` (cost context only)

**Must Modify:**
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/routes/ai.ts` (all 15 handlers)

**Do NOT Touch:**
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/aiChatService.ts`
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/chatTransport.ts`
- `/Users/gabrielgreenstein/blank-wars-clean/backend/src/services/promptAssemblyService.ts`

---

## Success Criteria

✅ All 15 handlers use OpenAI directly
✅ LocalAI code commented out with clear restoration markers
✅ No abstraction layers or fallback logic
✅ Build compiles without errors
✅ Clear commit messages explaining changes
✅ Environment variables documented for Railway deployment

---

## Final Notes

This is a **production cost optimization** - not a "feature flag" or "experimentation". The user wants to switch to OpenAI NOW and switch back to GPU later when scale justifies it. The commented code makes restoration trivial when that time comes.

Previous agent failed by being "clever" with abstractions. Be **explicit and simple** instead.

If anything is unclear, ask the user BEFORE writing code.

Good luck.
