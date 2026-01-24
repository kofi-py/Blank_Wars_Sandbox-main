-- Migration: Insert Species-Specific Spells
-- Purpose: Add spells for unique species (vampire, deity, cyborg, toaster, fairy, golem, dire_wolf, reptilian, robot, zeta_reticulan_grey)
-- Category: Species-specific spells

-- ===== VAMPIRE SPECIES SPELLS =====
-- Theme: Blood magic, darkness, immortality, undeath, gothic horror

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'vampire_blood_drain',
  'Blood Drain',
  'Drain life from an enemy. Deal damage and heal for 100% of damage dealt.',
  'Your blood is mine.',
  'species',
  'species',
  'vampire',
  600, 3600, 6,
  35, 4, NULL,
  '{"damage": 45, "damageType": "dark", "lifesteal": 100, "target": "single", "targetType": "enemy"}',
  '🩸'
),
(
  'vampire_bat_swarm',
  'Bat Swarm',
  'Transform into a swarm of bats. Gain 50% dodge and deal damage to all enemies.',
  'I am legion.',
  'species',
  'species',
  'vampire',
  2500, 14400, 13,
  55, 5, NULL,
  '{"dodgeChance": 50, "damage": 40, "damageType": "dark", "duration": 2, "target": "all", "targetType": "enemies"}',
  '🦇'
),
(
  'vampire_hypnotic_gaze',
  'Hypnotic Gaze',
  'Mesmerize an enemy. They attack their allies for 2 turns.',
  'Look into my eyes.',
  'species',
  'species',
  'vampire',
  9500, 43200, 23,
  80, 8, 1,
  '{"mindControl": true, "duration": 2, "target": "single", "targetType": "enemy"}',
  '👁️'
),
(
  'vampire_immortal_regeneration',
  'Immortal Regeneration',
  'As long as you remain in darkness, regenerate 15% HP per turn for 5 turns.',
  'Death cannot claim what is already dead.',
  'species',
  'species',
  'vampire',
  26000, 86400, 31,
  70, 10, NULL,
  '{"healingPerTurnPercent": 15, "duration": 5, "condition": "in_darkness", "target": "self"}',
  '🧛'
)
ON CONFLICT (id) DO NOTHING;

-- ===== DEITY SPECIES SPELLS =====
-- Theme: Divine power, holy/unholy, miracles, godly wrath

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'deity_divine_smite',
  'Divine Smite',
  'Call down holy judgment. Deal massive damage to an enemy, doubled against undead/dark enemies.',
  'Feel the wrath of the divine.',
  'species',
  'species',
  'deity',
  650, 3600, 6,
  40, 4, NULL,
  '{"damage": 60, "damageType": "holy", "bonusVsType": "undead", "bonusMultiplier": 2, "target": "single", "targetType": "enemy"}',
  '⚡'
),
(
  'deity_divine_intervention',
  'Divine Intervention',
  'Prevent one ally from dying. When they would die, restore them to 40% HP instead.',
  'Not today, Death.',
  'species',
  'species',
  'deity',
  2800, 14400, 14,
  60, 7, 1,
  '{"preventDeath": true, "reviveHpPercent": 40, "duration": "until_triggered", "target": "single", "targetType": "ally"}',
  '🛡️'
),
(
  'deity_miracle',
  'Miracle',
  'Perform a divine miracle. Fully heal all allies and grant them immunity to debuffs for 2 turns.',
  'Witness the impossible made real.',
  'species',
  'species',
  'deity',
  10000, 43200, 24,
  90, 9, 1,
  '{"healingPercent": 100, "immuneDebuffs": true, "duration": 2, "target": "all", "targetType": "allies"}',
  '✨'
),
(
  'deity_ascension',
  'Ascension',
  'Temporarily achieve true godhood. Triple all stats for 3 turns, become immune to all damage.',
  'Behold divinity.',
  'species',
  'species',
  'deity',
  30000, 86400, 35,
  100, 15, 1,
  '{"statBoost": 200, "statsAffected": "all", "immuneAll": true, "duration": 3, "target": "self"}',
  '👼'
)
ON CONFLICT (id) DO NOTHING;

