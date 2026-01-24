/**
 * Battle Contestant Persona Builder
 * Creates combat-specific personas for battle declarations and rebellions
 * Includes relationships, memories, and decisions - all relevant to combat behavior
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildStatContext } from '../../../../statContext';

export interface BattlePersonaOptions {
  memory: string;
}

/**
 * Format relationships for combat context
 */
function formatRelationships(relationships: PsychologicalPackage['relationships']): string {
  return relationships.slice(0, 5).map(r => {
    const feelings: string[] = [];
    if (r.trust > 60) feelings.push('trusts');
    if (r.trust < 30) feelings.push('distrusts');
    if (r.respect > 60) feelings.push('respects');
    if (r.respect < 30) feelings.push('disrespects');
    if (r.affection > 60) feelings.push('likes');
    if (r.affection < 30) feelings.push('dislikes');
    if (r.rivalry > 60) feelings.push('rival');
    const feeling = feelings.length > 0 ? feelings.join('/') : 'neutral toward';
    return `- ${r.character_name}: ${feeling} (${r.shared_battles} battles together)`;
  }).join('\n');
}

/**
 * Format recent memories for combat context
 */
function formatMemories(memories: IdentityPackage['recent_memories']): string {
  return memories.slice(0, 5).map(m =>
    `- ${m.content} (${m.emotion_type}, importance: ${m.importance})`
  ).join('\n');
}

/**
 * Format recent decisions - pattern of following/defying coach
 */
function formatDecisions(decisions: IdentityPackage['recent_decisions']): string {
  return decisions.slice(0, 3).map(d =>
    `- ${d.description} → ${d.outcome}${d.followed_advice ? '' : ' (ignored coach advice)'}`
  ).join('\n');
}

export function buildPersona(
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage,
  characterBehavior: string,
  options: BattlePersonaOptions
): string {
  const comedyContext = identity.comedy_style;
  const statContext = buildStatContext(identity, combat, psych);
  const battleRecord = `${identity.total_wins}W-${identity.total_losses}L (${identity.win_percentage}% win rate)`;

  const memorySection = options.memory.trim().length > 0
    ? `THINGS ON YOUR MIND:\n${options.memory}`
    : '';

  const personalityStr = Array.isArray(identity.personality_traits)
    ? identity.personality_traits.join(', ')
    : identity.personality_traits;

  return `## CHARACTER PERSONA: ${identity.name}
${identity.title}

## WHO YOU ARE
${identity.backstory}

Species: ${identity.species}
Archetype: ${identity.archetype}
Origin: ${identity.origin_era}

## YOUR PERSONALITY
Traits: ${personalityStr}

## YOUR COMEDY STYLE
${comedyContext}

## YOUR BATTLE RECORD
${battleRecord}
Level: ${identity.level}

## YOUR CURRENT STATE
${statContext}

## YOUR RELATIONSHIPS
${formatRelationships(psych.relationships)}

## RECENT MEMORIES
${formatMemories(identity.recent_memories)}

## RECENT DECISIONS
${formatDecisions(identity.recent_decisions)}

${memorySection}

## IN BATTLE YOU...
${characterBehavior}`.trim();
}
