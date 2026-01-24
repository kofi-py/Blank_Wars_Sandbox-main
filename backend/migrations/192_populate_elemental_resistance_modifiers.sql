-- Migration 191: Populate elemental resistance modifiers for archetypes, species, and individuals
-- All values based on logical reasoning for each character's nature
-- Base value is 50, modifiers adjust from there

BEGIN;

-- =====================================================
-- ARCHETYPE ELEMENTAL MODIFIERS
-- =====================================================

-- warrior: Battle-hardened, general environmental resilience
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('warrior', 'fire_resistance', 5),
  ('warrior', 'cold_resistance', 5),
  ('warrior', 'lightning_resistance', 0),
  ('warrior', 'toxic_resistance', 5)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- beast: Animals have natural toxin resistance from wild living
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('beast', 'fire_resistance', 0),
  ('beast', 'cold_resistance', 0),
  ('beast', 'lightning_resistance', 0),
  ('beast', 'toxic_resistance', 10)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- tank: Built to withstand all damage types
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('tank', 'fire_resistance', 10),
  ('tank', 'cold_resistance', 10),
  ('tank', 'lightning_resistance', 5),
  ('tank', 'toxic_resistance', 10)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- assassin: Train with poisons, built up tolerance
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('assassin', 'fire_resistance', 0),
  ('assassin', 'cold_resistance', 0),
  ('assassin', 'lightning_resistance', 0),
  ('assassin', 'toxic_resistance', 15)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- mage: Magical affinity provides some elemental protection
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('mage', 'fire_resistance', 5),
  ('mage', 'cold_resistance', 5),
  ('mage', 'lightning_resistance', 10),
  ('mage', 'toxic_resistance', 0)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- scholar: Academic knowledge of toxins
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('scholar', 'fire_resistance', 0),
  ('scholar', 'cold_resistance', 0),
  ('scholar', 'lightning_resistance', 0),
  ('scholar', 'toxic_resistance', 5)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- trickster: Often use poisons, built tolerance
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('trickster', 'fire_resistance', 0),
  ('trickster', 'cold_resistance', 0),
  ('trickster', 'lightning_resistance', 0),
  ('trickster', 'toxic_resistance', 10)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- detective: Forensic knowledge of toxins
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('detective', 'fire_resistance', 0),
  ('detective', 'cold_resistance', 0),
  ('detective', 'lightning_resistance', 0),
  ('detective', 'toxic_resistance', 5)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- leader: Disciplined, some resilience
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('leader', 'fire_resistance', 5),
  ('leader', 'cold_resistance', 5),
  ('leader', 'lightning_resistance', 0),
  ('leader', 'toxic_resistance', 0)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- beastmaster: Work with venomous creatures, high toxin tolerance
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('beastmaster', 'fire_resistance', 0),
  ('beastmaster', 'cold_resistance', 0),
  ('beastmaster', 'lightning_resistance', 0),
  ('beastmaster', 'toxic_resistance', 15)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- magical_appliance: Machines love temp extremes, WEAK to electricity, no biology
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('magical_appliance', 'fire_resistance', 15),
  ('magical_appliance', 'cold_resistance', 15),
  ('magical_appliance', 'lightning_resistance', -25),
  ('magical_appliance', 'toxic_resistance', 30)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- mystic: Spiritual/occult protection from elements
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('mystic', 'fire_resistance', 10),
  ('mystic', 'cold_resistance', 10),
  ('mystic', 'lightning_resistance', 10),
  ('mystic', 'toxic_resistance', 5)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- system: NPCs, neutral baseline
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier)
VALUES
  ('system', 'fire_resistance', 0),
  ('system', 'cold_resistance', 0),
  ('system', 'lightning_resistance', 0),
  ('system', 'toxic_resistance', 0)
