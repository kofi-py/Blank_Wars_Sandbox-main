/**
 * Social Lounge Personas Index
 * Maps character_id to persona builder for all 33 contestants.
 *
 * NOTE: Only contestants have socialLounge personas - system characters
 * (therapists, judges, real estate agents, hosts, trainers) do NOT appear here.
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';

// Import all contestant persona builders
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

type PersonaBuilder = (identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage) => string;

const personas: Record<string, PersonaBuilder> = {
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
 * Gets the persona builder for a character and builds the persona with their current data.
 * STRICT MODE: Throws error if character persona not found (should only happen for system characters).
 */
export default function getPersona(
  characterId: string,
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage
): string {
  const personaBuilder = personas[characterId];

  if (!personaBuilder) {
    throw new Error(`STRICT MODE: Social lounge persona not found for character "${characterId}". Only contestants have social lounge personas. Available: ${Object.keys(personas).join(', ')}`);
  }

  return personaBuilder(identity, combat, psych);
}
