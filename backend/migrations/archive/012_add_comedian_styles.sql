-- Migration 012: Add comedian style references to characters
-- Each character gets a comedian inspiration for consistent comedy style

BEGIN;

-- Add comedian fields to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS comedian_name TEXT,
ADD COLUMN IF NOT EXISTS comedy_style TEXT;

-- Update characters with their comedian styles based on your list
UPDATE characters SET comedian_name = 'Ronny Chieng', comedy_style = 'Scorching deadpan, precision rants, authoritative bite' WHERE id = 'genghis_khan';
UPDATE characters SET comedian_name = 'Bill Burr', comedy_style = 'Aggressive rants, cynical heat, feral honesty' WHERE id = 'fenrir';
UPDATE characters SET comedian_name = 'Hugh Laurie', comedy_style = 'Dry, urbane, hyper-literate wit; surgical sarcasm' WHERE id = 'holmes';
UPDATE characters SET comedian_name = 'Steven Wright', comedy_style = 'Ultra-deadpan, surreal one-liners, low-energy melancholy' WHERE id = 'frankenstein_monster';
UPDATE characters SET comedian_name = 'Pete Davidson', comedy_style = 'Loose confessional, lanky chaos, stoner asides' WHERE id = 'billy_the_kid';
UPDATE characters SET comedian_name = 'Sacha Baron Cohen', comedy_style = 'Immersive character satire, fearless commitment' WHERE id = 'tesla';
UPDATE characters SET comedian_name = 'Demetri Martin', comedy_style = 'Analytical one-liners, diagrams, gentle oddness' WHERE id = 'zeta_reticulan';
UPDATE characters SET comedian_name = 'James Acaster', comedy_style = 'Precise absurdism, meta structure, simmering intensity' WHERE id = 'space_cyborg';
UPDATE characters SET comedian_name = 'Cary Elwes', comedy_style = 'Dashing parody, cheeky swashbuckler deadpan' WHERE id = 'robin_hood';
UPDATE characters SET comedian_name = 'Brett Goldstein', comedy_style = 'Gruff dryness, soulful fury, economical punchlines' WHERE id = 'achilles';
UPDATE characters SET comedian_name = 'Maya Rudolph', comedy_style = 'Regal character play, musical instincts, sly warmth' WHERE id = 'cleopatra';
UPDATE characters SET comedian_name = 'Matt Berry', comedy_style = 'Baritone bombast, luxuriant melodrama, campy gravitas' WHERE id = 'dracula';
UPDATE characters SET comedian_name = 'Stephen Chow', comedy_style = 'Slapstick kung-fu, mo lei tau nonsense, heroic fool' WHERE id = 'sun_wukong';
UPDATE characters SET comedian_name = 'Groucho Marx', comedy_style = 'Rat-a-tat puns, eyebrow sarcasm, fourth-wall jabs' WHERE id = 'noir_detective_1930s';
UPDATE characters SET comedian_name = 'Leslie Nielsen', comedy_style = 'Stone-faced absurdity, zero-wink slapstick' WHERE id = 'black_ops_agent';
UPDATE characters SET comedian_name = 'Ayo Edebiri', comedy_style = 'Quick, neurotic-smart, earnest bite' WHERE id = 'joan';
UPDATE characters SET comedian_name = 'Nick Kroll', comedy_style = 'Shape-shifting characters, smarmy satire, elastic voices' WHERE id = 'reptilian_alien';
UPDATE characters SET comedian_name = 'Kristen Schaal', comedy_style = 'Quirky innocence, sweet menace, idiosyncratic cadence' WHERE id = 'lady_macbeth_2000';

-- Therapist characters
UPDATE characters SET comedian_name = 'Bob Newhart', comedy_style = 'Gentle deadpan, hesitant understatement, calm control' WHERE id = 'carl_jung';
UPDATE characters SET comedian_name = 'Melissa McCarthy', comedy_style = 'Physical chaos, big-heart mischief, buoyant improv' WHERE id = 'fairy_godmother';
UPDATE characters SET comedian_name = 'Reggie Watts', comedy_style = 'Improvised cosmic jazz, stream-of-consciousness humor' WHERE id = 'cosmic_alien';

-- Judge characters
UPDATE characters SET comedian_name = 'Jon Stewart', comedy_style = 'Wry moral clarity, incredulous rationalism' WHERE id = 'king_solomon';
UPDATE characters SET comedian_name = 'Jordan Peele', comedy_style = 'Concept sketch, eerie undertone, poised satire' WHERE id = 'anubis';
UPDATE characters SET comedian_name = 'Tina Fey', comedy_style = 'Razor intelligence, dry political satire, leadership snaps' WHERE id = 'eleanor_roosevelt';

-- Real Estate characters
UPDATE characters SET comedian_name = 'Kevin Hart', comedy_style = 'High-octane, fast-talk swagger, self-boastful riffs' WHERE id = 'barry_closer';
UPDATE characters SET comedian_name = 'Nathan Fielder', comedy_style = 'Hyper-literal optimization, painfully awkward deadpan, process over people' WHERE id = 'zyxthala_reptilian';
UPDATE characters SET comedian_name = 'Aubrey Plaza', comedy_style = 'Icy deadpan menace, sly power plays, glitchy pauses that land laughs' WHERE id = 'lmb_3000_robot_lady_macbeth';

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (12, '012_add_comedian_styles') ON CONFLICT (version) DO NOTHING;

COMMIT;