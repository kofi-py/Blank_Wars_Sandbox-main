-- Fix therapy chat: Add comedian_style_id to therapists missing them
-- All system characters need comedian styles for entertaining interactions

-- Seraphina (Fairy Godmother therapist) - Use matronist_003 (polite in face of catastrophe)
UPDATE characters
SET comedian_style_id = 51
WHERE id = 'seraphina';

-- Zxk14bW^7 (Alien therapist) - Use analyst_036 (clinical analysis, treats emotions as data)
UPDATE characters
SET comedian_style_id = 84
WHERE id = 'zxk14bw7';

-- Verify all therapists now have comedian styles
SELECT id, name, role, comedian_style_id
FROM characters
WHERE role = 'therapist'
ORDER BY name;
