# Changelog: Week of September 27 - October 4, 2025

## 📊 Database & Schema (October 3-4, 2025)

### ERD Documentation & Diagrams
- **DOCS: Add comprehensive ERD documentation and verified schema diagrams**
  - Generated professional Entity-Relationship Diagrams with correct architectural hierarchy
  - Created radial layout showing users and user_characters as central hubs
  - Added 5 coach-perspective ERDs (Roster, Competition, Team Management, AI Autonomy, Economy)
  - ERD_VERIFICATION_REPORT.md: Complete documentation of all 47 tables and 47 FK relationships
  - ERD_COMPARISON_REPORT.md: Analysis of SchemaSpy layout issues vs correct architecture
  - Reusable Python scripts: generate_erd.py, generate_coach_erds.py

- **DOCS: Add schema documentation and additional ERD formats**
  - Backend DB schema documentation (PostgreSQL)
  - Frontend data structures (TypeScript interfaces)
  - Agent development team quickstart guide
  - DBML schema export for dbdiagram.io compatibility
  - Hierarchical ERD layout (alternative view)

### Reality Show Challenge System (October 3, 2025)
- **DATA: Add reality show challenge template seeds**
  - Seeded 12 challenge templates (Survivor, Top Chef, Amazing Race, Big Brother, The Challenge parodies)
  - Templates include physical, mental, social, endurance, strategy, and skill-based challenges
  - Full reward configurations with currency, equipment, and battle boosts

- **FEAT: Add reality show challenge frontend components**
  - Complete UI for challenge registration and management
  - Challenge detail views with participant lists
  - Leaderboard and alliance visualizations

- **FEAT: Add challenge API routes**
  - REST endpoints for challenge CRUD operations
  - Participant registration and management
  - Results recording and reward distribution
  - Alliance formation and tracking

### Master Bedroom Conflict System (October 2, 2025)
- **FEAT: Add master bedroom conflict system**
  - Added master_bed_character_id to team_context table
  - Scene triggers for bedroom assignment drama
  - Integration with character conflict mechanics

### Database Fixes
- **FIX: Add /ai/ to CSRF skip list** - Resolved all chat 403 errors
- **FIX: Replace all pool references with db in new services**
- **FIX: Standardize all HQ sleeping arrangement image filenames**

## 🤖 LocalAI Infrastructure (September 27 - October 4, 2025)

### LocalAI Configuration Overhaul (October 3-4, 2025)
- **FIX: Correct LocalAI model YAML configuration for v3.0.0**
  - Updated to use correct v3 YAML schema
  - Fixed model parameter mappings
  - Proper backend configuration

- **FIX: Use LOCALAI_URL environment variable** - Removed hardcoded localhost:11435
- **FIX: LocalAI config - use 'stop' instead of 'stopwords'** - Correct parameter names for v3.0.0

### LocalAGI Integration (September 29 - October 1, 2025)
- **UPGRADE: Replace LocalAGI with complete v2.4.0 source code**
  - Full source integration instead of npm package
  - Better control over configuration and dependencies

- **FIX: Update LocalAGI interfaces to match upstream version**
- **FIX: Add missing types.PromptResult and correct LocalAI backend**
- **Deploy LocalAGI + LocalAI as separate services** - Two-service architecture with large file handling

### LocalAI Docker & Deployment (September 27-30, 2025)
- **FIX: Complete LocalAI configuration overhaul** - All deployment issues resolved
- **FIX: Use current LocalAI image** - Replaced deprecated quay.io image
- **FIX: Switch to latest-cpu with diagnostic entrypoint**
- **FIX: Use AIO image with preload disabled**
- **FIX: Use actual backend name cpu-llama-cpp instead of alias**
- **FIX: Use LOCALAI_EXTERNAL_BACKENDS** - Trigger backend download from gallery
- **FIX: Multi-stage build to extract backends from AIO image**
- **FIX: Pre-install llama backend at build time**
- **FIX: Switch to non-AIO image to avoid preload failures**
- **FIX: Use absolute path for model file in YAML config**

