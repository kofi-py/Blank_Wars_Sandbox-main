-- Migration 272: Fix UUID type mismatch in recalculate_user_character_stat trigger
-- Bug: v_user_character_id was declared as INTEGER but column is UUID
-- This caused the trigger to crash on any modifier insert

CREATE OR REPLACE FUNCTION recalculate_user_character_stat()
RETURNS TRIGGER AS $$
DECLARE
  v_user_character_id UUID;  -- FIXED: was INTEGER, now UUID
  v_stat_name VARCHAR(50);
  v_character_id UUID;
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

  -- Get the character_id for this user_character
  SELECT character_id INTO v_character_id
  FROM user_characters
  WHERE id = v_user_character_id;

  -- Get the base value from characters table
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
  -- Map stat_name to column name
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
      -- Unknown stat, log warning but don't fail
      RAISE NOTICE 'Unknown stat_name in character_modifiers: %', v_stat_name;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_user_character_stat() IS 'Triggered on character_modifiers changes. Recalculates the affected current_* stat on user_characters = base + SUM(modifiers). Fixed UUID type in migration 272.';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (272, '272_fix_modifier_trigger_uuid_type')
ON CONFLICT (version) DO NOTHING;
