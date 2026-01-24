-- Migration: Insert Universal Spells
-- Purpose: Add universal spells available to all characters
-- Category: Universal (no class/archetype/species restrictions)

-- ===== COMMON TIER UNIVERSAL SPELLS (5 spells) =====

-- 1. Minor Heal
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_minor_heal',
  'Minor Heal',
  'Restore a small amount of HP to yourself or an ally.',
  'Basic healing magic, the foundation of restorative arts.',
    'universal',
  'universal',
  100, 0, 1,
  15, 2, NULL,
  '{"healing": 25, "target": "single", "targetType": "ally_or_self"}',
  '💚'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Shield
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_shield',
  'Shield',
  'Grant temporary defense boost to yourself or an ally for 2 turns.',
  'A protective barrier that deflects incoming attacks.',
    'universal',
  'universal',
  100, 0, 1,
  20, 3, NULL,
  '{"defenseBoost": 20, "duration": 2, "target": "single", "targetType": "ally_or_self"}',
  '🛡️'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Haste
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_haste',
  'Haste',
  'Increase speed for 3 turns, improving turn order.',
  'Time moves faster for the blessed.',
    'universal',
  'universal',
  150, 0, 2,
  18, 4, NULL,
  '{"speedBoost": 30, "duration": 3, "target": "single", "targetType": "ally_or_self"}',
  '⚡'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Slow
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_slow',
  'Slow',
  'Decrease enemy speed for 2 turns, delaying their actions.',
  'The sands of time grow heavy.',
    'universal',
  'universal',
  150, 0, 2,
  18, 3, NULL,
  '{"speedReduction": 30, "duration": 2, "target": "single", "targetType": "enemy"}',
  '🐌'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Dispel
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_dispel',
  'Dispel',
  'Remove one negative status effect from an ally or one positive effect from an enemy.',
  'Purification through pure magical force.',
    'universal',
  'universal',
  200, 0, 3,
  20, 4, NULL,
  '{"removeStatus": true, "target": "single", "targetType": "any"}',
  '✨'
)
ON CONFLICT (id) DO NOTHING;

-- ===== UNCOMMON TIER UNIVERSAL SPELLS (5 spells) =====

-- 6. Moderate Heal
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_moderate_heal',
  'Moderate Heal',
  'Restore a moderate amount of HP to yourself or an ally.',
  'Enhanced healing arts for serious wounds.',
    'universal',
  'universal',
  500, 3600, 5,
  30, 3, NULL,
  '{"healing": 60, "target": "single", "targetType": "ally_or_self"}',
  '💚'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Mass Shield
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_mass_shield',
  'Mass Shield',
  'Grant temporary defense boost to all allies for 2 turns.',
  'A barrier that protects the entire party.',
    'universal',
  'universal',
  600, 3600, 6,
  40, 5, NULL,
  '{"defenseBoost": 15, "duration": 2, "target": "all", "targetType": "allies"}',
  '🛡️'
)
ON CONFLICT (id) DO NOTHING;

-- 8. Cleanse
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_cleanse',
  'Cleanse',
  'Remove all negative status effects from a single ally.',
  'Purifying light that burns away all ailments.',
    'universal',
  'universal',
  550, 3600, 5,
  35, 5, NULL,
  '{"removeAllNegative": true, "target": "single", "targetType": "ally"}',
  '✨'
)
ON CONFLICT (id) DO NOTHING;

-- 9. Mana Surge
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_mana_surge',
  'Mana Surge',
  'Restore 30 mana to yourself or an ally.',
  'Channel raw magical energy to refuel depleted reserves.',
    'universal',
  'universal',
  500, 3600, 6,
  20, 4, NULL,
  '{"manaRestore": 30, "target": "single", "targetType": "ally_or_self"}',
  '🔮'
)
ON CONFLICT (id) DO NOTHING;

-- 10. Fortitude
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_fortitude',
  'Fortitude',
  'Increase maximum HP by 20% for 4 turns.',
  'Bolster vitality and endurance beyond natural limits.',
    'universal',
  'universal',
  600, 7200, 7,
  30, 5, NULL,
  '{"maxHpBoost": 20, "duration": 4, "target": "single", "targetType": "ally_or_self"}',
  '💪'
)
ON CONFLICT (id) DO NOTHING;

-- ===== RARE TIER UNIVERSAL SPELLS (5 spells) =====

-- 11. Greater Heal
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_greater_heal',
  'Greater Heal',
  'Restore a large amount of HP to yourself or an ally.',
  'Advanced restorative magic that mends even grievous wounds.',
    'universal',
  'universal',
  2000, 14400, 12,
  50, 4, NULL,
  '{"healing": 120, "target": "single", "targetType": "ally_or_self"}',
  '💚'
)
ON CONFLICT (id) DO NOTHING;

