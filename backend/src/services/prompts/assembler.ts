/**
 * Centralized Prompt Assembler
 *
 * ONE assembler builds ALL prompts. Handles two patterns:
 * 1. NEW PATTERN (kitchenTable): Domain module with buildAllProse(data) - all data becomes prose
 * 2. LEGACY PATTERN (other domains): Static scene/role strings + JSON data packages
 *
 * See: docs/gameplans/006-universal-template-refactor.md
 */

import {
  fetchCharacterData,
  fetchSystemCharacterData,
  fetchPreferencesData,
  OPENING,
  buildCharacterIdentity,
  buildExistentialSituation,
  formatDataPackages,
  formatSystemCharacterData,
  formatPreferencesPackage,
  INTERPRETATION_GUIDE,
  formatConversationHistory,
  FINAL_INSTRUCTIONS,
} from './universalTemplate';
import { query } from '../../database/index';
import type { AssemblyRequest, AssembledPrompt, Domain, PreferencesPackage, CharacterData, SystemCharacterData } from './types';

// Import refactored domain modules (new pattern)
import * as kitchenTableDomain from './domains/kitchenTable';
import { KITCHEN_TABLE_RULES } from './domains/kitchenTable/rules';
import * as therapyDomain from './domains/therapy';
import * as confessionalDomain from './domains/confessional';
import * as performanceDomain from './domains/performance';
import * as personalProblemsDomain from './domains/personalProblems';
import * as equipmentDomain from './domains/equipment';
import * as abilitiesDomain from './domains/abilities';
import * as attributesDomain from './domains/attributes';
import * as resourcesDomain from './domains/resources';
import * as progressionDomain from './domains/progression';
import * as trainingDomain from './domains/training';
import * as realEstateDomain from './domains/realEstate';
import * as groupActivitiesDomain from './domains/groupActivities';
import * as battleDomain from './domains/battle';
import * as socialLoungeDomain from './domains/socialLounge';
import * as messageBoardDomain from './domains/messageBoard';
import * as financialDomain from './domains/financial';
import * as employeeLoungeDomain from './domains/employeeLounge';

// =====================================================
// REFACTORED DOMAINS (new pattern with prose builders)
// =====================================================

/**
 * Domains that have been refactored to the new pattern.
 * These use buildAllProse(data) instead of static strings + JSON dump.
 */
const REFACTORED_DOMAINS: Set<Domain> = new Set([
  'kitchenTable',
  'therapy',
  'confessional',
  'performance',
  'personalProblems',
  'equipment',
  'abilities',
  'attributes',
  'resources',
  'progression',
  'training',
  'realEstate',
  'groupActivities',
  'battle',
  'socialLounge',
  'messageBoard',
  'financial',
  'employeeLounge',
  'tutorial',
  'controlRoom',
]);

// =====================================================
// CONTEXT CHARACTER NAME LOOKUP
// =====================================================

/**
 * Fetches just the character name from DB.
 * Used for context characters (therapist, opponent, trainer, etc.)
 */
async function fetchCharacterName(character_id: string): Promise<string> {
  const result = await query(
    'SELECT name FROM characters WHERE id = $1',
    [character_id]
  );
  if (!result.rows[0]?.name) {
    throw new Error(`STRICT MODE: Character not found: ${character_id}`);
  }
  return result.rows[0].name;
}

// =====================================================
// DOMAINS THAT NEED PREFERENCES PACKAGE
// =====================================================

/**
 * Domains where granular preference data (powers, spells, equipment, attributes)
 * is relevant to the conversation and worth the extra prompt tokens.
 */
const DOMAINS_WITH_PREFERENCES: Set<Domain> = new Set([
  'equipment',   // Gear recommendations
  'abilities',   // Power/spell discussions
  'attributes',  // Stat allocation
  'resources',   // Resource allocation (mana/energy/health)
  'battle',      // Combat decision-making
  'progression', // Leveling decisions
]);

// =====================================================
// LEGACY SCENE REGISTRY (for non-refactored domains)
// =====================================================

