# BlankWars Memory System

## Table of Contents
- [Overview](#overview)
- [Data Flow Per Turn](#data-flow-per-turn)
- [Configurations](#configurations)
- [Interfaces](#interfaces)
- [HUD Spec](#hud-spec)
- [Digest Spec](#digest-spec)
- [Invariants](#invariants)
- [Runbook](#runbook)
- [Troubleshooting Matrix](#troubleshooting-matrix)
- [Upgrade & Rollback](#upgrade--rollback)
- [Appendix](#appendix)

## Overview

**What memory is and isn't:**
- **KV = in-session only**: Fast resume of recent dialogue; size ≈ tokens_in_kv × ~115 KB
- **DB = long-term**: Persistent facts, character state, relationships, equipment
- **Digest = compact world state facts** (≤180 tokens), injected only on change or cold start
- **HUD = always present** (≤40 tokens), immediate self-state; does not accumulate in KV

## Data Flow Per Turn

```
Load KV (if header OK) → Prune to KV_TAIL_TOKENS → 
Build system prompt: base + HUD (+ digest only if version changed or cold) →
Generate (≤ REPLY_MAX_TOKENS) →
Prune → Save KV (with header + CRC) →
Rebuild digest from DB → SHA-256 → store version for next turn
```

### Numbered Steps:
1. **Load KV**: Check session snapshot exists and header matches (FORMAT_MAGIC, MODEL_SHA)
2. **Prune**: Truncate KV cache to KV_TAIL_TOKENS (2000) to prevent unbounded growth
3. **Build Context**: Always include HUD; include digest only if version changed or cold start
4. **Generate**: Process user input with ≤ REPLY_MAX_TOKENS constraint
5. **Save**: Prune response and save KV with LLKV1 header + CRC32C
6. **Post-process**: Rebuild digest from current DB state, compare SHA-256 hash, store if changed

## Configurations

### Environment Variables (exact names/values)

| Variable | Default | Description |
|----------|---------|-------------|
| `KV_ONLY_ENABLED` | `true` | Enable/disable KV system |
| `KV_TAIL_TOKENS` | `2000` | Maximum tokens in KV cache |
| `N_CTX` | `4096` | Model context window |
| `REPLY_MAX_TOKENS` | `800` | Maximum reply tokens |
| `DIGEST_MAX_TOKENS` | `180` | Maximum digest tokens |
| `HUD_MAX_TOKENS` | `40` | Maximum HUD tokens |
| `MODEL_SHA` | *pinned* | Model file SHA-256 hash |
| `KV_COMPRESS` | `1` | Enable zstd compression |

## Interfaces

### kvserver Endpoints
- `POST /v1/chat/completions` - Main chat endpoint with KV
- `GET /v1/rotate-hint?sid=<session_id>` - Check rotation status
- `GET /v1/info` - System fingerprint info

### KV Header (LLKV1)
```
magic="LLKV1"
model_sha=<hex>
digest_version=<sha256 hex>
crc32c=<uint32>
tokens=<uint32>
bytes=<uint64>
timestamp=<uint64>
```

### Database Tables Used
- `user_characters` - Character stats (health, wallet, stress_level, team_trust, etc.)
- `equipment` - Equipment data (equipment_name, primary_equipment_id)
- `facts` - World state facts (session_id, type, key, value, status, expires_at)
- `state_digest` - Digest versions (session_id, digest_version, digest_content)
- `events` - LocalAGI event stream
- `session_locks` - Concurrency control

## HUD Spec

### Fields (from user_characters + equipment tables)
```sql
SELECT 
    uc.current_health,
    uc.max_health,
    uc.wallet,
    uc.stress_level,
    uc.team_trust,
    GREATEST(0, LEAST(100, 
        (100 - uc.stress_level * 0.3)
        + (uc.team_trust - 50) * 0.1
        + (uc.mental_health - 50) * 0.2
        + (uc.battle_focus - 50) * 0.15
    )) as adherence,
    COALESCE(e.equipment_name, 'Unarmed') as equipment
FROM user_characters uc
LEFT JOIN equipment e ON uc.primary_equipment_id = e.id
WHERE uc.id = ? AND uc.user_id = ?
```

### Rendering Format
```
HUD: HP {current_health}/{max_health} • Credits: {wallet} • Stress: {stress_level} • Trust: {team_trust} • Adherence: {adherence}% • Equip: {equipment}
```

### Budget
- **≤40 tokens**
- Sourced from `user_characters` + `equipment` tables
- Always present every turn

## Digest Spec

### Deterministic Builder Rules
1. **Query active facts**: `SELECT type, key, value FROM facts WHERE session_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`
2. **Format bullets**: `{Type}: {value}` (e.g., "Conflict: War with Merchant Guild")
3. **Sort lines**: Alphabetical order for deterministic output
4. **Canonicalize**: Trim whitespace, collapse multiple spaces to single
5. **SHA-256**: Hash canonical text = digest_version

### Relevance Gate
- **Include durable facts**: conflicts, relationships, debts, quests, reputation, alliances, win/loss records
- **Include ephemeral facts** only while active (TTL not expired): buffs, debuffs, alerts, rumors, timers
- **Exclude**: Expired facts, low-priority metadata

### Example Digest
```
Alliance: Tech Syndicate partnership
Conflict: War with Merchant Guild over trade routes  
Debt: Owes 500 credits to First Bank
```

### SHA-256 Over Canonical Text
```go
func calculateDigestHash(digest string) string {
    canonical := canonicalize(digest) // Sort + normalize whitespace
    sum := sha256.Sum256([]byte(canonical))
    return hex.EncodeToString(sum[:])
}
```

## Invariants

### Things that must always hold:
- `tokens_in_kv ≤ KV_TAIL_TOKENS` after save
- Plateau around ~230 MB at T=2000 (3B model)
- `digest_injected=true` only on cold or version change
- Single writer per session_id (enforced by locking)
- HUD ≤ 40 tokens, Digest ≤ 180 tokens, Reply ≤ 800 tokens
- Deterministic digest: same DB state → same digest_version

## Runbook

### Local Quick Test
```bash
# Set environment
export KV_ONLY_ENABLED=true
export KV_TAIL_TOKENS=2000
export N_CTX=4096

# Run 10-turn scene
./backend/src/kv-system/local_test_runner.sh

# Confirm pattern and plateau:
# - T1: digest_injected=true (cold)
# - T2-T3: digest_injected=false (no changes)  
# - T4: digest_injected=true (state change)
# - tokens_in_kv approaches 2000, kv_bytes ~230MB
```

### Restart Mid-Scene (Warm Resume)
```bash
# Kill app during scene
pkill -f "node.*server"

# Restart - should resume from KV
npm run dev

# Next turn should be warm: loaded=true, cold=false
```

### Bump MODEL_SHA (Cold Start Once)
```bash
export MODEL_SHA="new_model_sha_here"
# Next turn triggers: header mismatch → cold start + digest injection once
```

### If Any Fail
See [troubleshooting matrix](#troubleshooting-matrix)

## Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `digest_injected=true` every turn | Time-based/unstable digest; nondeterministic order | Canonicalize + SHA-256; remove timestamps/IDs; sort bullets |
| KV grows past plateau | Tail prune not called pre-save | Call `PruneKVTo(T)` before save; verify `tokens_in_kv` |
| Header mismatch errors | Model SHA changed | Cold start + inject digest once; update `MODEL_SHA` |
| CRC failures | Non-atomic write | tmp→fsync→rename; quarantine .bad; retry |
| HUD missing | Query error/cache miss | Log HUD build error; fallback to minimal HUD |
| Digest > 180 tokens | Relevance gate off | Trim low-priority facts; tighten rules |
| Parallel write race | Missing lock | Enforce single writer per session_id |
| KV size units wrong | MB vs KB confusion | Verify ~230 MB (not KB) at 2000 tokens |
| Context overflow | Token sum > N_CTX | Check HUD + Digest + KV + Reply ≤ 4096 |
| Stale digest version | Hash not updating | Rebuild digest after DB changes |

## Upgrade & Rollback

### Upgrade Path
1. **Model Change**: Update `MODEL_SHA` environment variable
2. **Expected**: Header mismatch on next turn → cold start + digest injection once
3. **Steady State**: Normal operation resumes with new model

### Rollback Path
1. **Disable KV**: Set `KV_ONLY_ENABLED=false`
2. **Fallback**: System continues via cold start + digest every turn
3. **No Errors**: Sessions continue with traditional memory management

## Appendix

### Sample One-Line Logs
```
# Field meanings: S=digest_tokens, U=user_tokens, R=reply_tokens, bpt=bytes_per_token
kv_only path=kv_only sid=session_123 loaded=true cold=false tokens_in_kv=1440 kv_bytes=165600000 n_ctx=4096 digest_injected=false digest_version=2c7f8a5b9d1e S=0 U=18 R=40 bpt=115 status=OK latency_ms=71

# Cold start
kv_only path=kv_only sid=session_456 loaded=false cold=true tokens_in_kv=0 kv_bytes=0 n_ctx=4096 digest_injected=true digest_version=a1b2c3d4e5f6 S=8 U=15 R=45 bpt=0 status=OK latency_ms=120

# State change
kv_only path=kv_only sid=session_789 loaded=true cold=false tokens_in_kv=480 kv_bytes=55200000 n_ctx=4096 digest_injected=true digest_version=f9e8d7c6b5a4 S=12 U=16 R=48 bpt=115 status=OK latency_ms=95
```

### SQL Snippets

#### Start Conflict
```sql
INSERT INTO facts (session_id, type, key, value, status, started_at, updated_at)
VALUES ('session_123', 'conflict', 'merchant_war', 'War with Merchant Guild over trade routes', 'active', NOW(), NOW());
```

#### End Conflict  
```sql
UPDATE facts 
SET status = 'resolved', resolved_at = NOW()
WHERE session_id = 'session_123' AND type = 'conflict' AND key = 'merchant_war';
```

#### Update Relationship
```sql
INSERT INTO facts (session_id, type, key, value, status, started_at, updated_at)
VALUES ('session_123', 'relationship', 'tech_syndicate', 'Allied with Tech Syndicate (+15 standing)', 'active', NOW(), NOW())
ON CONFLICT (session_id, type, key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

### Sample state_digest Row
```sql
session_id: 'session_123'
digest_version: '2c7f8a5b9d1e...' 
digest_content: 'Alliance: Tech Syndicate partnership Conflict: War with Merchant Guild Debt: Owes 500 credits'
updated_at: '2025-01-15 14:30:22'
```

### Metrics Glossary
- **tokens_in_kv**: Current KV cache size in tokens
- **kv_bytes**: KV cache size in bytes  
- **bpt**: Bytes per token ratio (~115 for 3B model)
- **digest_injected**: Whether digest was included this turn
- **digest_version**: SHA-256 hash of current digest content
- **S/U/R**: System/User/Reply token counts
- **cold**: Whether this was a cold start (no KV loaded)
- **loaded**: Whether KV was successfully restored