### LocalAI Health & Monitoring (September 27-28, 2025)
- **FIX: Use correct LocalAI healthcheck endpoint /readyz** (not /health)
- **Add LocalAI health endpoint** - HTTP-based health checks
- **Add detailed LocalAI connectivity diagnostics**
- **Test LocalAI health check with /v1/models endpoint**

### LocalAI Cache & Build Issues (September 29, 2025)
- **FIX: Use ARG for cache busting** - Instead of RUN command
- **Update cache buster for clean build**
- **CRITICAL FIX: Clean up localai-backend directory structure**
- **FIX: Add REAL Docker cache buster** - ENV variable, not comment
- **FIX: Bust Docker cache for LocalAI YAML config**
- **FIX: NUCLEAR cache buster** - RUN command with timestamp

### LocalAI Backend Configuration (September 28-29, 2025)
- **FIX: Use correct backend name 'llama' for gguf models**
- **FIX: Use correct LocalAI backend name llama-cpp-grpc**
- **Add custom llama-3.2-3b-instruct.yaml config**

### LocalAI Networking (September 27, 2025)
- **FIX: LocalAI IPv6 binding for Railway private networking**
- **FIX: LocalAI IPv6 binding with correct environment variable**
- **Configure LocalAI to match LocalAGI setup**

### Git LFS & Model Files (September 27, 2025)
- **Track model files with Git LFS**
- **Add LocalAI model and config with Git LFS**
- **Fix Dockerfile to use correct model paths from repo root**

## 🛠️ Railway Deployment Fixes (September 28-29, 2025)

### Multi-Service Architecture
- **Update Railway config for LocalAGI + LocalAI-backend two-service architecture**
- **Completely disable Node.js detection for LocalAGI** - Force Docker builds
- **Add .railwayignore to force Docker detection**

### Migration & Build Fixes
- **FIX: Add pg-client to backend** - Resolve build dependencies
- **FIX: Correct migration script syntax** - Shell script compatibility
- **Fix Go build error by adding go mod tidy**
- **Fix both LocalAGI and LocalAI deployment issues**
- **Fix LocalAGI and LocalAI deployment issues** (multiple iterations)

### YAML & Config Paths
- **Fix YAML file path in localai-backend Dockerfile** (multiple fixes)
- **Fix YAML 404 errors in Dockerfiles**
- **Force add YAML config file to localai-backend**

### Critical Deployment Fixes
- **FIX: Resolve all Railway deployment failures with root cause fixes**
- **FIX: Resolve all three Railway deployment failures**
- **FIX: Final resolution for all service startup and build errors**
- **Apply precise fixes from Gemini/GPT analysis**
- **Apply precise fixes for LocalAI and backend issues**

## 🐛 Production Bug Fixes (September 27, 2025)

### Database & Environment
- **Fix production issues: create cron_logs table and ADDRESS env var**
- **Fix cron job logging to use proper cron_logs table**

### Authentication & CORS
- **Fix CSRF token error on login/register** (by Green003-CPAOS)
- **FIX: Allow Vercel preview deployments in CORS**

### Build System
- **FIX: Use bash instead of sh for migration script** - Shell compatibility
- **Revert webui and package.json names back to original** - Maintain naming conventions

## 📈 Summary Statistics

- **Total Commits:** 156 commits
- **Contributors:** Claude AI Assistant, CPAIOS, Green003-CPAOS
- **Major Features Added:**
  - Reality Show Challenge System (7 tables, full frontend/backend)
  - Master Bedroom Conflict System
  - Comprehensive ERD Documentation
- **Infrastructure Overhauls:**
  - LocalAI v3.0.0 migration (complete rewrite)
  - LocalAGI integration (v2.4.0 source)
  - Two-service Railway architecture
- **Critical Fixes:** 50+ deployment, configuration, and bug fixes

## 🔄 Auto-Deploy Commits

Note: 78 "Auto-deploy from main branch" commits by CPAIOS represent automatic Railway deployments triggered by main branch changes.

---

Generated: October 4, 2025
Repository: blank-wars-clean
Time Period: September 27, 2025 16:00 EST - October 4, 2025 16:00 EST
