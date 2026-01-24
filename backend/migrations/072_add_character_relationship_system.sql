-- Migration: Add Character Relationship System
-- Date: 2025-11-06
-- Purpose: Add species/archetype compatibility lookup tables and character relationship tracking

BEGIN;

-- =====================================================
-- SPECIES RELATIONSHIPS (Lookup/Rules Table)
-- Defines prejudice/affinity between species pairs
-- =====================================================
CREATE TABLE IF NOT EXISTS species_relationships (
    species1 VARCHAR(50) NOT NULL,
    species2 VARCHAR(50) NOT NULL,
    base_modifier INT DEFAULT 0,  -- -50 to +50
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (species1, species2)
);

-- =====================================================
-- ARCHETYPE RELATIONSHIPS (Lookup/Rules Table)
-- Defines compatibility between archetype pairs
-- =====================================================
CREATE TABLE IF NOT EXISTS archetype_relationships (
    archetype1 VARCHAR(50) NOT NULL,
    archetype2 VARCHAR(50) NOT NULL,
    base_modifier INT DEFAULT 0,  -- -50 to +50
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (archetype1, archetype2)
);

-- =====================================================
-- CHARACTER RELATIONSHIPS (Instance Tracking Table)
-- Stores actual relationships between specific characters
-- =====================================================
CREATE TABLE IF NOT EXISTS character_relationships (
    id SERIAL PRIMARY KEY,
    character1_id VARCHAR(255) NOT NULL,  -- References characters.id
    character2_id VARCHAR(255) NOT NULL,  -- References characters.id

    -- PRE-EXISTING MODIFIERS (calculated at creation from lookup tables)
    species_modifier INT DEFAULT 0,       -- From species_relationships
    archetype_modifier INT DEFAULT 0,     -- From archetype_relationships
    personal_vendetta BOOLEAN DEFAULT false,  -- Manual override (Holmes/Moriarty)
    vendetta_description TEXT,            -- Why they have a vendetta
    base_disposition INT DEFAULT 0,       -- species_mod + archetype_mod + random variance

    -- DYNAMIC STATE (changes through gameplay)
    current_trust INT DEFAULT 0,          -- -100 to +100
    current_respect INT DEFAULT 0,        -- -100 to +100
    current_affection INT DEFAULT 0,      -- -100 to +100
    current_rivalry INT DEFAULT 0,        -- 0 to 100

    -- COMPUTED STATUS
    relationship_status VARCHAR(50),      -- enemy, rival, neutral, friend, etc.
    trajectory VARCHAR(20),               -- improving, declining, stable, volatile
    progress_score INT DEFAULT 0,         -- current_trust - base_disposition (tracks growth)

    -- EVENT TRACKING
    shared_battles INT DEFAULT 0,
    conflicts_resolved INT DEFAULT 0,
    therapy_sessions_together INT DEFAULT 0,
    positive_interactions INT DEFAULT 0,
    negative_interactions INT DEFAULT 0,
    shared_experiences TEXT[] DEFAULT '{}',  -- Array of event IDs

    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(character1_id, character2_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_relationships_char1 ON character_relationships(character1_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_char2 ON character_relationships(character2_id);
CREATE INDEX IF NOT EXISTS idx_character_relationships_status ON character_relationships(relationship_status);
CREATE INDEX IF NOT EXISTS idx_character_relationships_updated ON character_relationships(updated_at);

-- =====================================================
-- POPULATE SPECIES RELATIONSHIPS
-- =====================================================

-- Vampire relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('vampire', 'werewolf', -30, 'Ancient blood feud - territorial night hunters with primal hatred'),
  ('vampire', 'vampire', 20, 'Kindred spirits of the undead - shared nocturnal existence'),
  ('vampire', 'human', -10, 'Predator-prey dynamic creates baseline tension'),
  ('vampire', 'angel', -20, 'Holy beings naturally repel the undead'),
  ('vampire', 'demon', 10, 'Dark creatures share affinity for shadows and chaos'),
  ('vampire', 'zombie', 5, 'Fellow undead, though vampires see zombies as lesser'),
  ('vampire', 'witch', 0, 'Neutral - both practice dark arts but warily'),
  ('vampire', 'ghost', 5, 'Both supernatural entities of the night'),
  ('vampire', 'deity', -15, 'Divine power makes vampires uneasy');

-- Werewolf relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('werewolf', 'vampire', -30, 'Ancient blood feud - rival apex predators'),
  ('werewolf', 'werewolf', 15, 'Pack mentality creates baseline camaraderie'),
  ('werewolf', 'human', -5, 'Predatory instincts create slight tension'),
  ('werewolf', 'dire_wolf', 20, 'Natural kinship with fellow canines'),
  ('werewolf', 'angel', -10, 'Divine purity conflicts with bestial nature'),
  ('werewolf', 'demon', 5, 'Both embody primal chaos and violence'),
  ('werewolf', 'witch', 5, 'Often formed pacts in folklore');

-- Angel relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('angel', 'demon', -40, 'Cosmic opposition - eternal enemies by nature'),
  ('angel', 'angel', 25, 'Celestial harmony and shared divine purpose'),
  ('angel', 'vampire', -20, 'Holy beings naturally oppose the undead'),
  ('angel', 'werewolf', -10, 'Divine order vs bestial chaos'),
  ('angel', 'human', 10, 'Angels traditionally protect and guide humans'),
  ('angel', 'deity', 15, 'Respect for divine hierarchy'),
  ('angel', 'ghost', 5, 'Compassion for lost souls');

-- Demon relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('demon', 'angel', -40, 'Cosmic opposition - fundamental enemies'),
  ('demon', 'demon', 10, 'Grudging respect among infernal beings'),
  ('demon', 'vampire', 10, 'Dark creatures share affinity'),
  ('demon', 'werewolf', 5, 'Both embody primal chaos'),
  ('demon', 'human', -15, 'Tempters and corruptors view humans as prey'),
  ('demon', 'witch', 15, 'Frequent pact partners in dark magic');

-- Human relationships (baseline neutral)
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('human', 'human', 0, 'No inherent species bias'),
  ('human', 'vampire', -10, 'Fear of predation creates wariness'),
  ('human', 'werewolf', -5, 'Unease around shapeshifters'),
  ('human', 'angel', 10, 'Reverence and hope for divine protection'),
  ('human', 'demon', -15, 'Fear and mistrust of infernal beings'),
  ('human', 'robot', -5, 'Uncanny valley effect creates slight discomfort'),
  ('human', 'cyborg', -3, 'Ambivalence about human-machine hybrids');

-- Robot/AI relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('robot', 'robot', 15, 'Logical kinship among artificial beings'),
  ('robot', 'cyborg', 10, 'Shared technological nature'),
  ('robot', 'human', -5, 'Humans uneasy around pure AI'),
  ('robot', 'fairy', -15, 'Logic vs magic - fundamental incompatibility'),
  ('robot', 'witch', -10, 'Technology clashes with mysticism'),
  ('robot', 'golem', 5, 'Both are constructed beings');

-- Fairy/Magical creature relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('fairy', 'fairy', 20, 'Shared connection to magical realms'),
  ('fairy', 'human', 5, 'Playful curiosity about mortals'),
  ('fairy', 'robot', -15, 'Magic recoils from cold technology'),
  ('fairy', 'witch', 15, 'Natural magical affinity'),
  ('fairy', 'angel', 10, 'Both are ethereal beings of light'),
  ('fairy', 'demon', -20, 'Fae creatures oppose infernal corruption');

-- Deity relationships
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('deity', 'deity', 0, 'Relationship depends on pantheon politics'),
  ('deity', 'human', 5, 'Mortals worship and amuse gods'),
  ('deity', 'angel', 15, 'Divine hierarchy - angels serve gods'),
  ('deity', 'demon', -25, 'Gods oppose infernal powers'),
  ('deity', 'vampire', -15, 'Divine power rejects undead abominations');

-- Misc species
INSERT INTO species_relationships (species1, species2, base_modifier, description) VALUES
  ('zombie', 'zombie', 0, 'No complex social bonds among mindless undead'),
  ('ghost', 'ghost', 5, 'Shared experience of death creates understanding'),
  ('witch', 'witch', 10, 'Covens and shared magical knowledge'),
  ('golem', 'golem', 5, 'Recognition between constructed beings'),
  ('cyborg', 'cyborg', 10, 'Shared human-machine experience');

-- =====================================================
-- POPULATE ARCHETYPE RELATIONSHIPS
-- =====================================================

-- Warrior archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('warrior', 'warrior', 10, 'Mutual respect among fighters - shared martial code'),
  ('warrior', 'scholar', -10, 'Brains vs brawn tension - warriors see scholars as weak'),
  ('warrior', 'trickster', -15, 'Honor-bound fighters distrust deception'),
  ('warrior', 'healer', 5, 'Warriors value those who mend battle wounds'),
  ('warrior', 'mage', -5, 'Slight mistrust of magic over steel'),
  ('warrior', 'leader', 5, 'Warriors respect strong leadership'),
  ('warrior', 'beast', 10, 'Respect for primal fighting prowess');

-- Scholar archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('scholar', 'scholar', 15, 'Intellectual kinship and collaborative knowledge'),
  ('scholar', 'warrior', -10, 'Scholars view warriors as brutes'),
  ('scholar', 'trickster', 0, 'Neutral - both value cleverness'),
  ('scholar', 'mage', 10, 'Shared pursuit of knowledge and study'),
  ('scholar', 'detective', 15, 'Both analytical and methodical'),
  ('scholar', 'inventor', 20, 'Natural collaboration between theory and practice');

-- Trickster archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('trickster', 'trickster', 5, 'Wary camaraderie - always watching for betrayal'),
  ('trickster', 'warrior', -15, 'Deception offends honor codes'),
  ('trickster', 'noble', -20, 'Aristocrats despise dishonorable tactics'),
  ('trickster', 'detective', -10, 'Detectives see tricksters as criminals'),
  ('trickster', 'thief', 15, 'Natural allies in deception and mischief');

-- Leader archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('leader', 'leader', -20, 'Too many chiefs - competition for authority'),
  ('leader', 'warrior', 5, 'Leaders command, warriors respect authority'),
  ('leader', 'scholar', 0, 'Leaders consult scholars but maintain control'),
  ('leader', 'noble', -10, 'Competing claims to authority'),
  ('leader', 'follower', 15, 'Natural hierarchy works smoothly');

-- Noble archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('noble', 'noble', 0, 'Status competition - depends on ranking'),
  ('noble', 'peasant', -15, 'Class superiority creates tension'),
  ('noble', 'detective', -10, 'Privacy-invading questions irritate aristocrats'),
  ('noble', 'trickster', -20, 'Nobles despise dishonorable behavior'),
  ('noble', 'scholar', 5, 'Nobles patronize learned individuals');

-- Healer archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('healer', 'healer', 15, 'Shared compassion and medical knowledge'),
  ('healer', 'warrior', 5, 'Complementary roles - mutual need'),
  ('healer', 'destroyer', -20, 'Life-giver vs life-taker fundamental opposition'),
  ('healer', 'necromancer', -25, 'Healing life opposes raising death');

-- Mage archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('mage', 'mage', 10, 'Shared arcane knowledge and study'),
  ('mage', 'warrior', -5, 'Mages view physical combat as crude'),
  ('mage', 'scholar', 10, 'Both value knowledge and study'),
  ('mage', 'witch', 5, 'Shared magical practice');

-- Detective archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('detective', 'detective', 10, 'Professional respect for investigative skills'),
  ('detective', 'criminal', -25, 'Natural adversaries - law vs crime'),
  ('detective', 'trickster', -10, 'Detectives see through deception'),
  ('detective', 'noble', -10, 'Investigations invade aristocratic privacy'),
  ('detective', 'scholar', 15, 'Both analytical and methodical');

-- Beast archetype
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('beast', 'beast', 10, 'Primal recognition and respect'),
  ('beast', 'civilized', -10, 'Wild nature clashes with refinement'),
  ('beast', 'warrior', 10, 'Shared love of combat');

-- Inventor/Mad Scientist
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('inventor', 'inventor', 15, 'Collaborative innovation and shared excitement'),
  ('inventor', 'scholar', 20, 'Theory meets practice'),
  ('inventor', 'luddite', -20, 'Progress vs tradition conflict');

-- Additional complementary pairs
INSERT INTO archetype_relationships (archetype1, archetype2, base_modifier, description) VALUES
  ('mentor', 'student', 20, 'Natural teaching relationship'),
  ('protector', 'vulnerable', 15, 'Guardian instinct triggers naturally'),
  ('rebel', 'authority', -20, 'Natural opposition to control'),
  ('artist', 'critic', -10, 'Creators vs judges tension');

-- =====================================================

COMMIT;
