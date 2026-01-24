# Spell System Architecture: `spell_type` vs `category`

## Executive Summary
The runtime error `column sd.spell_type does not exist` occurs because the application code expects a field named `spell_type`, but the database schema uses the name `category`.

After analyzing the `power_definitions` table (the architectural template) and the codebase, **the correct solution is to map the database column `category` to the application field `spell_type`**. This is not a hack; it is a standard mapping layer adjustment to align the database schema with the domain model.

## Detailed Analysis

### 1. Database Schema (`spell_definitions`)
The `spell_definitions` table was created in migration `037` and refined in `065`. It defines the following structure:
*   **`tier`**: The power level (universal, archetype, species, signature).
*   **`category`**: A descriptive classification (offensive, defensive, heal, buff, debuff, utility).
*   **`spell_type`**: **DOES NOT EXIST.**

### 2. Comparison with `power_definitions`
The spell system is designed to mirror the power system. The `power_definitions` table (Migration `008`) contains *both*:
*   **`category`**: Descriptive type ('offensive', 'defensive', 'support', etc.).
*   **`power_type`**: Mechanical type ('active', 'passive', 'toggle').

**Key Insight:** Spells are inherently **Active**. Unlike powers, which can be passive stat boosts, spells are actions taken during a turn. Therefore, the `power_type` (active/passive) distinction is redundant for spells. The "type" of a spell that matters to the user is its **Category** (what does it do?).

### 3. Application Code Expectations
The frontend code (`characterConversion.ts`) checks `spell_type` for values like 'heal' and 'def':
```typescript
s.spell_type?.toLowerCase().includes('heal') ? 'support' : ...
```
This confirms that the application uses `spell_type` to mean "Descriptive Category" (Heal, Attack, Defense), which exactly matches the data stored in the `category` database column.

## The Discrepancy
*   **Database:** Calls it `category` (consistent with `power_definitions.category`).
*   **Code:** Calls it `spell_type` (likely a legacy term or a simplification).

## Recommended Solution
We should **NOT** add a new `spell_type` column to the database, as it would duplicate the purpose of `category`.

Instead, we should **Alias** the column in the Data Access Layer (`databaseAdapter.ts`). This effectively tells the application: "When you ask for `spell_type`, use the data from the `category` column."

### Proposed Fix
In `backend/src/services/databaseAdapter.ts`:

```sql
SELECT 
  sd.name, 
  sd.description, 
  sd.tier, 
  sd.category AS spell_type, -- <--- THE FIX
  sd.mana_cost,
  ...
```

### Why this is the "Best Solution"
1.  **Schema Consistency:** Maintains `category` in the DB, keeping it consistent with `power_definitions`.
2.  **Data Integrity:** Uses the existing, populated data in `category`.
3.  **Code Stability:** Satisfies the frontend's expectation of `spell_type` without requiring a massive refactor of the frontend code.
4.  **Semantic Correctness:** Since all spells are "active", their primary distinction *is* their category. Mapping `category` to `spell_type` is semantically valid in this context.
