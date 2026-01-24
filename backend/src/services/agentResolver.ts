// Minimal, dev-safe agent name resolver.
// No DB writes. Maps display names like "Fenrir", "Count Dracula", "Space Cyborg"
// to LocalAGI pool ids like "fenrir", "dracula", "space_cyborg".
export type ResolveResult = { id: string; reason: string };

const STRIP_PREFIXES = ["count ", "dr ", "doctor ", "sir ", "the "];

const ALIASES: Record<string, string> = {
  // 17 Battle Characters (coachable)
  "merlin": "merlin",
  "fenrir": "fenrir", 
  "holmes": "holmes",
  "sherlock holmes": "holmes",
  "dracula": "dracula",
  "count dracula": "dracula",
  "joan": "joan",
  "joan of arc": "joan",
  "frankenstein's monster": "frankenstein_monster",
  "frankenstein monster": "frankenstein_monster", 
  "frankensteins monster": "frankenstein_monster",
  "frankenstein": "frankenstein_monster",
  "sun wukong": "sun_wukong",
  "monkey king": "sun_wukong",
  "wukong": "sun_wukong",
  "sam spade": "sam_spade",
  "billy the kid": "billy_the_kid",
  "billy": "billy_the_kid",
  "genghis khan": "genghis_khan",
  "genghis": "genghis_khan",
  "khan": "genghis_khan",
  "tesla": "tesla",
  "nikola tesla": "tesla",
  "rilak_trelkar": "rilak_trelkar",
  "rilak trelkar": "rilak_trelkar",
  "rilak": "rilak_trelkar",
  "alien grey": "rilak_trelkar",
  "grey alien": "rilak_trelkar",
  "grey": "rilak_trelkar",
  "robin hood": "robin_hood",
  "robin": "robin_hood",
  "space cyborg": "space_cyborg",
  "space-cyborg": "space_cyborg",
  "cyborg": "space_cyborg",
  "agent x": "agent_x",
  "agent-x": "agent_x",
  "achilles": "achilles",
  "cleopatra": "cleopatra",
  "cleopatra vii": "cleopatra",
  "napoleon bonaparte": "napoleon_bonaparte",
  "napoleon": "napoleon_bonaparte",
  "bonaparte": "napoleon_bonaparte",
  "little bo peep": "little_bo_peep",
  "bo peep": "little_bo_peep",
  "aleister crowley": "aleister_crowley",
  "crowley": "aleister_crowley",
  "archangel michael": "archangel_michael",
  "michael": "archangel_michael",
  "don quixote": "don_quixote",
  "quixote": "don_quixote",
  "jack the ripper": "jack_the_ripper",
  "ripper": "jack_the_ripper",
  "kali": "kali",
  "kangaroo": "kangaroo",
  "karna": "karna",
  "mami wata": "mami_wata",
  "quetzalcoatl": "quetzalcoatl",
  "ramses ii": "ramses_ii",
  "ramses": "ramses_ii",
  "shaka zulu": "shaka_zulu",
  "shaka": "shaka_zulu",
  "unicorn": "unicorn",
  "velociraptor": "velociraptor",

  // 6 Service Characters (3 Real Estate + 3 Therapists)
  "barry": "barry",  // Canonical ID maps to itself
  "barry the closer": "barry",
  "barry_the_closer": "barry",
  "barry_closer": "barry",
  "closer": "barry",
  "lmb_3000": "lmb_3000",  // Canonical ID maps to itself
  "lmb 3000": "lmb_3000",
  "lmb-3000": "lmb_3000",
  "lmb3000": "lmb_3000",
  "robot": "lmb_3000",
  "macbeth": "lmb_3000",
  "zyxthala": "zyxthala",  // Canonical ID maps to itself
  "zyxthala_reptilian": "zyxthala",
  "zyxthala reptilian": "zyxthala",
  "reptilian": "zyxthala",
  "carl jung": "carl_jung",
  "carl": "carl_jung",
  "jung": "carl_jung",
  "seraphina": "seraphina",
  "fairy godmother": "seraphina",
  "fairy godmother seraphina": "seraphina",
  "fairy": "seraphina",
  "godmother": "seraphina",
  "alien therapist": "alien_therapist",
  "zxk14bw7": "zxk14bw7",

  // 3 Judges
  "eleanor roosevelt": "eleanor_roosevelt",
  "eleanor": "eleanor_roosevelt",
  "roosevelt": "eleanor_roosevelt",
  "king solomon": "king_solomon",
  "solomon": "king_solomon",
  "king": "king_solomon",
  "anubis": "anubis",

  // Confessional System
  "hostmaster v8 72": "hostmaster_v8_72",
  "hostmaster_v8_72": "hostmaster_v8_72",

  // Training System
  "argock": "argock",
  "orc trainer": "argock",
  "trainer": "argock",
};

function normalize(name: string): string {
  let s = (name || "").toLowerCase().trim();
  for (const p of STRIP_PREFIXES) {
    if (s.startsWith(p)) { s = s.slice(p.length); break; }
  }
  // collapse punctuation/spaces to single space
  s = s.replace(/[_\-\s]+/g, " ").replace(/['']/g, "'").replace(/[^a-z0-9' ]/g, "");
  return s;
}

export function resolveAgentId(display_name: string): ResolveResult {
  const n = normalize(display_name);
  if (ALIASES[n]) return { id: ALIASES[n], reason: `alias(${n})` };

  // Handle user character IDs (userchar_*) - these are already valid identifiers
  if (display_name.startsWith('userchar_')) {
    return { id: display_name, reason: 'userchar_id' };
  }

  // Handle raw UUIDs (user_characters.id format) - these are valid for system character instances
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(display_name)) {
    return { id: display_name, reason: 'uuid_userchar' };
  }

  // NO FALLBACKS - throw error if not found in ALIASES
  throw new Error(`Unknown agent: "${display_name}" (normalized: "${n}") - add to ALIASES in agent_resolver.ts`);
}