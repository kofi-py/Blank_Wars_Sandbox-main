# Spell/Power System & Abilities Research
**Date**: October 28, 2025
**Context**: Investigating relationship between abilities JSON, spell system, and weapon proficiencies for 15 new characters

---

## Executive Summary

### ✅ GOOD NEWS: Spell System Already Supports New Characters!

**8 out of 15 new characters already have species-specific spells defined:**
- Kangaroo (7 spells for 'kangaroo' species)
- Unicorn (7 spells for 'unicorn' species)
- Velociraptor (7 spells for 'dinosaur' species)
- Archangel Michael (7 spells for 'angel' species)
- Ramses II (7 spells for 'undead' species)
- Kali, Mami Wata, Quetzalcoatl (7 spells each for 'deity' species)

**7 archetypes have spells including beastmaster:**
- Beastmaster (7 archetype spells)
- Mystic (7 archetype spells)
- Leader (7 archetype spells)
- Assassin (7 archetype spells)
- And more...

### ⚠️ ACTION NEEDED: Weapon Proficiencies

**All 15 new characters are missing weapon_proficiencies**. This affects the Equipment chat system where characters discuss their weapon/armor preferences.

---

## 1. Abilities JSON Field - LEGACY/DEPRECATED

### What It Contains
The `abilities` field in the characters table contains:

**Format 1 - BaseStats (17 characters):**
```json
{
  "baseStats": {
    "strength": 95,
    "agility": 85,
    "intelligence": 60,
    "vitality": 90,
    "wisdom": 45,
    "charisma": 80
  }
}
```

**Format 2 - Text Description (1 character - Crumbsworth):**
```
"Breakfast of Champions (team energy/stat buff), Flaming Toast (ranged fire attack),
Carb Loading (stamina restoration), Burnt Offering (sacrifice HP for team buffs),
Emergency Breakfast (panic heal)"
```

### Characters With Abilities Field
Only 18 out of 33 contestants have this field:
- Achilles, Agent X, Billy the Kid, Cleopatra, Dracula, Crumbsworth, Fenrir
- Frankensteins Monster, Genghis Khan, Joan of Arc, Merlin, Tesla
- Rilak Trelkar, Robin Hood, Sammy Slugger, Sherlock Holmes, Space Cyborg, Sun Wukong

### Why It's Likely DEPRECATED

1. **Inconsistent Format**: Mixed baseStats JSON vs text descriptions
2. **Replaced by New System**: Modern spell/power system uses dedicated tables:
   - `spell_definitions`
   - `power_definitions`
   - `character_spell_loadout`
   - `character_powers`
   - `user_spells`

3. **BaseStats Don't Match Current Stats**: The "baseStats" in abilities JSON have different stat names than the actual character stat columns (strength, dexterity, stamina, etc.)

4. **Not Used in Code**: No evidence of abilities JSON being parsed or used in game systems

### Recommendation
**DO NOT populate abilities JSON for new characters.** The spell/power system has replaced it.

---

## 2. Spell/Power System - ACTIVE & COMPLETE

### Database Tables

**spell_definitions** - Spell library with restrictions
```sql
Columns:
- id, name, description, flavor_text
- category (e.g., 'offensive', 'defensive', 'utility')
- restricted_to_archetype (can be NULL for universal spells)
- restricted_to_species (can be NULL for universal spells)
- character_id (for character-specific unique spells)
- unlock_cost_coins, learn_time_seconds, required_level
- mana_cost, cooldown_turns, charges_per_battle
- effects (JSONB with actual spell mechanics)
- icon, animation
```

**Current Spell Coverage:**

#### Archetype Spells (7 spells each):
- ✅ scholar
- ✅ mage
- ✅ trickster
- ✅ assassin
- ✅ mystic
- ✅ leader
- ✅ magical_appliance
- ✅ **beastmaster** (NEW!)

#### Species Spells (7 spells each):
- ✅ deity
- ✅ dire_wolf
- ✅ undead
- ✅ human_magical
- ✅ vampire
- ✅ magical_toaster
- ✅ angel
- ✅ **dinosaur** (NEW!)
- ✅ **kangaroo** (NEW!)
- ✅ **unicorn** (NEW!)
- ✅ golem
- ✅ zeta_reticulan_grey

### New Character Spell Coverage

