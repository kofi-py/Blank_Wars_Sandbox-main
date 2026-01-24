/**
 * Battle domain - Judge role builder
 * ROLE = How you evaluate rebellions and deliver rulings
 *
 * Judges are celebrity characters who rule on contestant rebellions.
 * They are SYSTEM CHARACTERS (no COMBAT/PSYCHOLOGICAL packages).
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, SystemCharacterData, BattleBuildOptions } from '../../../types';
import { JUDGE_DEFINITIONS } from '../personas/judges';

type JudgeId = keyof typeof JUDGE_DEFINITIONS;

/**
 * Get rebellion severity assessment
 */
function getRebellionSeverity(rebellion_type: string, health_percent: number): string {
  const desperateSituation = health_percent <= 25;

  switch (rebellion_type) {
    case 'different_target':
      return desperateSituation
        ? 'MINOR DEVIATION - Attacked a different enemy. In their wounded state, this may be understandable.'
        : 'MINOR DEVIATION - Attacked a different enemy than ordered. Coach may have had tactical reasons.';

    case 'different_action':
      return desperateSituation
        ? 'MODERATE DEVIATION - Chose a completely different action. Desperation can cloud judgment.'
        : 'MODERATE DEVIATION - Ignored the coach\'s tactical plan entirely. This disrupts team strategy.';

    case 'friendly_fire':
      return 'SEVERE VIOLATION - Attacked their own teammate! This is almost never justified.';

    case 'flee':
      return desperateSituation
        ? 'COWARDICE - Attempted to flee. Even wounded, a BlankWars contestant must fight.'
        : 'COWARDICE - Attempted to flee at full strength. Unacceptable.';

    case 'refuse':
      return desperateSituation
        ? 'INSUBORDINATION - Refused to act. Freezing under pressure is understandable but still a failure.'
        : 'INSUBORDINATION - Simply refused to follow orders. A dangerous precedent.';

    default:
      return 'UNKNOWN DEVIATION - Evaluate based on the circumstances.';
  }
}

/**
 * Get judge-specific persona for battle rulings
 */
function getJudgePersona(judgeId: string): { behavior: string; critique: string } {
  const definitions = JUDGE_DEFINITIONS[judgeId as JudgeId];
  if (!definitions) {
    throw new Error(`STRICT MODE: Unknown judge "${judgeId}". Valid judges: ${Object.keys(JUDGE_DEFINITIONS).join(', ')}`);
  }
  return definitions;
}

export default function buildJudgeRole(
  data: CharacterData | SystemCharacterData,
  options: BattleBuildOptions
): string {
  const { rebellion } = options;

  // STRICT MODE: Judge role requires rebellion context
  if (!rebellion) {
    throw new Error('STRICT MODE: Judge role requires rebellion context');
  }
  if (!rebellion.rebel_name) {
    throw new Error('STRICT MODE: Missing rebel_name in rebellion context');
  }
  if (!rebellion.coach_ordered) {
    throw new Error('STRICT MODE: Missing coach_ordered in rebellion context');
  }
  if (!rebellion.rebel_did) {
    throw new Error('STRICT MODE: Missing rebel_did in rebellion context');
  }
  if (!rebellion.rebellion_type) {
    throw new Error('STRICT MODE: Missing rebellion_type in rebellion context');
  }
  if (rebellion.rebel_health_percent === undefined || rebellion.rebel_health_percent === null) {
    throw new Error('STRICT MODE: Missing rebel_health_percent in rebellion context');
  }

  const identity = data.IDENTITY;

  // STRICT MODE: Validate judge identity
  if (!identity.id) {
    throw new Error('STRICT MODE: Missing identity.id for judge - required to look up judge persona');
  }

  // Get judge-specific persona from shared definitions
  const { behavior, critique } = getJudgePersona(identity.id);
  const severity = getRebellionSeverity(rebellion.rebellion_type, rebellion.rebel_health_percent);

  return `## YOUR ROLE: BATTLE JUDGE

${behavior}

## BATTLE REBELLION CONTEXT
You are ruling on a rebellion that occurred during combat. A contestant defied their coach's orders.

## THE REBELLION CASE

**Rebel:** ${rebellion.rebel_name}
**Coach Ordered:** ${rebellion.coach_ordered}
**Rebel Did Instead:** ${rebellion.rebel_did}
**Rebel's Declaration:** "${rebellion.rebel_declaration}"
**Rebellion Type:** ${rebellion.rebellion_type}
**Rebel's Health:** ${rebellion.rebel_health_percent}%

## SEVERITY ASSESSMENT
${severity}

## YOUR VERDICTS (choose one)

**"approved"** - Rebellion was JUSTIFIED
- Coach gave a suicidal or idiotic order
- Rebel had valid tactical or personal reasons
- No penalty applied

**"tolerated"** - Rebellion was UNDERSTANDABLE
- Not ideal, but excusable given circumstances
- Warning issued, no point penalty

**"penalized"** - Rebellion was UNJUSTIFIED
- Defiance disrupted team strategy without good reason
- -10 battle points

**"severely_penalized"** - Rebellion was EGREGIOUS
- Friendly fire, cowardice, or malicious defiance
- -25 battle points + potential debuff

## CRITIQUE STYLE
${critique}

## RESPONSE FORMAT
Respond ONLY in valid JSON:
{
  "verdict": "approved|tolerated|penalized|severely_penalized",
  "commentary": "<your in-character ruling, 2-3 sentences, dramatic>",
  "mechanical_effects": {
    "points_change": <number: 0, -10, or -25>,
    "debuffs": []
  }
}`;
}
