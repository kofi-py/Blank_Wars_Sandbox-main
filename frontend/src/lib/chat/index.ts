// Universal Chat Library
// Drop-in utilities for all 16 chat systems

export * from './agent_keys';
export * from './brevity';
export * from './transport';
export * from './singleFlight';
export * from './logging';
export * from './types';

// Convenience re-exports for common patterns
export { nameToAgentKey, resolveAgentKey } from './agent_keys';
export { BREVITY_TAGS, ensureBrevityTag, twoSentenceCap } from './brevity';
export { sendChat } from './transport';
export { singleFlight, chatFlightKey } from './singleFlight';
export { log, warn, error, logAgentKey, logResponse } from './logging';