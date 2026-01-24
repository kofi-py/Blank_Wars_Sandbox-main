// Centralized character image manifest and alias handling

export type CharacterImageVariant =
  | 'progression'
  | 'equipment'
  | 'skills'
  | 'performance'
  | 'confessional'
  | 'kitchen'
  | 'training'
  | 'therapy'
  | 'finance'
  | 'group_activities'
  | 'team'
  | 'colosseaum'
  | 'clubhouse'
  | 'graffiti'
  | 'community_board'
  | 'furniture_bed'
  | 'furniture_floor'
  | 'furniture_bunk';

// CharacterSlug must match DB scene_image_slug values exactly
export type CharacterSlug =
  | 'achilles'
  | 'agent_x'
  | 'aleister_crowley'
  | 'anubis'
  | 'archangel_michael'
  | 'barry'
  | 'billy_the_kid'
  | 'carl_jung'
  | 'cleopatra'
  | 'crumbsworth'
  | 'cyborg'           // space_cyborg's scene_image_slug
  | 'don_quixote'
  | 'dracula'
  | 'eleanor_roosevelt'
  | 'fenrir'
  | 'frankenstein'     // frankenstein_monster's scene_image_slug
  | 'genghis_khan'
  | 'holmes'           // sherlock's scene_image_slug
  | 'hostmaster_v8_72'
  | 'jack_the_ripper'
  | 'joan'             // joan of arc's scene_image_slug
  | 'kali'
  | 'kangaroo'
  | 'karna'
  | 'king_solomon'
  | 'little_bo_peep'
  | 'lmb_3000'
  | 'mami_wata'
  | 'merlin'
  | 'napoleon_bonaparte'
  | 'quetzalcoatl'
  | 'ramses_ii'
  | 'rilak'            // rilak_trelkar's scene_image_slug
  | 'robin_hood'
  | 'sam_spade'
  | 'seraphina'
  | 'shaka_zulu'
  | 'sun_wukong'
  | 'tesla'
  | 'unicorn'
  | 'velociraptor'
  | 'zxk14bw7'
  | 'zyxthala';

// Normalized human-friendly names to DB scene_image_slug values
// All aliases must map to the EXACT scene_image_slug from the database
export const CHARACTER_ALIASES: Record<string, CharacterSlug> = {
  // Direct matches (id === scene_image_slug)
  achilles: 'achilles',
  'agent x': 'agent_x',
  agent_x: 'agent_x',
  aleister_crowley: 'aleister_crowley',
  'aleister crowley': 'aleister_crowley',
  aleister: 'aleister_crowley',
  anubis: 'anubis',
  archangel_michael: 'archangel_michael',
  'archangel michael': 'archangel_michael',
  archangel: 'archangel_michael',
  barry: 'barry',
  'barry the closer': 'barry',
  'billy the kid': 'billy_the_kid',
  billy_the_kid: 'billy_the_kid',
  carl_jung: 'carl_jung',
  'carl jung': 'carl_jung',
  cleopatra: 'cleopatra',
  'cleopatra vii': 'cleopatra',
  crumbsworth: 'crumbsworth',
  don_quixote: 'don_quixote',
  'don quixote': 'don_quixote',
  'don q': 'don_quixote',
  dracula: 'dracula',
  'count dracula': 'dracula',
  eleanor_roosevelt: 'eleanor_roosevelt',
  'eleanor roosevelt': 'eleanor_roosevelt',
  fenrir: 'fenrir',
  genghis_khan: 'genghis_khan',
  'genghis khan': 'genghis_khan',
  gengis: 'genghis_khan',
  gengas: 'genghis_khan',
  hostmaster_v8_72: 'hostmaster_v8_72',
  'hostmaster v8.72': 'hostmaster_v8_72',
  jack_the_ripper: 'jack_the_ripper',
  'jack the ripper': 'jack_the_ripper',
  kali: 'kali',
  kangaroo: 'kangaroo',
  karna: 'karna',
  king_solomon: 'king_solomon',
  'king solomon': 'king_solomon',
  little_bo_peep: 'little_bo_peep',
  'little bo peep': 'little_bo_peep',
  lmb_3000: 'lmb_3000',
  'lmb-3000': 'lmb_3000',
  'lady macbeth': 'lmb_3000',
  mami_wata: 'mami_wata',
  'mami wata': 'mami_wata',
  merlin: 'merlin',
  napoleon_bonaparte: 'napoleon_bonaparte',
  'napoleon bonaparte': 'napoleon_bonaparte',
  napoleon: 'napoleon_bonaparte',
  quetzalcoatl: 'quetzalcoatl',
  ramses_ii: 'ramses_ii',
  'ramses ii': 'ramses_ii',
  ramses: 'ramses_ii',
  robin_hood: 'robin_hood',
  'robin hood': 'robin_hood',
  sam_spade: 'sam_spade',
  'sam spade': 'sam_spade',
  'samuel spade': 'sam_spade',
  seraphina: 'seraphina',
  shaka_zulu: 'shaka_zulu',
  'shaka zulu': 'shaka_zulu',
  zulu: 'shaka_zulu',
  sun_wukong: 'sun_wukong',
  'sun wukong': 'sun_wukong',
  tesla: 'tesla',
  'nikola tesla': 'tesla',
  unicorn: 'unicorn',
  velociraptor: 'velociraptor',
  zxk14bw7: 'zxk14bw7',
  zyxthala: 'zyxthala',
  'zyxthala the reptilian': 'zyxthala',

  // Characters where id !== scene_image_slug (CRITICAL MAPPINGS)
  // These map various name forms to the CORRECT scene_image_slug

  // space_cyborg -> cyborg
  cyborg: 'cyborg',
  space_cyborg: 'cyborg',
  'space cyborg': 'cyborg',

  // frankenstein_monster -> frankenstein
  frankenstein: 'frankenstein',
  frankenstein_monster: 'frankenstein',
  "frankenstein's monster": 'frankenstein',
  'frankensteins monster': 'frankenstein',

  // holmes (sherlock) -> holmes
  holmes: 'holmes',
  sherlock: 'holmes',
  'sherlock holmes': 'holmes',
  sherlock_holmes: 'holmes',

  // joan (joan of arc) -> joan
  joan: 'joan',
  'joan of arc': 'joan',
  'joan of ark': 'joan',
  joan_of_arc: 'joan',

  // rilak_trelkar -> rilak
  rilak: 'rilak',
  rilak_trelkar: 'rilak',
  'rilak trelkar': 'rilak',
  'rilak-trelkar': 'rilak',
};

