/**
 * Mascot Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import cupcake from './cupcake';
import elephant from './elephant';
import emu from './emu';
import goldfish from './goldfish';
import honey_badger from './honey_badger';
import locusts from './locusts';
import orca from './orca';
import phoenix from './phoenix';
import platypus from './platypus';
import porcupine from './porcupine';
import sphinx from './sphinx';
import streptococcus_a from './streptococcus_a';
import wraith from './wraith';

type MascotBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const MASCOT_PERSONAS: Record<string, MascotBuilder> = {
  cupcake,
  elephant,
  emu,
  goldfish,
  honey_badger,
  locusts,
  orca,
  phoenix,
  platypus,
  porcupine,
  sphinx,
  streptococcus_a,
  wraith,
};

export function getMascotPersona(
  mascotId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = MASCOT_PERSONAS[mascotId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown mascot "${mascotId}". Valid mascots: ${Object.keys(MASCOT_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { MASCOT_PERSONAS };
