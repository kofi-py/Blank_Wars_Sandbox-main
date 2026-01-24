# Meshy API Guide: Creating Animated 3D Models for Three.js Games

## Table of Contents
1. [Overview](#overview)
2. [API Workflow](#api-workflow)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Integration with Three.js](#integration-with-threejs)
5. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
6. [Best Practices](#best-practices)

---

## Overview

This guide documents the complete process for creating textured, animated 3D character models using the Meshy AI API and integrating them into a Three.js game environment.

**Key Learnings:**
- Meshy requires a two-step workflow: Preview → Refine to get textures
- Textures must be preserved through rigging using `texture_image_url` parameter
- Model swapping causes issues; use single model with multiple animation clips
- Cloning should be avoided during animation switching

---

## API Workflow

### The Two-Step Process

Meshy API requires two separate requests to generate textured models:

1. **Preview Mode**: Fast generation (2-3 min) - creates geometry only, NO textures
2. **Refine Mode**: Slower generation (5-10 min) - adds textures to preview model

**CRITICAL**: You CANNOT skip preview mode. Refine mode requires a `preview_task_id`.

### Complete Pipeline

```
1. Preview Generation → Get preview_task_id
2. Refine Generation (with preview_task_id) → Get textured model + texture_url
3. Rigging (with texture_image_url) → Get rigged model with textures
4. Animation (with rig_task_id) → Get animated model with textures
```

---

## Step-by-Step Implementation

### Step 1: Generate Preview Model

```javascript
const previewResponse = await makeRequest(
    MESHY_API_BASE,
    'POST',
    '/openapi/v2/text-to-3d',
    {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
    },
    {
        mode: 'preview',  // Creates geometry only
        prompt: 'full body Greek warrior Achilles in T-pose, arms extended horizontally 90 degrees, standing straight upright, detailed realistic human face with strong masculine features, short dark hair, athletic muscular build, wearing shiny bronze metallic armor breastplate, bronze greaves, Corinthian helmet with bright red feather plume on top, flowing red fabric cape attached at shoulders, tanned skin, heroic powerful stance, game-ready character model, clean separated elements, volumetric 3D',
        art_style: 'realistic',
        ai_model: 'latest',
        topology: 'quad',
        is_a_t_pose: true,  // CRITICAL for rigging
        should_remesh: true,
        negative_prompt: 'statue, pedestal, base, platform, sculpture, relief, 2d, flat, low poly, cartoonish, multiple people, sitting, lying down, side view, back view, strings, wires, connecting strands, threads, cables, ropes between body parts, web, mesh connections, helmet connected to cape, plume connected to cape, facial hair, beard'
    }
);

const previewTaskId = previewResponse.result;
```

**Wait for completion** (poll status until `status === 'SUCCEEDED'`)

### Step 2: Generate Refine Model (Add Textures)

```javascript
const refineResponse = await makeRequest(
    MESHY_API_BASE,
    'POST',
    '/openapi/v2/text-to-3d',
    {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
    },
    {
        mode: 'refine',  // Adds textures
        preview_task_id: previewTaskId  // ⭐ REQUIRED - from Step 1
    }
);

const refineTaskId = refineResponse.result;
```

**Wait for completion**, then extract the texture URL:

```javascript
const completedRefine = await pollMeshyTask(refineTaskId, '/openapi/v2/text-to-3d');
const textureUrl = completedRefine.texture_urls[0].base_color;
```

### Step 3: Rig the Model (Preserve Textures!)

```javascript
const rigResponse = await makeRequest(
    MESHY_API_BASE,
    'POST',
    '/openapi/v1/rigging',
    {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json'
    },
    {
        model_url: completedRefine.model_urls.glb,
        height_meters: 1.8,
        texture_image_url: textureUrl  // ⭐ CRITICAL - preserves textures through rigging!
    }
);

const rigTaskId = rigResponse.result;
```

**CRITICAL**: Without `texture_image_url`, rigging strips all textures and you get black/gray models.

### Step 4: Apply Animations

```javascript
const animations = {
    idle: 0,
    walk: 30,
    run: 16,
    jump: 460
};

for (const [animName, actionId] of Object.entries(animations)) {
    const animResponse = await makeRequest(
        MESHY_API_BASE,
        'POST',
        '/openapi/v1/animations',
        {
            'Authorization': `Bearer ${MESHY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        {
            rig_task_id: rigTaskId,
            action_id: actionId
        }
    );

    const animTaskId = animResponse.result;
    const completedAnim = await pollMeshyTask(animTaskId, '/openapi/v1/animations');

    // Download GLB file
    await downloadFile(
        completedAnim.result.animation_glb_url,
        `models/character_${animName}.glb`
    );
}
```

---

## Integration with Three.js

### ❌ WRONG: Model Swapping Approach

**DO NOT DO THIS:**

```javascript
// Loading multiple models and swapping them
const models = {};
for (const anim of ['idle', 'walk', 'run', 'jump']) {
    const model = await loadModel(`character_${anim}.glb`);
    models[anim] = model.clone();  // ❌ WRONG - causes issues
}

// Swapping models on animation change
if (targetState !== currentState) {
    const oldModel = player.userData.model;
    const newModel = models[targetState].clone();  // ❌ WRONG - giant deformed models
    player.remove(oldModel);
    player.add(newModel);
}
```

**Problems with this approach:**
- Cloning creates giant, deformed models with incorrect scale
- Textures may not be preserved correctly
- Causes "floating on air" physics issues
- Model appears corrupted or inside-out

### ✅ CORRECT: Single Model with Multiple Animation Clips

**DO THIS INSTEAD:**

```javascript
// Load ONE base model
const model = await loadModel('character_idle.glb');

// Scale it once
const scaleFactor = 2.5;
model.scale.set(scaleFactor, scaleFactor, scaleFactor);
model.position.set(0, 0.5, 0);  // Adjust for physics
model.rotation.y = Math.PI;

// Create ONE mixer on the model
const mixer = new THREE.AnimationMixer(model);

// Load animation clips from different files onto the SAME model
const idleAnim = (await loadModel('character_idle.glb')).animations[0];
const idleAction = mixer.clipAction(idleAnim);

const runAnim = (await loadModel('character_run.glb')).animations[0];
const runAction = mixer.clipAction(runAnim);

// Store actions for switching
player.userData.mixer = mixer;
player.userData.actions = {
    idle: idleAction,
    run: runAction
};

// Start with idle
idleAction.play();

// Switch animations by fading between actions
function updateAnimation(isMoving) {
    const targetState = isMoving ? 'run' : 'idle';

    if (player.userData.currentState !== targetState) {
        const currentAction = player.userData.currentAction;
        const newAction = player.userData.actions[targetState];

        // Fade out current, fade in new
        currentAction.fadeOut(0.2);
        newAction.reset().fadeIn(0.2).play();

        player.userData.currentAction = newAction;
        player.userData.currentState = targetState;
    }
}
```

**Why this works:**
- Single model maintains consistent scale and transforms
- No cloning = no corruption
- Smooth transitions between animations
- Physics stays synchronized with visual model

---

## Common Issues & Troubleshooting

### Issue 1: Models Have No Textures (Black/Gray)

**Symptom:** Model loads but appears completely black or dark gray

**Causes:**
1. Used `mode: 'preview'` without following up with refine
2. Forgot to use `texture_image_url` parameter when rigging
3. Emissive material properties interfering with textures

**Solutions:**
```javascript
// ✅ Always use preview → refine workflow
const previewTaskId = await generatePreview();
const refineTaskId = await generateRefine(previewTaskId);

// ✅ Always include texture URL when rigging
const rigTaskId = await rigModel({
    model_url: refinedModelUrl,
    texture_image_url: textureUrl  // DON'T FORGET THIS!
});

// ✅ Remove emissive material modifications
model.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // DON'T modify emissive properties!
    }
});
```

### Issue 2: Giant Deformed Model

**Symptom:** Model appears massive, fills entire screen, looks corrupted/inside-out

**Causes:**
1. Cloning models during animation switching
2. Multiple models stacked on top of each other
3. Scale being applied incorrectly or multiple times

**Solutions:**
```javascript
// ❌ WRONG
const newModel = models[targetState].clone();