const SCENES: Partial<Record<Domain, () => Promise<{ default: string }>>> = {
  // therapy: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // battle: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // training: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // financial: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // tutorial: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // performance: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // personalProblems: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // groupActivities: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // equipment: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // kitchenTable: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // realEstate: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // socialLounge: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // messageBoard: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // progression: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // attributes: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // abilities: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // resources: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // controlRoom: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
};

// =====================================================
// LEGACY ROLE REGISTRY (for non-refactored domains)
// =====================================================

const ROLES: Partial<Record<Domain, Record<string, () => Promise<{ default: string }>>>> = {
  // therapy: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // battle: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // training: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // financial: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // tutorial: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // performance: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // personalProblems: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // groupActivities: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // equipment: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // kitchenTable: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // realEstate: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // socialLounge: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // messageBoard: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // progression: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // attributes: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // abilities: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // resources: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
  // controlRoom: Handled by REFACTORED_DOMAINS - uses buildAllProse() instead
};

// =====================================================
// VARIABLE INJECTION (for legacy templates)
// =====================================================

/**
 * Replaces ${variable} placeholders in role templates with actual values.
 * Example: "${therapist_name}" becomes "Dr. Sigmund Freud"
 */
function injectVariables(template: string, options?: Record<string, string>): string {
  if (!options) return template;
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    const value = options[key];
    return value !== undefined ? value : match; // Keep placeholder if no value provided
  });
}

// =====================================================
// NEW PATTERN: REFACTORED DOMAIN ASSEMBLER
// =====================================================

/**
 * Assembles prompt for refactored domains (new pattern).
 * Uses buildAllProse(data) - no JSON data dump.
 */
// Type guard to check if data is SystemCharacterData (no COMBAT/PSYCHOLOGICAL)
function isSystemCharacterData(data: CharacterData | SystemCharacterData): data is SystemCharacterData {
  return !('COMBAT' in data);
}

