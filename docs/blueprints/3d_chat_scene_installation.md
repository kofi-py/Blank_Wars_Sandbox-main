# Blueprint: Installing 3D Chat Scenes with Word Bubbles

## Overview

This blueprint documents how to add 3D character scenes with comic-style word bubbles to any chat domain in Blank Wars. The system renders GLB/GLTF character models in a Three.js canvas with speech bubbles that appear when characters speak.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chat Domain Page                          │
│  (e.g., TeamHeadquarters, PersonalProblemsChat)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              [Domain]ChatScene.tsx                       │   │
│  │  - 3D Canvas with character model(s)                     │   │
│  │  - Word bubble system                                    │   │
│  │  - Face metrics tracking (jaw/head position)             │   │
│  │  - Collision detection for bubbles                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Domain Service                              │   │
│  │  (e.g., confessionalService.ts, kitchenTableService.ts) │   │
│  │  - Manages conversation state                            │   │
│  │  - Handles AI message generation                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
frontend/src/components/
├── KitchenChatScene.tsx        # Multi-character (2-3) scene
├── ConfessionalChatScene.tsx   # Single character scene
├── PersonalProblemsChatScene.tsx # Single character scene
└── [NewDomain]ChatScene.tsx    # Your new scene

frontend/src/services/
├── kitchenTableService.ts
├── confessionalService.ts
└── [newDomain]Service.ts

frontend/src/utils/
└── characterImageUtils.ts      # getCharacter3DModelPath()
```

## Implementation Types

### Type A: Single Character Scene
Used for: Confessional, Personal Problems, Therapy, Training (1-on-1)

**Characteristics:**
- One character centered in scene
- Character responds to coach/hostmaster/trainer
- Simpler collision detection (no cross-character bubbles)

**Base template:** `ConfessionalChatScene.tsx` or `PersonalProblemsChatScene.tsx`

### Type B: Multi-Character Scene
Used for: Kitchen Table, Employee Lounge, Group activities

**Characteristics:**
- 2-3 characters positioned in arc formation
- Characters talk to each other
- Complex collision detection (bubbles must avoid other characters' faces and bubbles)

**Base template:** `KitchenChatScene.tsx`

---

## Step-by-Step Installation Guide

### Step 1: Create the Scene Component

Create `frontend/src/components/[Domain]ChatScene.tsx`:

```typescript
'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Contestant } from '@blankwars/types';

// Copy the Character component from an existing scene (it's identical across all)
// Copy the Bubble interface and helper functions

export interface [Domain]ChatSceneProps {
    character: CharacterConfig;        // For single character
    // OR
    characters: CharacterConfig[];     // For multi-character

    characterData: Contestant;         // Full character data
    // Domain-specific props:
    messages: Message[];               // Chat history
    isTyping?: boolean;                // Loading state
    // ... other domain-specific state
}

const [Domain]ChatScene = forwardRef<[Domain]ChatSceneRef, [Domain]ChatSceneProps>(({
    // props
}, ref) => {
    // Implementation...
});
```

### Step 2: Configure Character Positioning

**Single Character (centered):**
```typescript
const characterConfig = {
    id: character.character_id,
    modelPath: getCharacter3DModelPath(character.character_id),
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number]
};
```

**Multi-Character (arc formation):**
```typescript
const POSITIONS: { [key: number]: [number, number, number][] } = {
    1: [[0, 0, 0]],
    2: [[-1.5, 0, 0], [1.5, 0, 0]],
    3: [[-1.8, 0, 0.2], [0, 0, 0.5], [1.8, 0, 0.2]]
};

const ROTATIONS: { [key: number]: [number, number, number][] } = {
    1: [[0, 0, 0]],
    2: [[0, Math.PI / 4, 0], [0, -Math.PI / 4, 0]],
    3: [[0, Math.PI / 5, 0], [0, 0, 0], [0, -Math.PI / 5, 0]]
};
```

### Step 3: Set Up Word Bubble System

**Key state variables:**
```typescript
const [faceMetrics, setFaceMetrics] = useState<FaceMetrics | null>(null);
const [bubbles, setBubbles] = useState<Bubble[]>([]);
const [lockedLayout, setLockedLayout] = useState<LayoutType | null>(null);
const [talkTrigger, setTalkTrigger] = useState(0);
```

**Bubble layouts available:**
- `stack-right` / `stack-left` - Vertical stack beside head
- `horizontal-right` / `horizontal-left` - Horizontal spread
- `arc-over` - Arc above head
- `diagonal-up-right` / `diagonal-up-left` - Diagonal arrangement

**Sentence splitting:**
```typescript
const splitIntoSentences = (text: string): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
};
```

### Step 4: Integrate with Parent Component

**Import the scene:**
```typescript
import [Domain]ChatScene from './[Domain]ChatScene';
import { getCharacter3DModelPath } from '../utils/characterImageUtils';
```

**Add to JSX:**
```tsx
{selectedCharacter && (
    <div className="w-full h-[300px]"> {/* or h-[600px] for full scenes */}
        <[Domain]ChatScene
            character={{
                id: selectedCharacter.character_id,
                modelPath: getCharacter3DModelPath(selectedCharacter.character_id),
                position: [0, 0, 0],
                rotation: [0, 0, 0]
            }}
            characterData={selectedCharacter}
            messages={messages}
            isTyping={isLoading}
            // ... other props
        />
    </div>
)}
```

### Step 5: Wire Up Message Flow

**Watch for new character messages:**
```typescript
const spokenMessageIds = useRef<Set<number>>(new Set());