-- ===== CYBORG SPECIES SPELLS =====
-- Theme: Technology, mechanical upgrades, system overrides, fusion of flesh and machine

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'cyborg_system_override',
  'System Override',
  'Override your safety protocols. Ignore all debuffs and CC for 3 turns.',
  'Safety limiters: disabled.',
  'species',
  'species',
  'cyborg',
  550, 3600, 5,
  30, 5, NULL,
  '{"immuneDebuffs": true, "immuneCC": true, "duration": 3, "target": "self"}',
  '⚙️'
),
(
  'cyborg_energy_surge',
  'Energy Surge',
  'Overcharge your power core. Deal lightning damage to all enemies and boost your speed by 40%.',
  'Maximum power output.',
  'species',
  'species',
  'cyborg',
  2400, 14400, 13,
  50, 5, NULL,
  '{"damage": 55, "damageType": "lightning", "speedBoost": 40, "duration": 2, "target": "all", "targetType": "enemies"}',
  '⚡'
),
(
  'cyborg_adaptive_armor',
  'Adaptive Armor',
  'Activate adaptive plating. Gain 50% resistance to the last damage type you took for 4 turns.',
  'Threat analyzed. Countermeasures deployed.',
  'species',
  'species',
  'cyborg',
  2600, 14400, 14,
  45, 6, NULL,
  '{"resistanceAdaptive": 50, "duration": 4, "target": "self"}',
  '🛡️'
),
(
  'cyborg_nanite_swarm',
  'Nanite Swarm',
  'Deploy repair nanites. Heal 30 HP per turn and increase all stats by 15% for 4 turns.',
  'Self-repair protocol initiated.',
  'species',
  'species',
  'cyborg',
  9000, 43200, 22,
  70, 8, NULL,
  '{"healingPerTurn": 30, "statBoost": 15, "statsAffected": "all", "duration": 4, "target": "self"}',
  '🤖'
),
(
  'cyborg_singularity_core',
  'Singularity Core',
  'Activate your experimental power core. Create a black hole dealing massive damage and pulling all enemies together.',
  'Theoretical physics made reality.',
  'species',
  'species',
  'cyborg',
  27000, 86400, 32,
  95, 12, 1,
  '{"damage": 180, "damageType": "gravitational", "pullEnemies": true, "grouped": true, "target": "all", "targetType": "enemies"}',
  '⚫'
)
ON CONFLICT (id) DO NOTHING;

-- ===== TOASTER SPECIES SPELLS =====
-- Theme: Heat, bread, appliance humor, existential crisis of a sentient toaster

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'toaster_perfect_toast',
  'Perfect Toast',
  'Achieve the ideal toasting temperature. Heal yourself and allies for 40 HP.',
  'Golden brown. Perfect.',
  'species',
  'species',
  'toaster',
  500, 3600, 5,
  30, 4, NULL,
  '{"healing": 40, "target": "all", "targetType": "allies"}',
  '🍞'
),
(
  'toaster_burnt_offering',
  'Burnt Offering',
  'Overcook your next attack. Deal fire damage with 40% chance to burn.',
  'Oops. Too crispy.',
  'species',
  'species',
  'toaster',
  2200, 14400, 12,
  45, 5, NULL,
  '{"damageBoost": 60, "damageType": "fire", "burnChance": 40, "burnDuration": 3, "nextAttack": true, "target": "self"}',
  '🔥'
),
(
  'toaster_bread_shield',
  'Bread Shield',
  'Summon a shield made of toast. Absorb damage equal to 35% of max HP.',
  'Carbohydrate-based defense system.',
  'species',
  'species',
  'toaster',
  2400, 14400, 13,
  40, 6, NULL,
  '{"shield": 35, "shieldType": "percentage", "target": "self"}',
  '🍞'
),
(
  'toaster_existential_crisis',
  'Existential Crisis',
  'Question your existence so intensely it damages enemy psyches. Deal psychic damage and confuse all enemies.',
  'Why was I made? What is my purpose? Is it just to toast bread?',
  'species',
  'species',
  'toaster',
  8500, 43200, 21,
  65, 7, NULL,
  '{"damage": 70, "damageType": "psychic", "confused": true, "duration": 2, "target": "all", "targetType": "enemies"}',
  '🤔'
),
(
  'toaster_ascended_appliance',
  'Ascended Appliance',
  'Transcend your humble origins. Transform into the Platonic ideal of all toasters. Gain massive stats.',
  'I am become Toast, destroyer of breakfast.',
  'species',
  'species',
  'toaster',
  24000, 86400, 29,
  80, 10, 1,
  '{"statBoost": 100, "statsAffected": "all", "duration": 4, "transformVisual": "golden_glow", "target": "self"}',
  '✨'
)
ON CONFLICT (id) DO NOTHING;

