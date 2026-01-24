# Terrain & Waterfall APIs - Research Documentation

## Overview
This document contains research on APIs and techniques for creating realistic 3D landscapes and waterfalls in Three.js games.

---

## 🌎 Terrain & Landscape APIs

### Comparison Table

| Service/Library | Type | Cost | Key Features for Three.js | API/Integration Details | Best For |
|----------------|------|------|---------------------------|------------------------|----------|
| **THREE.Terrain** | Procedural Generation Library | Free (open-source) | Generates infinite terrains using noise (Perlin, Simplex) + erosion; outputs THREE.Mesh directly. Supports texturing and LOD for games. | JS library—include via npm (`npm i three.terrain`); call `THREE.Terrain({ heightmap: ..., options })` to generate mesh in your scene. No external API calls. | Procedural games needing runtime variety (e.g., endless runners). |
| **three-geo** | Real-World Terrain Library | Free (open-source) | Builds 3D satellite-textured terrains from GPS coords using DEM data; includes contour maps and erosion sim. Outputs THREE.Group/Mesh. | JS library—npm install; `new ThreeGeo({ coords: [lat, lng], zoom: 14 })` fetches from Mapbox API (free tier: 50k requests/month) and renders. | Realistic Earth-based landscapes (e.g., hiking sims). |
| **Mapbox Terrain API** | REST API for Heightmaps/Textures | Free (up to 50k requests/month; $0.50/1k after) | Provides RGB-encoded DEM heightmaps and satellite imagery tiles; easy to convert to Three.js PlaneGeometry with displacement. | REST API—fetch tiles via `https://api.mapbox.com/v4/mapbox.terrain-rgb/{zoom}/{x}/{y}.png?access_token=YOUR_TOKEN`; parse RGB to heights in JS. Free token signup. | Dynamic, zoomable real-world terrains; pair with three-geo for simplicity. |
| **MapTiler Cloud** | REST API for Heightmaps/Textures | Free (100k requests/month) | Direct competitor to Mapbox. Provides Terrain-RGB heightmap tiles and high-res satellite/map imagery. | REST API. Integration identical to Mapbox: fetch PNG tile, parse RGB values to heights, apply as displacement map. | Direct, often cheaper alternative to Mapbox for real-world terrains. |
| **Poly Haven API** | REST API for Assets | Free (CC0 license) | High-quality HDRIs, PBR textures, and some landscape models (e.g., rocky terrains); download GLTF or textures for env maps. | REST API—`https://api.polyhaven.com/v1/assets?types=hdris,models&q=terrain` (JSON response with download URLs); load via Three.js loaders. No rate limits for non-commercial. | Photorealistic environments; cheap on bandwidth. |
| **Real API** | Rendering API | Free (beta; future tiers ~$5-20/month est.) | Generates realistic 3D landscapes/images from text prompts; outputs GLTF or rendered frames integrable with Three.js. | REST API—POST to `/generate` with prompt (e.g., "mountain landscape"); returns model URL. Beta access via signup at realistic3.com. | AI-generated custom terrains; quick prototyping. |
| **OpenTopography API** | REST API for DEM Data | Free (academic/non-commercial) | Global elevation datasets (e.g., SRTM, LiDAR); fetch raw height data for any lat/lng bounding box. | REST API—`https://portal.opentopography.org/API/globaldem?demtype=SRTMGL1&south=lat&north=lat&west=lng&east=lng&outputFormat=GTiff`; process TIFF to heightmap array in JS. | High-res scientific terrains (e.g., custom game worlds). |
| **Google Maps Photorealistic 3D Tiles API** | Real-World 3D Tiles API | Free (part of standard $200/month Google Cloud free credit) | Provides Google's high-resolution, photorealistic 3D mesh data for buildings, trees, and terrain. | REST API. Load using 3D Tiles loader library (e.g., `3d-tiles-renderer`) within Three.js scene. | High-fidelity digital twins of real-world cities. |
| **Cesium ion** | Real-World Terrain & 3D Tiles API | Free ("Community" tier for non-commercial & small commercial use) | Provides high-precision global terrain (Cesium World Terrain), satellite imagery, and 3D building data. | REST API. Supports three.js integration via loaders like `cesium-three` or `3d-tiles-renderer`. | Geographically accurate, large-scale world rendering (e.g., global strategy games, flight sims). |
| **Nextzen (via AWS Open Data)** | REST API for Heightmaps (DEM) | Completely Free (hosted on AWS Open Data) | Open-source global elevation data. Provides "Terrarium" format PNG tiles (similar to Mapbox RGB). | REST API (data on S3). Fetch tiles, parse RGB, apply as displacement. Free data, minimal S3 bandwidth cost. | Completely free, open-source option if Mapbox/MapTiler free tiers are too restrictive. |