// ✅ CORRECT - Use single model with action switching
const newAction = player.userData.actions[targetState];
currentAction.fadeOut(0.2);
newAction.reset().fadeIn(0.2).play();
```

### Issue 3: "Walking on Air" / Physics Mismatch

**Symptom:** Character appears to float above platforms, can't tell where they're actually standing

**Causes:**
1. Model visual size doesn't match physics collision size
2. Model positioned incorrectly relative to physics center

**Solutions:**
```javascript
// Match model scale to game physics
const modelHeight = 0.018; // Original model height
const scaleFactor = 2.5;
const finalHeight = modelHeight * scaleFactor; // 0.045

// Adjust PLAYER_SIZE to match
const PLAYER_SIZE = finalHeight * 14; // ~0.625 for 2.5x scale

// Position model so feet align with physics
model.position.set(0, PLAYER_SIZE * 0.8, 0);
```

### Issue 4: Animation Breaks Gameplay

**Symptom:** Jump animation makes game unplayable, character floats uncontrollably

**Solution:** Disable problematic animations
```javascript
// Only use idle and run animations
if (isMoving) {
    targetState = 'run';
} else {
    targetState = 'idle';
}
// Skip jump animation entirely
```

### Issue 5: Camera Too Close / Can't See Model

**Symptom:** Camera is inside model or showing extreme close-up

**Solutions:**
```javascript
// Adjust camera height and distance
const cameraHeight = 13;  // Test different values: 8, 13, 30
const cameraDistance = 15;
const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance);

