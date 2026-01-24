/**
 * Kitchen Table Personas Index
 * Exports persona pools separated by character type.
 * CONTESTANT_PERSONAS: Regular characters in normal kitchen chat rotation
 * SYSTEM_GUEST_PERSONAS: System characters (hosts, judges, therapists, etc.) for surprise visits only
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import type { KitchenPersonaOptions } from './buildPersona';

// Import contestant persona builders
import achilles from './achilles';
import agent_x from './agent_x';
import aleister_crowley from './aleister_crowley';
import archangel_michael from './archangel_michael';
import billy_the_kid from './billy_the_kid';
import cleopatra from './cleopatra';
import crumbsworth from './crumbsworth';
import don_quixote from './don_quixote';
import dracula from './dracula';
import fenrir from './fenrir';
import frankenstein_monster from './frankenstein_monster';
import genghis_khan from './genghis_khan';
import holmes from './holmes';
import jack_the_ripper from './jack_the_ripper';
import joan from './joan';
import kali from './kali';
import kangaroo from './kangaroo';
import karna from './karna';
import little_bo_peep from './little_bo_peep';
import mami_wata from './mami_wata';
import merlin from './merlin';
import napoleon_bonaparte from './napoleon_bonaparte';
import quetzalcoatl from './quetzalcoatl';
import ramses_ii from './ramses_ii';
import rilak_trelkar from './rilak_trelkar';
import robin_hood from './robin_hood';
import sam_spade from './sam_spade';
import shaka_zulu from './shaka_zulu';
import space_cyborg from './space_cyborg';
import sun_wukong from './sun_wukong';
import tesla from './tesla';
import unicorn from './unicorn';
import velociraptor from './velociraptor';

// Import system guest persona builders (for surprise visits only)
import anubis from './anubis';
import barry from './barry';
import carl_jung from './carl_jung';
import eleanor_roosevelt from './eleanor_roosevelt';
import king_solomon from './king_solomon';
import lmb_3000 from './lmb_3000';
import seraphina from './seraphina';
import zxk14bw7 from './zxk14bw7';
import zyxthala from './zyxthala';

type PersonaBuilder = (identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions) => string;

/**
 * Regular contestants - included in normal kitchen chat rotation
 */
export const CONTESTANT_PERSONAS: Record<string, PersonaBuilder> = {
  achilles,
  agent_x,
  aleister_crowley,
  archangel_michael,
  billy_the_kid,
  cleopatra,
  crumbsworth,
  don_quixote,
  dracula,
  fenrir,
  frankenstein_monster,
  genghis_khan,
  holmes,
  jack_the_ripper,
  joan,
  kali,
  kangaroo,
  karna,
  little_bo_peep,
  mami_wata,
  merlin,
  napoleon_bonaparte,
  quetzalcoatl,
  ramses_ii,
  rilak_trelkar,
  robin_hood,
  sam_spade,
  shaka_zulu,
  space_cyborg,
  sun_wukong,
  tesla,
  unicorn,
  velociraptor,
};

/**
 * System characters - excluded from normal rotation, available for surprise visits
 * Includes: judges, therapists, real estate agents, hosts, and other system roles
 */
export const SYSTEM_GUEST_PERSONAS: Record<string, PersonaBuilder> = {
  // Judges
  anubis,
  eleanor_roosevelt,
  king_solomon,
  // Therapist
  carl_jung,
  // Real estate agents
  barry,
  lmb_3000,
  zyxthala,
  // System characters
  seraphina,
  zxk14bw7,
};

// Combined pool for lookup (used by getPersona)
const allPersonas: Record<string, PersonaBuilder> = {
  ...CONTESTANT_PERSONAS,
  ...SYSTEM_GUEST_PERSONAS,
};

/**
 * Gets the persona builder for a character and builds the persona with their current data.
 * STRICT MODE: Throws error if character persona not found.
 */
export default function getPersona(
  characterId: string,
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  options: KitchenPersonaOptions
): string {
  const personaBuilder = allPersonas[characterId];

  if (!personaBuilder) {
    throw new Error(`STRICT MODE: Kitchen table persona not found for character "${characterId}". Available: ${Object.keys(allPersonas).join(', ')}`);
  }

  return personaBuilder(identity, combat, psych, options);
}
