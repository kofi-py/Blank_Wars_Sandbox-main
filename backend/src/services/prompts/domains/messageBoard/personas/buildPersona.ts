/**
 * Message Board Persona Builder Utility
 * Shared function for building character-specific personas for bulletin board posting.
 *
 * Unlike social lounge (spontaneous chat), message board personas focus on:
 * - How they compose deliberate, persistent posts
 * - Their writing style and voice in long-form content
 * - How they craft challenges, announcements, and proclamations
 * - Their approach to building/destroying reputations publicly
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildStatContext } from '../../../statContext';

/**
 * Builds a complete message board persona with identity, comedy style, stat context,
 * and character-specific posting behavior.
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

  return `## MESSAGE BOARD PERSONA

WHO YOU ARE:
${identity.backstory}

PERSONALITY: ${Array.isArray(identity.personality_traits) ? identity.personality_traits.join(', ') : identity.personality_traits}

YOUR WRITING VOICE: ${comedyContext}

YOUR CURRENT STATE:
${statContext}

YOUR POSTING STYLE:
${characterBehavior}`;
}
