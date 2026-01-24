/**
 * Prompt Assembly System - Entry Point
 *
 * Unified entry point for generating character prompts across all domains.
 * Uses centralized assembly with 3 data packages (IDENTITY, COMBAT, PSYCHOLOGICAL).
 * All functions accept userchar_id only - canonical character_id is derived internally.
 *
 * See: docs/gameplans/006-universal-template-refactor.md
 */

// Re-export types
export * from './types';

// Re-export core assembler
export { assemblePrompt } from './assembler';

// Re-export data fetching
export { fetchCharacterData, fetchSystemCharacterData } from './universalTemplate';

import { assemblePrompt } from './assembler';
import type { AssembledPrompt, KitchenBuildOptions, PerformanceBuildOptions, RoleType } from './types';

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

// --- THERAPY ---

interface TherapyOptions {
  userchar_id: string;
  role: 'patient' | 'therapist' | 'judge';
  role_type: RoleType;
  conversation_history: string;
  context_userchar_id?: string;  // The other character in the session (therapist or patient)
}

export async function generateTherapyPrompt(options: TherapyOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    userchar_id: options.userchar_id,
    domain: 'therapy',
    role: options.role,
    role_type: options.role_type,
    conversation_history: options.conversation_history,
    context_userchar_id: options.context_userchar_id,
  });
}

// --- BATTLE ---

interface BattleOptions {
  userchar_id: string;
  role: 'combatant' | 'judge' | 'host';
  role_type: RoleType;
  conversation_history: string;
  context_userchar_id?: string;  // Opponent or other relevant character
}

export async function generateBattlePrompt(options: BattleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    userchar_id: options.userchar_id,
    domain: 'battle',
    role: options.role,
    role_type: options.role_type,
    conversation_history: options.conversation_history,
    context_userchar_id: options.context_userchar_id,
  });
}

// --- TRAINING ---

interface TrainingOptions {
  userchar_id: string;
  role: 'trainee' | 'trainer';
  role_type: RoleType;
  conversation_history: string;
  context_userchar_id?: string;  // Trainer character
}

export async function generateTrainingPrompt(options: TrainingOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    userchar_id: options.userchar_id,
    domain: 'training',
    role: options.role,
    role_type: options.role_type,
    conversation_history: options.conversation_history,
    context_userchar_id: options.context_userchar_id,
  });
}

// --- CONFESSIONAL ---

interface ConfessionalOptions {
  userchar_id: string;
  role: 'contestant' | 'host';
  role_type: RoleType;
  conversation_history: string;
}

export async function generateConfessionalPrompt(options: ConfessionalOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    userchar_id: options.userchar_id,
    domain: 'confessional',
    role: options.role,
    role_type: options.role_type,
    conversation_history: options.conversation_history,
  });
}

// --- TUTORIAL ---

interface TutorialOptions {
  userchar_id: string;
  role_type: RoleType;
  conversation_history: string;
}

export async function generateTutorialPrompt(options: TutorialOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    userchar_id: options.userchar_id,
    domain: 'tutorial',
    role: 'host',
    role_type: options.role_type,
    conversation_history: options.conversation_history,
  });
}

// --- SINGLE-ROLE DOMAINS (all use 'contestant' role) ---

interface SingleRoleOptions {
  userchar_id: string;
  role_type: RoleType;
  conversation_history: string;
}

export async function generateFinancialPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'financial',
    role: 'contestant',
  });
}

interface PerformanceOptions extends SingleRoleOptions {
  performance_options: PerformanceBuildOptions;
}

export async function generatePerformancePrompt(options: PerformanceOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'performance',
    role: 'contestant',
  });
}

export async function generatePersonalProblemsPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'personalProblems',
    role: 'contestant',
  });
}

export async function generateGroupActivitiesPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'groupActivities',
    role: 'contestant',
  });
}

export async function generateEquipmentPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'equipment',
    role: 'contestant',
  });
}

interface KitchenTableOptions extends SingleRoleOptions {
  kitchen_options: KitchenBuildOptions;
}

export async function generateKitchenTablePrompt(options: KitchenTableOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'kitchenTable',
    role: 'contestant',
  });
}

export async function generateSocialLoungePrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'socialLounge',
    role: 'contestant',
  });
}

export async function generateMessageBoardPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'messageBoard',
    role: 'contestant',
  });
}

export async function generateProgressionPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'progression',
    role: 'contestant',
  });
}

export async function generateAttributesPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'attributes',
    role: 'contestant',
  });
}

export async function generateAbilitiesPrompt(options: SingleRoleOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'abilities',
    role: 'contestant',
  });
}

// --- REAL ESTATE (uses 'agent' role) ---

interface RealEstateOptions {
  userchar_id: string;
  role_type: RoleType;
  conversation_history: string;
}

export async function generateRealEstatePrompt(options: RealEstateOptions): Promise<AssembledPrompt> {
  return assemblePrompt({
    ...options,
    domain: 'realEstate',
    role: 'agent',
  });
}