ON CONFLICT (archetype, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- =====================================================
-- SPECIES ELEMENTAL MODIFIERS
-- =====================================================

-- human: Baseline, no special resistances
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('human', 'fire_resistance', 0),
  ('human', 'cold_resistance', 0),
  ('human', 'lightning_resistance', 0),
  ('human', 'toxic_resistance', 0)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- angel: Divine beings, holy fire doesn't burn them, resistant to corruption
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('angel', 'fire_resistance', 20),
  ('angel', 'cold_resistance', 10),
  ('angel', 'lightning_resistance', 10),
  ('angel', 'toxic_resistance', 30)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- vampire: Flammable (sunlight=fire weakness), cold doesn't bother undead, no metabolism=poison immune
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('vampire', 'fire_resistance', -30),
  ('vampire', 'cold_resistance', 20),
  ('vampire', 'lightning_resistance', 0),
  ('vampire', 'toxic_resistance', 30)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- undead: Dried flesh/wrappings VERY flammable, cold can't kill what's dead, no metabolism
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('undead', 'fire_resistance', -25),
  ('undead', 'cold_resistance', 15),
  ('undead', 'lightning_resistance', 10),
  ('undead', 'toxic_resistance', 40)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- deity: Divine beings transcend mortal elements
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('deity', 'fire_resistance', 15),
  ('deity', 'cold_resistance', 15),
  ('deity', 'lightning_resistance', 15),
  ('deity', 'toxic_resistance', 30)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- dinosaur: Cold-blooded = VERY weak to cold, scales give fire protection, primitive biology weak to toxins
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('dinosaur', 'fire_resistance', 10),
  ('dinosaur', 'cold_resistance', -30),
  ('dinosaur', 'lightning_resistance', 0),
  ('dinosaur', 'toxic_resistance', -10)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- dire_wolf: Arctic wolf adapted to extreme cold, thick fur
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('dire_wolf', 'fire_resistance', 5),
  ('dire_wolf', 'cold_resistance', 25),
  ('dire_wolf', 'lightning_resistance', 0),
  ('dire_wolf', 'toxic_resistance', 10)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- golem: Stone/flesh construct, conductive, no biology
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('golem', 'fire_resistance', 20),
  ('golem', 'cold_resistance', 15),
  ('golem', 'lightning_resistance', -15),
  ('golem', 'toxic_resistance', 40)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- robot: Metal handles temp, VERY weak to electricity, no biology
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('robot', 'fire_resistance', 10),
  ('robot', 'cold_resistance', 10),
  ('robot', 'lightning_resistance', -30),
  ('robot', 'toxic_resistance', 50)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- cyborg: Part machine = electrical weakness, part human = some toxin vulnerability
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('cyborg', 'fire_resistance', 5),
  ('cyborg', 'cold_resistance', 5),
  ('cyborg', 'lightning_resistance', -20),
  ('cyborg', 'toxic_resistance', 20)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- human_magical: Magical nature provides elemental protection
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('human_magical', 'fire_resistance', 10),
  ('human_magical', 'cold_resistance', 10),
  ('human_magical', 'lightning_resistance', 10),
  ('human_magical', 'toxic_resistance', 5)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- kangaroo: Australian = heat adapted, NOT cold adapted
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('kangaroo', 'fire_resistance', 5),
  ('kangaroo', 'cold_resistance', -15),
  ('kangaroo', 'lightning_resistance', 0),
  ('kangaroo', 'toxic_resistance', 5)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- magical_toaster: Literally a toaster = loves heat, metal = very weak to electricity
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('magical_toaster', 'fire_resistance', 30),
  ('magical_toaster', 'cold_resistance', 20),
  ('magical_toaster', 'lightning_resistance', -40),
  ('magical_toaster', 'toxic_resistance', 50)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- unicorn: Magical purity provides protection, especially vs corruption/toxins
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('unicorn', 'fire_resistance', 10),
  ('unicorn', 'cold_resistance', 15),
  ('unicorn', 'lightning_resistance', 5),
  ('unicorn', 'toxic_resistance', 25)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- zeta_reticulan_grey: Tech-adapted (lightning resistant), but vulnerable to Earth pathogens/toxins
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('zeta_reticulan_grey', 'fire_resistance', 5),
  ('zeta_reticulan_grey', 'cold_resistance', -5),
  ('zeta_reticulan_grey', 'lightning_resistance', 15),
  ('zeta_reticulan_grey', 'toxic_resistance', -15)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- reptilian: Cold-blooded but less extreme than dinosaur
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('reptilian', 'fire_resistance', 5),
  ('reptilian', 'cold_resistance', -20),
  ('reptilian', 'lightning_resistance', 0),
  ('reptilian', 'toxic_resistance', 5)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- fairy: Small delicate body, cold affects them, very vulnerable to toxins due to size
INSERT INTO species_attribute_modifiers (species, attribute_name, modifier)
VALUES
  ('fairy', 'fire_resistance', 5),
  ('fairy', 'cold_resistance', -10),
  ('fairy', 'lightning_resistance', 5),
  ('fairy', 'toxic_resistance', -20)
ON CONFLICT (species, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- =====================================================
-- INDIVIDUAL CHARACTER ELEMENTAL MODIFIERS
-- =====================================================

-- achilles: Near-invulnerable but poison could work through blood
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('achilles', 'fire_resistance', 0),
  ('achilles', 'cold_resistance', 0),
  ('achilles', 'lightning_resistance', 0),
  ('achilles', 'toxic_resistance', -10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- agent_x: Spy training includes poison resistance
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('agent_x', 'fire_resistance', 0),
  ('agent_x', 'cold_resistance', 0),
  ('agent_x', 'lightning_resistance', 0),
  ('agent_x', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- aleister_crowley: Occult protection, but heavy drug use = weakened toxin processing
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('aleister_crowley', 'fire_resistance', 10),
  ('aleister_crowley', 'cold_resistance', 10),
  ('aleister_crowley', 'lightning_resistance', 10),
  ('aleister_crowley', 'toxic_resistance', -20)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- archangel_michael: Chief warrior angel, extra divine protection
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('archangel_michael', 'fire_resistance', 10),
  ('archangel_michael', 'cold_resistance', 5),
  ('archangel_michael', 'lightning_resistance', 5),
  ('archangel_michael', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- billy_the_kid: Young, reckless outlaw, no special traits
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('billy_the_kid', 'fire_resistance', 0),
  ('billy_the_kid', 'cold_resistance', -5),
  ('billy_the_kid', 'lightning_resistance', 0),
  ('billy_the_kid', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- cleopatra: Egyptian queen (heat adapted, cold vulnerable), famous for poison expertise
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('cleopatra', 'fire_resistance', 5),
  ('cleopatra', 'cold_resistance', -10),
  ('cleopatra', 'lightning_resistance', 0),
  ('cleopatra', 'toxic_resistance', 20)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- dracula: EXTRA fire weakness beyond vampire, Transylvanian cold master
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('dracula', 'fire_resistance', -15),
  ('dracula', 'cold_resistance', 10),
  ('dracula', 'lightning_resistance', 0),
  ('dracula', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- crumbsworth: Sentient toaster, already covered by species
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('crumbsworth', 'fire_resistance', 5),
  ('crumbsworth', 'cold_resistance', 0),
  ('crumbsworth', 'lightning_resistance', -5),
  ('crumbsworth', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- don_quixote: Delusional knight, no special elemental traits
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('don_quixote', 'fire_resistance', 0),
  ('don_quixote', 'cold_resistance', 0),
  ('don_quixote', 'lightning_resistance', 0),
  ('don_quixote', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- fenrir: Norse mythological wolf, Ragnarok-level cold resistance
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('fenrir', 'fire_resistance', 0),
  ('fenrir', 'cold_resistance', 15),
  ('fenrir', 'lightning_resistance', 0),
  ('fenrir', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- frankenstein_monster: VERY fire-phobic, literally POWERED by electricity
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('frankenstein_monster', 'fire_resistance', -20),
  ('frankenstein_monster', 'cold_resistance', 5),
  ('frankenstein_monster', 'lightning_resistance', 30),
  ('frankenstein_monster', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- genghis_khan: Mongolian steppes = extreme cold survival
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('genghis_khan', 'fire_resistance', 5),
  ('genghis_khan', 'cold_resistance', 20),
  ('genghis_khan', 'lightning_resistance', 0),
  ('genghis_khan', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- jack_the_ripper: Victorian London cold/fog, surgical knowledge of toxins
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('jack_the_ripper', 'fire_resistance', 0),
  ('jack_the_ripper', 'cold_resistance', 5),
  ('jack_the_ripper', 'lightning_resistance', 0),
  ('jack_the_ripper', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- joan: Burned at stake but protected by divine faith - fire resistance is thematic
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('joan', 'fire_resistance', 20),
  ('joan', 'cold_resistance', 0),
  ('joan', 'lightning_resistance', 0),
  ('joan', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- kali: Goddess of destruction, depicted with poison/serpents
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('kali', 'fire_resistance', 15),
  ('kali', 'cold_resistance', 5),
  ('kali', 'lightning_resistance', 5),
  ('kali', 'toxic_resistance', 20)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- kangaroo: Already covered by species
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('kangaroo', 'fire_resistance', 5),
  ('kangaroo', 'cold_resistance', -5),
  ('kangaroo', 'lightning_resistance', 0),
  ('kangaroo', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- karna: Son of Surya the SUN GOD - extreme fire immunity, solar nature = cold weakness
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('karna', 'fire_resistance', 35),
  ('karna', 'cold_resistance', -10),
  ('karna', 'lightning_resistance', 5),
  ('karna', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- little_bo_peep: Rural shepherdess, some herbal knowledge
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('little_bo_peep', 'fire_resistance', 0),
  ('little_bo_peep', 'cold_resistance', -5),
  ('little_bo_peep', 'lightning_resistance', 0),
  ('little_bo_peep', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- mami_wata: Water deity - water conducts electricity, aquatic = cold resistant
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('mami_wata', 'fire_resistance', 0),
  ('mami_wata', 'cold_resistance', 10),
  ('mami_wata', 'lightning_resistance', -15),
  ('mami_wata', 'toxic_resistance', 15)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- merlin: Greatest wizard ever, strong all-around elemental mastery
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('merlin', 'fire_resistance', 10),
  ('merlin', 'cold_resistance', 10),
  ('merlin', 'lightning_resistance', 10),
  ('merlin', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- napoleon_bonaparte: Russian winter FAMOUSLY killed his army - thematic cold weakness
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('napoleon_bonaparte', 'fire_resistance', 0),
  ('napoleon_bonaparte', 'cold_resistance', -20),
  ('napoleon_bonaparte', 'lightning_resistance', 0),
  ('napoleon_bonaparte', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- quetzalcoatl: Feathered serpent = cold-blooded aspect, wind/storm god = lightning affinity
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('quetzalcoatl', 'fire_resistance', 15),
  ('quetzalcoatl', 'cold_resistance', -15),
  ('quetzalcoatl', 'lightning_resistance', 20),
  ('quetzalcoatl', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- ramses_ii: Mummy wrapped in dry linen = EXTREMELY flammable
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('ramses_ii', 'fire_resistance', -25),
  ('ramses_ii', 'cold_resistance', 0),
  ('ramses_ii', 'lightning_resistance', 5),
  ('ramses_ii', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- rilak_trelkar: Alien scholar, Earth toxins unfamiliar
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('rilak_trelkar', 'fire_resistance', 0),
  ('rilak_trelkar', 'cold_resistance', 0),
  ('rilak_trelkar', 'lightning_resistance', 5),
  ('rilak_trelkar', 'toxic_resistance', -5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- robin_hood: Forest survival, herbal knowledge
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('robin_hood', 'fire_resistance', 0),
  ('robin_hood', 'cold_resistance', 10),
  ('robin_hood', 'lightning_resistance', 0),
  ('robin_hood', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- sam_spade: Hard-boiled detective - cold stakeouts in San Francisco fog, encountered poisons in cases
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('sam_spade', 'fire_resistance', 0),
  ('sam_spade', 'cold_resistance', 5),
  ('sam_spade', 'lightning_resistance', 0),
  ('sam_spade', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- shaka_zulu: African warrior = heat adapted, not cold adapted, tribal poison knowledge
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('shaka_zulu', 'fire_resistance', 10),
  ('shaka_zulu', 'cold_resistance', -15),
  ('shaka_zulu', 'lightning_resistance', 0),
  ('shaka_zulu', 'toxic_resistance', 10)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- holmes: Chemistry expertise = toxin knowledge, British climate
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('holmes', 'fire_resistance', 0),
  ('holmes', 'cold_resistance', 5),
  ('holmes', 'lightning_resistance', 0),
  ('holmes', 'toxic_resistance', 15)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- space_cyborg: Space-adapted, already covered by species
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('space_cyborg', 'fire_resistance', 0),
  ('space_cyborg', 'cold_resistance', 5),
  ('space_cyborg', 'lightning_resistance', -5),
  ('space_cyborg', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- sun_wukong: Monkey King was forged in Laozi's Eight Trigrams Furnace - extreme fire immunity
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('sun_wukong', 'fire_resistance', 20),
  ('sun_wukong', 'cold_resistance', 0),
  ('sun_wukong', 'lightning_resistance', 10),
  ('sun_wukong', 'toxic_resistance', 15)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- unicorn: Pure creature, already mostly covered by species
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('unicorn', 'fire_resistance', 5),
  ('unicorn', 'cold_resistance', 5),
  ('unicorn', 'lightning_resistance', 0),
  ('unicorn', 'toxic_resistance', 5)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- velociraptor: Cold-blooded, already covered by species
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('velociraptor', 'fire_resistance', 0),
  ('velociraptor', 'cold_resistance', -10),
  ('velociraptor', 'lightning_resistance', 0),
  ('velociraptor', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- tesla: MASTER of electricity - extreme resistance
INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('tesla', 'fire_resistance', 0),
  ('tesla', 'cold_resistance', 0),
  ('tesla', 'lightning_resistance', 35),
  ('tesla', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- =====================================================
-- SYSTEM CHARACTERS (all zeros)
-- =====================================================

INSERT INTO signature_attribute_modifiers (character_id, attribute_name, modifier)
VALUES
  ('anubis', 'fire_resistance', 0),
  ('anubis', 'cold_resistance', 0),
  ('anubis', 'lightning_resistance', 0),
  ('anubis', 'toxic_resistance', 0),
  ('argock', 'fire_resistance', 0),
  ('argock', 'cold_resistance', 0),
  ('argock', 'lightning_resistance', 0),
  ('argock', 'toxic_resistance', 0),
  ('barry', 'fire_resistance', 0),
  ('barry', 'cold_resistance', 0),
  ('barry', 'lightning_resistance', 0),
  ('barry', 'toxic_resistance', 0),
  ('carl_jung', 'fire_resistance', 0),
  ('carl_jung', 'cold_resistance', 0),
  ('carl_jung', 'lightning_resistance', 0),
  ('carl_jung', 'toxic_resistance', 0),
  ('eleanor_roosevelt', 'fire_resistance', 0),
  ('eleanor_roosevelt', 'cold_resistance', 0),
  ('eleanor_roosevelt', 'lightning_resistance', 0),
  ('eleanor_roosevelt', 'toxic_resistance', 0),
  ('hostmaster_v8_72', 'fire_resistance', 0),
  ('hostmaster_v8_72', 'cold_resistance', 0),
  ('hostmaster_v8_72', 'lightning_resistance', 0),
  ('hostmaster_v8_72', 'toxic_resistance', 0),
  ('king_solomon', 'fire_resistance', 0),
  ('king_solomon', 'cold_resistance', 0),
  ('king_solomon', 'lightning_resistance', 0),
  ('king_solomon', 'toxic_resistance', 0),
  ('lmb_3000', 'fire_resistance', 0),
  ('lmb_3000', 'cold_resistance', 0),
  ('lmb_3000', 'lightning_resistance', 0),
  ('lmb_3000', 'toxic_resistance', 0),
  ('seraphina', 'fire_resistance', 0),
  ('seraphina', 'cold_resistance', 0),
  ('seraphina', 'lightning_resistance', 0),
  ('seraphina', 'toxic_resistance', 0),
  ('zxk14bw7', 'fire_resistance', 0),
  ('zxk14bw7', 'cold_resistance', 0),
  ('zxk14bw7', 'lightning_resistance', 0),
  ('zxk14bw7', 'toxic_resistance', 0),
  ('zyxthala', 'fire_resistance', 0),
  ('zyxthala', 'cold_resistance', 0),
  ('zyxthala', 'lightning_resistance', 0),
  ('zyxthala', 'toxic_resistance', 0)
ON CONFLICT (character_id, attribute_name) DO UPDATE SET modifier = EXCLUDED.modifier;

-- =====================================================
-- APPLY MODIFIERS TO CHARACTERS TABLE (base values)
-- Formula: 50 + archetype_mod + species_mod + individual_mod
-- =====================================================

UPDATE characters c
SET
  fire_resistance = 50 + COALESCE(arch.fire_mod, 0) + COALESCE(spec.fire_mod, 0) + COALESCE(sig.fire_mod, 0),
  cold_resistance = 50 + COALESCE(arch.cold_mod, 0) + COALESCE(spec.cold_mod, 0) + COALESCE(sig.cold_mod, 0),
  lightning_resistance = 50 + COALESCE(arch.lightning_mod, 0) + COALESCE(spec.lightning_mod, 0) + COALESCE(sig.lightning_mod, 0),
  toxic_resistance = 50 + COALESCE(arch.toxic_mod, 0) + COALESCE(spec.toxic_mod, 0) + COALESCE(sig.toxic_mod, 0)
FROM (
  SELECT archetype,
    MAX(CASE WHEN attribute_name = 'fire_resistance' THEN modifier END) as fire_mod,
    MAX(CASE WHEN attribute_name = 'cold_resistance' THEN modifier END) as cold_mod,
    MAX(CASE WHEN attribute_name = 'lightning_resistance' THEN modifier END) as lightning_mod,
    MAX(CASE WHEN attribute_name = 'toxic_resistance' THEN modifier END) as toxic_mod
  FROM archetype_attribute_modifiers
  GROUP BY archetype
) arch,
(
  SELECT species,
    MAX(CASE WHEN attribute_name = 'fire_resistance' THEN modifier END) as fire_mod,
    MAX(CASE WHEN attribute_name = 'cold_resistance' THEN modifier END) as cold_mod,
    MAX(CASE WHEN attribute_name = 'lightning_resistance' THEN modifier END) as lightning_mod,
    MAX(CASE WHEN attribute_name = 'toxic_resistance' THEN modifier END) as toxic_mod
  FROM species_attribute_modifiers
  GROUP BY species
) spec,
(
  SELECT character_id,
    MAX(CASE WHEN attribute_name = 'fire_resistance' THEN modifier END) as fire_mod,
    MAX(CASE WHEN attribute_name = 'cold_resistance' THEN modifier END) as cold_mod,
    MAX(CASE WHEN attribute_name = 'lightning_resistance' THEN modifier END) as lightning_mod,
    MAX(CASE WHEN attribute_name = 'toxic_resistance' THEN modifier END) as toxic_mod
  FROM signature_attribute_modifiers
  GROUP BY character_id
) sig
WHERE c.archetype = arch.archetype
  AND c.species = spec.species
  AND c.id = sig.character_id;

-- =====================================================
-- APPLY TO USER_CHARACTERS TABLE (current values)
-- Copy from characters table for now (can be modified by equipment/buffs later)
-- =====================================================

UPDATE user_characters uc
SET
  current_fire_resistance = c.fire_resistance,
  current_cold_resistance = c.cold_resistance,
  current_lightning_resistance = c.lightning_resistance,
  current_toxic_resistance = c.toxic_resistance
FROM characters c
WHERE uc.character_id = c.id;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (192, '192_populate_elemental_resistance_modifiers')
ON CONFLICT (version) DO NOTHING;