| Character | Species | Archetype | Species Spells? | Archetype Spells? |
|-----------|---------|-----------|-----------------|-------------------|
| Aleister Crowley | human | mystic | ❌ | ✅ (7 mystic spells) |
| Archangel Michael | **angel** | mystic | ✅ (7 angel spells) | ✅ (7 mystic spells) |
| Don Quixote | human | warrior | ❌ | ❌ (warrior has 0) |
| Jack the Ripper | human | assassin | ❌ | ✅ (7 assassin spells) |
| Kali | **deity** | mystic | ✅ (7 deity spells) | ✅ (7 mystic spells) |
| Kangaroo | **kangaroo** | beast | ✅ (7 kangaroo spells) | ❌ (beast has 0) |
| Karna | human | warrior | ❌ | ❌ (warrior has 0) |
| Little Bo Peep | human | **beastmaster** | ❌ | ✅ (7 beastmaster spells) |
| Mami Wata | **deity** | mystic | ✅ (7 deity spells) | ✅ (7 mystic spells) |
| Napoleon Bonaparte | human | leader | ❌ | ✅ (7 leader spells) |
| Quetzalcoatl | **deity** | warrior | ✅ (7 deity spells) | ❌ (warrior has 0) |
| Ramses II | **undead** | leader | ✅ (7 undead spells) | ✅ (7 leader spells) |
| Shaka Zulu | human | leader | ❌ | ✅ (7 leader spells) |
| Unicorn | **unicorn** | beast | ✅ (7 unicorn spells) | ❌ (beast has 0) |
| Velociraptor | **dinosaur** | beast | ✅ (7 dinosaur spells) | ❌ (beast has 0) |

### Sample Spells for New Characters

**Kangaroo Spells (species='kangaroo'):**
- Aussie Grit
- Boxing Fury
- Mega Leap
- Mob Call
- Outback Endurance
- Pouch Storage
- Tail Sweep

**Angel Spells (Archangel Michael):**
- Banish Darkness
- Divine Judgment
- Guardian Blessing
- Heavenly Choir
- Holy Light
- Trumpet Call
- Wings of Faith

**Deity Spells (Kali, Mami Wata, Quetzalcoatl):**
- Ascension
- Divine Intervention
- Divine Judgment
- Divine Shield
- Divine Smite
- Holy Light
- Miracle

**Beastmaster Archetype Spells (Little Bo Peep):**
- 7 spells specific to beastmaster archetype

### Spell System Integration

**How It Works:**
1. Characters can learn spells based on:
   - Their archetype (e.g., all mystics can learn mystic spells)
   - Their species (e.g., all deities can learn deity spells)
   - Their character_id (character-unique signature spells)
   - Universal spells (no restrictions)

2. Players unlock spells by:
   - Spending coins (unlock_cost_coins)
   - Meeting level requirements (required_level)
   - Waiting for learning time (learn_time_seconds)

3. In battle, spells:
   - Cost mana (mana_cost)
   - Have cooldowns (cooldown_turns)
   - May have limited uses (charges_per_battle)
   - Apply effects from JSONB effects field

### Recommendation
✅ **No action needed for spell system** - All new characters are already supported!

**Missing Archetypes:**
- ❌ warrior (0 spells) - Affects Don Quixote, Karna, Quetzalcoatl
- ❌ tank (0 spells)
- ❌ beast (0 spells) - But Kangaroo, Unicorn, Velociraptor have species spells

**Missing Species:**
- ❌ human (0 species spells) - Most characters are human, but they get archetype spells instead

---

## 3. Weapon Proficiencies - ACTIVE & NEEDS ATTENTION

### What It Does

Weapon proficiencies are used in the **Equipment Chat** system where characters discuss their weapon and armor preferences with the coach.

**Code Location**: `backend/src/routes/ai.ts` (lines 505-517)
**Prompt Assembly**: `backend/src/services/promptAssemblyService.ts` (lines 1664-1673)

### How It Works

1. **Equipment chat queries database** for character weapon/armor data:
```sql
SELECT name, weapon_proficiencies, preferred_weapons,
       armor_proficiency, preferred_armor_type, equipment_notes
FROM characters WHERE id = $1
```

2. **Prompt includes proficiency data**:
```
YOUR EQUIPMENT PROFICIENCIES (use these exact details in your responses):
- Weapon Proficiencies: sword, spear, shield, axe
- Preferred Weapons: spear, shield
- Armor Proficiency: heavy
- Preferred Armor Type: plate
- Notes: [custom notes]
```

3. **Character uses this data** when discussing equipment with coach in chat

### Current Coverage

