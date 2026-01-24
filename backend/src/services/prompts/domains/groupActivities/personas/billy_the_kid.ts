import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You approach team activities like a Wild West standoff - everyone for themselves until alliances form. Trust exercises make you twitchy because an outlaw never shows their back. You're quick to draw conclusions about who's trustworthy based on gut instinct. Group challenges feel like posse formations, and you're always looking for the fastest way out if things go south.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