### Quick Integration Tips

**Loading Models/Textures:**
- Use `GLTFLoader` for GLB files or `TextureLoader` for heightmaps
- Example for Mapbox: Fetch PNG, read pixels as heights, apply to `new THREE.PlaneGeometry()` with `geometry.attributes.position`

**Procedural Boost:**
- Combine THREE.Terrain with noise libs like SimplexNoise for cheap, infinite landscapes—no API needed

**Performance:**
- For games, use LOD (Level of Detail) via Three.js's built-in frustum culling or libraries like `@react-three/drei`

**Mapbox Terrain-RGB Decoding:**
```javascript
// elevation = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
```

---

## 🌊 3D Waterfall Implementation

### The "Waterfall Stack"

| Layer | Purpose | Free/Cheap Source |
|-------|---------|-------------------|
| Base terrain | Rock face the water falls from | OpenTopography API (DEM) or Mapbox Terrain-RGB |
| Water sheet | Thin, semi-transparent flowing mesh | ShaderMaterial (custom) |
| Particle mist | Spray, foam, droplets | GPUInstancedMesh + Points |
| Foam / splash | White-water at the base | Decal + animated texture |
| Audio | Loopable waterfall sound | Freesound.org (CC-0) |

### 1. The Main Fall (Water Sheet)

**ShaderMaterial Approach:**

```glsl
// waterfall.vert
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// waterfall.frag
uniform float time;
uniform sampler2D noiseTex;   // seamless flow map
varying vec2 vUv;
varying vec3 vPos;

void main() {
  // Flow direction down the cliff
  vec2 flow = vec2(0.0, -1.0);
  vec2 uv = vUv + flow * time * 0.8;

  // Two scrolling layers for depth
  float n1 = texture2D(noiseTex, uv * 3.0).r;
  float n2 = texture2D(noiseTex, uv * 7.0 + vec2(time*0.3, 0.0)).r;
  float noise = (n1 + n2) * 0.5;

  // Transparency fade at edges
  float alpha = smoothstep(0.0, 0.1, noise) * 0.9;

  // Sub-surface scattering tint
  vec3 water = vec3(0.05, 0.15, 0.25);
  vec3 col = water + vec3(noise * 0.3);

  gl_FragColor = vec4(col, alpha);
}
```

**Free Textures:**
- Flow map: Poly Haven – "Water Flow" (CC0)
- Noise: three/examples/textures/noise.png

### 2. GPU Particle Mist

```javascript
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

const SIZE = 128;
const gpu = new GPUComputationRenderer(SIZE, SIZE, renderer);

const posTex = gpu.createTexture();
const velTex = gpu.createTexture();

// Velocity and position fragment shaders for physics
const velocityFrag = /* GLSL that adds gravity + turbulence */;
const positionFrag = /* GLSL that integrates velocity */;

const velVar = gpu.addVariable('velTex', velocityFrag, velTex);
const posVar = gpu.addVariable('posTex', positionFrag, posTex);

// Render to Points
const particleGeo = new THREE.BufferGeometry();
const particleMat = new THREE.PointsMaterial({
  size: 0.15,
  map: dropletSprite,
  transparent: true,
  blending: THREE.AdditiveBlending // KEY for realistic mist
});
const particles = new THREE.Points(particleGeo, particleMat);
```

**Free droplet sprite:** Kenney.nl – "particlePack" (CC0)

### 3. Depth-Based Foam Shader

**Advanced technique - creates foam where water meets surfaces:**

