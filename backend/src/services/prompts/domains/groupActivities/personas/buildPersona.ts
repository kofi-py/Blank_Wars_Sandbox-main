/**
 * Group Activities Persona Builder Utility
 * Shared function for building character-specific personas with stat context.
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildStatContext } from '../../../statContext';

/**
 * Builds a complete group activities persona with identity, comedy style, stat context, and character-specific behavior.
 */
export function buildPersona(
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  characterBehavior: string
): string {
  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  // Build stat-based personality modifiers
  const statContext = buildStatContext(identity, combat, psych);

  return `GROUP ACTIVITIES PERSONA:

WHO YOU ARE:
${identity.backstory}

PERSONALITY: ${Array.isArray(identity.personality_traits) ? identity.personality_traits.join(', ') : identity.personality_traits}

COMEDY STYLE: ${comedyContext}

YOUR CURRENT STATE:
${statContext}

YOUR GROUP ACTIVITIES BEHAVIOR:
${characterBehavior}`;
}