// Image Constants - Mapped to Repo Structure (No /images/ prefix)

// Image Constants - Mapped to Repo Structure (No /images/ prefix)

// NOTE: Most categories now use algorithmic generation in characterImageUtils.ts
// These maps are only for overrides or categories that are not yet standardized.

export const PROGRESSION_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const TRAINING_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const THERAPY_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const FINANCE_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const PERFORMANCE_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const GROUP_ACTIVITY_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const CLUBHOUSE_IMAGES: Partial<Record<CharacterSlug, string>> = {}; // Kept for potential overrides
export const GRAFFITI_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const COMMUNITY_BOARD_IMAGES: Partial<Record<CharacterSlug, string>> = {};
export const CONFESSIONAL_IMAGES: Partial<Record<CharacterSlug, string>> = {};

// Specific overrides for irregular filenames
export const SKILL_OVERRIDES: Record<string, string> = {
  frankenstein: "Skills/frankenstein's_monster_skills.png",
  achilles: 'Skills/achillies_skills.png', // Typo in repo?
};

export const EQUIPMENT_OVERRIDES: Partial<Record<CharacterSlug, string>> = {
  // Only list actual exceptions here if any remain after script cleanup
  // For now, keeping empty as script should have fixed 'crumbsworth_equipmen'
};

// COLOSSEAUM_IMAGES keys must match CharacterSlug (scene_image_slug from DB)
export const COLOSSEAUM_IMAGES: Partial<Record<CharacterSlug, string>> = {
  achilles: 'Colosseaum/achilles_colosseaum.png',
  agent_x: 'Colosseaum/agent_x_colosseaum.png',
  aleister_crowley: 'Colosseaum/aleister_crowley_colosseaum.png',
  archangel_michael: 'Colosseaum/archangel_michael_colosseaum.png',
  billy_the_kid: 'Colosseaum/billy_the_kid_colosseaum.png',
  cleopatra: 'Colosseaum/cleopatra_colosseaum.png',
  cyborg: 'Colosseaum/cyborg_colosseaum.png',
  don_quixote: 'Colosseaum/don_quixote_colosseaum.png',
  dracula: 'Colosseaum/dracula_colosseaum.png',
  fenrir: 'Colosseaum/fenrir_colosseaum.png',
  frankenstein: 'Colosseaum/frankenstein_colosseaum.png',
  genghis_khan: 'Colosseaum/genghis_khan_colosseaum.png',
  holmes: 'Colosseaum/holmes_colosseaum.png',
  jack_the_ripper: 'Colosseaum/jack_the_ripper_colosseaum.png',
  joan: 'Colosseaum/joan_colosseaum.png',
  kali: 'Colosseaum/kali_colosseaum.png',
  kangaroo: 'Colosseaum/kangaroo_colosseaum.png',
  karna: 'Colosseaum/karna_colosseaum.png',
  little_bo_peep: 'Colosseaum/little_bo_peep_colosseaum.png',
  mami_wata: 'Colosseaum/mami_wata_colosseaum.png',
  merlin: 'Colosseaum/merlin_colosseaum.png',
  napoleon_bonaparte: 'Colosseaum/napoleon_bonaparte_colosseaum.png',
  quetzalcoatl: 'Colosseaum/quetzalcoatl_colosseaum.png',
  ramses_ii: 'Colosseaum/ramses_ii_colosseaum.png',
  rilak: 'Colosseaum/rilak_colosseaum.png',
  robin_hood: 'Colosseaum/robin_hood_colosseaum.png',
  sam_spade: 'Colosseaum/sam_spade_colosseaum.png',
  shaka_zulu: 'Colosseaum/shaka_zulu_colosseaum.png',
  sun_wukong: 'Colosseaum/sun_wukong_colosseaum.png',
  tesla: 'Colosseaum/tesla_colosseaum.png',
  unicorn: 'Colosseaum/unicorn_colosseaum.png',
  velociraptor: 'Colosseaum/velociraptor_colosseaum.png'
};
