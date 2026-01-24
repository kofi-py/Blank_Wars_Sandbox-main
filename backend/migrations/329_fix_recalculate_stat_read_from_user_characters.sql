-- Migration 329: Fix recalculate_user_character_stat to use simple add/subtract
--
-- PROBLEM: Trigger was reading base value from `characters` table, but modifiers
-- apply to user_character instances. Also was summing all modifiers which caused
-- double-counting issues.
--
-- FIX: Simple arithmetic on user_characters:
--   INSERT: current_value + NEW.modifier_value
--   DELETE: current_value - OLD.modifier_value
--   UPDATE: current_value - OLD.modifier_value + NEW.modifier_value

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 329: Fixing recalculate_user_character_stat to use simple add/subtract...';
END $$;

CREATE OR REPLACE FUNCTION public.recalculate_user_character_stat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_character_id UUID;
  v_stat_name VARCHAR(50);
  v_current_value INTEGER;
  v_new_value INTEGER;
BEGIN
  -- Get user_character_id and stat_name (use NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    v_user_character_id := OLD.user_character_id;
    v_stat_name := OLD.stat_name;
  ELSE
    v_user_character_id := NEW.user_character_id;
    v_stat_name := NEW.stat_name;
  END IF;

  -- Get current value from user_characters
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM user_characters WHERE id = $1',
    v_stat_name
  ) INTO v_current_value USING v_user_character_id;

  -- Calculate new value based on operation
  IF TG_OP = 'INSERT' THEN
    v_new_value := v_current_value + NEW.modifier_value;
  ELSIF TG_OP = 'DELETE' THEN
    v_new_value := v_current_value - OLD.modifier_value;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Subtract old, add new
    v_new_value := v_current_value - OLD.modifier_value + NEW.modifier_value;
  END IF;

  -- Update the stat column on user_characters
  EXECUTE format(
    'UPDATE user_characters SET %I = $1 WHERE id = $2',
    v_stat_name
  ) USING v_new_value, v_user_character_id;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 329 complete: Trigger now uses simple add/subtract on user_characters';
END $$;

INSERT INTO migration_log (version, name)
VALUES (329, '329_fix_recalculate_stat_read_from_user_characters')
ON CONFLICT (version) DO NOTHING;

COMMIT;