useEffect(() => {
    const characterMessages = messages.filter(m => m.type === 'contestant');
    if (characterMessages.length === 0) return;

    const latestMessage = characterMessages[characterMessages.length - 1];
    if (latestMessage && !spokenMessageIds.current.has(latestMessage.id)) {
        spokenMessageIds.current.add(latestMessage.id);
        const sentences = splitIntoSentences(latestMessage.content);
        handleSpeak(sentences);
    }
}, [messages]);
```

---

## Customization Options

### Theme Colors

Each domain should have a distinct bubble color:
```typescript
// Kitchen Table - Uses character-indexed colors
const BUBBLE_COLORS = ['#E63946', '#1D4ED8', '#FACC15', '#9333EA'];

// Confessional - Purple
const BUBBLE_COLOR = '#9333EA';

// Personal Problems - Blue
const BUBBLE_COLOR = '#1D4ED8';

// Training - Green (suggested)
const BUBBLE_COLOR = '#16A34A';

// Therapy - Teal (suggested)
const BUBBLE_COLOR = '#0D9488';
```

### Scene Background

```typescript
// Gradient background
background: 'linear-gradient(to bottom, rgba(88, 28, 135, 0.2), rgba(30, 58, 138, 0.2))'

// Solid color
background: '#1a1a2e'
```

### Prompt/Message Display

**For invisible speaker (hostmaster, coach):**
```tsx
{latestPrompt && (
    <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: '#a855f7',
        padding: '12px 24px',
        borderRadius: '8px',
        maxWidth: '80%',
        fontStyle: 'italic',
        border: '1px solid #a855f7'
    }}>
        <span style={{ opacity: 0.7 }}>Prompt: </span>
        "{latestPrompt}"
    </div>
)}
```

---

## Database Requirements

### Character avatar_emoji

**CRITICAL:** All characters MUST have `avatar_emoji` set in the database, or STRICT MODE will fail.

Check for missing values:
```sql
SELECT id, name FROM characters
WHERE avatar_emoji IS NULL OR avatar_emoji = '';
```

Fix missing values:
```sql
UPDATE characters SET avatar_emoji = '🔥' WHERE id = 'character_id';
```

### 3D Model Availability

Characters need GLB models in the `blank-wars-models` repo. Check availability:
```typescript
import { getCharacter3DModelPath, hasCharacter3DModel } from '../utils/characterImageUtils';

if (!hasCharacter3DModel(character.character_id)) {
    // Show 2D fallback or placeholder
}
```

---

## Common Issues & Solutions

### Issue: Characters appear fused/overlapping
**Cause:** Position array not being applied correctly
**Solution:** Ensure positions are passed as tuples `[number, number, number]` with `as const`

### Issue: Bubbles overlapping same character
**Cause:** Collision check comparing against unresolved bubble positions
**Solution:** Only check collision against bubbles with index < currentIndex:
```typescript
for (let k = 0; k < currentIndex; k++) { // NOT k < result.length
```

### Issue: Cross-character bubble collision not working
**Cause:** Obstacle Y coordinate stored as bottom instead of center
**Solution:** Convert bubble Y to center when creating obstacles:
```typescript
const bubbleCenterY = otherJawPixelY + bubble.y - bubbleHalfHeight;
```

### Issue: Console spam from render logging
**Cause:** Console.log inside render function (runs every frame)
**Solution:** Use useEffect with empty deps for one-time logs, or remove logging

### Issue: Character model not loading
**Cause:** Missing model path in characterImageUtils.ts
**Solution:** Add entry to the models record:
```typescript
'new_character': `${REMOTE_3D_MODEL_BASE_URL}/new_character_metal_foldout_chair.glb`,
```

### Issue: STRICT MODE: Character has no avatar_emoji
**Cause:** Database missing avatar_emoji value
**Solution:** Update database with appropriate emoji

---

## Existing Implementations Reference

| Domain | Component | Type | Characters | Bubble Color |
|--------|-----------|------|------------|--------------|
| Kitchen Table | KitchenChatScene.tsx | Multi | 2-3 | Per-character colors |
| Confessional | ConfessionalChatScene.tsx | Single | 1 | Purple (#9333EA) |
| Personal Problems | PersonalProblemsChatScene.tsx | Single | 1 | Blue (#1D4ED8) |

---

## Checklist for New Domain

- [ ] Create `[Domain]ChatScene.tsx` component
- [ ] Choose Type A (single) or Type B (multi) based on domain
- [ ] Set theme color for bubbles
- [ ] Import and integrate into parent component
- [ ] Wire up message flow (watch for new messages)
- [ ] Verify all characters have `avatar_emoji` in database
- [ ] Verify all characters have 3D models available
- [ ] Test collision detection with multiple bubbles
- [ ] Test on different screen sizes
- [ ] Deploy and verify in production

---

## Future Domains to Consider

- **Therapy Module** - Single character, therapist prompts
- **Training** - Single character with trainer
- **Employee Lounge** - Multi-character casual chat
- **Battle Prep** - Multi-character strategy discussion
- **Clubhouse** - Multi-character social scene

---

*Last updated: January 19, 2026*
*Based on implementations: KitchenChatScene, ConfessionalChatScene, PersonalProblemsChatScene*
