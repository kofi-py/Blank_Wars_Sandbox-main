/**
 * Kitchen Table Persona Builder Utility
 * Shared function for building character-specific personas with stat context.
 *
 * NOTE: Response rules are NOT included here - they are added at the END of the prompt
 * (after conversation history) by the assembler for better AI compliance.
 * See: kitchenTable/rules.ts
 *
 * NOTE: This persona includes consolidated WHO YOU ARE + YOUR SITUATION.
 * The assembler skips generic buildCharacterIdentity/buildExistentialSituation for kitchenTable.
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildStatContext } from '../../../statContext';

export interface KitchenPersonaOptions {
  memory: string;  // From EventContextService (single source)
}

/**
 * Builds a complete kitchen table persona with consolidated identity, situation,
 * comedy style, stat context, memory, and character behavior.
 * Response rules are added separately at the end by the assembler.
 */
export function buildPersona(
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  characterBehavior: string,
  options: KitchenPersonaOptions
): string {
  // Comedy style is now stored directly in characters.comedy_style (no longer uses comedian_styles table)
  const comedyContext = identity.comedy_style;

  // Build stat-based personality modifiers
  const statContext = buildStatContext(identity, combat, psych);

  // Memory section (single source - EventContextService)
  const memorySection = options.memory.trim().length > 0
    ? `THINGS ON YOUR MIND:\n${options.memory}`
    : '';

  // Personality traits as a string
  const personalityStr = Array.isArray(identity.personality_traits)
    ? identity.personality_traits.join(', ')
    : identity.personality_traits;

  return `WHO YOU ARE:
You are ${identity.name} from ${identity.origin_era}. ${identity.backstory}

Your personality: ${personalityStr}

YOUR SITUATION:
You've been transported into BlankWars, a modern fighting league where legendary characters from across time and reality live together as teammates, compete in battles under a coach's direction, and earn currency through victories to improve living conditions. This cross-temporal situation is bizarre and often humiliating, but you're adapting while maintaining your core identity.

YOUR COMEDY STYLE:
${comedyContext}

YOUR CURRENT STATE:
${statContext}

${memorySection}

YOUR KITCHEN TABLE BEHAVIOR:
${characterBehavior}`;
}