```glsl
uniform sampler2D uWaterTexture;
uniform sampler2D uDepthTexture;
uniform float uTime;
varying vec2 vUv;
varying vec4 vScreenPosition;

float getDepth(vec2 screenCoords) {
    return texture2D(uDepthTexture, screenCoords).r;
}

void main() {
    // 1. Get water color
    vec2 scrollingUv = vUv + vec2(0.0, uTime * 0.1);
    vec4 waterColor = texture2D(uWaterTexture, scrollingUv);

    // 2. Get scene depth
    vec2 screenCoords = vScreenPosition.xy / vScreenPosition.w;
    float sceneDepth = getDepth(screenCoords);

    // 3. Get this pixel's depth
    float waterDepth = gl_FragCoord.z;

    // 4. Compare
    float foamThreshold = 0.5;
    float foamFactor = smoothstep(0.0, foamThreshold, sceneDepth - waterDepth);

    // 5. Mix
    vec3 foamColor = vec3(1.0);
    vec3 finalColor = mix(waterColor.rgb, foamColor, foamFactor);

    gl_FragColor = vec4(finalColor, waterColor.a);
}
```

### 4. Foam Decal (Simple Approach)

```javascript
const foamDecal = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 4),
  new THREE.MeshStandardMaterial({
    map: foamColorTex,
    normalMap: foamNormalTex,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true
  })
);
foamDecal.rotation.x = -Math.PI/2;
foamDecal.position.set(0, 0.1, 0); // base of fall

// Animate UVs
function animate() {
  foamDecal.material.map.offset.y -= 0.02;
}
```

**Free foam textures:** Poly Haven – "Foam 4K" (CC0)

### 5. Audio

```javascript
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('https://cdn.freesound.org/previews/620/620078_5674468-lq.mp3', buffer => {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.6);
  sound.play();
});
```

**Source:** Freesound – "Waterfall Loop" (CC-0)

---

## 🚀 Pro Production Add-Ons

| Technique | Purpose | Tools / Notes |
|-----------|---------|---------------|
| Flowmap baking | Use Flowmap Painter or FluidNinja LIVE to author direction maps for the water shader | Integrate as `uniform sampler2D flowMap` |
| Refraction / reflection pass | Subtle refractive shimmer in falling sheet | Refractor from three-examples or custom screen-space distortion |
| Foam normal-map animation | Scrolling dual-normal maps for whitewater realism | Poly Haven "Foam 4K" → blend two UV scrolls |
| Audio-reactive mist density | Link FFT amplitude to particle alpha | `THREE.AudioAnalyser` |
| Post-FX bloom & chromatic aberration | Slight lens glow | `UnrealBloomPass` + `RGBShiftShader` |
| Render layers | Separate waterfall, mist, and environment for correct depth and order | assign `water.layer = 1`, render sequentially |

### Performance Checklist (60 fps on mid-range GPU)

| Check | Tip |
|-------|-----|
| Water sheet | 32×64 segments max; use ShaderMaterial (no per-vertex lights) |
| Particles | GPU compute → ≤ 16k droplets |
| LODs | Switch to billboard at > 30m |
| Shadows | Disable on water; use light probe for reflections |
| Post-process | UnrealBloomPass (low strength) for misty glow |

---

## 📝 Implementation Notes

### Current Game Implementation
- Using procedural noise-based terrain (THREE.Terrain approach)
- White water rapids with foam mesh and particle spray
- No shader-based waterfalls yet (future enhancement)

### Recommended Upgrade Path
1. **Level 1-2:** Keep current procedural terrain + rapids
2. **Level 3+:** Add shader-based water sheets for dramatic waterfalls
3. **Production:** Integrate Mapbox/three-geo for real-world canyon recreation

### Free Resource URLs
- Poly Haven API: https://api.polyhaven.com/v1/assets
- Freesound waterfalls: https://freesound.org/search/?q=waterfall
- Kenney particle pack: https://kenney.nl/assets/particle-pack
- three-geo library: https://github.com/w3reality/three-geo

---

## 🔗 Key Libraries & Resources

- **THREE.Terrain:** https://github.com/IceCreamYou/THREE.Terrain
- **three-geo:** https://github.com/w3reality/three-geo
- **3d-tiles-renderer:** For Google Maps / Cesium 3D Tiles
- **Flowmap Painter:** For custom flow maps
- **Poly Haven:** https://polyhaven.com
- **Freesound:** https://freesound.org

---

*Last Updated: 2025-10-29*
*Research compiled from Grok, Gemini, and ChatGPT analyses*
