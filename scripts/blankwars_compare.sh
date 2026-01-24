#!/usr/bin/env bash
set -euo pipefail

GOOD_REF="${1:-}"
NEW_REF="${2:-HEAD}"

if [[ -z "$GOOD_REF" ]]; then
  echo "Usage: $0 <GOOD_REF> [NEW_REF]"
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="reports/diff-$STAMP"
TMP=".compare-$STAMP"

mkdir -p "$OUT" "$TMP"

echo "==> Preparing side-by-side worktrees…"
git worktree add "$TMP/good" "$GOOD_REF" >/dev/null 2>&1
git worktree add "$TMP/new"  "$NEW_REF"  >/dev/null 2>&1 || true

GOOD="$TMP/good"
NEW="$TMP/new"

# 1) Git high-level
{
  echo "GOOD_REF: $GOOD_REF"
  echo "NEW_REF:  $NEW_REF"
  echo
  echo "=== Git Summary (GOOD) ==="
  (cd "$GOOD" && git log --oneline -n 20)
  echo
  echo "=== Git Summary (NEW) ==="
  (cd "$NEW" && git log --oneline -n 20)
} > "$OUT/01_git_summary.txt"

git -C "$ROOT" diff --name-status "$GOOD_REF..$NEW_REF" > "$OUT/02_diff_name_status.txt"
git -C "$ROOT" diff --stat "$GOOD_REF..$NEW_REF"       > "$OUT/03_diff_stat.txt"

# 2) Route candidates & hashes (dup detection)
{
  echo "=== Route candidates (GOOD) ==="
  rg -n "router\\.post\\('/chat'|/api/ai/chat" -g '!**/node_modules/**' -S "$GOOD" || true
  echo
  echo "=== Route candidates (NEW) ==="
  rg -n "router\\.post\\('/chat'|/api/ai/chat" -g '!**/node_modules/**' -S "$NEW" || true
} > "$OUT/04_route_candidates.txt"

{
  echo "=== ai.ts hashes (GOOD) ==="
  fd -a "ai.ts" "$GOOD/backend" | while read -r f; do printf "%s  " "${f#$GOOD/}"; shasum "$f" | cut -d' ' -f1; done
  echo
  echo "=== ai.ts hashes (NEW) ==="
  fd -a "ai.ts" "$NEW/backend" | while read -r f; do printf "%s  " "${f#$NEW/}"; shasum "$f" | cut -d' ' -f1; done
} > "$OUT/05_route_hashes.txt"

# 3) Placeholder/fallback scans
PLACEHOLDERS='quick reply|thinking\)\.\.\.|warming|primer|fallback'
{
  echo "=== Placeholder scan (GOOD) ==="
  rg -n -S "$PLACEHOLDERS" "$GOOD/backend/src" || true
  echo
  echo "=== Placeholder scan (NEW) ==="
  rg -n -S "$PLACEHOLDERS" "$NEW/backend/src" || true
} > "$OUT/06_placeholders_scan.txt"

# 4) Env/config deltas
{
  echo "=== Env toggles in code (GOOD) ==="
  rg -n -S "OPENAI_|LOCALAGI|PREWARM|AGENT_PRELOAD|BACKGROUND_DECISION|ENABLE_POLL_FALLBACK|LLM_SLA" "$GOOD/backend/src" || true
  echo
  echo "=== Env toggles in code (NEW) ==="
  rg -n -S "OPENAI_|LOCALAGI|PREWARM|AGENT_PRELOAD|BACKGROUND_DECISION|ENABLE_POLL_FALLBACK|LLM_SLA" "$NEW/backend/src" || true
} > "$OUT/07_env_scan.txt"

# 5) Service-layer diffs (OpenAI vs LocalAGI)
{
  echo "=== LocalAGI service diff (if present) ==="
  git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- backend/src/services/localAGIService.ts || true
  echo
  echo "=== OpenAI service diff (if present) ==="
  git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- backend/src/services/openaiService.ts || true
  echo
  echo "=== aiChatService diff (main service) ==="
  git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- backend/src/services/aiChatService.ts || true
} > "$OUT/08_service_deltas.txt"

# 6) Streaming path diffs
git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- backend/src/routes/ai.ts \
  > "$OUT/09_streaming_deltas.txt" || true

