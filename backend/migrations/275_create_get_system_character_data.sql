-- Migration 275: Create get_system_character_data() for system characters (judges, therapists)
-- System characters need identity + memories/decisions, but NOT combat or psychological stats

BEGIN;

CREATE OR REPLACE FUNCTION public.get_system_character_data(p_userchar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_char RECORD;
  v_uc RECORD;
  v_character_id TEXT;
  v_identity JSONB;
BEGIN
  -- =====================================================
  -- 1. FETCH USER CHARACTER DATA (to get character_id and memories)
  -- =====================================================
  SELECT uc.*, u.coach_name
  INTO v_uc
  FROM user_characters uc
  LEFT JOIN users u ON uc.user_id = u.id
  WHERE uc.id = p_userchar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  v_character_id := v_uc.character_id;

  IF v_character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  -- =====================================================
  -- 2. FETCH BASE CHARACTER DATA
  -- =====================================================
  SELECT
    c.*,
    cs.comedian_name AS cs_comedian_name,
    cs.comedy_style AS cs_comedy_style,
    cs.category AS cs_category
  INTO v_char
  FROM characters c
  LEFT JOIN comedian_styles cs ON c.comedian_style_id = cs.id
  WHERE c.id = v_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found (referenced by user_character %)', v_character_id, p_userchar_id;
  END IF;

  -- STRICT MODE: Validate required identity fields
  IF v_char.name IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: name', v_character_id;
  END IF;
  IF v_char.backstory IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: backstory', v_character_id;
  END IF;
  IF v_char.personality_traits IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: personality_traits', v_character_id;
  END IF;

  -- =====================================================
  -- 3. BUILD IDENTITY PACKAGE (no combat/psych stats)
  -- =====================================================
  v_identity := jsonb_build_object(
    -- Core identity from characters table
    'id', v_char.id,
    'userchar_id', v_uc.id,
    'name', v_char.name,
    'title', v_char.title,
    'backstory', v_char.backstory,
    'personality_traits', v_char.personality_traits,
    'species', v_char.species,
    'archetype', v_char.archetype,
    'origin_era', v_char.origin_era,
    'role', v_char.role,
    -- Communication style
    'conversation_style', v_char.conversation_style,
    'conversation_topics', v_char.conversation_topics,
    -- Comedy style (for personality)
    'comedian_name', v_char.cs_comedian_name,
    'comedy_style', v_char.cs_comedy_style,
    'comedian_category', v_char.cs_category,
    -- Recent memories (from character_memories)
    'recent_memories', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'content', cm.content,
        'created_at', cm.created_at,
        'emotion_type', cm.emotion_type,
        'importance', cm.importance,
        'intensity', cm.intensity,
        'tags', cm.tags
      ) ORDER BY cm.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM character_memories
        WHERE user_character_id = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 10
      ) cm
    ),
    -- Recent decisions
    'recent_decisions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'coach_advice', cd.coach_advice,
        'created_at', cd.created_at,
        'decision_type', cd.decision_type,
        'description', cd.description,
        'domain', cd.domain,
        'followed_advice', cd.followed_advice,
        'outcome', cd.outcome
      ) ORDER BY cd.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM character_decisions
        WHERE character_id = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 5
      ) cd
    )
  );

  -- =====================================================
  -- 4. RETURN IDENTITY ONLY (no COMBAT or PSYCHOLOGICAL)
  -- =====================================================
  RETURN jsonb_build_object(
    'IDENTITY', v_identity
  );
END;
$function$;

COMMIT;

-- =====================================================
-- LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (275, '275_create_get_system_character_data')
ON CONFLICT (version) DO NOTHING;
