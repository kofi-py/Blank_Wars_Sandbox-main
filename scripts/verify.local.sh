#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Backend health"
curl -s http://localhost:4000/api/ai/test | jq .

echo "[2/6] Chat ping"
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"ping"}]}' | jq .

echo "[3/6] Image gen (512x512)"
curl -s -X POST http://localhost:4000/api/ai/image \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a cozy game room","size":"512x512"}' | jq '.images[0].mime, .images[0].dataUrl' | head -2

echo "[4/6] Equipment lookup"
curl -s "http://localhost:4000/api/equipment/character/billy%20the%20kid" | jq .

echo "[5/6] WebSocket check (manual)"
echo "Open http://localhost:3007 — server logs should show 'Client connected' with no flapping."

echo "[6/6] LocalAGI docs reminder"
echo "Open http://localhost:8080/docs and confirm the chat path/payload; if not OpenAI-style, set LOCAL_AGI_CHAT_PATH and LOCAL_AGI_PAYLOAD accordingly."