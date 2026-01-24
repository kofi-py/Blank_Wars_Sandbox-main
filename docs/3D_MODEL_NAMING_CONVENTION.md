# 3D Model Naming Convention

## Purpose
This document defines the naming convention for 3D character models in Blank Wars to track different versions and processing stages.

## Naming Format
```
{character_name}_{version}_{state}_{animation}.glb
```

### Components

1. **character_name** (required)
   - Lowercase, underscores for spaces
   - Examples: `achilles`, `dracula`, `sun_wukong`, `agent_x`

2. **version** (optional but recommended)
   - Format: `v1`, `v2`, `v3`, `v4`, etc.
   - Increment for each iteration/improvement
   - Examples: `achilles_v4`, `dracula_v2`

3. **state** (required)
   - Indicates processing/quality level
   - Values:
     - `raw` - Unprocessed mesh from 3D generation (draft mode)
     - `textured` - Has texture maps applied
     - `rigged` - Has skeleton/bones for animation
     - `animated` - Has animation data embedded
   - Can combine: `textured_rigged`, `textured_animated`

4. **animation** (optional)
   - Only when model includes specific animation
   - Values: `idle`, `walk`, `run`, `jump`, `attack`, etc.
   - Examples: `achilles_v4_textured_animated_idle.glb`

## Current Model Status (As of Oct 2024)

### Textured & Animated (Best Quality)
```
✅ Achilles    : achilles_v4_idle.glb (6.3MB) - Latest version with textures & idle animation
✅ Dracula     : dracula_idle.glb (38.8MB) - Textured with idle animation
✅ Merlin      : merlin_idle.glb (34.7MB) - Textured with idle animation
```

### Draft Models (Untextured)
```
⚠️ Agent X              : agent_x.glb (13.1MB) - Draft mode, no textures
⚠️ Billy the Kid        : night_of_the_lone_ranger.glb (8.2MB) - Draft
⚠️ Cleopatra            : cleopatra.glb (10.6MB) - Draft
⚠️ Fenrir               : fenrir.glb (21.3MB) - Draft
⚠️ Frankenstein         : monsters_midnight_stroll.glb (10.6MB) - Draft
⚠️ Genghis Khan         : the_warrior_king.glb (25.7MB) - Draft
⚠️ Joan of Arc          : valors_flame.glb (19.4MB) - Draft
⚠️ Robin Hood           : forest_archer.glb (16.1MB) - Draft
⚠️ Sherlock Holmes      : sherlock.glb (7.6MB) - Draft
⚠️ Sun Wukong           : warrior_of_the_skies.glb (14.0MB) - Draft
⚠️ Tesla                : tesla.glb (10.0MB) - Draft
⚠️ Rilak-Trelkar        : zeta.glb (11.8MB) - Draft
⚠️ Sammy Slugger        : sammy_slugger.glb (8.4MB) - Draft
⚠️ Space Cyborg         : space_cyborg.glb (11.3MB) - Draft
```

## Examples

### Good Naming Examples
```
✅ achilles_v4_textured_animated_idle.glb  - Clear version, state, and animation
✅ dracula_v2_textured_rigged.glb          - Version 2, textured and rigged
✅ merlin_raw.glb                           - Raw unprocessed model
✅ cleopatra_v1_textured.glb               - Version 1 with textures
```

### Simplified Naming (Current Practice)
```
✅ achilles_v4_idle.glb  - Version 4, idle animation (implies textured_animated)
✅ dracula_idle.glb      - Idle animation (implies textured_animated)
✅ achilles_v4_walk.glb  - Version 4, walking animation
```

### Poor Naming Examples
```
❌ final_achilles.glb           - Ambiguous, no version or state info
❌ achilles_NEW.glb             - "NEW" is not specific
❌ achilles_fixed_v2_final.glb  - Confusing version info
```

## Migration Plan

To standardize existing models:

1. **Phase 1**: Audit all models (DONE)
2. **Phase 2**: Request textured versions for all draft models from Meshy API
3. **Phase 3**: Rename models following convention
4. **Phase 4**: Update model mappings in `characterImageUtils.ts`

## File Locations

- **Source Models**: `/blank-beast-ball/models/`
- **Public Assets**: `/frontend/public/blank-beast-ball/models/`
- **Legacy Models**: `/frontend/public/models/{character_folder}/`

## Notes

- Larger file sizes generally indicate textured models (textures embedded)
- Draft models from Meshy are typically 8-25MB
- Textured/animated models are typically 30-40MB+
- All models use `.glb` format (binary GLTF)
- Metadata files (`metadata.json`) in legacy folders contain mode: "draft" or "texture"

## Priority Characters for Texture Upgrade

Based on usage in Kitchen Table 3D chat, prioritize:
1. Agent X (frequently used, currently untextured)
2. Cleopatra (popular character)
3. Joan of Arc (fan favorite)
4. Sherlock Holmes (iconic character)
