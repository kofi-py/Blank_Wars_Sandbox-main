#!/usr/bin/env bash
set -euo pipefail

# --- config ---
PROD_DSN='postgresql://postgres:GhHFpHejdRUKEfKabfDcvuDgUtlmYwOu@gondola.proxy.rlwy.net:52976/railway'
# Local must already be set; if not, set it explicitly:
: "${DATABASE_URL:=postgresql://localhost:5432/blankwars}"
LOCAL_DSN="$DATABASE_URL"
SCHEMA_DUMP='/tmp/equipment_schema.sql'

echo "✅ Using PROD:  $PROD_DSN"
echo "✅ Using LOCAL: $LOCAL_DSN"

# 1) Verify prod table exists
if ! psql "$PROD_DSN" -tAc "SELECT to_regclass('public.equipment')" | grep -q equipment; then
  echo "❌ Prod does not have public.equipment — aborting"; exit 1
fi

# 2) Dump exact CREATE TABLE from prod (schema only)
pg_dump --no-owner --no-privileges -s -t public.equipment "$PROD_DSN" > "$SCHEMA_DUMP"
echo "📄 Wrote schema to $SCHEMA_DUMP"
echo "-----8<----- equipment schema (prod) -----"
sed -n '1,120p' "$SCHEMA_DUMP"
echo "-----8<-----------------------------------"

# 3) Create table locally IFF missing (no destructive drops)
if ! psql "$LOCAL_DSN" -tAc "SELECT to_regclass('public.equipment')" | grep -q equipment; then
  echo "🛠  Creating equipment locally to match prod…"
  psql "$LOCAL_DSN" -f "$SCHEMA_DUMP"
else
  echo "ℹ️  Local equipment already exists; skipping CREATE."
fi

# 4) Copy 3 sample rows from prod → local (schema must match)
#    NOTE: If PK/unique constraints exist, rows may already be present; that's OK.
echo "📥 Copying 3 sample rows from prod to local via COPY…"
psql "$PROD_DSN"  -c "COPY (SELECT * FROM public.equipment LIMIT 3) TO STDOUT WITH CSV" \
| psql "$LOCAL_DSN" -c "COPY public.equipment FROM STDIN WITH CSV"

# 5) Verify local rowcount and hit the API
psql "$LOCAL_DSN" -c "SELECT COUNT(*) AS equipment_rows FROM public.equipment;"
curl -i http://localhost:4000/api/equipment/generic | sed -n '1,80p'

echo "🎉 Equipment table mirrored locally and endpoint responding."