#!/bin/bash

# Vercel Install Script
# Assets (images, 3D models) are served directly from raw.githubusercontent.com - no submodules needed

echo "📦 Checking shared/types..."
# Shared types has no runtime dependencies, only devDependencies
# Since frontend uses it as file:../shared/types, npm will copy the source files
# No need to install anything here for Vercel builds
echo "✅ Shared types package ready (source files only)!"

# Change to repo root
cd "$(git rev-parse --show-toplevel)"

# Build shared/hex-engine package (required by frontend)
echo "📦 Building shared/hex-engine..."
cd shared/hex-engine
npm install --production=false
npm run build
cd ../..
echo "✅ Hex-engine package built!"

# Return to repo root for subsequent commands
cd "$(git rev-parse --show-toplevel)"
echo "📂 Returned to repository root"