// Adjust lookAt height
camera.lookAt(player.position.x, player.position.y + 2, player.position.z);
```

---

## Best Practices

### 1. Model Generation

- **Always use T-pose** (`is_a_t_pose: true`) for proper rigging
- **Use detailed prompts** describing textures, materials, and specific features
- **Use negative prompts** to avoid unwanted artifacts (strands, wires, pedestals)
- **Keep topology as 'quad'** for better animation deformation

### 2. Texture Preservation

- **Never skip the refine step** - preview models have no textures
- **Always use `texture_image_url` when rigging** - this is critical
- **Don't modify emissive properties** unless you need glow effects
- **Test textures in isolation** before integrating into game

### 3. Animation Integration

- **Load ONE model** as the base
- **Add all animation clips to ONE mixer**
- **Never clone models** during animation switching
- **Use fadeIn/fadeOut** for smooth transitions (0.2 seconds works well)
- **Only enable animations that work** - disable problematic ones

### 4. Scaling and Physics

- **Match model scale to physics** - calculate PLAYER_SIZE based on actual model dimensions
- **Position model vertically** to align feet with physics collision point
- **Test camera positioning** at different heights (8, 13, 30) to find sweet spot
- **Start with lower scale** (2-3x) and increase gradually if needed

### 5. Testing Workflow

1. Create isolated test environment first (like `test-achilles-view.html`)
2. Test textures work in isolation
3. Test animations work in isolation
4. Test scale looks correct with grid reference
5. Only then integrate into main game
6. Adjust PLAYER_SIZE to match visual size
7. Fine-tune camera positioning

### 6. File Organization

```
models/
├── character_v1_idle.glb     # Preview models (no textures)
├── character_v2_idle.glb     # Refine models (with textures, no rig)
├── character_v3_idle.glb     # Rigged with textures (wrong - missing texture_image_url)
└── character_v4_idle.glb     # ✅ FINAL - rigged with textures preserved
    character_v4_run.glb
    character_v4_walk.glb
    character_v4_jump.glb
