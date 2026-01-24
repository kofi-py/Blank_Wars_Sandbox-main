# BlankWars Memory System Troubleshooting

This document provides quick diagnostic steps for common KV+Digest system issues.

## Quick Diagnostic Commands

### Check System Status
```bash
# Environment
env | grep -E "KV_|N_CTX|REPLY_|DIGEST_"

# Database connectivity
psql postgres://localhost/blankwars -c "SELECT COUNT(*) FROM facts;"

# kvserver status  
curl http://localhost:8080/v1/info
```

### Check Session State
```bash
# Recent KV activity
tail -f server.log | grep "kv_only"

# Digest versions
psql postgres://localhost/blankwars -c "SELECT session_id, digest_version, updated_at FROM state_digest ORDER BY updated_at DESC LIMIT 5;"

# Active facts count
psql postgres://localhost/blankwars -c "SELECT type, COUNT(*) FROM facts WHERE status = 'active' GROUP BY type;"
```

## Common Issues & Quick Fixes

### Issue: Digest Injected Every Turn
**Symptom**: `digest_injected=true` on every turn, even without state changes

**Diagnosis**:
```bash
# Check if digest content is deterministic
psql postgres://localhost/blankwars -c "SELECT session_id, digest_content FROM state_digest WHERE session_id = 'your_session_id';"
```

**Fix**: Ensure digest builder uses deterministic sorting and no timestamps
```go
// Should sort facts and canonicalize text
sort.Strings(digestLines)
canonical := strings.TrimSpace(strings.Join(digestLines, " "))
```

### Issue: KV Size Growing Unbounded  
**Symptom**: `tokens_in_kv` keeps growing past 2000, `kv_bytes` never plateaus

**Diagnosis**:
```bash
# Check tail pruning
grep "tokens_in_kv" server.log | tail -10
```

**Fix**: Ensure KV pruning happens before save
```go
// Must call before saving KV
PruneKVTo(KV_TAIL_TOKENS)
```

### Issue: Header Mismatch Errors
**Symptom**: "INCOMPATIBLE: model SHA mismatch" errors, constant cold starts

**Fix**: Update MODEL_SHA environment variable to match current model
```bash
export MODEL_SHA=$(sha256sum /path/to/model.gguf | cut -d' ' -f1 | head -c16)
```

### Issue: CRC Failures
**Symptom**: KV loading fails with CRC32C validation errors

**Fix**: Ensure atomic writes in kvserver
```python
# Must use atomic tmp->rename pattern
with open(f"{session_path}.tmp", "wb") as f:
    f.write(kv_data)
    f.fsync()
os.rename(f"{session_path}.tmp", session_path)
```

### Issue: Missing HUD
**Symptom**: HUD not appearing in system prompt

**Diagnosis**:
```sql
-- Check character exists
SELECT id, current_health, wallet FROM user_characters WHERE id = ? AND user_id = ?;
```

**Fix**: Ensure character record exists and HUD query succeeds

### Issue: Digest Too Large
**Symptom**: Digest exceeds 180 token limit

**Fix**: Tighten relevance filtering
```go
// Limit facts by priority
if len(digestLines) > MAX_DIGEST_FACTS {
    digestLines = digestLines[:MAX_DIGEST_FACTS]
}
```

### Issue: Parallel Write Race
**Symptom**: Multiple processes writing to same session simultaneously

**Fix**: Enforce session-level locking
```go
// Acquire exclusive lock before processing
lock, err := lockManager.AcquireLock(ctx, sessionID, holderID)
defer lockManager.ReleaseLock(lock)
```

### Issue: Context Overflow
**Symptom**: Total tokens (HUD + Digest + KV + Reply) exceed N_CTX

**Diagnosis**:
```bash
# Check token breakdown
grep "n_ctx=4096" server.log | grep -E "S=[0-9]+.*U=[0-9]+.*R=[0-9]+"
```

**Fix**: Ensure token caps are enforced
- HUD ≤ 40
- Digest ≤ 180  
- Reply ≤ 800
- KV ≤ 2000

## Emergency Procedures

### Reset Session State
```bash
# Clear KV and digest for problematic session
psql postgres://localhost/blankwars -c "DELETE FROM state_digest WHERE session_id = 'problem_session';"
rm -f /sessions/problem_session.session*
```

### Disable KV System
```bash
# Fall back to traditional memory
export KV_ONLY_ENABLED=false
# Restart services
```

### Quarantine Corrupted KV
```bash
# Move bad KV files
mv /sessions/bad_session.session /sessions/quarantine/
mv /sessions/bad_session.session.json /sessions/quarantine/
```

## Performance Monitoring

### Key Metrics to Watch
```bash
# KV plateau achievement
grep "tokens_in_kv" server.log | awk '{print $NF}' | tail -20

# Digest injection rate (should be low)
grep "digest_injected=true" server.log | wc -l

# Average turn latency
grep "latency_ms" server.log | awk -F'latency_ms=' '{sum+=$2; count++} END {print sum/count}'
```

### Health Check Script
```bash
#!/bin/bash
# Quick health check
echo "KV System Health Check"
echo "====================="

# Check key services
systemctl is-active postgresql && echo "✅ Database: OK" || echo "❌ Database: DOWN"
curl -s http://localhost:8080/v1/info > /dev/null && echo "✅ kvserver: OK" || echo "❌ kvserver: DOWN"

# Check recent activity
RECENT=$(grep "kv_only.*status=OK" server.log | tail -1)
if [[ -n "$RECENT" ]]; then
    echo "✅ Recent KV activity: OK"
    echo "   $RECENT"
else
    echo "❌ No recent KV activity"
fi

# Check digest injection rate
TOTAL_TURNS=$(grep "kv_only" server.log | wc -l)
DIGEST_INJECTS=$(grep "digest_injected=true" server.log | wc -l)
INJECT_RATE=$(echo "scale=2; $DIGEST_INJECTS / $TOTAL_TURNS * 100" | bc)
echo "📊 Digest injection rate: ${INJECT_RATE}% (should be <30%)"
```

## Contact & Escalation

For issues not covered in this guide:

1. **Check server logs** for detailed error messages
2. **Verify environment variables** match expected configuration  
3. **Test with simple session** to isolate the problem
4. **Collect relevant logs** and system state before escalating

See [memory-system.md](memory-system.md) for complete system documentation.