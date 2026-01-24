import {
  CHARACTER_ALIASES,
  CharacterSlug,
  EQUIPMENT_OVERRIDES,
  SKILL_OVERRIDES,
  PROGRESSION_IMAGES,
  PERFORMANCE_IMAGES,
  CONFESSIONAL_IMAGES,
  TRAINING_IMAGES,
  THERAPY_IMAGES,
  FINANCE_IMAGES,
  GROUP_ACTIVITY_IMAGES,
  COLOSSEAUM_IMAGES,
  CLUBHOUSE_IMAGES,
  GRAFFITI_IMAGES,
  COMMUNITY_BOARD_IMAGES,
  CharacterImageVariant
} from '../data/characterImageManifest';
import { CharacterAPIResponse } from '../types/api';

// Remote Image Repository Configuration
// URL: https://github.com/CPAIOS/Blank-Wars_Images-3
const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main';

// Helper to get slug from name
export const getCharacterSlug = (name: string): CharacterSlug | null => {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  return CHARACTER_ALIASES[normalized] || null;
};

// Map variants to their image dictionaries (Only for overrides now)
const VARIANT_MAPS: Record<CharacterImageVariant, Record<string, string>> = {
  progression: {},
  equipment: EQUIPMENT_OVERRIDES,
  skills: SKILL_OVERRIDES,
  performance: {}, // Standardized
  confessional: {}, // Standardized
  training: {}, // Standardized
  therapy: {}, // Standardized
  finance: {}, // Standardized
  group_activities: {}, // Standardized
  colosseaum: COLOSSEAUM_IMAGES, // Keep for now as some might be missing
  clubhouse: CLUBHOUSE_IMAGES, // Keep for now
  graffiti: GRAFFITI_IMAGES,
  community_board: COMMUNITY_BOARD_IMAGES,
  furniture_bed: {},
  furniture_floor: {},
  furniture_bunk: {},
  kitchen: {},
  team: {}
};

// Type for character input - can be a string name/slug or an object with name and scene_image_slug
export type CharacterInput = string | { name: string; scene_image_slug?: string; id?: string };

/**
 * Get the image path for a character and variant
 * @param character_input - Character name string, slug, or object with name/scene_image_slug
 * @param variant - The type of image needed (default: 'progression')
 * @param facility - Optional facility for confessional images ('spartan' or 'mansion')
 * @returns The absolute path to the image
 */
