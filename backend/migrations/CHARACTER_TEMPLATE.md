# Character Creation Template

When adding new characters via migrations, ALL text fields that describe the character must use **2nd person POV** (addressing the character directly as "you/your").

## Required Format

### backstory (REQUIRED: 2nd person)
```sql
backstory = 'You are [name], [description]. You [actions/history]. You are known for [traits].'
```

**CORRECT:**
```sql
'You are the immortal vampire lord of Transylvania, master of dark magic and eternal night.'
```

**WRONG:**
```sql
'The immortal vampire lord of Transylvania, master of dark magic and eternal night.'
```

### comedy_style (REQUIRED: 2nd person)
```sql
comedy_style = 'Your [style description]. You [how you deliver comedy]. Your [traits].'
```

**CORRECT:**
```sql
'Your deep booming baritone delivers absurdity with aristocratic conviction. Your over-the-top narcissism is played completely straight with luxuriant melodrama and campy gravitas.'
```

**WRONG:**
```sql
'Deep booming baritone delivering absurdity with aristocratic conviction, over-the-top narcissism played completely straight'
```

## Why This Matters

The prompt system addresses characters directly in 2nd person. If backstory/comedy_style use 3rd person, the AI receives inconsistent POV instructions which degrades response quality.

## Example Migration

```sql
INSERT INTO characters (
    id, name, role, species, archetype, origin_era, backstory,
    personality_traits, comedy_style, scene_image_slug, rarity
) VALUES (
    'new_character_id',
    'Character Name',
    'contestant',  -- or 'host', 'mascot', 'trainer', etc.
    'human',
    'archetype_name',
    'Time Period, Location, Year',
    -- BACKSTORY: Must start with "You are" and use 2nd person throughout
    'You are [the character description]. You [did something notable]. You are known for [traits].',
    '["trait1", "trait2", "trait3"]'::jsonb,
    -- COMEDY_STYLE: Must use "Your/You" throughout, never 3rd person descriptions
    'Your [comedy trait] is delivered with [style]. You [how you perform]. Your [unique quality].',
    'scene_image_slug',
    'common'  -- or 'uncommon', 'rare', 'epic', 'legendary'
);
```

## Checklist Before Committing

- [ ] backstory starts with "You are"
- [ ] backstory uses "you/your" throughout (never "he/she/they/the character")
- [ ] comedy_style uses "Your/You" throughout
- [ ] comedy_style has NO 3rd person descriptions (never "His comedy...", "The character's style...")
