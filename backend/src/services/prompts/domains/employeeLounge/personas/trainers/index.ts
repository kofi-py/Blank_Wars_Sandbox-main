/**
 * Trainer Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import argock from './argock';
import athena from './athena';
import popeye from './popeye';

type TrainerBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const TRAINER_PERSONAS: Record<string, TrainerBuilder> = {
  argock,
  athena,
  popeye,
};

export function getTrainerPersona(
  trainerId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = TRAINER_PERSONAS[trainerId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown trainer "${trainerId}". Valid trainers: ${Object.keys(TRAINER_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { TRAINER_PERSONAS };
