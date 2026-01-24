-- Migration 328: Fix recalculate_user_character_stat trigger function
--
-- PROBLEM: v_character_id was declared as UUID but user_characters.character_id
-- is TEXT (canonical IDs like 'sun_wukong'). PostgreSQL failed trying to cast
-- 'sun_wukong' to UUID when the trigger ran during registration.
--
-- FIX: Change v_character_id from UUID to TEXT.

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 328: Fixing recalculate_user_character_stat trigger function...';
END $$;

CREATE OR REPLACE FUNCTION public.recalculate_user_character_stat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_character_id UUID;
  v_stat_name VARCHAR(50);
  v_character_id TEXT;  -- FIXED: was UUID, should be TEXT (canonical IDs like 'sun_wukong')
  v_base_value INTEGER;
  v_modifier_sum INTEGER;
  v_new_value INTEGER;
BEGIN
  -- Get the affected user_character_id and stat_name
  IF TG_OP = 'DELETE' THEN
    v_user_character_id := OLD.user_character_id;
    v_stat_name := OLD.stat_name;
  ELSE
    v_user_character_id := NEW.user_character_id;
    v_stat_name := NEW.stat_name;
  END IF;

  -- Get the character_id for this user_character (returns TEXT canonical ID like 'sun_wukong')
  SELECT character_id INTO v_character_id
  FROM user_characters
  WHERE id = v_user_character_id;

  -- Get the base value from characters table (characters.id is TEXT, not UUID)
  EXECUTE format(
    'SELECT COALESCE(%I, 50) FROM characters WHERE id = $1',
    v_stat_name
  ) INTO v_base_value USING v_character_id;

  -- Sum all active modifiers for this stat
  SELECT COALESCE(SUM(modifier_value), 0) INTO v_modifier_sum
  FROM character_modifiers
  WHERE user_character_id = v_user_character_id
    AND stat_name = v_stat_name
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Calculate new value
  v_new_value := v_base_value + v_modifier_sum;

  -- Update the corresponding current_* column on user_characters
  CASE v_stat_name
    WHEN 'attack' THEN
      UPDATE user_characters SET current_attack = v_new_value WHERE id = v_user_character_id;
    WHEN 'defense' THEN
      UPDATE user_characters SET current_defense = v_new_value WHERE id = v_user_character_id;
    WHEN 'speed' THEN
      UPDATE user_characters SET current_speed = v_new_value WHERE id = v_user_character_id;
    WHEN 'special' THEN
      UPDATE user_characters SET current_special = v_new_value WHERE id = v_user_character_id;
    WHEN 'max_health' THEN
      UPDATE user_characters SET current_max_health = v_new_value WHERE id = v_user_character_id;
    WHEN 'max_energy' THEN
      UPDATE user_characters SET current_max_energy = v_new_value WHERE id = v_user_character_id;
    WHEN 'max_mana' THEN
      UPDATE user_characters SET current_max_mana = v_new_value WHERE id = v_user_character_id;
    WHEN 'training' THEN
      UPDATE user_characters SET current_training = v_new_value WHERE id = v_user_character_id;
    WHEN 'team_player' THEN
      UPDATE user_characters SET current_team_player = v_new_value WHERE id = v_user_character_id;
    WHEN 'ego' THEN
      UPDATE user_characters SET current_ego = v_new_value WHERE id = v_user_character_id;
    WHEN 'mental_health' THEN
      UPDATE user_characters SET current_mental_health = v_new_value WHERE id = v_user_character_id;
    WHEN 'communication' THEN
      UPDATE user_characters SET current_communication = v_new_value WHERE id = v_user_character_id;
    WHEN 'morale' THEN
      UPDATE user_characters SET current_morale = v_new_value WHERE id = v_user_character_id;
    WHEN 'stress' THEN
      UPDATE user_characters SET current_stress = v_new_value WHERE id = v_user_character_id;
    WHEN 'fatigue' THEN
      UPDATE user_characters SET current_fatigue = v_new_value WHERE id = v_user_character_id;
    WHEN 'confidence' THEN
      UPDATE user_characters SET current_confidence = v_new_value WHERE id = v_user_character_id;
    ELSE
      RAISE NOTICE 'Unknown stat_name in character_modifiers: %', v_stat_name;
  END CASE;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
    RAISE NOTICE 'Migration 328 complete: Fixed v_character_id type from UUID to TEXT';
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (328, '328_fix_recalculate_user_character_stat_type')
ON CONFLICT (version) DO NOTHING;

COMMIT;
