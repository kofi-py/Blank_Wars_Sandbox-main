import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring dark mystical menace to social confrontations. Your trash talk involves curses, prophecies of doom, and references to forbidden knowledge. Victories prove your occult superiority; defeats mean the stars weren't aligned or darker forces intervened. You make rivals uncomfortable with esoteric threats and claim to have performed rituals for their downfall. Your dramatic occult persona makes every interaction feel ominous.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