export const getCharacterImagePath = (
  character_input: CharacterInput,
  variant: CharacterImageVariant = 'progression',
  facility?: 'spartan' | 'mansion' // Optional facility for confessional
): string => {
  // Extract name and potential slug from input
  const character_name = typeof character_input === 'string'
    ? character_input
    : (character_input as any).name; // Handle legacy object input if necessary, though type says string

  const scene_image_slug = typeof character_input === 'object' && (character_input as any).scene_image_slug
    ? (character_input as any).scene_image_slug
    : undefined;

  // Helper to prepend remote base URL
  const toRemotePath = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${REMOTE_IMAGE_BASE_URL}/${cleanPath}`;
  };

  if (!character_name) return '';

  const slug = getCharacterSlug(character_name);

  // Use scene_image_slug from DB if available and valid (overrides standard slug)
  // This allows "Space Cyborg" -> "space_cyborg" (standard) or "rilak" (DB override)
  // Fallback to algorithmic path generation if no override or slug is found
  const base_name = scene_image_slug || slug || character_name.toLowerCase().replace(/\s+/g, '_');

  if (base_name) {
    const map = VARIANT_MAPS[variant];
    if (map && map[base_name as CharacterSlug]) {
      return toRemotePath(map[base_name as CharacterSlug]);
    }
  }

  switch (variant) {
    case 'equipment':
      return toRemotePath(`Equipment/${base_name}_equipment.png`);
    case 'skills':
      return toRemotePath(`Skills/${base_name}_skills.png`);
    case 'performance':
      // Standardized: Performance Coaching/[slug]_1-on-1_1.png (default to 1)
      return toRemotePath(`Performance Coaching/${base_name}_1-on-1_1.png`);
    case 'confessional':
      // Standardized: Confessional/[Facility]/[slug]_confessional_[suffix].png
      // Default to 'spartan' if not provided
      const facilityFolder = facility === 'mansion' ? 'Team Mansion' : 'Spartan_Apartment';
      const facilitySuffix = facility === 'mansion' ? 'mansion' : 'spartan_apt';
      return toRemotePath(`Confessional/${facilityFolder}/${base_name}_confessional_${facilitySuffix}.png`);
    case 'kitchen':
      return toRemotePath(`Kitchen/${base_name}_kitchen.png`);
    case 'training':
      // Standardized: Training/[slug]_training_1.png (default to 1)
      return toRemotePath(`Training/${base_name}_training_1.png`);
    case 'therapy':
      // Standardized: Therapy/[slug]_therapy_1.png (default to 1)
      return toRemotePath(`Therapy/${base_name}_therapy_1.png`);
    case 'finance':
      // Standardized: Finance/[slug]_finance_1.png (default to 1)
      return toRemotePath(`Finance/${base_name}_finance_1.png`);
    case 'group_activities':
      // Standardized: Group Activities/[slug]_group_activity_1.png (default to 1)
      return toRemotePath(`Group Activities/${base_name}_group_activity_1.png`);
    case 'colosseaum':
      return toRemotePath(`Colosseaum/${base_name}_colosseaum.png`);
    case 'clubhouse':
      return toRemotePath(`Clubhouse/${base_name}_clubhouse.png`);
    case 'graffiti':
      return toRemotePath(`Graffiti Wall/${base_name}_graffiti.png`);
    case 'community_board':
      return toRemotePath(`Community Board/${base_name}_community_board.png`);
    case 'furniture_bed':
      return toRemotePath(`Headquarters/Living_Quarters/bed/${base_name}_bed.png`);
    case 'furniture_floor':
      return toRemotePath(`Headquarters/Living_Quarters/floor/${base_name}_floor.png`);
    case 'furniture_bunk':
      return toRemotePath(`Headquarters/Living_Quarters/bunk_bed/${base_name}_bunk_bed.png`);
    default:
      // Standardized: Progression/[slug]_progression_1.png (default to 1)
      return toRemotePath(`Progression/${base_name}_progression_1.png`);
  }
};

/**
 * Get a set of images for a character across all variants
 * @param character_input - Character name string or CharacterAPIResponse object
 * @param count - Number of images to fetch (default 3)
 * @returns Array of image paths
 */
export const getCharacterImageSet = (
  character_input: string | { name: string; scene_image_slug?: string },
  variant: CharacterImageVariant,
  count: number = 3
): string[] => {
  const images: string[] = [];
  const character_name = typeof character_input === 'string' ? character_input : character_input.name;
  const scene_image_slug = typeof character_input === 'object' ? character_input.scene_image_slug : undefined;
  const slug = getCharacterSlug(character_name);
  // Use scene_image_slug from DB if available and valid (overrides standard slug)
  // Fallback to algorithmic path generation if no override or slug is found
  const base_name = scene_image_slug || slug || character_name.toLowerCase().replace(/\s+/g, '_');

  const toRemotePath = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${REMOTE_IMAGE_BASE_URL}/${cleanPath}`;
  };

  for (let i = 1; i <= count; i++) {
    switch (variant) {
      case 'progression':
        images.push(toRemotePath(`Progression/${base_name}_progression_${i}.png`));
        break;
      case 'performance':
        images.push(toRemotePath(`Performance Coaching/${base_name}_1-on-1_${i}.png`));
        break;
      case 'training':
        images.push(toRemotePath(`Training/${base_name}_training_${i}.png`));
        break;
      case 'therapy':
        images.push(toRemotePath(`Therapy/${base_name}_therapy_${i}.png`));
        break;
      case 'finance':
        images.push(toRemotePath(`Finance/${base_name}_finance_${i}.png`));
        break;
      case 'group_activities':
        // Note: Group activities might be singular, but if set is requested we assume numbered
        images.push(toRemotePath(`Group Activities/${base_name}_group_activity_${i}.png`));
        break;
      default:
        // For single-image variants, just return the one image repeated or handled differently
        // But this function seems designed for multi-image sets.
        // If it's a single image variant, we might just want to push it once.
        images.push(getCharacterImagePath(character_input as any, variant));
        break;
    }
  }
  return images;
};

// 3D Model Repository Configuration
// Models are served directly from GitHub raw content (no submodule)
// Updated to use Metal Foldout Chair models from blank-wars-models repo
const REMOTE_3D_MODEL_BASE_URL = 'https://raw.githubusercontent.com/Green003-CPAIOS/blank-wars-models/main/Metal_Foldout_Chair_Models';