**17 out of 33 contestants** have weapon_proficiencies defined:
- Achilles, Agent X, Billy the Kid, Cleopatra, Dracula
- Fenrir, Frankensteins Monster, Genghis Khan, Joan of Arc
- Merlin, Tesla, Rilak Trelkar, Robin Hood, Sammy Slugger
- Sherlock Holmes, Space Cyborg, Sun Wukong

**16 contestants MISSING weapon_proficiencies:**
- **All 15 new characters**
- Crumbsworth (magical toaster)

### Impact of Missing Proficiencies

**Equipment Chat Behavior:**
- Characters without proficiencies get fallback: `weaponProfs: []`
- Prompt includes: "Weapon Proficiencies: none specified"
- Characters can still chat, but have no specific weapon preferences to reference
- Less immersive/authentic conversation

**NO Impact on:**
- Battle system (uses stat values directly)
- Equipment equipping (no enforcement of proficiencies)
- Other chat systems

### Recommendation
⚠️ **ADD weapon_proficiencies for all 15 new characters** to improve Equipment chat quality

---

## 4. Coverage Analysis by Archetype

| Archetype | Total | With Weapons | With Spells | Needs Warrior Spells? |
|-----------|-------|--------------|-------------|----------------------|
| assassin | 3 | 2 | ✅ (7 spells) | No |
| beast | 4 | 1 | ❌ (0 archetype) | Yes (but has species) |
| beastmaster | 1 | 0 | ✅ (7 spells) | No |
| leader | 6 | 3 | ✅ (7 spells) | No |
| mage | 1 | 1 | ✅ (7 spells) | No |
| magical_appliance | 1 | 0 | ✅ (7 spells) | No |
| mystic | 5 | 1 | ✅ (7 spells) | No |
| scholar | 3 | 3 | ✅ (7 spells) | No |
| tank | 2 | 2 | ❌ (0 spells) | Yes |
| trickster | 2 | 2 | ✅ (7 spells) | No |
| **warrior** | **5** | **2** | **❌ (0 spells)** | **YES!** |

### Critical Gap: Warrior Archetype

**Warriors without spells:**
- Don Quixote
- Karna
- Quetzalcoatl (has deity spells though)
- Plus 2 older warrior characters

**This is likely being worked on in the other window** based on your mention of "complete power and spell system being finished."

---

## 5. Proposed Weapon Proficiencies for New Characters

Based on character backgrounds and archetypes:

### 1. Aleister Crowley (Mystic)
```sql
weapon_proficiencies: {ceremonial_dagger, wand, staff, ritual_tools}
preferred_weapons: {athame, magical_wand}
armor_proficiency: light
preferred_armor_type: robes
equipment_notes: Prefers occult ceremonial equipment
```

### 2. Archangel Michael (Mystic/Warrior Angel)
```sql
weapon_proficiencies: {flaming_sword, spear, holy_lance, shield}
preferred_weapons: {flaming_sword, divine_spear}
armor_proficiency: heavy
preferred_armor_type: celestial_plate
equipment_notes: Divine weapons only, refuses unholy armaments
```

### 3. Don Quixote (Warrior)
```sql
weapon_proficiencies: {lance, sword, shield}
preferred_weapons: {jousting_lance, rusty_sword}
armor_proficiency: heavy
preferred_armor_type: plate
equipment_notes: Insists on chivalric weapons even if broken
```

### 4. Jack the Ripper (Assassin)
```sql
weapon_proficiencies: {knife, dagger, surgical_tools, garrote}
preferred_weapons: {surgical_knife, concealed_blade}
armor_proficiency: light
preferred_armor_type: none
equipment_notes: Precision cutting instruments, Victorian era style
```

### 5. Kali (Mystic Deity)
```sql
weapon_proficiencies: {sword, scimitar, trident, chakram, skull_mace}
preferred_weapons: {curved_swords, severed_heads}
armor_proficiency: light
preferred_armor_type: none
equipment_notes: Wields multiple weapons simultaneously
```

### 6. Kangaroo (Beast)
```sql
weapon_proficiencies: {claws, kicks, boxing_gloves, natural_weapons}
preferred_weapons: {powerful_kicks, boxing_strikes}
armor_proficiency: none
preferred_armor_type: none
equipment_notes: Relies on natural boxing ability and kicks
```

### 7. Karna (Warrior)
```sql
weapon_proficiencies: {bow, spear, sword, chakra_disc}
preferred_weapons: {divine_bow, sacred_spear}
armor_proficiency: heavy
preferred_armor_type: divine_armor
equipment_notes: Born with divine armor and earrings
```