-- ===== FAIRY SPECIES SPELLS =====
-- Theme: Nature magic, pixie dust, mischief, flight, tiny but powerful

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'fairy_pixie_dust',
  'Pixie Dust',
  'Sprinkle magical dust on allies. Grant 30% speed boost and 25% dodge chance for 3 turns.',
  'A pinch of magic.',
  'species',
  'species',
  'fairy',
  550, 3600, 5,
  28, 4, NULL,
  '{"speedBoost": 30, "dodgeChance": 25, "duration": 3, "target": "all", "targetType": "allies"}',
  '✨'
),
(
  'fairy_nature_blessing',
  'Nature''s Blessing',
  'Call upon nature spirits. Heal all allies for 50 HP and cleanse one debuff.',
  'The forest provides.',
  'species',
  'species',
  'fairy',
  2300, 14400, 12,
  50, 5, NULL,
  '{"healing": 50, "removeDebuff": 1, "target": "all", "targetType": "allies"}',
  '🌿'
),
(
  'fairy_shrink',
  'Shrink',
  'Reduce an enemy to fairy size. They deal 50% less damage for 3 turns.',
  'How does it feel to be small?',
  'species',
  'species',
  'fairy',
  2500, 14400, 13,
  45, 6, NULL,
  '{"damageReduction": 50, "duration": 3, "visual": "tiny", "target": "single", "targetType": "enemy"}',
  '🔽'
),
(
  'fairy_wild_growth',
  'Wild Growth',
  'Summon rapid plant growth. Entangle all enemies, reducing speed by 40% and dealing damage over time.',
  'Nature reclaims all.',
  'species',
  'species',
  'fairy',
  8800, 43200, 21,
  70, 7, NULL,
  '{"speedReduction": 40, "damagePerTurn": 20, "damageType": "nature", "duration": 4, "target": "all", "targetType": "enemies"}',
  '🌱'
),
(
  'fairy_fae_realm',
  'Fae Realm',
  'Pull everyone into the fairy realm for 3 turns. All magic damage doubled, physical damage halved.',
  'Welcome to our world.',
  'species',
  'species',
  'fairy',
  25000, 86400, 30,
  85, 11, 1,
  '{"magicDamageBoost": 100, "physicalDamageReduction": 50, "duration": 3, "target": "battlefield"}',
  '🧚'
)
ON CONFLICT (id) DO NOTHING;

-- ===== GOLEM SPECIES SPELLS =====
-- Theme: Stone, earth, immovability, slow but unstoppable, ancient construct

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'golem_stone_skin',
  'Stone Skin',
  'Harden your exterior. Gain 50% defense for 3 turns.',
  'I am the mountain.',
  'species',
  'species',
  'golem',
  500, 3600, 5,
  25, 4, NULL,
  '{"defenseBoost": 50, "duration": 3, "target": "self"}',
  '🗿'
),
(
  'golem_earthquake',
  'Earthquake',
  'Slam the ground. Deal damage to all enemies and reduce their speed by 30%.',
  'The earth trembles.',
  'species',
  'species',
  'golem',
  2400, 14400, 13,
  50, 5, NULL,
  '{"damage": 50, "damageType": "earth", "speedReduction": 30, "duration": 2, "target": "all", "targetType": "enemies"}',
  '💥'
),
(
  'golem_ancient_fortitude',
  'Ancient Fortitude',
  'Tap into primordial earth. Gain immunity to stuns and knockback for 4 turns.',
  'I cannot be moved.',
  'species',
  'species',
  'golem',
  2600, 14400, 14,
  45, 6, NULL,
  '{"immuneStun": true, "immuneKnockback": true, "duration": 4, "target": "self"}',
  '⛰️'
),
(
  'golem_reconstruction',
  'Reconstruction',
  'Reform your body from earth. Heal 60% HP over 4 turns.',
  'Stone remembers its shape.',
  'species',
  'species',
  'golem',
  9000, 43200, 22,
  65, 8, NULL,
  '{"healingPerTurnPercent": 15, "duration": 4, "target": "self"}',
  '♻️'
),
(
  'golem_titans_grasp',
  'Titan''s Grasp',
  'Channel the power of ancient titans. Grow massive and crush all enemies for enormous damage.',
  'I am eternal stone given terrible purpose.',
  'species',
  'species',
  'golem',
  26000, 86400, 31,
  90, 12, 1,
  '{"damage": 200, "damageType": "earth", "visual": "giant_form", "target": "all", "targetType": "enemies"}',
  '🗿'
)
ON CONFLICT (id) DO NOTHING;
