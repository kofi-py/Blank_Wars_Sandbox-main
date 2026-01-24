# bcrypt Deployment Fix - Railway Alpine Linux Issue

**Date**: November 24, 2025
**Status**: FIX IDENTIFIED - NEEDS IMPLEMENTATION
**Severity**: CRITICAL - Backend deployment failing, server crashes on startup

---

## Problem Summary

The Railway backend deployment is failing with a bcrypt native module error:

```
Error: Cannot find module '/app/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node'
```

**Impact**:
- Backend server crashes immediately after migrations complete
- Healthcheck fails
- No service available to users

---

## Root Cause Analysis

### The Issue
The Dockerfile attempts to rebuild bcrypt for Alpine Linux at **LINE 23**, but this happens **BEFORE** the source code is copied (lines 26-27).

**Current Dockerfile order (BROKEN)**:
```dockerfile
# Line 20: Install dependencies
RUN pnpm install --frozen-lockfile

# Line 23: Try to rebuild bcrypt ❌ FAILS HERE
RUN pnpm --filter backend rebuild bcrypt

# Lines 26-27: Source code copied AFTER rebuild attempt
COPY backend ./backend
COPY shared/types ./shared/types
```

### Why This Fails
1. When `pnpm --filter backend rebuild bcrypt` runs on line 23, only `package.json` files exist in the workspace
2. The actual backend workspace directory structure doesn't exist yet (no source code)
3. pnpm can't locate the "backend" workspace and returns: `"No projects matched the filters in '/app'"`
4. The rebuild silently fails (no error thrown, just no output)
5. bcrypt's native binary is never compiled for Alpine Linux
6. Server crashes when trying to load the missing `bcrypt_lib.node` file

### Railway Logs Evidence
```
2025-11-24T14:44:09.165497403Z [inf]  No projects matched the filters in "/app"
2025-11-24T14:44:09.165520111Z [inf]  [ 9/16] RUN pnpm --filter backend rebuild bcrypt
```

Note: No output after the rebuild command = silent failure.

---

## The Fix

### Solution
Move the bcrypt rebuild to **AFTER** source code is copied AND we're in the backend workspace context.

### Specific Changes Needed

**REMOVE** these lines (22-23):
```dockerfile
# Rebuild bcrypt for Alpine Linux in backend workspace
RUN pnpm --filter backend rebuild bcrypt
```

**ADD** this line after line 42 (after `chmod +x ./migrations/run-migrations.sh`):
```dockerfile
# Rebuild bcrypt for Alpine Linux (must happen after source copy, in workspace context)
RUN pnpm rebuild bcrypt
```

### Complete Fixed Section
```dockerfile
# Build backend
WORKDIR /app/backend

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client bash

# Ensure migration script is executable
RUN chmod +x ./migrations/run-migrations.sh

# Rebuild bcrypt for Alpine Linux (must happen after source copy, in workspace context)
RUN pnpm rebuild bcrypt

# Accept DATABASE_URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Build
RUN pnpm build
```

---

## Why This Works

1. ✅ Source code is already copied (lines 26-27)
2. ✅ We're in `WORKDIR /app/backend` context (line 36)
3. ✅ pnpm can see the full workspace structure
4. ✅ Build tools are already installed (line 17: python3, make, g++)
5. ✅ Dependencies are already installed (line 20)
6. ✅ `pnpm rebuild bcrypt` runs in the correct workspace context
7. ✅ Native binary compiles for Alpine Linux architecture

---

## Technical Context

### Why bcrypt Needs Rebuilding
- **bcrypt** is a native Node.js module with C++ bindings
- It contains platform-specific compiled binaries (`.node` files)
- The binaries in `node_modules` are compiled for the platform where `pnpm install` ran
- Alpine Linux uses `musl libc` instead of `glibc`, requiring recompilation
- pnpm 10.x blocks automatic build scripts for security, requiring explicit `rebuild` command

### Monorepo Workspace Context
This is a **pnpm monorepo** with workspaces:
```yaml
packages:
  - 'shared/*'
  - 'frontend'
  - 'backend'
```

- bcrypt is a dependency in `backend/package.json` only
- The rebuild must happen in the backend workspace context
- Using `--filter backend` requires the full workspace structure to exist
- Being in `WORKDIR /app/backend` provides implicit workspace context

---

## Previous Fix Attempts

### Attempt 1 (commit edcd6c5e) - FAILED
**What was tried**: Added build tools and basic rebuild
```dockerfile
RUN apk add --no-cache python3 make g++
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild bcrypt  # ← Ran at root level, wrong workspace
```
**Why it failed**: Rebuild ran at root workspace where bcrypt isn't a dependency

