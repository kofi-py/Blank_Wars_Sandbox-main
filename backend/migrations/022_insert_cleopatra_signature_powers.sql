-- Migration: Insert Cleopatra Signature Powers
-- Purpose: Add 7 unique signature powers for Cleopatra character
-- Character: Cleopatra (Leader, Human) - Leadership, charm, political cunning, Egyptian royalty

-- ===== CLEOPATRA SIGNATURE POWERS (7 total) =====

-- 1. Royal Command (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_royal_command',
  'Royal Command',
  'signature',
  'support',
  'cleopatra',
  'Inspire allies with royal authority',
  '"I am Egypt. Obey."',
  '👑',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 15, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 15, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 65, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 65, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seduction (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_seduction',
  'Seduction',
  'signature',
  'support',
  'cleopatra',
  'Charm enemies to fight for you',
  '"Even the mightiest fall to my charm."',
  '💋',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "chance": 25, "rank": 1},
    {"type": "status_effect", "statusEffect": "charm", "duration": 2, "chance": 50, "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -20, "duration": 2, "target": "single_enemy", "failsafe": true, "rank": 2},
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "chance": 80, "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": -40, "duration": 2, "target": "single_enemy", "failsafe": true, "rank": 3}
  ]'::jsonb,
  2,
  18,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Legacy of Egypt (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_legacy_of_egypt',
  'Legacy of Egypt',
  'signature',
  'passive',
  'cleopatra',
  'Ancient power and divine heritage',
  '"I am descended from gods."',
  '🏛️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "morale", "value": 5, "target": "team", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "morale", "value": 12, "target": "team", "rank": 2},
    {"type": "immunity", "immunityType": "charm", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "morale", "value": 20, "target": "team", "rank": 3},
    {"type": "immunity", "immunityType": "charm", "rank": 3},
    {"type": "immunity", "immunityType": "fear", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 10, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Asp's Venom (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_asps_venom',
  'Asp''s Venom',
  'signature',
  'offensive',
  'cleopatra',
  'Deadly poison attack',
  '"The serpent''s kiss is lethal."',
  '🐍',
  3,
  'active',
  '[
    {"type": "damage", "value": 20, "damageType": "poison", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "poison", "duration": 2, "damage_per_turn": 25, "rank": 1},
    {"type": "damage", "value": 50, "damageType": "poison", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "poison", "duration": 1, "damage_per_turn": 40, "rank": 2},
    {"type": "damage", "value": 90, "damageType": "poison", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "poison", "duration": 2, "damage_per_turn": 60, "rank": 3},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 1, "rank": 3}
  ]'::jsonb,
  1,
  22,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Political Cunning (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_political_cunning',
  'Political Cunning',
  'signature',
  'support',
  'cleopatra',
  'Manipulate the battlefield by stealing enemy buffs',
  '"Everything has a price. I know yours."',
  '📜',
  3,
  'active',
  '[
    {"type": "steal_buff", "count": 1, "from": "single_enemy", "to": "random_ally", "duration": 2, "rank": 1},
    {"type": "steal_buff", "count": 2, "from": "single_enemy", "to": "random_ally", "duration": 1, "rank": 2},
    {"type": "steal_buff", "count": 99, "from": "single_enemy", "to": "all_allies", "duration": 2, "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Divine Favor (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_divine_favor',
  'Divine Favor',
  'signature',
  'support',
  'cleopatra',
  'Blessing of the gods - massive team heal and buff',
  '"The gods smile upon us."',
  '💎',
  3,
  'active',
  '[
    {"type": "heal", "value": 20, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "heal", "value": 40, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "all_allies", "rank": 2},
    {"type": "heal", "value": 70, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 80, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "all_allies", "rank": 3},
    {"type": "shield", "value": 30, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Queen of the Nile (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cleopatra_queen_of_the_nile',
  'Queen of the Nile',
  'signature',
  'offensive',
  'cleopatra',
  'Ultimate authority - empower yourself and allies',
  '"I am Egypt incarnate. Bow before me."',
  '⚱️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 25, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 20, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 100, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 70, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 50, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "immunity", "immunityType": "charm", "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "immunity", "immunityType": "fear", "duration": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  4,
  45,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Cleopatra signature powers - royal leader specialist';
