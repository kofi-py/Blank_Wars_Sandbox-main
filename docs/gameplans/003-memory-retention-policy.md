# Game Plan 003: Memory Retention Policy

**Created:** 2025-12-06
**Status:** Planning Complete - Ready for Implementation
**Priority:** Medium
**Depends On:** None (can run independently)

---

## Overview

Define and implement retention policies for the `character_memories` table to prevent unbounded growth while preserving important character moments.

### Current State
- `character_memories` table has built-in decay fields (`decay_rate`, `importance`, `recall_count`, `last_recalled`)
- **No active pruning logic exists** - these fields are tracked but never used
- Table will grow unbounded without intervention

### Goal
- Implement scheduled cleanup job
- Preserve high-importance memories indefinitely
- Prune low-importance, never-recalled memories
- Archive (don't delete) medium-importance old memories

---

## Table Schema Reference

```sql
-- Existing columns relevant to retention:
importance          INTEGER DEFAULT 5       -- 1-10 scale
recall_count        INTEGER DEFAULT 0       -- Times this memory was used in prompts
last_recalled       TIMESTAMP DEFAULT NOW() -- Last time memory appeared in prompt
decay_rate          NUMERIC DEFAULT 1.0     -- Multiplier for decay speed
created_at          TIMESTAMP NOT NULL
```

---

## Retention Rules

### Tier 1: Core Memories (NEVER DELETE)
```sql
-- Memories with importance >= 8 are core character moments
-- Examples: Major rebellions, relationship breakthroughs, first battle wins
WHERE importance >= 8
```
**Action:** Never delete. These define the character.

### Tier 2: Significant Memories (Archive after 1 year)
```sql
-- Importance 6-7, older than 1 year
WHERE importance BETWEEN 6 AND 7
AND created_at < NOW() - INTERVAL '1 year'
```
**Action:** Move to `character_memories_archive` table. Can be recalled for special deep-dive prompts but not included in regular prompts.

### Tier 3: Standard Memories (Delete if stale)
```sql
-- Importance 4-5, older than 90 days, not recalled in 60 days
WHERE importance BETWEEN 4 AND 5
AND created_at < NOW() - INTERVAL '90 days'
AND last_recalled < NOW() - INTERVAL '60 days'
```
**Action:** Delete. These are routine memories that weren't important enough to recall.

### Tier 4: Low-Importance Memories (Aggressive pruning)
```sql
-- Importance 1-3, older than 30 days, never recalled
WHERE importance <= 3
AND recall_count = 0
AND created_at < NOW() - INTERVAL '30 days'
```
**Action:** Delete. These were never important and never used.

---

## Memory Importance Guidelines

When creating memories, assign importance based on:

| Importance | Event Type | Examples |
|------------|------------|----------|
| 10 | Life-changing | Character death of close ally, marriage, major betrayal |
| 9 | Major milestone | First rebellion, 100th battle win, max bond level |
| 8 | Significant event | Friendly fire incident, judge ruling, promotion |
| 7 | Notable moment | Dramatic declaration, rivalry escalation |
| 6 | Meaningful interaction | Deep therapy session, confession |
| 5 | Standard event (default) | Regular battle turn, routine chat |
| 4 | Minor interaction | Casual lounge chat |
| 3 | Trivial | Background event, system notification |
| 2 | Ephemeral | Temporary status, fleeting thought |
| 1 | Debug/test | Should not exist in production |

---

## Archive Table

```sql
CREATE TABLE IF NOT EXISTS character_memories_archive (
  -- Same schema as character_memories
  id                    VARCHAR(255) PRIMARY KEY,
  character_id          VARCHAR(255) NOT NULL,
  event_id              VARCHAR(255),
  content               TEXT NOT NULL,
  emotion_type          VARCHAR(50),
  intensity             INTEGER DEFAULT 5,
  valence               INTEGER DEFAULT 5,
  importance            INTEGER DEFAULT 5,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
  last_recalled         TIMESTAMP WITH TIME ZONE,
  recall_count          INTEGER DEFAULT 0,
  associated_characters TEXT[] DEFAULT '{}',
  tags                  TEXT[] DEFAULT '{}',
  decay_rate            NUMERIC DEFAULT 1.0,
  chat_context          JSONB,
  cross_reference_data  JSONB,
  financial_metadata    JSONB,
  therapy_metadata      JSONB,
  confessional_metadata JSONB,

  -- Archive metadata
  archived_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archive_reason        TEXT  -- 'age', 'manual', 'bulk_cleanup'
);

CREATE INDEX idx_memories_archive_char_id ON character_memories_archive(character_id);
```

---

## Cleanup Job

### SQL Implementation

```sql
-- Run daily via cron or scheduled job

-- Step 1: Archive Tier 2 memories (significant but old)
INSERT INTO character_memories_archive
SELECT *, NOW() as archived_at, 'age' as archive_reason
FROM character_memories
WHERE importance BETWEEN 6 AND 7
AND created_at < NOW() - INTERVAL '1 year';

DELETE FROM character_memories
WHERE importance BETWEEN 6 AND 7
AND created_at < NOW() - INTERVAL '1 year';

-- Step 2: Delete Tier 3 memories (standard, stale)
DELETE FROM character_memories
WHERE importance BETWEEN 4 AND 5
AND created_at < NOW() - INTERVAL '90 days'
AND last_recalled < NOW() - INTERVAL '60 days';

-- Step 3: Delete Tier 4 memories (low-importance, never used)
DELETE FROM character_memories
WHERE importance <= 3
AND recall_count = 0
AND created_at < NOW() - INTERVAL '30 days';

-- Log cleanup stats
INSERT INTO cron_logs (job_name, run_at, stats)
VALUES ('memory_cleanup', NOW(), jsonb_build_object(
  'archived', (SELECT COUNT(*) FROM character_memories_archive WHERE archived_at > NOW() - INTERVAL '1 day'),
  'deleted_tier3', <count>,
  'deleted_tier4', <count>
));
```

### Node.js Implementation

```typescript
// backend/src/jobs/memoryCleanupJob.ts

import { query } from '../database/index';

export async function runMemoryCleanup(): Promise<CleanupStats> {
  const stats = {
    archived: 0,
    deleted_tier3: 0,
    deleted_tier4: 0,
  };

  // Step 1: Archive significant old memories
  const archiveResult = await query(`
    WITH archived AS (
      INSERT INTO character_memories_archive
      SELECT *, NOW() as archived_at, 'age' as archive_reason
      FROM character_memories
      WHERE importance BETWEEN 6 AND 7
      AND created_at < NOW() - INTERVAL '1 year'
      RETURNING id
    )
    DELETE FROM character_memories
    WHERE id IN (SELECT id FROM archived)
    RETURNING id
  `);
  stats.archived = archiveResult.rowCount;

  // Step 2: Delete stale standard memories
  const tier3Result = await query(`
    DELETE FROM character_memories
    WHERE importance BETWEEN 4 AND 5
    AND created_at < NOW() - INTERVAL '90 days'
    AND last_recalled < NOW() - INTERVAL '60 days'
    RETURNING id
  `);
  stats.deleted_tier3 = tier3Result.rowCount;

  // Step 3: Delete low-importance never-used memories
  const tier4Result = await query(`
    DELETE FROM character_memories
    WHERE importance <= 3
    AND recall_count = 0
    AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  `);
  stats.deleted_tier4 = tier4Result.rowCount;

  // Log to cron_logs
  await query(`
    INSERT INTO cron_logs (job_name, run_at, stats)
    VALUES ('memory_cleanup', NOW(), $1)
  `, [JSON.stringify(stats)]);

  return stats;
}
```

---

## Recall Count Tracking

When a memory is included in a prompt, increment its recall_count:

```typescript
// In universalTemplate.ts or memory fetching logic
async function getRecentMemories(character_id: string, limit: number): Promise<Memory[]> {
  const memories = await query(`
    SELECT * FROM character_memories
    WHERE character_id = $1
    ORDER BY importance DESC, created_at DESC
    LIMIT $2
  `, [character_id, limit]);

  // Update recall stats for fetched memories
  if (memories.rows.length > 0) {
    const ids = memories.rows.map(m => m.id);
    await query(`
      UPDATE character_memories
      SET recall_count = recall_count + 1,
          last_recalled = NOW()
      WHERE id = ANY($1)
    `, [ids]);
  }

  return memories.rows;
}
```

---

## Implementation Tasks

### Task 1: Create archive table
- [ ] Create `character_memories_archive` table with migration
- [ ] Add indexes

### Task 2: Implement cleanup job
- [ ] Create `backend/src/jobs/memoryCleanupJob.ts`
- [ ] Add to scheduled jobs (cron or node-cron)

### Task 3: Add recall tracking
- [ ] Update memory fetching logic to increment recall_count
- [ ] Update last_recalled timestamp

### Task 4: Backfill importance
- [ ] Review existing memories and assign appropriate importance
- [ ] Update memory creation logic to set importance based on event type

---

## Monitoring

Track cleanup effectiveness:

```sql
-- Memory growth over time
SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as memories_created
FROM character_memories
GROUP BY day
ORDER BY day DESC
LIMIT 30;

-- Cleanup effectiveness
SELECT * FROM cron_logs
WHERE job_name = 'memory_cleanup'
ORDER BY run_at DESC
LIMIT 10;

-- Memory distribution by importance
SELECT importance, COUNT(*) as count
FROM character_memories
GROUP BY importance
ORDER BY importance;
```

---

## Notes

- Never delete importance >= 8 memories
- Archive before delete for significant memories (6-7)
- Aggressive pruning for low-importance never-recalled memories
- Track recall to identify which memories are actually useful
- Run cleanup job daily during low-traffic hours