### Attempt 2 (commit 24ff4864) - FAILED
**What was tried**: Used `--filter` flag to target backend
```dockerfile
RUN pnpm --filter backend rebuild bcrypt
```
**Why it failed**: Ran before source code copy - workspace didn't exist yet

---

## Deployment Architecture

### Platform
- **Host**: Railway (cloud deployment)
- **Base Image**: `node:20-alpine`
- **Package Manager**: pnpm (monorepo)
- **Database**: PostgreSQL (Railway managed)

### Build Process
1. Docker image built from `backend/Dockerfile`
2. Railway auto-deploys on git push to main
3. Migrations run automatically via `pnpm start` script
4. Server starts on port 4000
5. Healthcheck expects server response

### Current State
- ✅ Migrations: All 130 migrations complete successfully
- ❌ Server Start: Crashes with bcrypt module error
- ❌ Healthcheck: Fails (no server running)
- ❌ Deployment: Marked as failed

---

## Verification Steps

After implementing the fix and deploying:

1. **Check Railway Logs** for successful bcrypt rebuild:
   ```
   [inf] RUN pnpm rebuild bcrypt
   [inf] > bcrypt@5.1.1 install /app/backend/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt
   [inf] > node-gyp rebuild
   [inf] make: Entering directory '/app/backend/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/build'
   [inf] CXX(target) Release/obj.target/bcrypt_lib/src/blowfish.o
   [inf] CXX(target) Release/obj.target/bcrypt_lib/src/bcrypt.o
   [inf] CXX(target) Release/obj.target/bcrypt_lib/src/bcrypt_node.o
   [inf] SOLINK_MODULE(target) Release/obj.target/bcrypt_lib.node
   ```

2. **Check Server Startup** logs:
   ```
   Server started on port 4000
   Connected to PostgreSQL
   ```

3. **Verify Healthcheck** passes (Railway marks deployment as successful)

4. **Test Authentication Endpoint** (bcrypt is used for password hashing):
   ```bash
   curl https://[railway-domain]/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

---

## File References

### Key Files
- **Dockerfile**: `/backend/Dockerfile` (lines 22-23 need removal, add after line 42)
- **Backend Package**: `/backend/package.json` (confirms bcrypt@5.1.1 dependency)
- **Workspace Config**: `/pnpm-workspace.yaml` (defines monorepo structure)
- **Migrations Script**: `/backend/migrations/run-migrations.sh` (working correctly)

### Railway Deployment
- Project: Blank Wars Backend
- Auto-deploy: Enabled on main branch
- Last successful deployment: Before bcrypt changes
- Current status: Failing at server startup

---

## Additional Notes

### Why Not Just Use bcryptjs?
The project already has both `bcrypt` and `bcryptjs` as dependencies. While `bcryptjs` is pure JavaScript and doesn't require native compilation, switching would require:
- Code changes throughout the authentication system
- Migration of existing password hashes (bcrypt and bcryptjs use different formats)
- Risk of breaking existing user authentication

The proper fix is to correctly compile the native bcrypt module.

### Docker Layer Caching
The fix maintains efficient Docker layer caching:
- Layers before source copy remain cached (deps, build tools)
- Only layers from source copy onward rebuild on code changes
- bcrypt rebuild is infrequent (only on alpine/bcrypt version changes)

### Security Considerations
- pnpm 10.x intentionally blocks automatic build scripts
- Explicit `rebuild` commands are the recommended approach
- This is more secure than downgrading pnpm or disabling script checks

---

## Implementation Checklist

- [ ] Remove lines 22-23 from `/backend/Dockerfile`
- [ ] Add `RUN pnpm rebuild bcrypt` after line 42 (after chmod, before ARG DATABASE_URL)
- [ ] Commit changes with descriptive message
- [ ] Push to trigger Railway deployment
- [ ] Monitor Railway logs for successful bcrypt compilation
- [ ] Verify server starts successfully
- [ ] Verify healthcheck passes
- [ ] Test authentication endpoints
- [ ] Mark this issue as resolved

---

## Questions for Future Investigation

1. Why was this working before? (User mentioned "things were working before")
   - Possible: Previous pnpm version ran build scripts automatically
   - Possible: Alpine base image changed
   - Possible: bcrypt version updated

2. Should we add a test in CI to catch native module compilation issues?

3. Should we document the Alpine Linux native module rebuild pattern for future dependencies?

---

**Next Action**: Implement the Dockerfile changes described above and push to trigger Railway deployment.
