# Archived Old 3D System (Socket.io-based)

**Archive Date:** January 8, 2026
**Reason:** Migration to universal ChatScene3D with REST API architecture

## What Was Archived

### Components (components/)
1. **ChatTheater3D.tsx**
   - Old 3D scene renderer using Three.js
   - Used WordBubbleSystem for speech bubbles
   - Had broken horizontal bubble patterns (bubbles appeared diagonal)
   - No memoization (60 FPS recalculation causing performance issues)

2. **WordBubbleSystem.tsx**
   - Old bubble positioning and layout system
   - Issues:
     - HORIZONTAL_STEP = faceH * 0.85 (too small, caused collisions)
     - MIN_GAP = 12px (prevented bubbles from touching naturally)
     - No accumulated offset for spreading patterns
     - Bubble-bubble collision always pushed upward (broke horizontal patterns)

3. **KitchenTable3D.tsx**
   - Kitchen table wrapper component
   - Used Socket.io for AI communication
   - Wrapped ChatTheater3D and WordBubbleSystem

### Services (services/)
1. **data/kitchenChatService.ts**
   - Socket.io client implementation
   - Connected to backend via WebSocket
   - Events: `kitchen_conversation_response`, `kitchen_message`
   - Issues:
     - Async WebSocket complexity
     - Connection management overhead
     - Not aligned with REST architecture

2. **services/kitchenChatService.ts**
   - Wrapper service for Socket.io client
   - Functions: `startNewScene`, `handleCoachMessage`, `continueScene`
   - Built prompts in frontend (violates "All Prose Rule")
   - Calculated sleeping arrangements in frontend (should be backend DB query)

## What Replaced It

**New Universal System:**
- `ChatScene3D.tsx` - Generalized from KitchenChatScene
- `KitchenCharacter.tsx` - Face metrics tracking
- `SpeechBubble3D.tsx` - HTML overlay bubbles
- Domain-specific wrappers (KitchenTableScene, ConfessionalScene, etc.)

**Fixed Issues:**
- HORIZONTAL_STEP = 150px (prevents bubble collision)
- MIN_GAP = 2px (bubbles can touch naturally)
- Accumulated offset for ALL patterns (preserves shape)
- Memoized position calculations (no 60 FPS waste)
- REST API via `apiClient.post('/ai/chat')` (aligned with Confessional pattern)

## Components That Used Old System

- [x] KitchenTable3D.tsx → **Migrated to KitchenTableScene**
- [ ] Confessional3D.tsx → **Pending migration to ConfessionalScene**
- [ ] PersonalProblemsChat.tsx → **Pending migration to PersonalProblemsScene**
- [ ] TeamChatPanelWithBubbles.tsx → **Pending migration to TeamChatScene**

## Migration Notes

### Key Architectural Changes
1. **Socket.io → REST API**
   - All AI requests now use `apiClient.post('/ai/chat', { domain: 'kitchen_table', ... })`
   - Backend handles all prompt building via Prose Builder system
   - Frontend only sends minimal context (character IDs, messages)

2. **Frontend Prompt Building → Backend Domain Builders**
   - OLD: Frontend calculated sleeping arrangements, built prompts
   - NEW: Backend queries DB via `get_full_character_data()`, builds prose

3. **String Concatenation → Modular Prose Assembly**
   - OLD: Legacy string concatenation in frontend
   - NEW: Backend assembles: Opening → Identity → Scene → Role → Persona → History

### Performance Improvements
- Bubble position calculation: 60 FPS → Only on state change
- Horizontal patterns: Diagonal staircase → True horizontal lines
- Collision detection: 160px → 5px (tighter, more natural)

## Do NOT Delete This Archive

Keep for:
- Reference during remaining migrations (Confessional, PersonalProblems, TeamChat)
- Debugging if issues arise with new system
- Understanding what the old system did wrong
- Historical context for future developers

## When Safe to Delete

After ALL domains have been migrated and verified working:
- [ ] Kitchen Table → KitchenTableScene (in progress)
- [ ] Confessional → ConfessionalScene
- [ ] Personal Problems → PersonalProblemsScene
- [ ] Team Chat → TeamChatScene

**Wait 2+ weeks of production use before deletion.**