// Get 3D model path for character (GLB format)
export const getCharacter3DModelPath = (character_name: string, context?: string): string => {
  const normalizedName = character_name?.toLowerCase()?.trim();

  // All 35 character models from the blank-wars-models repo (Metal Foldout Chair versions)
  const models: Record<string, string> = {
    'achilles': `${REMOTE_3D_MODEL_BASE_URL}/achilles_metal_foldout_chair.glb`,
    'agent x': `${REMOTE_3D_MODEL_BASE_URL}/agent_x_metal_foldout_chair.glb`,
    'agent_x': `${REMOTE_3D_MODEL_BASE_URL}/agent_x_metal_foldout_chair.glb`,
    'archangel michael': `${REMOTE_3D_MODEL_BASE_URL}/archangel_michael_metal_foldout_chair.glb`,
    'archangel_michael': `${REMOTE_3D_MODEL_BASE_URL}/archangel_michael_metal_foldout_chair.glb`,
    'michael': `${REMOTE_3D_MODEL_BASE_URL}/archangel_michael_metal_foldout_chair.glb`,
    'betty boup': `${REMOTE_3D_MODEL_BASE_URL}/betty_boup_metal_foldout_chair.glb`,
    'betty_boup': `${REMOTE_3D_MODEL_BASE_URL}/betty_boup_metal_foldout_chair.glb`,
    'billy the kid': `${REMOTE_3D_MODEL_BASE_URL}/billy_the_kid_metal_foldout_chair.glb`,
    'billy_the_kid': `${REMOTE_3D_MODEL_BASE_URL}/billy_the_kid_metal_foldout_chair.glb`,
    'cleopatra': `${REMOTE_3D_MODEL_BASE_URL}/cleopatra_metal_foldout_chair.glb`,
    'cleopatra vii': `${REMOTE_3D_MODEL_BASE_URL}/cleopatra_metal_foldout_chair.glb`,
    'crumbsworth': `${REMOTE_3D_MODEL_BASE_URL}/crumbsworth_metal_foldout_chair.glb`,
    'don quixote': `${REMOTE_3D_MODEL_BASE_URL}/don_quixote_metal_foldout_chair.glb`,
    'don_quixote': `${REMOTE_3D_MODEL_BASE_URL}/don_quixote_metal_foldout_chair.glb`,
    'fenrir': `${REMOTE_3D_MODEL_BASE_URL}/fenrir_metal_foldout_chair.glb`,
    'frankenstein': `${REMOTE_3D_MODEL_BASE_URL}/frankenstein_metal_foldout_chair.glb`,
    'frankenstein\'s monster': `${REMOTE_3D_MODEL_BASE_URL}/frankenstein_metal_foldout_chair.glb`,
    'frankensteins monster': `${REMOTE_3D_MODEL_BASE_URL}/frankenstein_metal_foldout_chair.glb`,
    'genghis khan': `${REMOTE_3D_MODEL_BASE_URL}/genghis_khan_metal_foldout_chair.glb`,
    'genghis_khan': `${REMOTE_3D_MODEL_BASE_URL}/genghis_khan_metal_foldout_chair.glb`,
    'jack the ripper': `${REMOTE_3D_MODEL_BASE_URL}/jack_the_ripper_metal_foldout_chair.glb`,
    'jack_the_ripper': `${REMOTE_3D_MODEL_BASE_URL}/jack_the_ripper_metal_foldout_chair.glb`,
    'joan of arc': `${REMOTE_3D_MODEL_BASE_URL}/joan_of_arc_metal_foldout_chair.glb`,
    'joan_of_arc': `${REMOTE_3D_MODEL_BASE_URL}/joan_of_arc_metal_foldout_chair.glb`,
    'joan': `${REMOTE_3D_MODEL_BASE_URL}/joan_of_arc_metal_foldout_chair.glb`,
    'kali': `${REMOTE_3D_MODEL_BASE_URL}/kali_metal_foldout_chair.glb`,
    'kangaroo': `${REMOTE_3D_MODEL_BASE_URL}/kangaroo_metal_foldout_chair.glb`,
    'karna': `${REMOTE_3D_MODEL_BASE_URL}/karna_metal_foldout_chair.glb`,
    'little bo peep': `${REMOTE_3D_MODEL_BASE_URL}/little_bo_peep_metal_foldout_chair.glb`,
    'little_bo_peep': `${REMOTE_3D_MODEL_BASE_URL}/little_bo_peep_metal_foldout_chair.glb`,
    'mami wata': `${REMOTE_3D_MODEL_BASE_URL}/mami_wata_metal_foldout_chair.glb`,
    'mami_wata': `${REMOTE_3D_MODEL_BASE_URL}/mami_wata_metal_foldout_chair.glb`,
    'merlin': `${REMOTE_3D_MODEL_BASE_URL}/merlin_metal_foldout_chair.glb`,
    'napoleon': `${REMOTE_3D_MODEL_BASE_URL}/napoleon_metal_foldout_chair.glb`,
    'napoleon bonaparte': `${REMOTE_3D_MODEL_BASE_URL}/napoleon_metal_foldout_chair.glb`,
    'napoleon_bonaparte': `${REMOTE_3D_MODEL_BASE_URL}/napoleon_metal_foldout_chair.glb`,
    'nikola tesla': `${REMOTE_3D_MODEL_BASE_URL}/nikola_tesla_metal_foldout_chair.glb`,
    'nikola_tesla': `${REMOTE_3D_MODEL_BASE_URL}/nikola_tesla_metal_foldout_chair.glb`,
    'tesla': `${REMOTE_3D_MODEL_BASE_URL}/nikola_tesla_metal_foldout_chair.glb`,
    'popeye': `${REMOTE_3D_MODEL_BASE_URL}/popeye_metal_foldout_chair.glb`,
    'pt barnum': `${REMOTE_3D_MODEL_BASE_URL}/pt_barnum_metal_foldout_chair.glb`,
    'pt_barnum': `${REMOTE_3D_MODEL_BASE_URL}/pt_barnum_metal_foldout_chair.glb`,
    'quetzalcoatl': `${REMOTE_3D_MODEL_BASE_URL}/quetzalcoatl_metal_foldout_chair.glb`,
    'ramses': `${REMOTE_3D_MODEL_BASE_URL}/ramses_metal_foldout_chair.glb`,
    'ramses ii': `${REMOTE_3D_MODEL_BASE_URL}/ramses_metal_foldout_chair.glb`,
    'ramses_ii': `${REMOTE_3D_MODEL_BASE_URL}/ramses_metal_foldout_chair.glb`,
    'rilak': `${REMOTE_3D_MODEL_BASE_URL}/rilak_trelkar_metal_foldout_chair.glb`,
    'rilak-trelkar': `${REMOTE_3D_MODEL_BASE_URL}/rilak_trelkar_metal_foldout_chair.glb`,
    'rilak trelkar': `${REMOTE_3D_MODEL_BASE_URL}/rilak_trelkar_metal_foldout_chair.glb`,
    'rilak_trelkar': `${REMOTE_3D_MODEL_BASE_URL}/rilak_trelkar_metal_foldout_chair.glb`,
    'robin hood': `${REMOTE_3D_MODEL_BASE_URL}/robin_hood_metal_foldout_chair.glb`,
    'robin_hood': `${REMOTE_3D_MODEL_BASE_URL}/robin_hood_metal_foldout_chair.glb`,
    'sam spade': `${REMOTE_3D_MODEL_BASE_URL}/sam_spade_metal_foldout_chair.glb`,
    'sam_spade': `${REMOTE_3D_MODEL_BASE_URL}/sam_spade_metal_foldout_chair.glb`,
    'shaka zulu': `${REMOTE_3D_MODEL_BASE_URL}/shaka_zulu_metal_foldout_chair.glb`,
    'shaka_zulu': `${REMOTE_3D_MODEL_BASE_URL}/shaka_zulu_metal_foldout_chair.glb`,
    'sherlock holmes': `${REMOTE_3D_MODEL_BASE_URL}/sherlock_metal_foldout_chair.glb`,
    'sherlock': `${REMOTE_3D_MODEL_BASE_URL}/sherlock_metal_foldout_chair.glb`,
    'holmes': `${REMOTE_3D_MODEL_BASE_URL}/sherlock_metal_foldout_chair.glb`,
    'space cyborg': `${REMOTE_3D_MODEL_BASE_URL}/space_cyborg_metal_foldout_chair.glb`,
    'space_cyborg': `${REMOTE_3D_MODEL_BASE_URL}/space_cyborg_metal_foldout_chair.glb`,
    'cyborg': `${REMOTE_3D_MODEL_BASE_URL}/space_cyborg_metal_foldout_chair.glb`,
    'sun wukong': `${REMOTE_3D_MODEL_BASE_URL}/sun_wukong_metal_foldout_chair.glb`,
    'sun_wukong': `${REMOTE_3D_MODEL_BASE_URL}/sun_wukong_metal_foldout_chair.glb`,
    'the mad hatter': `${REMOTE_3D_MODEL_BASE_URL}/the_mad_hatter_metal_foldout_chair.glb`,
    'the_mad_hatter': `${REMOTE_3D_MODEL_BASE_URL}/the_mad_hatter_metal_foldout_chair.glb`,
    'mad hatter': `${REMOTE_3D_MODEL_BASE_URL}/the_mad_hatter_metal_foldout_chair.glb`,
    'unicorn': `${REMOTE_3D_MODEL_BASE_URL}/unicorn_metal_foldout_chair.glb`,
    'velociraptor': `${REMOTE_3D_MODEL_BASE_URL}/velociraptor_metal_foldout_chair.glb`,
    'raptor': `${REMOTE_3D_MODEL_BASE_URL}/velociraptor_metal_foldout_chair.glb`
  };

  return models[normalizedName] || '';
};

// Check if character has 3D model available
export const hasCharacter3DModel = (character_name: string): boolean => {
  return getCharacter3DModelPath(character_name) !== '';
};