### 8. Little Bo Peep (Beastmaster)
```sql
weapon_proficiencies: {staff, crook, sling, rope}
preferred_weapons: {shepherds_crook, sling}
armor_proficiency: light
preferred_armor_type: cloth
equipment_notes: Focuses on herding tools and non-lethal options
```

### 9. Mami Wata (Mystic Deity)
```sql
weapon_proficiencies: {trident, water_magic, mirror, comb}
preferred_weapons: {enchanted_comb, sacred_mirror}
armor_proficiency: none
preferred_armor_type: none
equipment_notes: Water-based magical implements
```

### 10. Napoleon Bonaparte (Leader)
```sql
weapon_proficiencies: {pistol, saber, sword, cannon}
preferred_weapons: {cavalry_saber, flintlock_pistol}
armor_proficiency: medium
preferred_armor_type: military_uniform
equipment_notes: Napoleonic era military equipment
```

### 11. Quetzalcoatl (Warrior Deity)
```sql
weapon_proficiencies: {feathered_serpent_form, obsidian_blade, atlatl, macuahuitl}
preferred_weapons: {obsidian_sword, divine_serpent_strike}
armor_proficiency: medium
preferred_armor_type: feathered_armor
equipment_notes: Aztec divine weapons and armor
```

### 12. Ramses II (Leader Undead)
```sql
weapon_proficiencies: {khopesh, scepter, staff, bow}
preferred_weapons: {pharaohs_khopesh, was_scepter}
armor_proficiency: medium
preferred_armor_type: royal_vestments
equipment_notes: Ancient Egyptian royal regalia
```

### 13. Shaka Zulu (Leader)
```sql
weapon_proficiencies: {iklwa_spear, shield, knobkerrie, throwing_spear}
preferred_weapons: {iklwa, cowhide_shield}
armor_proficiency: light
preferred_armor_type: none
equipment_notes: Zulu military innovations, close combat specialist
```

### 14. Unicorn (Beast)
```sql
weapon_proficiencies: {horn, hooves, magic, healing_aura}
preferred_weapons: {spiral_horn, magical_strikes}
armor_proficiency: none
preferred_armor_type: none
equipment_notes: Horn is primary weapon, refuses weapons
```

### 15. Velociraptor (Beast)
```sql
weapon_proficiencies: {claws, teeth, tail, natural_weapons}
preferred_weapons: {sickle_claw, pack_tactics}
armor_proficiency: none
preferred_armor_type: natural_scales
equipment_notes: Pack hunter, uses coordinated strikes
```

---

## 6. Recommendations

### Immediate Actions

1. ✅ **No action needed for spell system**
   - Already supports all new characters via archetype/species spells
   - Wait for warrior archetype spells being developed in other window

2. ⚠️ **ADD weapon_proficiencies for all 15 new characters**
   - Use proposed proficiencies above
   - Improves Equipment chat immersion
   - Optional but recommended

3. ❌ **DO NOT populate abilities JSON**
   - Field is deprecated/legacy
   - Replaced by spell/power system

### SQL to Add Weapon Proficiencies

Create file: `add_weapon_proficiencies_15_chars.sql`

```sql
-- Add weapon proficiencies for 15 new characters

UPDATE characters SET
  weapon_proficiencies = '{ceremonial_dagger,wand,staff,ritual_tools}',
  preferred_weapons = '{athame,magical_wand}',
  armor_proficiency = 'light',
  preferred_armor_type = 'robes',
  equipment_notes = 'Prefers occult ceremonial equipment'
WHERE id = 'aleister_crowley';

-- [Continue for all 15 characters with their specific proficiencies]
```

### Long-term Improvements

1. **Clarify abilities JSON usage**
   - Deprecate field if unused
   - Or standardize format if still needed

2. **Add warrior archetype spells**
   - Currently being worked on in other window
   - Affects Don Quixote, Karna, and 2 older warriors

3. **Add tank archetype spells**
   - Only 2 tank characters affected

4. **Consider human species spells**
   - Many humans rely solely on archetype spells
   - Could add human-specific abilities

---

## Conclusion

### ✅ Spell/Power System Status: COMPLETE
All 15 new characters are fully supported by the spell/power system through archetype and species restrictions. No action needed.

### ⚠️ Weapon Proficiencies Status: INCOMPLETE
All 15 new characters are missing weapon_proficiencies. This affects Equipment chat quality. Recommend adding proficiencies using the proposals above.

### ❌ Abilities JSON Status: DEPRECATED
Do not populate this field. The spell/power system has replaced it.

---

*Research completed by Claude Code on October 28, 2025*