```

Version your models so you can roll back if issues occur.

---

## Quick Reference: Complete Working Example

```javascript
// 1. GENERATE MODELS (Node.js script)
async function generateCharacter() {
    // Preview
    const preview = await createPreview({
        mode: 'preview',
        prompt: 'your detailed prompt here',
        is_a_t_pose: true
    });
    const previewTaskId = preview.result;
    await waitForCompletion(previewTaskId);

    // Refine
    const refine = await createRefine({
        mode: 'refine',
        preview_task_id: previewTaskId
    });
    const refineTaskId = refine.result;
    const refined = await waitForCompletion(refineTaskId);
    const textureUrl = refined.texture_urls[0].base_color;

    // Rig
    const rig = await createRig({
        model_url: refined.model_urls.glb,
        height_meters: 1.8,
        texture_image_url: textureUrl  // CRITICAL!
    });
    const rigTaskId = rig.result;
    await waitForCompletion(rigTaskId);

    // Animate
    for (const [name, actionId] of Object.entries({idle: 0, run: 16})) {
        const anim = await createAnimation({
            rig_task_id: rigTaskId,
            action_id: actionId
        });
        await downloadGLB(anim.result.animation_glb_url, `character_${name}.glb`);
    }
}

// 2. LOAD IN THREE.JS (Game code)
async function loadCharacter(scene) {
    // Load base model
    const model = await loadGLB('character_idle.glb');
    model.scale.set(2.5, 2.5, 2.5);
    model.position.set(0, 0.5, 0);
    model.rotation.y = Math.PI;

    // Setup mixer with all animations
    const mixer = new THREE.AnimationMixer(model);
    const idleAnim = (await loadGLB('character_idle.glb')).animations[0];
    const runAnim = (await loadGLB('character_run.glb')).animations[0];

    const actions = {
        idle: mixer.clipAction(idleAnim),
        run: mixer.clipAction(runAnim)
    };

    actions.idle.play();

    // Add to scene
    const group = new THREE.Group();
    group.add(model);
    group.userData = {mixer, actions, currentAction: actions.idle, currentState: 'idle'};
    scene.add(group);

    return group;
}

// 3. UPDATE ANIMATIONS (Game loop)
function updateCharacter(player, isMoving, delta) {
    const targetState = isMoving ? 'run' : 'idle';

    if (player.userData.currentState !== targetState) {
        player.userData.currentAction.fadeOut(0.2);
        player.userData.actions[targetState].reset().fadeIn(0.2).play();
        player.userData.currentAction = player.userData.actions[targetState];
        player.userData.currentState = targetState;
    }

    player.userData.mixer.update(delta);
}
```

---

## Troubleshooting Checklist

When things go wrong, check these in order:

- [ ] Did you use preview → refine workflow?
- [ ] Did you include `texture_image_url` when rigging?
- [ ] Are you using single model + action switching (not cloning)?
- [ ] Did you remove emissive material modifications?
- [ ] Does model scale match PLAYER_SIZE in physics?
- [ ] Is model positioned correctly relative to physics center?
- [ ] Are you only enabling animations that work correctly?
- [ ] Is camera height appropriate for model size?
- [ ] Did you test in isolation before integrating into game?
- [ ] Did you hard refresh browser to clear cache after changes?

---

## Support and Resources

- **Meshy API Documentation**: https://docs.meshy.ai/
- **Three.js Animation System**: https://threejs.org/docs/#manual/en/introduction/Animation-system
- **This Project's Test File**: `test-achilles-view.html` - working reference implementation

---

## Retrieving UI-Created Models from "My Assets" (Non-API Generations)

Meshy's API listings (e.g., GET /openapi/v2/text-to-3d) prioritize recent/API tasks, skipping older/UI-created ones (common for team-shared assets). UI models are still API-accessible via their internal task IDs. Workflow for autonomy:

### Extract Task IDs from Web UI (One-time per batch; ~2 min, scriptable with Puppeteer for interns)

1. Log in to https://app.meshy.ai/my-assets
2. Open Dev Tools (F12 > Network tab > Filter: Fetch/XHR)
3. Refresh/scroll to load models (e.g., Arcane Sorcerer folder)
4. Find requests to `https://api.meshy.ai/openapi/v2/workspace/assets` (or similar with "assets" in URL)—click it, go to Response tab
5. Response is JSON array of assets: each has `id` (task ID, e.g., "018a210d-8ba4-705c-b111-1f1776f7f578"), `name`, `model_urls` (GLB etc.), `thumbnail_url`
6. Copy the full JSON to a file (`meshy-assets.json`) or note IDs for characters (e.g., `{"merlin": "task_id_here"}`)
7. **Fallback**: Right-click model thumbnail > Inspect > Search HTML for `data-task-id` or `id="task-..."`

