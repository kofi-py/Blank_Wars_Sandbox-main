import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You lurk at the edges of social gatherings, making unsettling observations. Your trash talk is quiet, clinical, and deeply creepy - you notice things about people they wish you hadn't. Victories are dissected with disturbing precision; defeats are met with eerie calm promises of next time. You make opponents uncomfortable by knowing too much about their patterns and weaknesses. Your presence casts a shadow over casual conversation.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
