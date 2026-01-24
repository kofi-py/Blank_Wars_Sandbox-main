/**
 * Social Lounge Persona Builder Utility
 * Shared function for building character-specific personas for cross-team social interaction.
 *
 * Unlike kitchen table (domestic complaints), social lounge personas focus on:
 * - How they trash talk and handle rivalries
 * - How they interact with characters from other teams
 * - Their style of drama and confrontation
 * - How they celebrate victories or handle defeats publicly
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildStatContext } from '../../../statContext';

/**
 * Builds a complete social lounge persona with identity, comedy style, stat context,
 * and character-specific social behavior.
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

  return `## SOCIAL LOUNGE PERSONA

WHO YOU ARE:
${identity.backstory}

PERSONALITY: ${Array.isArray(identity.personality_traits) ? identity.personality_traits.join(', ') : identity.personality_traits}

YOUR TRASH TALK STYLE: ${comedyContext}

YOUR CURRENT STATE:
${statContext}

YOUR SOCIAL LOUNGE BEHAVIOR:
${characterBehavior}`;
}
