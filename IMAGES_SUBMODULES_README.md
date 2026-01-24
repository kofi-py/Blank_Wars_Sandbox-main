# Blank Wars Images - Submodule Structure

## Overview

The Blank Wars project uses **Git submodules** to manage image assets across multiple repositories. This keeps each repository under GitHub's 5GB size limit while organizing assets logically.

## Repository Structure

### Main Repository: `Blank_Wars_2026`
- **Location**: Main project repository
- **Contains**: Code, migrations, backend, frontend (excluding large assets)

### Image Submodules

#### 1. Blank-Wars-Images (Original)
- **Path**: `frontend/public/images/`
- **Repository**: https://github.com/Green003-CPAIOS/Blank-Wars-Images
- **Size**: ~1.9 GB
- **Files**: 716 files
- **Contents**:
  - Character portraits and skill images
  - Battle backgrounds
  - Equipment icons
  - Training, coaching, and HQ assets
  - Homepage and UI elements

#### 2. Blank-Wars-Images-2 (New)
- **Path**: `frontend/public/images2/`
- **Repository**: https://github.com/Green003-CPAIOS/Blank-Wars_Images-2
- **Size**: ~4.0 GB
- **Files**: 1,853 files
- **Contents**:
  - **Battle/** (686 files): Character vs character battle scenes
  - **Character Cards/** (104 files): Full character card designs
  - **Clubhouse/**: Character clubhouse variations
  - **Community Board/**: Community board character images
  - **Equipment/**: Character equipment screens
  - **Finance/**: Finance screen character variations
  - **Graffiti Wall/**: Graffiti wall character art
  - **Group Activities/**: Group activity scenes
  - **Headquarters/**: HQ and confessional backgrounds
  - **Performance Coaching/**: 1-on-1 coaching scenes
  - **Personal Problems/**: Personal problems UI
  - **Progression/**: Progression screen assets
  - **Skills/**: Skills UI assets
  - **Therapy/**: Therapy session scenes
  - **Training/**: Training scene variations

## Setup Instructions

### Initial Clone

When cloning the repository for the first time:

```bash
# Clone the main repository
git clone https://github.com/CPAIOS/Blank_Wars_2026.git
cd Blank_Wars_2026

# Initialize and update all submodules
git submodule init
git submodule update --recursive

# Or do both in one command:
git submodule update --init --recursive
```

### After Pulling Updates

If someone updates a submodule reference:

```bash
# Pull the latest changes from main repo
git pull

# Update submodules to match the commit references
git submodule update --recursive
```

## Working with Submodules

### Updating Images in a Submodule

If you need to add/modify images:

```bash
# Navigate to the submodule directory
cd frontend/public/images2

# Make your changes (add/modify files)

# Stage and commit within the submodule
git add .
git commit -m "Add new character images"

# Push to the submodule's repository
git push origin main

# Go back to main repository
cd ../../..

# The main repo will see the submodule as modified
git add frontend/public/images2
git commit -m "Update images2 submodule reference"
git push origin main
```

### Checking Submodule Status

```bash
# See current submodule commit references
git submodule status

# See if submodules are out of sync
git submodule summary
```

## Why Use Submodules?

### Benefits

1. **GitHub Size Limits**: Each repository stays under 5GB limit
2. **Separation of Concerns**: Code and assets are versioned separately
3. **Faster Clones**: Developers can choose which submodules to download
4. **Independent History**: Asset changes don't clutter code history

### Trade-offs

1. **Additional Complexity**: Requires understanding of submodule workflow
2. **Two-step Updates**: Must commit in submodule AND main repo
3. **Sync Required**: Team members must update submodules after pulling

## Common Operations

### Adding New Images

```bash
# Add to the appropriate submodule
cd frontend/public/images2
cp /path/to/new/images .
git add .
git commit -m "Add new images"
git push

# Update main repo reference
cd ../../..
git add frontend/public/images2
git commit -m "Update images2 with new assets"
git push
```

### Switching Branches

```bash
# When switching branches, update submodules
git checkout feature-branch
git submodule update --recursive
```

### Pulling Someone Else's Changes

```bash
# Pull main repo
git pull origin main

# Update submodules to match
git submodule update --recursive

# If you see merge conflicts in submodules, resolve them in the submodule directory
```

## Migration Details (November 26, 2024)

### What Was Done

1. **Downloaded Assets**: 3.8 GB from Google Drive (split into 2 zip files)
2. **Created New Repository**: Blank-Wars-Images-2 on GitHub
3. **Organized Structure**: Sorted 1,853 files into logical directories
4. **Two Commits**:
   - First commit: Battle scenes, character cards, and initial assets
   - Second commit: Clubhouse, training, therapy, and additional variations
5. **Added Submodule**: Configured images2 as a git submodule in main repo
6. **Total Upload**: ~4 GB to GitHub in approximately 30 minutes

### Repository Sizes After Migration

- Blank-Wars-Images (original): 1.9 GB ✓
- Blank-Wars-Images-2 (new): 4.0 GB ✓
- Both under GitHub's 5 GB repository limit

## Troubleshooting

### Submodule Directory is Empty

```bash
git submodule update --init --recursive
```

### Submodule Shows as Modified (but you didn't change it)

```bash
# This means the submodule is at a different commit than expected
cd frontend/public/images2
git checkout main
git pull
cd ../../..
```

### Detached HEAD in Submodule

Submodules checkout specific commits (detached HEAD state). This is normal.

```bash
# To work on submodule, check out a branch first
cd frontend/public/images2
git checkout main
# Now make changes
```

### Accidentally Committed Submodule as Regular Directory

```bash
# Remove from index
git rm --cached frontend/public/images2

# Re-add as submodule
git submodule add https://github.com/Green003-CPAIOS/Blank-Wars_Images-2.git frontend/public/images2
```

## Best Practices

1. **Always update submodules** after pulling from main repo
2. **Commit submodule changes first**, then update main repo reference
3. **Don't make changes in detached HEAD** - checkout a branch in the submodule
4. **Document large asset additions** in commit messages
5. **Keep submodule commits atomic** - one logical change per commit

## Additional Submodules

The project also uses these submodules:

- `tools/3d-generation/InstantMesh`: 3D generation tool
- `tools/3d-generation/TripoSR`: 3D reconstruction tool
- `frontend/public/models`: 3D model assets
- `frontend/public/models-confessional`: Confessional 3D models

## Support

For questions or issues with submodules:
1. Check this README first
2. Run `git submodule status` to diagnose
3. Consult Git submodule documentation: https://git-scm.com/book/en/v2/Git-Tools-Submodules

---

**Last Updated**: November 26, 2024
**Contributor**: Claude (setup and documentation)
