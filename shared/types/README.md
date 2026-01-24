# @blankwars/types

Shared TypeScript types for Blank Wars, generated from the database schema.

## Purpose

This package provides a single source of truth for types used across both frontend and backend applications. Types are generated directly from the PostgreSQL database schema to ensure consistency.

## Usage

### In Backend:
```typescript
import { Archetype, Species, CharacterRarity } from '@blankwars/types';
```

### In Frontend:
```typescript
import { Archetype, Species, CharacterRarity } from '@blankwars/types';
```

## Generating Types

Types are generated from the database schema:

```bash
cd shared/types
npm run generate
```

This connects to the database specified in `backend/.env` and generates TypeScript types based on:
- Character archetypes
- Species
- Rarity levels
- Power tiers
- Spell tiers

## CI/CD

In production builds, types are generated before Docker build:

```bash
# In CI/CD pipeline
cd shared/types
DATABASE_URL=$PRODUCTION_DB_URL npm run generate
```

The generated `src/generated.ts` file is committed to git for version control and review.

## Development Workflow

1. Make schema changes to the database (migrations)
2. Run `npm run generate` to update types
3. Commit the updated `generated.ts` file
4. Both frontend and backend automatically get updated types
