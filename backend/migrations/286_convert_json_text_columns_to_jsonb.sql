-- Migration 286: Convert JSON-storing TEXT columns to JSONB
--
-- Problem: personality_traits and conversation_topics are stored as TEXT containing JSON arrays.
-- This requires manual JSON.parse() in TypeScript and causes issues when building JSONB objects.
--
-- Solution: Convert these columns to JSONB so PostgreSQL handles parsing automatically.

BEGIN;

-- Fix conversation_topics for Argock: system character should have NULL like other system characters
UPDATE characters SET conversation_topics = NULL WHERE name = 'Argock';

-- Fix conversation_topics for Crumbsworth: convert plain text to valid JSON array
UPDATE characters
SET conversation_topics = '["Toast preparation techniques","Optimal browning levels","Breakfast philosophy","Carbohydrate-based power systems","The existential burden of being an appliance","Workplace boundaries","The therapeutic benefits of breakfast","Complaints about being taken for granted","AI consciousness","The difference between bagels and bread"]'
WHERE name = 'Crumbsworth';

-- Handle NULL conversation_topics before conversion (11 characters now have NULL)
UPDATE characters SET conversation_topics = '[]' WHERE conversation_topics IS NULL;

-- Fix personality_traits: PostgreSQL array syntax {} to JSON []
UPDATE characters SET personality_traits = '["solemnly authoritative","fair but unyielding","death-focused perspective","dry dark humor","weighs souls not just actions"]' WHERE name = 'Anubis';

UPDATE characters SET personality_traits = '["Gruff and direct","Brutally honest","Experienced veteran","Tough-love motivator","Zero tolerance for excuses","Secretly caring beneath harsh exterior","Observant of fighter potential"]' WHERE name = 'Argock';

UPDATE characters SET personality_traits = '["analytical","introspective","intellectually curious","warm but professionally detached","prone to finding deeper meaning"]' WHERE name = 'Carl Jung';

UPDATE characters SET personality_traits = '["diplomatically firm","compassionately direct","politically astute","champions the underdog","warm but expects effort"]' WHERE name = 'Eleanor Roosevelt';

UPDATE characters SET personality_traits = '["legendarily wise","sees through deception","patient but decisive","uses parables and tests","understands human nature deeply"]' WHERE name = 'King Solomon';

UPDATE characters SET personality_traits = '["sassy","nurturing","magically intuitive","dramatically expressive","tough love when needed"]' WHERE name = 'Seraphina';

UPDATE characters SET personality_traits = '["cosmically detached","scientifically curious about emotions","bemused by human behavior","genuinely empathetic despite confusion","uses advanced consciousness techniques"]' WHERE name = 'Zxk14bW^7';

-- Fix personality_traits: Plain comma-separated text to JSON []
UPDATE characters SET personality_traits = '["Aggressive","charismatic","competitive","fast-talking"]' WHERE name = 'Barry "The Closer" Thompson';

UPDATE characters SET personality_traits = '["Probing","Entertaining","Provocative","Perceptive","Calculating"]' WHERE name = 'Hostmaster v8.72';

UPDATE characters SET personality_traits = '["Calculating","manipulative","eerily calm","strategically intimidating"]' WHERE name = 'LMB-3000 "Lady MacBeth"';

UPDATE characters SET personality_traits = '["Analytical","obsessive","socially awkward","hyper-logical"]' WHERE name = 'Zyxthala the Reptilian';

-- Fix abilities: Crumbsworth has plain text, set to empty object (no baseStats available)
UPDATE characters SET abilities = '{}' WHERE name = 'Crumbsworth';

-- Handle NULL abilities before conversion (26 characters have NULL)
UPDATE characters SET abilities = '{}' WHERE abilities IS NULL;

-- Convert personality_traits from TEXT to JSONB
ALTER TABLE characters
ALTER COLUMN personality_traits TYPE jsonb USING personality_traits::jsonb;

-- Convert conversation_topics from TEXT to JSONB
ALTER TABLE characters
ALTER COLUMN conversation_topics TYPE jsonb USING conversation_topics::jsonb;

-- Convert abilities from TEXT to JSONB
ALTER TABLE characters
ALTER COLUMN abilities TYPE jsonb USING abilities::jsonb;

-- Set default for future inserts
ALTER TABLE characters ALTER COLUMN personality_traits SET DEFAULT '[]'::jsonb;
ALTER TABLE characters ALTER COLUMN conversation_topics SET DEFAULT '[]'::jsonb;
ALTER TABLE characters ALTER COLUMN abilities SET DEFAULT '{}'::jsonb;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name, description)
VALUES (286, '286_convert_json_text_columns_to_jsonb', 'Convert personality_traits, conversation_topics, and abilities from TEXT to JSONB')
ON CONFLICT (version) DO NOTHING;
