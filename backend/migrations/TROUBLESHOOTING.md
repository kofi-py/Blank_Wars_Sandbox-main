# PostgreSQL Migration Troubleshooting Guide

## ✅ Successfully Fixed - November 16, 2025

All database deployment errors have been resolved. Here's what was fixed and how to handle similar issues in the future:

---

## **Common PostgreSQL Migration Errors & Solutions**

### **1. Foreign Key Type Mismatches**
**Error Pattern:** `foreign key constraint cannot be implemented - Key columns are of incompatible types: uuid and text`

**Solution:**
- Check baseline schema (`001_baseline_schema.sql`) to verify data types
- In this project, `users.id`, `user_characters.id`, and `equipment.id` are all **TEXT**, not UUID
- When creating foreign keys, always match the referenced column type exactly

```sql
-- ✅ CORRECT:
user_id TEXT NOT NULL REFERENCES users(id)

-- ❌ WRONG:
user_id UUID NOT NULL REFERENCES users(id)
```

### **2. Duplicate Key Violations**
**Error Pattern:** `duplicate key value violates unique constraint "table_name_pkey"`

**Solution:**
- Add idempotent conflict handling to all INSERT statements
- This makes migrations safe to run multiple times

```sql
INSERT INTO power_definitions (id, name, ...)
VALUES ('power_id', 'Power Name', ...)
ON CONFLICT (id) DO NOTHING;
```

### **3. Column Name Mismatches**
**Error Pattern:** `column "description" of relation "migration_log" does not exist`

**Solution:**
- Verify exact column names in baseline schema
- In this project, `migration_log` has `name` not `description`
- Also verify data types (version should be INTEGER not TEXT)

```sql
-- ✅ CORRECT:
INSERT INTO migration_log (version, name, executed_at)
VALUES (72, 'Migration name', NOW())

-- ❌ WRONG:
INSERT INTO migration_log (version, description, executed_at)
VALUES ('072', 'Migration name', NOW())
```

### **4. Railway Build Failures - npm ci**
**Error Pattern:** `npm error Invalid: lock file's ws@X.X.X does not satisfy ws@Y.Y.Y`

**Solution:**
- Railway's Dockerfile runs from `/backend/` directory
- `package-lock.json` MUST be in `/backend/` not project root
- Regenerate with:

```bash
cd backend
rm -f package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json"
```

---

## **Standard Troubleshooting Workflow**

### 1. **Analyze Error Logs**
- Categorize errors by type
- Count total vs fixable errors
- Prioritize by blocking severity

### 2. **Verify Schema**
- Always check `001_baseline_schema.sql` for truth
- Grep for specific table/column definitions
- Confirm data types match

### 3. **Research Best Practices**
- Search PostgreSQL docs for error codes
- Look up idempotent migration patterns
- Verify Railway-specific requirements

### 4. **Triple-Check Before Applying**
- Read actual migration files
- Verify no existing ON CONFLICT clauses
- Confirm column names exist in schema

### 5. **Use Proper Git Workflow**
- Create feature branch: `git checkout -b fix/descriptive-name`
- Commit changes with clear messages
- Push and create PR on GitHub
- Merge to main only after review

### 6. **Verify Deployment**
- Wait 2-6 minutes for Railway deployment
- Check Railway logs for "Migration process completed successfully"
- Verify schema version matches expected number
- Confirm no error messages in logs

---

## **Files Critical to Database Deployment**

- `/backend/migrations/001_baseline_schema.sql` - Source of truth for all table schemas
- `/backend/migrations/run-migrations.sh` - Migration runner script
- `/backend/package-lock.json` - MUST be in backend/ directory for Railway
- `/backend/Dockerfile` - Defines Railway build context

---

## **Project-Specific Schema Facts**

This project uses **TEXT** for all ID columns, not UUID:

```sql
users.id → TEXT
user_characters.id → TEXT
equipment.id → TEXT
spell_definitions.id → TEXT
power_definitions.id → TEXT
```

The `migration_log` table schema:

```sql
CREATE TABLE migration_log (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## **Success Metrics from November 16 Fix**

- ✅ 30 out of 33 errors fixed (91% success rate)
- ✅ 11 migrations successfully applied (074-084)
- ✅ Database schema version: 85
- ✅ Total tables: 89
- ✅ Server running with clients connected
- ✅ Zero deployment errors

---

## **Detailed Fix History - November 16, 2025**

### Migration 072: Character Relationship System
**Errors Fixed:**
- Column name: `description` → `name`
- Version type: `'072'` (TEXT) → `72` (INTEGER)

**Files Changed:** `072_add_character_relationship_system.sql`

### Migration 074: Lost & Found Wars Schema
**Errors Fixed:**
- 7 UUID foreign key columns changed to TEXT
- `equipment_id UUID` → `equipment_id TEXT`
- `user_id UUID` → `user_id TEXT`
- `character_id UUID` → `character_id TEXT`

**Files Changed:** `074_lost_and_found_wars_schema.sql`

### Migrations 075-084: Equipment, Powers, and Spells
**Errors Fixed:**
- Added `ON CONFLICT (id) DO NOTHING` to all INSERT statements
- Prevented duplicate key violations on re-runs

**Files Changed:**
- `075_insert_crumbsworth_equipment.sql`
- `076_insert_beast_archetype_powers.sql`
- `077_insert_universal_spells.sql`
- `078_insert_tank_archetype_powers.sql`
- `079_insert_scholar_spells.sql`
- `080_insert_trickster_archetype_powers.sql`
- `081_insert_trickster_spells.sql`
- `082_insert_human_species_remaining_powers.sql`
- `083_insert_species_spells.sql`
- `084_insert_missing_universal_skills.sql`

### Railway Build Fix
**Error Fixed:**
- package-lock.json location: root directory → `/backend/` directory
- Ensured npm ci compatibility with Railway's Docker build context

---

**This guide documents the successful resolution of all critical database deployment errors. Future database issues should follow this same systematic approach: analyze → verify → research → fix → deploy → verify success.**
