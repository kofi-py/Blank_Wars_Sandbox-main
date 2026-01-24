#!/usr/bin/env bash
set -euo pipefail
( cd backend && npm ci --prefer-offline >/dev/null 2>&1 || true
  bash scripts/prebuild.sh >/dev/null 2>&1 || true
  npx tsc -p tsconfig.json >/dev/null 2>&1
)