async function assembleRefactoredPrompt(
  request: AssemblyRequest,
  data: CharacterData | SystemCharacterData
): Promise<AssembledPrompt> {
  const { domain, role, role_type, conversation_history } = request;

  let prose: { scene: string; role: string; persona: string };

  switch (domain) {
    case 'kitchenTable':
      if (!request.kitchen_options) {
        throw new Error('STRICT MODE: Kitchen table domain requires kitchen_options in request');
      }
      prose = kitchenTableDomain.buildAllProse(data, request.kitchen_options);
      break;

    case 'confessional':
      if (!request.confessional_options) {
        throw new Error('STRICT MODE: Confessional domain requires confessional_options in request');
      }
      prose = confessionalDomain.buildAllProse(data, request.confessional_options, role);
      break;

    case 'performance': {
      if (!request.performance_options) {
        throw new Error('STRICT MODE: Performance domain requires performance_options in request');
      }
      prose = performanceDomain.buildAllProse(data, request.performance_options);
      break;
    }

    case 'personalProblems': {
      if (!request.personal_problems_options) {
        throw new Error('STRICT MODE: PersonalProblems domain requires personal_problems_options in request');
      }
      prose = personalProblemsDomain.buildAllProse(data, request.personal_problems_options);
      break;
    }

    case 'equipment': {
      if (!request.equipment_options) {
        throw new Error('STRICT MODE: Equipment domain requires equipment_options in request');
      }
      prose = equipmentDomain.buildAllProse(data, request.equipment_options);
      break;
    }

    case 'abilities': {
      if (!request.abilities_options) {
        throw new Error('STRICT MODE: Abilities domain requires abilities_options in request');
      }
      prose = abilitiesDomain.buildAllProse(data, request.abilities_options);
      break;
    }

    case 'attributes': {
      if (!request.attributes_options) {
        throw new Error('STRICT MODE: Attributes domain requires attributes_options in request');
      }
      prose = attributesDomain.buildAllProse(data, request.attributes_options);
      break;
    }

    case 'resources': {
      if (!request.resources_options) {
        throw new Error('STRICT MODE: Resources domain requires resources_options in request');
      }
      prose = resourcesDomain.buildAllProse(data, request.resources_options);
      break;
    }

    case 'progression': {
      if (!request.progression_options) {
        throw new Error('STRICT MODE: Progression domain requires progression_options in request');
      }
      prose = progressionDomain.buildAllProse(data, request.progression_options);
      break;
    }

    case 'training': {
      if (!request.training_options) {
        throw new Error('STRICT MODE: Training domain requires training_options in request');
      }
      prose = trainingDomain.buildAllProse(data, request.training_options);
      break;
    }

    case 'therapy': {
      const therapyOpts = request.therapy_options;
      if (!therapyOpts) {
        throw new Error('STRICT MODE: Therapy domain requires therapy_options in request');
      }

      const therapyRole = role as therapyDomain.TherapyRole;

      // Fetch context character data when needed
      // For patient role: context is therapist (system char) - use fetchSystemCharacterData
      // For therapist/judge role: context is patient (contestant) - use fetchCharacterData
      let contextData: CharacterData | undefined;
      let contextSystemData: SystemCharacterData | undefined;
      if (request.context_userchar_id) {
        if (therapyRole === 'patient') {
          // Context is therapist (system character)
          contextSystemData = await fetchSystemCharacterData(request.context_userchar_id);
        } else {
          // Context is patient (contestant)
          contextData = await fetchCharacterData(request.context_userchar_id);
        }
      }

      // STRICT MODE: Validate intensity_strategy (required for therapist role only - set by coach in UI)
      if (therapyRole === 'therapist' && !therapyOpts.intensity_strategy) {
        throw new Error('STRICT MODE: intensity_strategy is required for therapist role (selected by coach in UI)');
      }

      // Build therapy options based on role
      const buildOptions: therapyDomain.TherapyBuildOptions = {
        sessionType: therapyOpts.session_type,
        role: therapyRole,
        intensityStrategy: therapyOpts.intensity_strategy,
        groupParticipants: therapyOpts.group_participants,
        transcript: therapyOpts.transcript,
      };

      // Therapist/Judge need patient data, Patient needs therapist identity
      if (therapyRole === 'therapist' || therapyRole === 'judge') {
        if (!contextData) {
          throw new Error('STRICT MODE: Therapist/Judge role requires context_userchar_id for patient data');
        }
        buildOptions.patientData = contextData;
      } else if (therapyRole === 'patient') {
        if (!contextSystemData) {
          throw new Error('STRICT MODE: Patient role requires context_userchar_id for therapist data');
        }
        buildOptions.therapistIdentity = contextSystemData.IDENTITY;
      }

      // Judge needs their bonuses from DB + calculated stat values
      if (therapyRole === 'judge') {
        if (!request.context_userchar_id) {
          throw new Error('STRICT MODE: Judge role requires context_userchar_id (patient)');
        }
        const judgeId = data.IDENTITY.id;
        const bonusResult = await query(
          `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
           FROM judge_bonuses WHERE character_id = $1`,
          [judgeId]
        );
        if (bonusResult.rows.length === 0) {
          throw new Error(`STRICT MODE: No judge_bonuses found for judge "${judgeId}"`);
        }
        buildOptions.judgeBonuses = bonusResult.rows;
        buildOptions.patientUsercharId = request.context_userchar_id;

        // Calculate A/B/C/D/E stat values based on intensity
        const intensity = therapyOpts.intensity_strategy;
        const statValues: Array<{ stat: string; A: number; B: number; D: number; E: number }> = [];
        for (const bonus of bonusResult.rows) {
          let bonusVal: number;
          let penaltyVal: number;
          if (intensity === 'soft') {
            bonusVal = bonus.easy_bonus;
            penaltyVal = bonus.easy_penalty;
          } else if (intensity === 'medium') {
            bonusVal = bonus.medium_bonus;
            penaltyVal = bonus.medium_penalty;
          } else {
            bonusVal = bonus.hard_bonus;
            penaltyVal = bonus.hard_penalty;
          }
          statValues.push({
            stat: bonus.bonus_type,
            A: Math.round(bonusVal * 1.0),
            B: Math.round(bonusVal * 0.6),
            D: Math.round(penaltyVal * 0.4),
            E: Math.round(penaltyVal * 0.67),
          });
        }
        buildOptions.judgeChoices = {
          choiceA: statValues.map(s => `${s.stat} ${s.A >= 0 ? '+' : ''}${s.A}`).join(', '),
          choiceB: statValues.map(s => `${s.stat} ${s.B >= 0 ? '+' : ''}${s.B}`).join(', '),
          choiceD: statValues.map(s => `${s.stat} ${s.D}`).join(', '),
          choiceE: statValues.map(s => `${s.stat} ${s.E}`).join(', '),
        };
      }

      prose = therapyDomain.buildAllProse(data, buildOptions);
      break;
    }

    case 'realEstate': {
      if (!request.real_estate_options) {
        throw new Error('STRICT MODE: Real estate domain requires real_estate_options in request');
      }
      // Real estate agents are system characters - verify we have SystemCharacterData
      if ('COMBAT' in data) {
        throw new Error('STRICT MODE: Real estate agents must be system characters (SystemCharacterData)');
      }
      prose = realEstateDomain.buildAllProse(data, request.real_estate_options);
      break;
    }

    case 'groupActivities': {
      if (!request.group_activities_options) {
        throw new Error('STRICT MODE: Group activities domain requires group_activities_options in request');
      }
      prose = groupActivitiesDomain.buildAllProse(data, request.group_activities_options);
      break;
    }

    case 'battle': {
      if (!request.battle_options) {
        throw new Error('STRICT MODE: Battle domain requires battle_options in request');
      }
      prose = battleDomain.buildAllProse(data, request.battle_options);
      break;
    }

    case 'socialLounge': {
      if (!request.social_lounge_options) {
        throw new Error('STRICT MODE: Social lounge domain requires social_lounge_options in request');
      }
      // Social lounge is for contestants only - verify we have full CharacterData
      if (!('COMBAT' in data)) {
        throw new Error('STRICT MODE: Social lounge requires full CharacterData (contestants only)');
      }
      prose = socialLoungeDomain.buildAllProse(data, request.social_lounge_options);
      break;
    }

    case 'messageBoard': {
      if (!request.message_board_options) {
        throw new Error('STRICT MODE: Message board domain requires message_board_options in request');
      }
      // Message board is for contestants only - verify we have full CharacterData
      if (!('COMBAT' in data)) {
        throw new Error('STRICT MODE: Message board requires full CharacterData (contestants only)');
      }
      prose = messageBoardDomain.buildAllProse(data, request.message_board_options);
      break;
    }

    case 'financial': {
      if (!request.financial_options) {
        throw new Error('STRICT MODE: Financial domain requires financial_options in request');
      }
      // Financial discussions are for contestants only - verify we have full CharacterData
      if (!('COMBAT' in data)) {
        throw new Error('STRICT MODE: Financial domain requires full CharacterData (contestants only)');
      }
      prose = financialDomain.buildAllProse(data, request.financial_options);
      break;
    }

    case 'employeeLounge': {
      if (!request.employee_lounge_options) {
        throw new Error('STRICT MODE: Employee lounge domain requires employee_lounge_options in request');
      }
      // Employee lounge is for system characters only - verify we have SystemCharacterData
      if ('COMBAT' in data) {
        throw new Error('STRICT MODE: Employee lounge requires SystemCharacterData (system characters only)');
      }
      prose = employeeLoungeDomain.buildAllProse(data, request.employee_lounge_options);
      break;
    }

    default:
      throw new Error(`STRICT MODE: Domain "${domain}" marked as refactored but no module found`);
  }

  // Assemble in correct order
  // Note: No JSON data dump, no generic FINAL_INSTRUCTIONS (domain has its own rules in role)
  // Kitchen table uses consolidated persona (WHO YOU ARE + YOUR SITUATION) instead of generic identity/existential
  const parts: string[] = domain === 'kitchenTable'
    ? [
        OPENING,
        prose.scene,
        prose.role,
        prose.persona,
      ]
    : [
        OPENING,
        buildCharacterIdentity(data.IDENTITY.name, data.IDENTITY.origin_era),
        buildExistentialSituation(role_type),
        prose.scene,
        prose.role,
        prose.persona,
      ];

  // Add conversation history if present
  const historySection = formatConversationHistory(conversation_history);
  if (historySection) {
    parts.push(historySection);
  }

  // Add domain-specific rules at the END (after conversation history) for best AI compliance
  if (domain === 'kitchenTable') {
    parts.push(KITCHEN_TABLE_RULES);
  }

  const system_prompt = parts.join('\n\n');

  return {
    system_prompt,
    data,
    domain,
    role,
  };
}

