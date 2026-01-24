/**
 * Real Estate Agent Personas Index
 * Maps character_id to persona builder for real estate agents.
 *
 * Canonical IDs (see migration 246, agentResolver.ts):
 * - barry (resolves from barry_the_closer, barry_closer, etc.)
 * - lmb_3000 (resolves from lmb-3000, lmb3000, etc.)
 * - zyxthala (resolves from zyxthala_reptilian, etc.)
 */

import type { SystemCharacterIdentity } from '../../../../types';

import buildBarryPersona from './barry';
import buildLMB3000Persona from './lmb_3000';
import buildZyxthalaPersona from './zyxthala';

type AgentPersonaBuilder = (identity: SystemCharacterIdentity) => string;

const AGENT_PERSONAS: Record<string, AgentPersonaBuilder> = {
  barry: buildBarryPersona,
  lmb_3000: buildLMB3000Persona,
  zyxthala: buildZyxthalaPersona,
};

/**
 * Gets the persona for a real estate agent by character_id.
 * STRICT MODE: Throws if agent persona not found.
 */
export function getAgentPersona(
  characterId: string,
  identity: SystemCharacterIdentity
): string {
  const personaBuilder = AGENT_PERSONAS[characterId];

  if (!personaBuilder) {
    throw new Error(
      `STRICT MODE: Real estate agent persona not found for character "${characterId}". ` +
      `Available: ${Object.keys(AGENT_PERSONAS).join(', ')}`
    );
  }

  return personaBuilder(identity);
}

export default getAgentPersona;