-- 12. Barrier
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_barrier',
  'Barrier',
  'Create a shield that absorbs damage equal to 30% of max HP for 3 turns.',
  'An impenetrable force field against all harm.',
    'universal',
  'universal',
  2500, 14400, 13,
  55, 6, NULL,
  '{"shield": 30, "shieldType": "percentage", "duration": 3, "target": "single", "targetType": "ally_or_self"}',
  '🛡️'
)
ON CONFLICT (id) DO NOTHING;

-- 13. Time Warp
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_time_warp',
  'Time Warp',
  'Reset all cooldowns for a single ally.',
  'Manipulate time itself to undo what has been done.',
    'universal',
  'universal',
  3000, 21600, 15,
  60, 8, 1,
  '{"resetCooldowns": true, "target": "single", "targetType": "ally_or_self"}',
  '⏰'
)
ON CONFLICT (id) DO NOTHING;

-- 14. Mass Cleanse
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_mass_cleanse',
  'Mass Cleanse',
  'Remove all negative status effects from all allies.',
  'A wave of purifying energy that cleanses the entire battlefield.',
    'universal',
  'universal',
  2800, 21600, 14,
  70, 7, NULL,
  '{"removeAllNegative": true, "target": "all", "targetType": "allies"}',
  '✨'
)
ON CONFLICT (id) DO NOTHING;

-- 15. Reflection
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_reflection',
  'Reflection',
  'Reflect 50% of damage taken back to attacker for 2 turns.',
  'Let your enemies taste their own medicine.',
    'universal',
  'universal',
  2200, 14400, 12,
  45, 5, NULL,
  '{"reflectDamage": 50, "duration": 2, "target": "single", "targetType": "ally_or_self"}',
  '🪞'
)
ON CONFLICT (id) DO NOTHING;

-- ===== EPIC TIER UNIVERSAL SPELLS (3 spells) =====

-- 16. Full Heal
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_full_heal',
  'Full Heal',
  'Restore target to maximum HP and remove all negative status effects.',
  'The ultimate restorative magic, a complete renewal.',
    'universal',
  'universal',
  8000, 43200, 20,
  80, 6, 2,
  '{"healingPercent": 100, "removeAllNegative": true, "target": "single", "targetType": "ally_or_self"}',
  '💚'
)
ON CONFLICT (id) DO NOTHING;

-- 17. Resurrection
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_resurrection',
  'Resurrection',
  'Revive a fallen ally with 50% HP.',
  'Defy death itself and call back the departed.',
    'universal',
  'universal',
  10000, 43200, 22,
  100, 10, 1,
  '{"revive": true, "reviveHpPercent": 50, "target": "dead_ally", "targetType": "dead"}',
  '⚱️'
)
ON CONFLICT (id) DO NOTHING;

-- 18. Time Stop
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_time_stop',
  'Time Stop',
  'Take an extra turn immediately. All allies gain +20% speed for 2 turns after.',
  'Freeze time and act while the world stands still.',
    'universal',
  'universal',
  12000, 43200, 25,
  90, 10, 1,
  '{"extraTurn": true, "speedBoost": 20, "boostDuration": 2, "target": "all", "targetType": "allies"}',
  '⏸️'
)
ON CONFLICT (id) DO NOTHING;

-- ===== LEGENDARY TIER UNIVERSAL SPELLS (2 spells) =====

-- 19. Ultima
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_ultima',
  'Ultima',
  'Massive non-elemental damage to all enemies.',
  'The ultimate destructive magic, feared across all realms.',
    'universal',
  'universal',
  25000, 86400, 30,
  100, 8, 1,
  '{"damage": 200, "damageType": "non-elemental", "target": "all", "targetType": "enemies"}',
  '💥'
)
ON CONFLICT (id) DO NOTHING;

-- 20. Miracle
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES (
  'universal_miracle',
  'Miracle',
  'Fully heal all allies, remove all negative effects, and grant invulnerability for 1 turn.',
  'A divine intervention that turns the tide of any battle.',
    'universal',
  'universal',
  30000, 86400, 35,
  150, 15, 1,
  '{"healingPercent": 100, "removeAllNegative": true, "invulnerable": true, "invulnDuration": 1, "target": "all", "targetType": "allies"}',
  '🌟'
)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE spell_definitions IS 'Universal spells batch 1: 20 spells across all tiers (Common: 5, Uncommon: 5, Rare: 5, Epic: 3, Legendary: 2)';