// =====================================================
// LEGACY PATTERN: ORIGINAL DOMAIN ASSEMBLER
// =====================================================

/**
 * Assembles prompt for legacy domains (old pattern).
 * Uses static scene/role strings + JSON data packages.
 */
async function assembleLegacyPrompt(
  request: AssemblyRequest,
  data: CharacterData | SystemCharacterData
): Promise<AssembledPrompt> {
  const {
    domain,
    role,
    role_type,
    conversation_history,
    context_userchar_id,
  } = request;

  // Conditionally fetch preferences for domains that need them
  let preferences: PreferencesPackage | undefined;
  if (DOMAINS_WITH_PREFERENCES.has(domain)) {
    preferences = await fetchPreferencesData(request.userchar_id);
  }

  // Get scene context
  const sceneLoader = SCENES[domain];
  if (!sceneLoader) {
    throw new Error(`Unknown domain: "${domain}"`);
  }
  const sceneModule = await sceneLoader();
  const sceneContext = sceneModule.default;

  // Get role context + inject variables
  const roleRegistry = ROLES[domain];
  if (!roleRegistry) {
    throw new Error(`No roles defined for domain: "${domain}"`);
  }
  const roleLoader = roleRegistry[role];
  if (!roleLoader) {
    throw new Error(`Unknown role "${role}" for domain "${domain}". Available roles: ${Object.keys(roleRegistry).join(', ')}`);
  }
  const roleModule = await roleLoader();

  // Fetch context character name if provided (via userchar_id)
  let injectionVars: Record<string, string> | undefined;
  if (context_userchar_id) {
    const contextData = await fetchCharacterData(context_userchar_id);
    injectionVars = { context_name: contextData.IDENTITY.name };
  }
  const roleContext = injectVariables(roleModule.default, injectionVars);

  // Assemble in correct order (scene/role BEFORE data packages)
  // System characters use formatSystemCharacterData (no COMBAT/PSYCHOLOGICAL)
  const dataSection = isSystemCharacterData(data)
    ? formatSystemCharacterData(data)
    : formatDataPackages(data);

  const parts: string[] = [
    OPENING,
    buildCharacterIdentity(data.IDENTITY.name, data.IDENTITY.origin_era),
    buildExistentialSituation(role_type),
    sceneContext,
    roleContext,
    dataSection,
  ];

  // Add preferences package if fetched
  if (preferences) {
    parts.push(formatPreferencesPackage(preferences));
  }

  parts.push(INTERPRETATION_GUIDE);

  // Add conversation history if present
  const historySection = formatConversationHistory(conversation_history);
  if (historySection) {
    parts.push(historySection);
  }

  // Final instructions always last
  parts.push(FINAL_INSTRUCTIONS);

  const system_prompt = parts.join('\n\n');

  return {
    system_prompt,
    data,
    preferences,
    domain,
    role,
  };
}

// =====================================================
// CORE ASSEMBLER (routes to correct pattern)
// =====================================================

/**
 * Assembles a complete prompt for any domain/role combination.
 * Routes to refactored or legacy assembler based on domain.
 *
 * @param request - Assembly request with character_id, domain, role, etc.
 * @returns AssembledPrompt with system_prompt string and character data
 * @throws Error if domain or role not found, or character data fetch fails
 */
export async function assemblePrompt(request: AssemblyRequest): Promise<AssembledPrompt> {
  const { userchar_id, domain, role_type } = request;

  // 1. Fetch character data - system characters get identity + memories only
  const data = role_type === 'system'
    ? await fetchSystemCharacterData(userchar_id)
    : await fetchCharacterData(userchar_id);

  // 2. Route to correct assembler based on domain
  // Both assemblers handle CharacterData and SystemCharacterData
  if (REFACTORED_DOMAINS.has(domain)) {
    return assembleRefactoredPrompt(request, data);
  } else {
    return assembleLegacyPrompt(request, data);
  }
}
// Build trigger: 1766116841
