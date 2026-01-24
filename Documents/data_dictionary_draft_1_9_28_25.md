Blank Wars — Data Dictionary (Draft v1)
Source of truth: PostgreSQL schema + numbered migrations (see “Migrations Index”).
Governance: NO FALLBACKS, Dollars-Everywhere, Schema Parity, Explicit Derivations.
0) Global Rules
IDs: uuid unless otherwise noted. Snake_case column names.
Timestamps: created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now().
Soft delete: deleted_at timestamptz NULL (active excludes non-NULL).
Money: INTEGER dollars everywhere. Any legacy *_cents is a defect. Client must never coalesce; boundary must throw on missing/non-finite.
JSONB shape: Where specified, enforce type via CHECK (jsonb_typeof(col) = 'object'|'array').
Enums (canonical casing):
role_enum: player, therapist, judge, agent, npc, system
rarity_enum: common, uncommon, rare, epic, legendary
intensityStrategy: Soft, Medium, Hard
hq_tier (text for now): spartan_apartment, basic_house, … (others TBD)
current_scene_type (text/enum): mundane, conflict, chaos
current_time_of_day (text/enum): morning, afternoon, evening, night
1) users (owner context)
Column	Type	Null	Default	Constraints / Notes
id	uuid	NO		PK
subscription_tier	text (enum recommended)	YES		Canonical tiers: Free, Bronze, Elite, Legendary (cased as shown). Used in rarity derivation (step 2).
Indexes: users_pkey(id)
Notes: Enforce canonical values via enum in a future migration to stop drift.
2) characters (canonical templates)
Column	Type	Null	Default	Constraints / Notes
id	uuid or text (confirm)	NO		PK
species	text	NO		NO FALLBACK; must be explicit; never default to “human”.
comedy_style	text	NO		Required for prompt assembly; missing is an error.
comedian_name	text	NO		Required for persona voice.
role	role_enum (text)	NO		One of: player,therapist,judge,agent,npc,system.
rarity	rarity_enum (text)	NO		Persisted. Derived via strict order (see §9).
owner_id	uuid	YES		FK → users(id); ON DELETE SET NULL (intended).
base_health	integer	NO		Set by 025_apply_realistic_level1_stats.sql (HP 30–127).
base_attack	integer	NO		
base_defense	integer	NO		
base_speed	integer	NO		
base_special	integer	NO		
Indexes: characters_pkey(id), characters_owner_id_idx(owner_id)
Relationships: many to user_characters.
Derivations: rarity—see §9.
Migrations: 20250805160000_add_psych_stats_to_characters.sql, 025_apply_realistic_level1_stats.sql.
3) user_characters (player state — authoritative money)
Column	Type	Null	Default	Constraints / Notes
id	uuid	NO		PK
user_id	uuid	NO		FK → users(id) ON DELETE CASCADE (intended)
character_id	uuid	NO		FK → characters(id) ON DELETE CASCADE
wallet	integer (USD)	NO	0	CHECK (wallet >= 0)
debt	integer (USD)	NO	0	CHECK (debt >= 0)
monthly_earnings	integer (USD)	NO	0	CHECK (monthly_earnings >= 0)
current_mental_health	integer	NO		CHECK (current_mental_health BETWEEN 0 AND 100)
bond_level	integer	NO		CHECK (bond_level BETWEEN 0 AND 10)
financial_personality	jsonb	NO	'{}'::jsonb	CHECK (jsonb_typeof(financial_personality)='object')
recent_decisions	jsonb	NO	'[]'::jsonb	CHECK (jsonb_typeof(recent_decisions)='array'); NO FALLBACK
Indexes: (user_id, character_id) UNIQUE recommended.
Notes: Dollars-everywhere invariant is enforced here. Replace any client coalescing with server-side throws.
4) financial_decisions (audit — needs unit fix)
Defect: legacy cents columns violate Dollars-Everywhere.
Current (to be migrated)
amount_cents, wallet_delta_cents, debt_delta_cents — legacy
Target schema (migration required)
Column	Type	Null	Default	Constraint
id	uuid	NO		PK
user_char_id	uuid	NO		FK → user_characters(id)
amount	integer (USD)	NO		
wallet_delta	integer (USD)	NO	0	
debt_delta	integer (USD)	NO	0	
metadata	jsonb	YES		optional
created_at	timestamptz	NO	now()	
Migration plan: rename columns, convert units if any data exists; add NOT NULL/DEFAULTS as above; drop old _cents.
5) team_context (scene + roster)
Column	Type	Null	Default	Constraints / Notes
id	uuid	NO		PK
team_id	uuid	NO		FK to owning user/team entity
active_teammates	jsonb (array)	YES or NO	'[]'::jsonb	CHECK (jsonb_typeof(active_teammates)='array' AND jsonb_array_length(active_teammates) <= 3)
hq_tier	text	YES		spartan_apartment, basic_house, …
current_scene_type	text	YES		mundane, conflict, chaos
current_time_of_day	text	YES		morning, afternoon, evening, night
Notes: “Roommates” is derived at runtime (query by user_id), not stored here.
6) therapy_sessions
Column	Type	Null	Default	Constraints / Notes
id	uuid	NO		PK
patient_id	uuid	NO		FK → character with role='player'
therapist_id	uuid	NO		FK → character with role='therapist'
patient_species	text	NO		NO FALLBACK
therapist_species	text	NO		NO FALLBACK
transcript	jsonb	NO		unified conversation history
turn_count	integer	NO		session progress
intensityStrategy	text (enum)	NO		One of Soft,Medium,Hard
Indexes: consider (patient_id, therapist_id, created_at); optional constraint to prevent concurrent active sessions.
Guards: API must supply usercharId, therapistId, role; species required for both; unknown → reject.
7) memories (persistent event stream)
Column	Type	Null	Default	Constraints / Notes
id	uuid	NO		PK
user_char_id	uuid	NO		FK → user_characters(id)
event_type	text (enum recommended)	NO		e.g., therapy_session_start, therapy_turn_analyzed, therapy_evaluation_completed, financial_crisis
payload	jsonb	NO	'{}'::jsonb	event domain data
type	text	YES		memory type
subject	text	YES		
valence	integer	YES		
decay	integer	YES		
created_at	timestamptz	NO	now()	
deleted_at	timestamptz	YES		
Scoring storage: message-level scores (EmotionalDepth, Vulnerability, Insight, DefensivePatterns, Empathy; 1–10) live in payload for therapy_turn_analyzed. Application clamps 1–10; DB CHECK optional if columns are materialized.
8) Role/Agent Registry (code reference)
DB source of truth for entities: characters.role.
Code registry (roleRegistry.ts) mirrors canonical agent keys and sets: THERAPISTS, JUDGES, ANALYZERS.
analysis_agent: defined in personalityService.ts, registered under ANALYZERS; used to score messages and write memories events.
9) Financial Tier → Rarity (strict derivation)
Persisted column: characters.rarity (rarity_enum).
Derivation order (no deviations, NO FALLBACKS):
financial_tiers.financial_tier (authoritative per-character)
users.subscription_tier joined via characters.owner_id
subscription_tier (general reference, if present)
If unresolved after (1)→(3) → THROW.
9.1) financial_tiers (per character)
Column	Type	Null	Notes
character_id	uuid	NO	UNIQUE FK → characters(id)
financial_tier	text (enum recommended)	NO	canonical set includes: poor, free, bronze, silver, middle, gold, platinum, wealthy, noble, royal (as used historically)
source	text	NO	e.g., owner.subscription_tier, manual_override
9.2) tier_to_rarity (mapping) — must exist
financial_tier (text)	rarity (rarity_enum)
TBD exact keys	TBD exact values
Action: populate explicit rows. Suggested (from history, not finalized):
poor→common, free→common/uncommon, bronze→uncommon, silver→rare, middle→rare/epic, gold→epic, platinum→legendary, wealthy/noble/royal→legendary.
If any input financial_tier lacks a mapping → THROW.
10) Migrations Index (confirmed)
Order	Filename	Purpose
005	005_embedded_schema_consolidation.sql	Adds current_mental_health to user_characters.
011	011_fix_remaining_schema_issues.sql	Adds wallet, financial_stress to user_characters.
013	013_add_scene_context_fields.sql	Creates team_context; adds default_mood/default_energy_level to characters. (Renamed to 024)
20250805160000	20250805160000_add_psych_stats_to_characters.sql	Adds initial psychological stats to characters.
022	022_add_financial_personality.sql	Adds financial_personality jsonb.
024	024_add_scene_context_fields.sql	Renamed 013; scene context additions.
025	025_apply_realistic_level1_stats.sql	Sets realistic level-1 stats: base_health 30–127, etc.
026	026_add_missing_real_estate_agents.sql	Adds Real Estate Agents (barry_closer, lmb_3000_robot_lady_macbeth, zyxthala_reptilian).
Removed (dangerous cents conversion):
20250820_A_add_cents_columns.sql, 20250820_B_backfill_cents.sql, 20250821_C_unique_client_decision_id.sql.
11) CI Parity & Tests (Definition of Done)
Schema parity check: Script queries information_schema + enums; compares to docs/data-dictionary.json. Any drift (missing/extra table/column/type/nullability/enum) → fail.
Money invariants: tests assert all money columns are integer dollars; no *_cents anywhere; non-finite/missing → boundary throw.
Derivation invariant: test updates to financial tier cause characters.rarity to update; missing mapping → throws.
JSONB shape: tests ensure financial_personality object; recent_decisions array; bad shape → fail.
Machine-Readable Mirror (docs/data-dictionary.json — draft)
{
  "version": "2025-09-27",
  "governance": {
    "noFallbacks": true,
    "moneyUnit": "USD_integer",
    "enumCasingFrozen": true
  },
  "enums": {
    "role_enum": ["player","therapist","judge","agent","npc","system"],
    "rarity_enum": ["common","uncommon","rare","epic","legendary"],
    "intensityStrategy": ["Soft","Medium","Hard"],
    "hq_tier": ["spartan_apartment","basic_house"],
    "current_scene_type": ["mundane","conflict","chaos"],
    "current_time_of_day": ["morning","afternoon","evening","night"]
  },
  "entities": {
    "users": {
      "pk": ["id"],
      "columns": {
        "id": {"type":"uuid","null":false},
        "subscription_tier": {"type":"text","null":true,"enumSuggest":["Free","Bronze","Elite","Legendary"]}
      }
    },
    "characters": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid|text","null":false},
        "species":{"type":"text","null":false,"nofallback":true},
        "comedy_style":{"type":"text","null":false},
        "comedian_name":{"type":"text","null":false},
        "role":{"type":"role_enum","null":false},
        "rarity":{"type":"rarity_enum","null":false,"derivedFrom":["financial_tiers.financial_tier","users.subscription_tier","subscription_tier"],"nofallback":true},
        "owner_id":{"type":"uuid","null":true,"fk":"users.id"},
        "base_health":{"type":"integer","null":false},
        "base_attack":{"type":"integer","null":false},
        "base_defense":{"type":"integer","null":false},
        "base_speed":{"type":"integer","null":false},
        "base_special":{"type":"integer","null":false}
      }
    },
    "user_characters": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid","null":false},
        "user_id":{"type":"uuid","null":false,"fk":"users.id","onDelete":"CASCADE"},
        "character_id":{"type":"uuid","null":false,"fk":"characters.id","onDelete":"CASCADE"},
        "wallet":{"type":"integer","null":false,"default":0,"check":"wallet>=0"},
        "debt":{"type":"integer","null":false,"default":0,"check":"debt>=0"},
        "monthly_earnings":{"type":"integer","null":false,"default":0,"check":"monthly_earnings>=0"},
        "current_mental_health":{"type":"integer","null":false,"check":"between 0 and 100"},
        "bond_level":{"type":"integer","null":false,"check":"between 0 and 10"},
        "financial_personality":{"type":"jsonb","null":false,"default":"{}","check":"jsonb_typeof(financial_personality)='object'"},
        "recent_decisions":{"type":"jsonb","null":false,"default":"[]","check":"jsonb_typeof(recent_decisions)='array'"}
      }
    },
    "financial_decisions": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid","null":false},
        "user_char_id":{"type":"uuid","null":false,"fk":"user_characters.id"},
        "amount":{"type":"integer","null":false},
        "wallet_delta":{"type":"integer","null":false,"default":0},
        "debt_delta":{"type":"integer","null":false,"default":0},
        "metadata":{"type":"jsonb","null":true},
        "created_at":{"type":"timestamptz","null":false,"default":"now()"}
      },
      "migrationFixes": ["rename *_cents -> dollars columns","convert units if data present"]
    },
    "team_context": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid","null":false},
        "team_id":{"type":"uuid","null":false},
        "active_teammates":{"type":"jsonb","null":false,"default":"[]","check":"jsonb_typeof(active_teammates)='array' AND jsonb_array_length(active_teammates)<=3"},
        "hq_tier":{"type":"text","null":true},
        "current_scene_type":{"type":"text","null":true},
        "current_time_of_day":{"type":"text","null":true}
      }
    },
    "therapy_sessions": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid","null":false},
        "patient_id":{"type":"uuid","null":false,"fk":"characters.id"},
        "therapist_id":{"type":"uuid","null":false,"fk":"characters.id"},
        "patient_species":{"type":"text","null":false,"nofallback":true},
        "therapist_species":{"type":"text","null":false,"nofallback":true},
        "transcript":{"type":"jsonb","null":false},
        "turn_count":{"type":"integer","null":false},
        "intensityStrategy":{"type":"text","null":false,"enumRef":"intensityStrategy"}
      }
    },
    "memories": {
      "pk": ["id"],
      "columns": {
        "id":{"type":"uuid","null":false},
        "user_char_id":{"type":"uuid","null":false,"fk":"user_characters.id"},
        "event_type":{"type":"text","null":false},
        "payload":{"type":"jsonb","null":false,"default":"{}"},
        "type":{"type":"text","null":true},
        "subject":{"type":"text","null":true},
        "valence":{"type":"integer","null":true},
        "decay":{"type":"integer","null":true},
        "created_at":{"type":"timestamptz","null":false,"default":"now()"},
        "deleted_at":{"type":"timestamptz","null":true}
      },
      "conventions": {
        "therapy_turn_analyzed":{"payload":["emotional_depth","vulnerability","insight","defensive_patterns","empathy"],"range":"1-10"}
      }
    },
    "financial_tiers": {
      "pk": ["character_id"],
      "columns": {
        "character_id":{"type":"uuid","null":false,"fk":"characters.id","unique":true},
        "financial_tier":{"type":"text","null":false},
        "source":{"type":"text","null":false}
      }
    },
    "tier_to_rarity": {
      "pk": ["financial_tier"],
      "columns": {
        "financial_tier":{"type":"text","null":false},
        "rarity":{"type":"rarity_enum","null":false}
      },
      "policy":"missing mapping -> THROW"
    }
  }
}
Open TODOs (explicit)
Finalize tier_to_rarity rows (exact mapping values).
Lock users.subscription_tier into an enum with canonical values (Free, Bronze, Elite, Legendary).
Run migration to fix financial_decisions (rename/drop _cents, backfill/convert if needed).
Confirm characters.id type (uuid vs text) and set FKs accordingly.
Add DB CHECK for team_context.active_teammates length (≤ 3) if not already present.
Confirm indexes/uniques noted as “recommended” and add in migrations.
If you want this dropped into docs/data-dictionary.md and docs/data-dictionary.json, say the word and I’ll output both artifacts exactly as shown (and include a CI parity script stub you can wire into your pipeline).

API calls, production settings, ERD, unified user data in tables textual  