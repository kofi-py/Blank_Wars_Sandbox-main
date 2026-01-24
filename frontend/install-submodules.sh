#!/bin/bash

# Vercel Install Script for Private Git Submodules
# This script runs BEFORE npm install to authenticate and download private submodules

echo "🔐 Setting up private git submodules..."

# Check if GIT_TOKEN is available
if [ -z "$GIT_TOKEN" ]; then
  echo "⚠️  GIT_TOKEN not found - submodules may not download"
  echo "Continuing anyway..."
else
  echo "✅ GIT_TOKEN found"
fi

# Configure git to inject token into all GitHub HTTPS URLs (researched solution)
echo "📝 Configuring git to use token for GitHub authentication..."
git config --global url."https://${GIT_TOKEN}@github.com/".insteadOf "https://github.com/"

# Sync the submodule configuration
echo "🔄 Syncing submodule configuration..."
git submodule sync

# Change to repo root since submodule paths in .gitmodules are from root
cd "$(git rev-parse --show-toplevel)"

# Deinitialize the submodule first to force a clean clone (fixes Vercel's partial init issue)
echo "🔧 Deinitializing submodule to force clean state..."
git submodule deinit -f frontend/public/models || true

# Initialize and download the submodules (excluding broken TripoSR)
echo "📥 Downloading submodule content..."
git -c submodule."tools/3d-generation/TripoSR".update=none submodule update --init --recursive frontend/public/models

# Check if the models directory has files
if [ -d "frontend/public/models" ] && [ "$(ls -A frontend/public/models)" ]; then
  echo "✅ Submodule downloaded successfully!"
  echo "📊 Files in models:"
  ls -lh frontend/public/models/**/*.glb 2>/dev/null | wc -l | xargs echo "   GLB files:"
else
  echo "⚠️  Warning: models directory is empty or missing"
fi

echo "🎉 Submodule setup complete!"

# Install shared/types package dependencies before frontend
echo "📦 Installing shared/types dependencies..."
cd "$(git rev-parse --show-toplevel)/shared/types"
npm install
echo "✅ Shared types package ready!"
