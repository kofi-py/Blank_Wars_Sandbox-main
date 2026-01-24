-- Migration 168: Add base morale, stress, fatigue to characters table
-- These are base psychological tendencies that affect runtime behavior
-- Base 50, with character-specific modifiers based on personality
--
-- morale: Base optimism/confidence. High = naturally upbeat, low = pessimistic
-- stress: Base stress tendency. High = volatile/easily triggered, low = calm/composed
-- fatigue: Base fatigue tendency. High = tires easily, low = high stamina
--
-- NOTE: System characters (judges, NPCs, therapists) excluded - they don't battle

-- Add columns to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS morale INTEGER DEFAULT 50;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS stress INTEGER DEFAULT 50;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS fatigue INTEGER DEFAULT 50;

-- Populate base values for each of the 33 playable characters

-- 1. ACHILLES - Proud warrior, rage-prone, legendary endurance
UPDATE characters SET morale = 70, stress = 75, fatigue = 30 WHERE name = 'Achilles';

-- 2. AGENT X - Professional, controlled, fit
UPDATE characters SET morale = 50, stress = 40, fatigue = 35 WHERE name = 'Agent X';

-- 3. ALEISTER CROWLEY - Confident occultist, unstable, draining magic use
UPDATE characters SET morale = 65, stress = 70, fatigue = 60 WHERE name = 'Aleister Crowley';

-- 4. ARCHANGEL MICHAEL - Righteous confidence, divine composure, celestial stamina
UPDATE characters SET morale = 80, stress = 30, fatigue = 25 WHERE name = 'Archangel Michael';

-- 5. BILLY THE KID - Cocky outlaw, hot-headed, young energy
UPDATE characters SET morale = 75, stress = 70, fatigue = 30 WHERE name = 'Billy the Kid';

-- 6. CLEOPATRA VII - Regal confidence, political stress, refined stamina
UPDATE characters SET morale = 75, stress = 55, fatigue = 45 WHERE name = 'Cleopatra VII';

-- 7. COUNT DRACULA - Ancient confidence, predatory calm, immortal stamina
UPDATE characters SET morale = 70, stress = 35, fatigue = 20 WHERE name = 'Count Dracula';

-- 8. CRUMBSWORTH - Cheerful appliance, simple mind low stress, magical energy
UPDATE characters SET morale = 80, stress = 25, fatigue = 40 WHERE name = 'Crumbsworth';

-- 9. DON QUIXOTE - Delusional optimism, erratic, aging body
UPDATE characters SET morale = 85, stress = 60, fatigue = 65 WHERE name = 'Don Quixote';

-- 10. FENRIR - Savage confidence, feral rage, beast stamina
UPDATE characters SET morale = 65, stress = 80, fatigue = 25 WHERE name = 'Fenrir';

-- 11. FRANKENSTEIN'S MONSTER - Melancholy, confused anger, tireless construct
UPDATE characters SET morale = 30, stress = 75, fatigue = 20 WHERE name = 'Frankensteins Monster';

-- 12. GENGHIS KHAN - Conqueror's confidence, battle-hardened calm, warrior stamina
UPDATE characters SET morale = 80, stress = 40, fatigue = 30 WHERE name = 'Genghis Khan';

-- 13. JACK THE RIPPER - Calm predator, cold composure, obsessive energy
UPDATE characters SET morale = 45, stress = 40, fatigue = 35 WHERE name = 'Jack the Ripper';

-- 14. JOAN OF ARC - Divine conviction, battle stress, mortal limits
UPDATE characters SET morale = 85, stress = 55, fatigue = 50 WHERE name = 'Joan of Arc';

-- 15. KALI - Fierce divine confidence, destructive rage, goddess stamina
UPDATE characters SET morale = 75, stress = 85, fatigue = 20 WHERE name = 'Kali';

-- 16. KANGAROO - Animal instinct, territorial stress, natural stamina
UPDATE characters SET morale = 55, stress = 60, fatigue = 35 WHERE name = 'Kangaroo';

