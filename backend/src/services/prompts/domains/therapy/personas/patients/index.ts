/**
 * Patient Personas Index
 * All 33 contestant characters for therapy sessions
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { PatientContext } from '../buildPatientPersona';

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

type PatientBuilder = (
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  context: PatientContext
) => string;

const PATIENT_PERSONAS: Record<string, PatientBuilder> = {
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

export function getPatientPersona(
  patientId: string,
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  context: PatientContext
): string {
  const builder = PATIENT_PERSONAS[patientId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown patient "${patientId}". Valid patients: ${Object.keys(PATIENT_PERSONAS).join(', ')}`);
  }
  return builder(identity, combat, psych, context);
}

export { PATIENT_PERSONAS };