# 7) try/catch counts (route)
{
  echo "=== try/catch counts (GOOD ai.ts) ==="
  if [[ -f "$GOOD/backend/src/routes/ai.ts" ]]; then
    node -e "const s=require('fs').readFileSync('$GOOD/backend/src/routes/ai.ts','utf8');console.log({try:(s.match(/try\\s*\\{/g)||[]).length,catch:(s.match(/catch\\s*\\(e: any\\)\\s*\\{/g)||[]).length});"
  else
    echo "GOOD ai.ts missing"
  fi
  echo "=== try/catch counts (NEW ai.ts) ==="
  if [[ -f "$NEW/backend/src/routes/ai.ts" ]]; then
    node -e "const s=require('fs').readFileSync('$NEW/backend/src/routes/ai.ts','utf8');console.log({try:(s.match(/try\\s*\\{/g)||[]).length,catch:(s.match(/catch\\s*\\(e: any\\)\\s*\\{/g)||[]).length});"
  else
    echo "NEW ai.ts missing"
  fi
} > "$OUT/10_try_catch_counts.txt"

# 8) package.json / lockfile deltas
git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- package.json backend/package.json > "$OUT/11_package_json.diff" || true
{
  echo "=== Lockfile top deltas ==="
  git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- package-lock.json pnpm-lock.yaml yarn.lock | head -200 || true
} > "$OUT/12_lockfile_summary.txt"

# 9) migrations & schema files
{
  echo "=== Changed migrations ==="
  git -C "$ROOT" diff --name-status "$GOOD_REF..$NEW_REF" -- backend/**/migrations** || true
  echo
  echo "=== Unified diffs for changed migrations ==="
  git -C "$ROOT" diff "$GOOD_REF..$NEW_REF" -- backend/**/migrations** || true
} > "$OUT/13_migrations_changed.txt"

# 10) Optional Postgres schema diff (requires env vars)
# Set PG_PROD_URL and PG_LOCAL_URL to enable.
if [[ "${PG_PROD_URL:-}" != "" && "${PG_LOCAL_URL:-}" != "" ]]; then
  echo "==> Dumping schemas for diff (prod vs local)…"
  pg_dump --schema-only "$PG_PROD_URL"  > "$TMP/prod_schema.sql"
  pg_dump --schema-only "$PG_LOCAL_URL" > "$TMP/local_schema.sql"
  diff -u "$TMP/prod_schema.sql" "$TMP/local_schema.sql" > "$OUT/14_schema_diff.sql" || true
else
  echo "-- Skipping DB schema diff; set PG_PROD_URL and PG_LOCAL_URL to enable." > "$OUT/14_schema_diff.sql"
fi

# 11) Summary synthesis (simple, readable)
{
  echo "# BlankWars Code Comparison Summary"
  echo "- GOOD_REF: \`$GOOD_REF\`"
  echo "- NEW_REF:  \`$NEW_REF\`"
  echo
  echo "## High-risk flags"
  echo "- Duplicate route files? See 04_route_candidates.txt & 05_route_hashes.txt"
  echo "- Placeholder strings present? See 06_placeholders_scan.txt"
  echo "- Route try/catch imbalance? See 10_try_catch_counts.txt"
  echo "- Service fabricates text (fallbacks) vs throws? See 08_service_deltas.txt"
  echo "- Streaming behavior drift? See 09_streaming_deltas.txt"
  echo "- Env/config toggles changing behavior? See 07_env_scan.txt"
  echo "- Migrations impacting characters/items/equipment? See 13_migrations_changed.txt"
  echo "- Package or lockfile drift that could change runtime? See 11/12"
  echo
  echo "## Next actions"
  echo "1) Pick one canonical route path and delete/alias dupes."
  echo "2) Remove any synthetic fallback paths (service layer) — throw, let route map to 5xx/504."
  echo "3) Normalize streaming chunks & errors."
  echo "4) Align env toggles (PREWARM/ENABLE_POLL_FALLBACK/LLM_SLA) with policy."
  echo "5) If migrations changed user_items / user_characters, confirm constraints match runtime usage."
} > "$OUT/SUMMARY.md"

echo "==> Report ready in: $OUT"

# NOTE: Cleanup worktrees manually when done:
#   git worktree remove "$TMP/good"; git worktree remove "$TMP/new"