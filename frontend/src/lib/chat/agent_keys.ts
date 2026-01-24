// Single source of truth for character name → agent slug mapping
// Based on proven therapy chat mappings + complete character roster

const NAME_MAP: Record<string, string> = {
  // Core legendary figures
  "frankenstein's monster": "frankenstein_monster",
  "frankensteins monster": "frankenstein_monster",  // Handle missing apostrophe
  "robin hood": "robin_hood",
  "sherlock holmes": "holmes",  // Backend expects 'holmes' not 'sherlock_holmes'
  "joan of arc": "joan",
  "agent x": "agent_x",
  "fenrir": "fenrir",

  // Alien/Sci-fi
  "rilak-trelkar": "rilak_trelkar",
  "rilak trelkar": "rilak_trelkar",
  "rilak": "rilak_trelkar",
  "alien grey": "rilak_trelkar",
  "space cyborg": "space_cyborg",

  // Historical figures
  "achilles": "achilles",
  "billy the kid": "billy_the_kid",
  "genghis khan": "genghis_khan",
  "sun wukong": "sun_wukong",
  "nikola tesla": "tesla",
  "cleopatra": "cleopatra",
  "cleopatra vii": "cleopatra",

  // Fiction/Fantasy
  "count dracula": "dracula",
  "dracula": "dracula",
  "merlin": "merlin",
  "sam spade": "sam_spade",

  // Add variants and common misspellings
  "frankenstein": "frankenstein_monster",
  "holmes": "holmes",
  "tesla": "tesla",
  "monkey king": "sun_wukong",
  "jack the ripper": "jack_the_ripper",
};

export function nameToAgentKey(name?: string): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return NAME_MAP[key] ?? null;
}

export function mustResolveAgentKey(
  display_name?: string | null,
  character_id?: string | null,
  context = 'chat'
): string {
  // Reject userchar IDs - we need the actual character_id from DB
  if (!character_id || /^userchar_/.test(character_id)) {
    throw new Error(
      `[${context}] MISSING character_id for "${display_name ?? 'unknown'}". ` +
      `Got: "${character_id ?? 'none'}". ` +
      `The DB must provide a valid character_id field (e.g., "jack_the_ripper"), not a userchar ID.`
    );
  }

  return character_id;
}

// Legacy function for backward compatibility
export function resolveAgentKey(c: {
  id: string;
  name?: string;
  character_id?: string;
  template_id?: string;
  archetype?: string;
}): string {
  return mustResolveAgentKey(c.name, c.character_id || c.template_id, 'agent_key');
}