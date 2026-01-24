CREATE TABLE IF NOT EXISTS archetypes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_adherence_mod INTEGER DEFAULT 0
);

INSERT INTO archetypes (id, name, base_adherence_mod) VALUES
('warrior', 'Warrior', 15),
('tank', 'Tank', 15),
('leader', 'Leader', 20),
('scholar', 'Scholar', 10),
('mage', 'Mage', 5),
('mystic', 'Mystic', 0),
('trickster', 'Trickster', -10),
('beast', 'Beast', -15),
('assassin', 'Assassin', 5),
('system', 'System', 25)
ON CONFLICT (id) DO UPDATE SET base_adherence_mod = EXCLUDED.base_adherence_mod;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (141, '141_create_archetypes_table') ON CONFLICT (version) DO NOTHING;
