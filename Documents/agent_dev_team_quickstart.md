Hi team,

  We've just added specialized Claude Code agents to the repository to
  improve development consistency and catch common issues early.

  What's New:
  - 8 specialized agents now available in .claude/agents/
  - Each agent has specific responsibilities and tool restrictions
  - Designed to prevent recurring issues (unauthorized decisions, silent
  failures, context contamination)

  Available Agents:
  1. Prompt Architect - Audits prompt integrity and contamination across all
   15+ chat domains
  2. Systems Engineer - Implements deterministic battle/psychology logic
  (proposal mode)
  3. Frontend/Visual Specialist - Handles 3D theater, word bubbles, and
  battle assets
  4. Database Auditor - Reviews schema integrity and data consistency
  (read-only)
  5. Quality Enforcer - Audits code for placeholders, fake solutions, and
  incomplete work
  6. API/Integration Engineer - Tests all 16+ endpoints and authentication
  flows
  7. Deployment Orchestrator - Manages LocalAGI/Railway infrastructure
  8. Documentation Curator - Maintains evidence-based documentation

  To Get Started:
  git pull

  How to Use:
  - Agents auto-select based on your task, or invoke explicitly:
  "Use the quality-enforcer agent to audit [file/feature]"
  - Full documentation available in .claude/README.md

  Benefits:
  - Enforces architectural discipline
  - Catches issues before commits
  - Provides consistent code review
  - Reduces debugging time

  Questions? Check the README or reach out.