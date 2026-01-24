# Autonomous Meshy Model Extraction

This automation extracts 3D model task IDs from the Meshy web UI and downloads them via the Meshy API, without requiring manual intervention.

## Prerequisites

1. **Safari with JavaScript from Apple Events enabled:**
   - Open Safari
   - Go to Safari > Settings > Advanced
   - Check "Show features for web developers"
   - Go to Safari > Develop > Allow JavaScript from Apple Events

2. **Environment:**
   - Node.js installed (v18+)
   - MESHY_API_KEY environment variable set (or hardcoded in script)

## Usage

### Step 1: Open Meshy in Safari

Open https://app.meshy.ai/my-assets in Safari and make sure you're logged in.

### Step 2: Run the extraction script

```bash
cd /Users/gabrielgreenstein/blank-wars-clean
node scripts/autonomous-meshy-extract.js
```

### Step 3: Follow the prompts

The script will:
1. Verify Safari is on the Meshy page
2. Install a network capture hook in Safari
3. Ask you to **refresh the page** (Cmd+R)
4. Wait 10 seconds for the page to load
5. Extract task IDs from the page DOM and captured network requests
6. Validate each task ID against the Meshy API
7. Download all valid models to the `models/` directory

## How It Works

### Phase 1: Network Capture
The script injects JavaScript into Safari that intercepts all `fetch()` and `XMLHttpRequest` calls. This captures the actual API requests Meshy's frontend makes when loading your assets.

### Phase 2: DOM Extraction
The script scans the page for:
- Task IDs in image `src` attributes (thumbnails)
- Task IDs in link `href` attributes
- Task IDs in `data-*` attributes
- Task IDs in JSON script tags
- Task IDs from the Performance API (network requests)

### Phase 3: Validation
Each extracted UUID is validated against multiple Meshy API endpoints:
- `/openapi/v2/text-to-3d/{taskId}`
- `/v1/image-to-3d/{taskId}`
- `/openapi/v1/rigging/{taskId}`
- `/openapi/v1/animations/{taskId}`

Only IDs that return valid model data are kept.

### Phase 4: Download
For each valid task:
- Downloads the GLB/OBJ/USDZ file
- Saves metadata (task ID, prompt, download time)
- Creates a download manifest

## Output

Models are saved to:
```
models/
├── <character_name>/
│   ├── <character_name>_base.glb
│   └── metadata.json
├── download_manifest.json
└── extracted_ids_debug.json
```

## Troubleshooting

### "Network capture not installed"
Make sure you enabled "Allow JavaScript from Apple Events" in Safari.

### "Safari is not on Meshy page"
Open https://app.meshy.ai/my-assets before running the script.

### "No valid model tasks found"
The extracted IDs might not be model task IDs. Try:
1. Scrolling through the My Assets page to load more models
2. Checking the `extracted_ids_debug.json` file to see what was extracted
3. Manually inspecting the page in Safari Web Inspector to find where task IDs are stored

## Next Steps

Once models are downloaded, you can:
1. Rig them using the Meshy rigging API
2. Animate them using the Meshy animation API
3. Integrate them into your game using the patterns from the Achilles integration

See `MESHY_API_GUIDE.md` for the full workflow.
