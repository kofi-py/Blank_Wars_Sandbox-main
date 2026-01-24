-- Migration: Insert Agent X Signature Powers
-- Purpose: Add 7 unique signature powers for Agent X character
-- Character: Agent X (Assassin, Human) - Stealth, precision, shadow operations

-- ===== AGENT X SIGNATURE POWERS (7 total) =====

-- 1. Precision Strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_precision_strike',
  'Precision Strike',
  'signature',
  'offensive',
  'agent_x',
  'Perfect accuracy attack that cannot miss and ignores defense',
  '"Target acquired. Eliminating."',
  '🎯',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "physical", "target": "single_enemy", "special": "cannot_miss", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "physical", "target": "single_enemy", "special": "cannot_miss", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "ignorePercent": true, "target": "enemy", "rank": 2},
    {"type": "damage", "value": 150, "damageType": "physical", "target": "single_enemy", "special": "cannot_miss", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -60, "ignorePercent": true, "target": "enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 50, "duration": 0, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Shadow Cloak (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_shadow_cloak',
  'Shadow Cloak',
  'signature',
  'defensive',
  'agent_x',
  'Become untargetable and increase evasion',
  '"Vanishing into the shadows."',
  '🌑',
  3,
  'active',
  '[
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "untargetable", "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 60, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 100, "duration": 1, "appliesTo": "next_attack", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  20,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Assassination Training (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_assassination_training',
  'Assassination Training',
  'signature',
  'passive',
  'agent_x',
  'Master of stealth kills - bonus damage against healthy targets',
  '"First strike is always lethal."',
  '🗡️',
  3,
  'passive',
  '[
    {"type": "conditional", "condition": "target_hp_above", "threshold": 80, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 15, "target": "self"}
    ], "rank": 1},
    {"type": "conditional", "condition": "target_hp_above", "threshold": 70, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 35, "target": "self"},
      {"type": "special", "specialType": "cannot_be_countered", "target": "self"}
    ], "rank": 2},
    {"type": "conditional", "condition": "target_hp_above", "threshold": 60, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 60, "target": "self"},
      {"type": "special", "specialType": "cannot_be_countered", "target": "self"},
      {"type": "stat_modifier", "stat": "critical_damage", "value": 20, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Execute (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_execute',
  'Execute',
  'signature',
  'offensive',
  'agent_x',
  'Finish weakened targets - instant kill below HP threshold',
  '"Target eliminated."',
  '💀',
  3,
  'active',
  '[
    {"type": "execute", "threshold": 20, "rank": 1},
    {"type": "execute", "threshold": 30, "rank": 2},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "execute", "threshold": 40, "rank": 3},
    {"type": "damage", "value": 180, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "duration": 1, "chance": 50, "rank": 3}
  ]'::jsonb,
  3,
  25,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Disguise (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_disguise',
  'Disguise',
  'signature',
  'support',
  'agent_x',
  'Confuse and redirect enemy attacks',
  '"They never see it coming."',
  '🎭',
  3,
  'active',
  '[
    {"type": "redirect_attack", "count": 1, "target": "self", "rank": 1},
    {"type": "redirect_attack", "chance": 40, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 3},
    {"type": "redirect_attack", "chance": 100, "duration": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  15,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Bleed Out (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_bleed_out',
  'Bleed Out',
  'signature',
  'offensive',
  'agent_x',
  'Devastating wound that reduces healing and causes bleeding',
  '"This one won''t heal."',
  '🔪',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 2, "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 2, "rank": 2},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 1, "damage_per_turn": 30, "rank": 2},
    {"type": "damage", "value": 160, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 2, "rank": 3},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 2, "damage_per_turn": 50, "rank": 3},
    {"type": "max_hp_reduction", "value": 10, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Ghost Protocol (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'agent_x_ghost_protocol',
  'Ghost Protocol',
  'signature',
  'offensive',
  'agent_x',
  'Ultimate stealth operation - untargetable with massive damage boost',
  '"Initiating ghost protocol. Going dark."',
  '👤',
  3,
  'active',
  '[
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "untargetable", "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "apply_on_hit", "statusEffect": "bleed", "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 120, "duration": 1, "target": "self", "rank": 3},
    {"type": "apply_on_hit", "statusEffect": "bleed", "rank": 3},
    {"type": "special", "specialType": "ignore_armor", "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  4,
  40,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Agent X signature powers - stealth assassin specialist';
