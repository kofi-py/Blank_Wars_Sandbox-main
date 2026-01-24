/**
 * Battle Context API Service
 * Fetches battle history, relationships, and personality data for AI judge context
 */

const API_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize battleContextAPI.');
  }
  return url;
})();

export interface BattleHistory {
  id: string;
  character1_id: string;
  character2_id: string;
  winner_id: string;
  end_reason: string;
  combat_log: string;
  started_at: string;
  ended_at: string;
  xp_gained: number;
}

export interface CharacterRelationship {
  character1_id: string;
  character2_id: string;
  current_trust: number;
  current_respect: number;
  current_affection: number;
  current_rivalry: number;
  relationship_status: string;
  shared_battles: number;
  vendetta_description: string | null;
  last_interaction: string;
}

/**
 * Fetch battle history between specific characters
 */
export async function getBattleHistory(character_ids: string[]): Promise<BattleHistory[]> {
  const ids_param = character_ids.join(',');
  const response = await fetch(
    `${API_BASE}/api/battles/history?character_ids=${encodeURIComponent(ids_param)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch battle history: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch battle history');
  }

  return data.battles;
}

/**
 * Fetch character relationships for tension/rivalry context
 */
export async function getCharacterRelationships(character_ids: string[]): Promise<CharacterRelationship[]> {
  const ids_param = character_ids.join(',');
  const response = await fetch(
    `${API_BASE}/api/battles/relationships?character_ids=${encodeURIComponent(ids_param)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch character relationships: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch character relationships');
  }

  return data.relationships;
}

export interface JudgeRuling {
  id: number;
  battle_id: string;
  ruling_round: number;
  situation: string;
  ruling: string;
  reasoning: string;
  gameplay_effect: string;
  narrative_impact: string;
  character_affected_id: string | null;
  character_benefited_id: string | null;
  character_penalized_id: string | null;
  ruling_type: string;
  severity: string;
  was_controversial: boolean;
  character_reactions: Record<string, string>;
  created_at: string;
}

/**
 * Fetch judge ruling history for specific judge and characters
 */
export async function getJudgeRulings(judge_id: string, character_ids: string[]): Promise<JudgeRuling[]> {
  const ids_param = character_ids.join(',');
  const response = await fetch(
    `${API_BASE}/api/battles/judge-rulings?judge_id=${encodeURIComponent(judge_id)}&character_ids=${encodeURIComponent(ids_param)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch judge rulings: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch judge rulings');
  }

  return data.rulings;
}

/**
 * Build AIJudgeContext from real database data
 */
export async function buildAIJudgeContext(
  character_ids: string[],
  player_team_name: string,
  opponent_team_name: string,
  judge: {id: string; name: string; personality: string}
) {
  const battle_history = await getBattleHistory(character_ids);
  const relationships = await getCharacterRelationships(character_ids);
  const judge_rulings = await getJudgeRulings(judge.id, character_ids);

  // Build character personalities map from character data
  const character_personalities: Record<string, string> = {};
  // This will be populated from the characters passed in

  // Build current tensions from relationships
  const current_tensions: string[] = [];
  for (const rel of relationships) {
    if (rel.current_rivalry > 50) {
      current_tensions.push(
        `High rivalry between ${rel.character1_id} and ${rel.character2_id} (rivalry: ${rel.current_rivalry})`
      );
    }
    if (rel.vendetta_description) {
      current_tensions.push(
        `Personal vendetta: ${rel.vendetta_description}`
      );
    }
    if (rel.current_trust < -50) {
      current_tensions.push(
        `Deep distrust between ${rel.character1_id} and ${rel.character2_id} (trust: ${rel.current_trust})`
      );
    }
  }

  // Convert judge rulings to AIRuling format
  const previous_rulings = judge_rulings.map(ruling => ({
    situation: ruling.situation,
    ruling: ruling.ruling,
    reasoning: ruling.reasoning,
    gameplay_effect: ruling.gameplay_effect,
    narrative_impact: ruling.narrative_impact,
    character_reactions: ruling.character_reactions
  }));

  return {
    judge,
    battle_history,
    current_round_number: 1,
    player_teamName: player_team_name,
    opponent_teamName: opponent_team_name,
    battle_narrative: `${player_team_name} vs ${opponent_team_name} - Opening Round`,
    character_personalities,
    current_tensions,
    previous_rulings,
    judging_style: 'realistic' as const
  };
}
