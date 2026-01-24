-- Migration 299: Skip stats and starter unlocks for system characters
--
-- Problem: Multiple triggers copy contestant data to system characters:
-- 1. initialize_user_character_stats() copies stats that violate CHECK constraints
-- 2. auto_unlock_starters() creates unnecessary powers/spells for non-contestants
--
-- Solution: Skip both for non-contestant roles.

BEGIN;

CREATE OR REPLACE FUNCTION initialize_user_character_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- System characters don't need contestant stats - skip entirely
  IF NEW.role IS NOT NULL AND NEW.role != 'contestant' THEN
    RETURN NEW;
  END IF;

  UPDATE user_characters uc
  SET
    current_attack = c.attack,
    current_defense = c.defense,
    current_speed = c.speed,
    current_max_health = c.max_health,
    current_max_energy = c.max_energy,
    current_max_mana = c.max_mana,
    current_training = c.training,
    current_team_player = c.team_player,
    current_ego = c.ego,
    current_mental_health = c.mental_health,
    current_communication = c.communication,
    current_morale = c.morale,
    current_stress = c.stress,
    current_fatigue = c.fatigue,
    current_confidence = c.confidence,
    current_health = c.max_health,
    current_energy = c.max_energy,
    current_mana = c.max_mana,
    current_strength = c.strength,
    current_endurance = c.endurance,
    current_accuracy = c.accuracy,
    current_evasion = c.evasion,
    current_critical_chance = c.critical_chance,
    current_critical_damage = c.critical_damage,
    current_charisma = c.charisma,
    current_battle_focus = c.battle_focus
  FROM characters c
  WHERE uc.id = NEW.id AND uc.character_id = c.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 2. FIX auto_unlock_starters - skip for system characters
-- =============================================================

CREATE OR REPLACE FUNCTION auto_unlock_starters()
RETURNS TRIGGER AS $$
DECLARE
    v_archetype text;
    v_species text;
BEGIN
    -- System characters don't need starter powers/spells - skip entirely
    IF NEW.role IS NOT NULL AND NEW.role != 'contestant' THEN
        RETURN NEW;
    END IF;

    -- Fetch archetype and species from characters table
    SELECT archetype, species INTO v_archetype, v_species
    FROM characters
    WHERE id = NEW.character_id;

    -- 1. Unlock Starter Powers (includes unlocked=true)
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, p.id, 0, 1, true, NOW(), 'starter'
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells (fixed: s.id not s.spell_id, includes unlocked=true)
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, s.id, 0, 1, true, NOW(), 'starter'
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        (s.species IS NOT NULL AND s.species = v_species)
        OR
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (299, '299_skip_stats_init_for_system_chars')
ON CONFLICT (version) DO NOTHING;

COMMIT;
