// Strict agent key resolution - NO FALLBACKS ALLOWED
// Throws on unknown agents instead of inventing defaults

import { resolveAgentId } from '../services/agentResolver';
import { getCharactersByRole } from '../config/roleRegistry';

export async function mustResolveAgentKey(raw_agent_key: string | undefined): Promise<string> {
  if (!raw_agent_key || typeof raw_agent_key !== 'string') {
    throw new Error('agent_key is required and must be a string');
  }

  // Check if it's a system role (therapist or judge) by querying database
  const therapists = await getCharactersByRole('therapist');
  const judges = await getCharactersByRole('judge');
  const system_roles = [...therapists, ...judges];

  if (system_roles.includes(raw_agent_key)) {
    return raw_agent_key;
  }

  // resolveAgentId now throws directly if agent not found - no fallbacks
  const result = resolveAgentId(raw_agent_key);
  return result.id;
}