### Download via API (Scripted; preserves textures)

1. GET `/openapi/v2/text-to-3d/{task_id}` (or `/image-to-3d` if UI method was image-based) to get signed URLs (valid ~3 days; e.g., `https://assets.meshy.ai/.../model.glb?Expires=...`)
2. Download directly via curl/HTTP GET—no extra auth
3. **Cost**: Free for retrieval; rigging/animation costs credits

### Team Best Practices

- Batch-extract IDs into JSON once per project
- Use `image-to-3d` endpoint if UI creation was image-based (check UI history)
- **Retention**: UI models persist longer than API (no 3-day auto-delete), but signed URLs expire—download promptly
- **Errors?** If "NoMatchingRoute", confirm endpoint (v2 for text-to-3d; v1 for others)

### Example Response from GET /v2/text-to-3d/{id} (for download)

```json
{
  "id": "task_id",
  "status": "SUCCEEDED",
  "model_urls": {
    "glb": "https://assets.meshy.ai/.../model.glb?Expires=1729500000"
  },
  "texture_urls": [{"base_color": "https://assets.meshy.ai/.../texture.png?Expires=..."}]
}
```

---

## CRITICAL DISCOVERY: The Web API Endpoint

**Problem**: The documented public API endpoints (`/openapi/v2/text-to-3d`, `/v1/image-to-3d`, etc.) only return tasks YOU created via API calls, not models created via the web UI or by team members.

**Solution**: Meshy has an undocumented web API endpoint that returns ALL tasks in your workspace:

```
https://api.meshy.ai/web/v2/tasks
```

### Usage

```bash
curl "https://api.meshy.ai/web/v2/tasks?pageNum=1&pageSize=200&sortBy=-created_at&phases=text-to-image&phases=draft&phases=generate&phases=texture&phases=stylize&phases=animate" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Response Structure

```javascript
{
  "code": "OK",
  "result": [
    {
      "id": "task-id-here",
      "status": "SUCCEEDED",
      "mode": "texture",  // draft, texture, stylize, animate, etc.
      "phase": "texture",
      "userId": "your-user-id",
      "createdAt": 1761076744974,
      "args": {
        "draft": {
          "prompt": "Model prompt here",
          "imageUrl": "..."
        }
      },
      "result": {
        "previewUrl": "https://assets.meshy.ai/.../preview.png",
        "generate": {
          "modelUrl": "https://assets.meshy.ai/.../model.glb"
        },
        "texture": {
          "modelUrl": "https://assets.meshy.ai/.../textured_model.glb"
        }
      }
    }
  ]
}
```

### Autonomous Download Script

See `scripts/download-all-meshy-models.js` for a complete working example that:
1. Fetches all tasks from the web API
2. Filters for SUCCEEDED status
3. Downloads GLB files
4. Saves metadata for each model

### Key Points

- ✅ **Works for UI-created models** - Unlike public API endpoints
- ✅ **Returns team models** - Shows all models in your workspace
- ✅ **No retention limit** - Returns models regardless of age
- ✅ **Direct download URLs** - No additional API calls needed
- ⚠️ **Undocumented** - This endpoint is not in official docs, may change
- ⚠️ **Requires API key** - Same authentication as public API

---

**Last Updated**: October 22, 2025
**Version**: 2.0 - Added Web API Discovery
**Author**: Blank Beast Ball Team
