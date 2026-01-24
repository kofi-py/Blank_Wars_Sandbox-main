-- Add weapon proficiencies for 16 characters (15 new + Crumbsworth)
-- Generated: 2025-10-28
-- All 33 contestants should have weapon proficiencies for Equipment chat

-- 1. Aleister Crowley (Mystic, Human)
UPDATE characters SET
  weapon_proficiencies = '{ceremonial_dagger,wand,staff,ritual_tools,athame}',
  preferred_weapons = '{athame,magical_wand}',
  armor_proficiency = 'light',
  preferred_armor_type = 'robes',
  equipment_notes = 'Prefers occult ceremonial equipment for rituals and magical workings'
WHERE id = 'aleister_crowley';

-- 2. Archangel Michael (Mystic, Angel)
UPDATE characters SET
  weapon_proficiencies = '{flaming_sword,spear,holy_lance,shield,divine_blade}',
  preferred_weapons = '{flaming_sword,divine_spear}',
  armor_proficiency = 'heavy',
  preferred_armor_type = 'celestial_plate',
  equipment_notes = 'Divine weapons only, refuses unholy or cursed armaments'
WHERE id = 'archangel_michael';

-- 3. Crumbsworth (Magical Appliance, Magical Toaster)
UPDATE characters SET
  weapon_proficiencies = '{heating_elements,toaster_slots,bread_launcher,crumb_tray,electrical_discharge}',
  preferred_weapons = '{dual_toaster_slots,breakfast_cannon}',
  armor_proficiency = 'heavy',
  preferred_armor_type = 'stainless_steel',
  equipment_notes = 'Weaponized kitchen appliance with electrically charged attacks'
WHERE id = 'crumbsworth';

-- 4. Don Quixote (Warrior, Human)
UPDATE characters SET
  weapon_proficiencies = '{lance,sword,shield,rusty_weapons}',
  preferred_weapons = '{jousting_lance,rusty_sword}',
  armor_proficiency = 'heavy',
  preferred_armor_type = 'plate',
  equipment_notes = 'Insists on chivalric weapons even if broken or outdated, refuses modern arms'
WHERE id = 'don_quixote';

-- 5. Jack the Ripper (Assassin, Human)
UPDATE characters SET
  weapon_proficiencies = '{knife,dagger,surgical_tools,garrote,scalpel}',
  preferred_weapons = '{surgical_knife,concealed_blade}',
  armor_proficiency = 'light',
  preferred_armor_type = 'none',
  equipment_notes = 'Precision cutting instruments, Victorian era surgical tools preferred'
WHERE id = 'jack_the_ripper';

-- 6. Kali (Mystic, Deity)
UPDATE characters SET
  weapon_proficiencies = '{sword,scimitar,trident,chakram,skull_mace,multiple_weapons}',
  preferred_weapons = '{curved_swords,trishula}',
  armor_proficiency = 'light',
  preferred_armor_type = 'none',
  equipment_notes = 'Wields multiple weapons simultaneously with divine multi-armed form'
WHERE id = 'kali';

-- 7. Kangaroo (Beast, Kangaroo)
UPDATE characters SET
  weapon_proficiencies = '{claws,kicks,boxing_gloves,natural_weapons,tail}',
  preferred_weapons = '{powerful_kicks,boxing_strikes}',
  armor_proficiency = 'none',
  preferred_armor_type = 'none',
  equipment_notes = 'Relies on natural boxing ability, powerful leg kicks, and tail balance'
WHERE id = 'kangaroo';

-- 8. Karna (Warrior, Human)
UPDATE characters SET
  weapon_proficiencies = '{bow,spear,sword,chakra_disc,divine_weapons}',
  preferred_weapons = '{divine_bow,sacred_spear}',
  armor_proficiency = 'heavy',
  preferred_armor_type = 'divine_armor',
  equipment_notes = 'Born with divine Kavacha armor and Kundala earrings, master archer'
WHERE id = 'karna';

-- 9. Little Bo Peep (Beastmaster, Human)
UPDATE characters SET
  weapon_proficiencies = '{staff,crook,sling,rope,whip}',
  preferred_weapons = '{shepherds_crook,sling}',
  armor_proficiency = 'light',
  preferred_armor_type = 'cloth',
  equipment_notes = 'Focuses on herding tools and non-lethal crowd control options'
WHERE id = 'little_bo_peep';

-- 10. Mami Wata (Mystic, Deity)
UPDATE characters SET
  weapon_proficiencies = '{trident,water_magic,mirror,comb,enchanted_items}',
  preferred_weapons = '{enchanted_comb,sacred_mirror}',
  armor_proficiency = 'none',
  preferred_armor_type = 'none',
  equipment_notes = 'Water-based magical implements, uses beauty and allure as weapons'
WHERE id = 'mami_wata';

-- 11. Napoleon Bonaparte (Leader, Human)
UPDATE characters SET
  weapon_proficiencies = '{pistol,saber,sword,cannon,musket}',
  preferred_weapons = '{cavalry_saber,flintlock_pistol}',
  armor_proficiency = 'medium',
  preferred_armor_type = 'military_uniform',
  equipment_notes = 'Napoleonic era military equipment, prefers French imperial arms'
WHERE id = 'napoleon_bonaparte';

-- 12. Quetzalcoatl (Warrior, Deity)
UPDATE characters SET
  weapon_proficiencies = '{feathered_serpent_form,obsidian_blade,atlatl,macuahuitl,tepoztopilli}',
  preferred_weapons = '{obsidian_sword,divine_serpent_strike}',
  armor_proficiency = 'medium',
  preferred_armor_type = 'feathered_armor',
  equipment_notes = 'Aztec divine weapons, can transform into feathered serpent for combat'
WHERE id = 'quetzalcoatl';

-- 13. Ramses II (Leader, Undead)
UPDATE characters SET
  weapon_proficiencies = '{khopesh,scepter,staff,bow,chariot_weapons}',
  preferred_weapons = '{pharaohs_khopesh,was_scepter}',
  armor_proficiency = 'medium',
  preferred_armor_type = 'royal_vestments',
  equipment_notes = 'Ancient Egyptian royal regalia, wrapped in ceremonial bandages'
WHERE id = 'ramses_ii';

-- 14. Shaka Zulu (Leader, Human)
UPDATE characters SET
  weapon_proficiencies = '{iklwa_spear,shield,knobkerrie,throwing_spear,assegai}',
  preferred_weapons = '{iklwa,cowhide_shield}',
  armor_proficiency = 'light',
  preferred_armor_type = 'none',
  equipment_notes = 'Zulu military innovations, revolutionized close combat tactics with short stabbing spear'
WHERE id = 'shaka_zulu';

-- 15. Unicorn (Beast, Unicorn)
UPDATE characters SET
  weapon_proficiencies = '{horn,hooves,magic,healing_aura,charge}',
  preferred_weapons = '{spiral_horn,magical_strikes}',
  armor_proficiency = 'none',
  preferred_armor_type = 'none',
  equipment_notes = 'Spiral horn is primary weapon, refuses manufactured weapons as beneath dignity'
WHERE id = 'unicorn';

-- 16. Velociraptor (Beast, Dinosaur)
UPDATE characters SET
  weapon_proficiencies = '{claws,teeth,tail,natural_weapons,sickle_claw}',
  preferred_weapons = '{sickle_claw,pack_tactics}',
  armor_proficiency = 'none',
  preferred_armor_type = 'natural_scales',
  equipment_notes = 'Pack hunter, uses coordinated strikes and devastating sickle claw attacks'
WHERE id = 'velociraptor';
