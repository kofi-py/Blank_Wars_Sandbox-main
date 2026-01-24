-- Migration to add missing Real Estate Agent characters
-- Version: 026
-- Description: Add the 3 missing Real Estate Agent system characters

BEGIN;

-- Add barry_closer (Real Estate Agent)
INSERT INTO characters (
    id, name, archetype, rarity, role, 
    base_health, base_attack, base_defense, base_speed, base_special,
    comedian_name, comedy_style,
    personality_traits, conversation_style, backstory,
    created_at
) VALUES (
    'barry_closer',
    'Barry "The Closer" Thompson',
    null,
    null,
    'system',
    100, 50, 60, 70, 80,
    'Kevin Hart',
    'High-octane, fast-talk swagger, self-boastful riffs',
    'Aggressive, charismatic, competitive, fast-talking',
    'High-energy sales pitches with relentless enthusiasm',
    'Barry earned his nickname by closing deals others thought impossible. His rapid-fire sales technique and unwavering confidence make him a formidable real estate force.',
    CURRENT_TIMESTAMP
);

-- Add lmb_3000_robot_lady_macbeth (Real Estate Agent)  
INSERT INTO characters (
    id, name, archetype, rarity, role,
    base_health, base_attack, base_defense, base_speed, base_special,
    comedian_name, comedy_style,
    personality_traits, conversation_style, backstory,
    created_at
) VALUES (
    'lmb_3000_robot_lady_macbeth',
    'LMB-3000 "Lady MacBeth"',
    null,
    null,
    'system',
    120, 40, 90, 50, 95,
    'Aubrey Plaza',
    'Icy deadpan menace, sly power plays, glitchy pauses that land laughs',
    'Calculating, manipulative, eerily calm, strategically intimidating',
    'Cold, methodical negotiations with unsettling pauses and veiled threats',
    'An advanced AI real estate unit with a disturbing personality matrix inspired by Shakespeare''s most ambitious character. Her sales tactics border on psychological manipulation.',
    CURRENT_TIMESTAMP
);

-- Add zyxthala_reptilian (Real Estate Agent)
INSERT INTO characters (
    id, name, archetype, rarity, role,
    base_health, base_attack, base_defense, base_speed, base_special, 
    comedian_name, comedy_style,
    personality_traits, conversation_style, backstory,
    created_at
) VALUES (
    'zyxthala_reptilian',
    'Zyxthala the Reptilian',
    null,
    null,
    'system',
    110, 45, 75, 65, 90,
    'Nathan Fielder',
    'Hyper-literal optimization, painfully awkward deadpan, process over people',
    'Analytical, obsessive, socially awkward, hyper-logical',
    'Overly detailed explanations with uncomfortable precision and bizarre optimization suggestions',
    'An interdimensional reptilian real estate specialist who approaches property sales with alien logic and uncomfortable attention to detail.',
    CURRENT_TIMESTAMP
);

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (26, '026_add_missing_real_estate_agents') ON CONFLICT (version) DO NOTHING;

COMMIT;