-- 17. KARNA - Noble warrior spirit, controlled intensity, legendary endurance
UPDATE characters SET morale = 75, stress = 45, fatigue = 30 WHERE name = 'Karna';

-- 18. LITTLE BO PEEP - Anxious shepherd, worried nature, delicate
UPDATE characters SET morale = 40, stress = 70, fatigue = 55 WHERE name = 'Little Bo Peep';

-- 19. MAMI WATA - Mysterious serenity, oceanic calm, spirit endurance
UPDATE characters SET morale = 65, stress = 30, fatigue = 35 WHERE name = 'Mami Wata';

-- 20. MERLIN - Wise confidence, sage composure, aged but magical
UPDATE characters SET morale = 70, stress = 25, fatigue = 55 WHERE name = 'Merlin';

-- 21. NAPOLEON BONAPARTE - Driven ambition, strategic stress, tireless commander
UPDATE characters SET morale = 80, stress = 60, fatigue = 40 WHERE name = 'Napoleon Bonaparte';

-- 22. NIKOLA TESLA - Visionary optimism, obsessive stress, overworked
UPDATE characters SET morale = 65, stress = 75, fatigue = 70 WHERE name = 'Nikola Tesla';

-- 23. QUETZALCOATL - Divine serenity, cosmic calm, god stamina
UPDATE characters SET morale = 75, stress = 30, fatigue = 25 WHERE name = 'Quetzalcoatl';

-- 24. RAMSES II - Pharaoh's pride, undead composure, deathless stamina
UPDATE characters SET morale = 75, stress = 35, fatigue = 15 WHERE name = 'Ramses II';

-- 25. RILAK TRELKAR - Alien detachment, clinical calm, efficient
UPDATE characters SET morale = 50, stress = 30, fatigue = 40 WHERE name = 'Rilak Trelkar';

-- 26. ROBIN HOOD - Merry outlaw, trickster chaos, athletic
UPDATE characters SET morale = 80, stress = 50, fatigue = 35 WHERE name = 'Robin Hood';

-- 27. SAM SPADE - Hard-boiled detective, cynical composure, world-weary endurance
UPDATE characters SET morale = 55, stress = 50, fatigue = 45 WHERE name = 'Sam Spade';

-- 28. SHAKA ZULU - Warrior king pride, battle intensity, legendary stamina
UPDATE characters SET morale = 80, stress = 55, fatigue = 25 WHERE name = 'Shaka Zulu';

-- 29. SHERLOCK HOLMES - Confident intellect, neurotic mind, sedentary habits
UPDATE characters SET morale = 55, stress = 70, fatigue = 55 WHERE name = 'Sherlock Holmes';

-- 30. SPACE CYBORG - Machine efficiency, programmed calm, cybernetic stamina
UPDATE characters SET morale = 50, stress = 35, fatigue = 25 WHERE name = 'Space Cyborg';

-- 31. SUN WUKONG - Immortal cockiness, impulsive chaos, boundless energy
UPDATE characters SET morale = 85, stress = 75, fatigue = 15 WHERE name = 'Sun Wukong';

-- 32. UNICORN - Proud mythical creature, temperamental, magical stamina
UPDATE characters SET morale = 70, stress = 55, fatigue = 30 WHERE name = 'Unicorn';

-- 33. VELOCIRAPTOR - Predator instinct, hunting focus, pack stamina
UPDATE characters SET morale = 60, stress = 55, fatigue = 30 WHERE name = 'Velociraptor';

COMMENT ON COLUMN characters.morale IS 'Base morale/optimism. High = naturally upbeat, low = pessimistic. Affects gameplan adherence.';
COMMENT ON COLUMN characters.stress IS 'Base stress tendency. High = volatile/easily triggered, low = calm/composed. Affects rebellion chance.';
COMMENT ON COLUMN characters.fatigue IS 'Base fatigue tendency. High = tires easily, low = high stamina. Affects performance over long battles.';
