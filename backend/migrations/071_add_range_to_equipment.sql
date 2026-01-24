-- Migration 071: Add range column to equipment and power_definitions tables
-- This adds weapon/power/spell attack range in hexes (0-12)

-- Step 1: Add range column to equipment table
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS range INTEGER DEFAULT 3;

-- Step 2: Add range column to power_definitions table
ALTER TABLE power_definitions
ADD COLUMN IF NOT EXISTS range INTEGER DEFAULT 5;

-- Step 3: Add comments to explain the columns
COMMENT ON COLUMN equipment.range IS 'Attack range in hexes (0-12): 0=melee, 1-4=close/melee, 5-7=polearm/short range, 8-9=medium range, 10-12=long range';
COMMENT ON COLUMN power_definitions.range IS 'Attack/effect range in hexes (0-12): 0=self/melee, 1-4=close, 5-7=medium, 8-9=long, 10-12=very long/cosmic';

-- Step 3: Update existing weapons based on equipment_type
-- Range 0 - Unarmed/Adjacent only
UPDATE equipment SET range = 0 WHERE equipment_type IN ('shield') AND slot = 'weapon';

-- Range 1 - Close Combat
UPDATE equipment SET range = 1 WHERE equipment_type IN ('dagger', 'knife', 'claws', 'knuckles', 'dual_daggers') AND slot = 'weapon';

-- Range 2 - Short Blades
UPDATE equipment SET range = 2 WHERE equipment_type IN ('club', 'cudgel', 'mace') AND slot = 'weapon';

-- Range 3 - Standard Melee
UPDATE equipment SET range = 3 WHERE equipment_type IN ('sword', 'hammer', 'whip', 'cane', 'crown', 'fedora', 'briefcase', 'cloak', 'blade') AND slot = 'weapon';

-- Range 4 - Long Swords
UPDATE equipment SET range = 4 WHERE equipment_type IN ('banner', 'greatsword') AND slot = 'weapon';

-- Range 5 - Polearms
UPDATE equipment SET range = 5 WHERE equipment_type IN ('spear', 'staff', 'rod') AND slot = 'weapon';

-- Range 6 - Short Bows
UPDATE equipment SET range = 6 WHERE equipment_type IN ('bow', 'orb') AND slot = 'weapon';

-- Range 7 - Pistols
UPDATE equipment SET range = 7 WHERE equipment_type IN ('pistol', 'revolver', 'chalice') AND slot = 'weapon';

-- Range 8 - Standard Firearms
UPDATE equipment SET range = 8 WHERE equipment_type IN ('rifle', 'tommy_gun', 'gun', 'generator') AND slot = 'weapon';

-- Range 9 - Advanced Firearms
UPDATE equipment SET range = 9 WHERE equipment_type IN ('energy_blade', 'energy_weapon', 'coil', 'armband', 'probe_staff') AND slot = 'weapon';

-- Range 10 - Heavy Weapons
UPDATE equipment SET range = 10 WHERE equipment_type IN ('plasma_rifle', 'disruptor') AND slot = 'weapon';

-- Range 11 - Siege Weapons
UPDATE equipment SET range = 11 WHERE equipment_type IN ('cannon', 'siege_weapon') AND slot = 'weapon';

-- Range 12 - Max Range/Cosmic
UPDATE equipment SET range = 12 WHERE equipment_type IN ('mind_control', 'reality_warper', 'sonic', 'divine_weapon', 'natural_weapon') AND slot = 'weapon';

-- Step 4: Update power ranges based on category/tier
-- Passive/Self powers (range 0)
UPDATE power_definitions SET range = 0 WHERE power_type = 'passive';
UPDATE power_definitions SET range = 0 WHERE category LIKE '%self%';

-- Melee powers (range 1-3)
UPDATE power_definitions SET range = 2 WHERE category = 'melee' AND power_type = 'active';

-- Standard offensive powers (range 5)
UPDATE power_definitions SET range = 5 WHERE category = 'offensive' AND power_type = 'active' AND tier IN ('skill', 'ability') AND range IS NULL;

-- Support powers (range 6)
UPDATE power_definitions SET range = 6 WHERE category = 'support' AND power_type = 'active' AND range IS NULL;

-- Signature/Advanced powers (range 8-12)
UPDATE power_definitions SET range = 9 WHERE tier = 'signature' AND power_type = 'active' AND range IS NULL;

-- Step 5: Verify the updates
SELECT 'Equipment' as table_name, equipment_type as type, range, COUNT(*) as count
FROM equipment
WHERE slot = 'weapon'
GROUP BY equipment_type, range
ORDER BY range, equipment_type;
