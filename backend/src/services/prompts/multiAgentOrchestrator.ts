/**
 * Universal Multi-Agent Orchestrator
 *
 * Handles multi-agent conversations across domains (therapy, training, kitchen table, etc.)
 * Each domain can configure:
 * - Who can participate
 * - Rules for determining active agents
 * - Response order
 */

import { assemblePrompt } from './assembler';
import type { AssemblyRequest, CharacterData, Domain } from './types';

// =====================================================
// TYPES
// =====================================================

export interface AgentConfig {
  agent_id: string;
  agent_name: string;
  userchar_id: string;  // canonical character_id is derived internally
  role: string;
  role_type: 'contestant' | 'system';
}

export interface AgentResponse {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  message: string;
  timestamp: string;
}

export interface MultiAgentRequest {
  domain: Domain;
  user_message: string;
  conversation_history: string;
  agents: AgentConfig[];
  // Domain-specific context for determining active agents
  domain_context: Record<string, unknown>;
  // Optional: force specific agents to respond
  force_agents?: string[];
}

export interface ActiveAgentRule {
  // Check if this agent should respond based on message and context
  shouldRespond: (
    agent: AgentConfig,
    user_message: string,
    domain_context: Record<string, unknown>,
    previous_responses: AgentResponse[]
  ) => boolean;
}

// =====================================================
// DOMAIN RULES
// =====================================================

/**
 * Therapy domain rules:
 * - Therapist always responds first
 * - Patients respond after therapist
 * - In group: patients can respond to each other
 */
const THERAPY_RULES: Record<string, ActiveAgentRule> = {
  therapist: {
    shouldRespond: () => true, // Therapist always responds
  },
  patient: {
    shouldRespond: (agent, user_message, context) => {
      const session_type = context.session_type as string;
      if (session_type === 'individual') {
        return true; // Single patient always responds
      }
      // Group: check if addressed by name or if it's their turn
      const addressed = user_message.toLowerCase().includes(agent.agent_name.toLowerCase());
      const random_chance = Math.random() < 0.5; // 50% chance to interject in group
      return addressed || random_chance;
    },
  },
};

/**
 * Kitchen table domain rules:
 * - Characters respond if addressed by name
 * - Random chance for others to interject
 */
const KITCHEN_TABLE_RULES: Record<string, ActiveAgentRule> = {
  roommate: {
    shouldRespond: (agent, user_message) => {
      const addressed = user_message.toLowerCase().includes(agent.agent_name.toLowerCase());
      const random_chance = Math.random() < 0.3; // 30% chance to interject
      return addressed || random_chance;
    },
  },
};

/**
 * Training domain rules:
 * - Trainer responds based on phase and random chance
 * - Trainee always responds
 */
const TRAINING_RULES: Record<string, ActiveAgentRule> = {
  trainer: {
    shouldRespond: (agent, user_message, context) => {
      const addressed = user_message.toLowerCase().includes('trainer') ||
                       user_message.toLowerCase().includes(agent.agent_name.toLowerCase());
      const phase = context.training_phase as string;
      const random_chance = phase === 'planning' ? 0.3 : phase === 'active' ? 0.4 : 0.5;
      return addressed || Math.random() < random_chance;
    },
  },
  trainee: {
    shouldRespond: () => true, // Trainee always responds
  },
};

const DOMAIN_RULES: Partial<Record<Domain, Record<string, ActiveAgentRule>>> = {
  therapy: THERAPY_RULES,
  kitchenTable: KITCHEN_TABLE_RULES,
  training: TRAINING_RULES,
};

// =====================================================
// ORCHESTRATOR
// =====================================================

/**
 * Determine which agents should respond based on domain rules
 */
export function determineActiveAgents(
  request: MultiAgentRequest
): AgentConfig[] {
  const { domain, user_message, agents, domain_context, force_agents } = request;

  // If specific agents are forced, use those
  if (force_agents && force_agents.length > 0) {
    return agents.filter(a => force_agents.includes(a.agent_id));
  }

  const rules = DOMAIN_RULES[domain];
  if (!rules) {
    // No rules for this domain - all agents respond
    return agents;
  }

  const active: AgentConfig[] = [];
  const previous_responses: AgentResponse[] = [];

  for (const agent of agents) {
    const rule = rules[agent.role];
    if (!rule) {
      // No rule for this role - agent responds
      active.push(agent);
    } else if (rule.shouldRespond(agent, user_message, domain_context, previous_responses)) {
      active.push(agent);
    }
  }

  return active;
}

/**
 * Generate responses from multiple agents sequentially.
 * Later agents receive earlier responses as context.
 */
export async function generateMultiAgentResponses(
  request: MultiAgentRequest,
  active_agents: AgentConfig[],
  generateResponse: (prompt: string, agent: AgentConfig) => Promise<string>
): Promise<AgentResponse[]> {
  const responses: AgentResponse[] = [];

  for (const agent of active_agents) {
    // Build conversation history including previous agent responses
    let augmented_history = request.conversation_history;
    if (responses.length > 0) {
      const previous_text = responses
        .map(r => `${r.agent_name}: ${r.message}`)
        .join('\n');
      augmented_history = augmented_history
        ? `${augmented_history}\n\n[Other agents in this conversation:]\n${previous_text}`
        : `[Other agents in this conversation:]\n${previous_text}`;
    }

    // Build assembly request for this agent
    const assembly_request: AssemblyRequest = {
      userchar_id: agent.userchar_id,
      domain: request.domain,
      role: agent.role,
      role_type: agent.role_type,
      conversation_history: augmented_history,
      // Domain-specific options would be added here based on domain
    };

    try {
      const assembled = await assemblePrompt(assembly_request);
      const message = await generateResponse(assembled.system_prompt, agent);

      responses.push({
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        agent_type: agent.role,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error generating response for ${agent.agent_name}:`, error);
    }
  }

  return responses;
}

/**
 * Full orchestration: determine active agents and generate responses
 */
export async function orchestrateMultiAgentResponse(
  request: MultiAgentRequest,
  generateResponse: (prompt: string, agent: AgentConfig) => Promise<string>
): Promise<AgentResponse[]> {
  const active_agents = determineActiveAgents(request);

  if (active_agents.length === 0) {
    console.warn('No active agents determined for request');
    return [];
  }

  return generateMultiAgentResponses(request, active_agents, generateResponse);
}
