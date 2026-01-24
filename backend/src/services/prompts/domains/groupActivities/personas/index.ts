/**
 * Group Activities Personas Index
 * Exports the getPersona function that returns character-specific personas.
 * NOTE: Only contestant characters - system characters (therapists, judges, hosts, trainers, real estate agents) are excluded.
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';

// Import all contestant persona builders
import holmes from './holmes';
import dracula from './dracula';
import achilles from './achilles';
import merlin from './merlin';
import cleopatra from './cleopatra';
import tesla from './tesla';
import joan from './joan';
import billy_the_kid from './billy_the_kid';
import sun_wukong from './sun_wukong';
import fenrir from './fenrir';
import frankenstein_monster from './frankenstein_monster';
import sam_spade from './sam_spade';
import genghis_khan from './genghis_khan';
import robin_hood from './robin_hood';
import space_cyborg from './space_cyborg';
import agent_x from './agent_x';
import aleister_crowley from './aleister_crowley';
import archangel_michael from './archangel_michael';
import don_quixote from './don_quixote';
import jack_the_ripper from './jack_the_ripper';
import kali from './kali';
import kangaroo from './kangaroo';
import karna from './karna';
import little_bo_peep from './little_bo_peep';
import mami_wata from './mami_wata';
import napoleon_bonaparte from './napoleon_bonaparte';
import quetzalcoatl from './quetzalcoatl';
import ramses_ii from './ramses_ii';
import shaka_zulu from './shaka_zulu';
import unicorn from './unicorn';
import velociraptor from './velociraptor';
import crumbsworth from './crumbsworth';
import rilak_trelkar from './rilak_trelkar';

type PersonaBuilder = (identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage) => string;

const personas: Record<string, PersonaBuilder> = {
  holmes,
  dracula,
  achilles,
  merlin,
  cleopatra,
  tesla,
  joan,
  billy_the_kid,
  sun_wukong,
  fenrir,
  frankenstein_monster,
  sam_spade,
  genghis_khan,
  robin_hood,
  space_cyborg,
  agent_x,
  aleister_crowley,
  archangel_michael,
  don_quixote,
  jack_the_ripper,
  kali,
  kangaroo,
  karna,
  little_bo_peep,
  mami_wata,
  napoleon_bonaparte,
  quetzalcoatl,
  ramses_ii,
  shaka_zulu,
  unicorn,
  velociraptor,
  crumbsworth,
  rilak_trelkar,
};

/**
 * Gets the persona builder for a character and builds the persona with their current data.
 * STRICT MODE: Throws error if character persona not found.
 */
export default function getPersona(
  characterId: string,
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage
): string {
  const personaBuilder = personas[characterId];

  if (!personaBuilder) {
    throw new Error(`STRICT MODE: Group activities persona not found for character "${characterId}". Available: ${Object.keys(personas).join(', ')}`);
  }

  return personaBuilder(identity, combat, psych);
}
