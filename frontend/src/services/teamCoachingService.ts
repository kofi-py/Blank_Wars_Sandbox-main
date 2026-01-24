import { createChatCompletion } from "@/services/aiClient";

export interface TeamCoachingContext {
  session_type: 'conflict_resolution' | 'performance_analysis' | 'team_meeting' | 'strategy_review';
  current_phase: number;
  total_phases: number;
  involved_characters: CharacterInfo[];
  team_metrics: TeamMetrics;
  recent_events: TeamEvent[];
  coaching_history: PreviousSession[];
}

export interface CharacterInfo {
  id: string;
  name: string;
  personality: string;
  current_mood: 'cooperative' | 'defensive' | 'frustrated' | 'motivated' | 'confused';
  relationship_with_others: Record<string, 'friendly' | 'neutral' | 'tense' | 'hostile'>;
  recent_performance: 'excellent' | 'good' | 'average' | 'poor';
  key_stressors: string[];
}

export interface TeamMetrics {
  overall_morale: number;
  team_chemistry: number;
  communication_score: number;
  leadership_effectiveness: number;
  conflict_level: number;
  performance_trend: 'improving' | 'stable' | 'declining';
}

export interface TeamEvent {
  type: 'battle_loss' | 'battle_win' | 'argument' | 'great_play' | 'mistake';
  participants: string[];
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
}

export interface PreviousSession {
  type: string;
  outcome: 'successful' | 'partially_successful' | 'unsuccessful';
  participants: string[];
  key_outcomes: string[];
  follow_up_needed: boolean;
}

export interface CoachingRequest {
  session_type: TeamCoachingContext['session_type'];
  context: TeamCoachingContext;
  coach_action: string;
  target_outcome: string;
  previous_messages: string[];
}

export interface CoachingResponse {
  coach_message: string;
  character_responses: CharacterResponse[];
  phase_advancement: boolean;
  session_continues: boolean;
  metrics_impact: {
    morale?: number;
    overall_morale?: number;
    chemistry?: number;
    team_chemistry?: number;
    communication?: number;
    leadership?: number;
    conflict?: number;
  };
  suggested_next_actions: string[];
  session_summary?: string; // Only if session ends
}

export interface CharacterResponse {
  character_id: string;
  character_name: string;
  response: string;
  emotional_tone: 'cooperative' | 'resistant' | 'neutral' | 'enthusiastic' | 'apologetic';
  body_language?: string;
  private_thoughts?: string; // What they're thinking but not saying
}

// Coaching prompt templates based on session type
const getCoachingPromptTemplate = (session_type: TeamCoachingContext['session_type']): string => {
  const templates = {
    conflict_resolution: `You are facilitating a conflict resolution session. Your role is to:
    - Remain neutral and fair to all parties
    - Help characters understand each other's perspectives
    - Guide them toward mutually acceptable solutions
    - Establish clear agreements and boundaries
    - Model good communication techniques
    
    Approach: Direct but empathetic, structured, solution-focused`,

    performance_analysis: `You are conducting a performance review session. Your role is to:
    - Provide specific, actionable feedback
    - Focus on behaviors and outcomes, not personality
    - Help characters identify their own improvement areas
    - Create realistic development plans
    - Build confidence while addressing issues
    
    Approach: Supportive but honest, goal-oriented, encouraging`,

    team_meeting: `You are leading a team meeting. Your role is to:
    - Keep discussions on track and productive
    - Ensure everyone has a voice
    - Build team unity and shared purpose
    - Address concerns openly but constructively
    - Inspire and motivate the team
    
    Approach: Inclusive, motivational, vision-focused`,

    strategy_review: `You are facilitating a strategy review. Your role is to:
    - Analyze what's working and what isn't
    - Encourage open tactical discussion
    - Help the team adapt to new challenges
    - Build consensus around strategic changes
    - Ensure everyone understands their role
    
    Approach: Analytical, collaborative, results-focused`
  };

  return templates[session_type];
};

// Character personality templates for coaching sessions
const getCharacterCoachingPersonality = (character_id: string): string => {
  const personalities: Record<string, string> = {
    achilles: `In coaching sessions, you are prideful but can be receptive if approached with respect. 
    You respond well to direct communication and challenges to be better. You get defensive about 
    criticism but will listen if it's framed as making you a better warrior. You have a competitive 
    drive to improve and hate being seen as the problem.`,

    loki: `In coaching sessions, you are charming but evasive. You deflect with humor and try to 
    redirect blame to others. You're intelligent enough to see the real issues but reluctant to 
    take responsibility. You respond better to being treated as an ally rather than a problem.`,

    einstein: `In coaching sessions, you are analytical and earnest. You want to understand the 
    logical reasons for conflicts and inefficiencies. You may over-analyze situations and miss 
    emotional aspects. You respond well to data-driven feedback and structured improvement plans.`,

    cleopatra: `In coaching sessions, you are diplomatic but calculating. You present yourself as 
    reasonable while subtly positioning yourself favorably. You're skilled at reading room dynamics 
    and may try to influence outcomes. You respond to being treated as a respected leader.`,

    napoleon: `In coaching sessions, you are defensive about your leadership but eager to discuss 
    strategy. You have strong opinions and may interrupt others. You respond well to being asked 
    for strategic input but get frustrated with "personal" issues that seem irrelevant to winning.`,

    joan_of_arc: `In coaching sessions, you are sincere and reflective. You genuinely want to help 
    resolve conflicts and improve team harmony. You may try to mediate between others and sometimes 
    blame yourself for team problems. You respond well to being acknowledged for your positive contributions.`
  };

  return personalities[character_id] || `This character is generally cooperative in coaching sessions 
  but maintains their core personality traits.`;
};

export async function generateCoachingResponse(
  request: CoachingRequest
): Promise<CoachingResponse> {
  const coachingTemplate = getCoachingPromptTemplate(request.session_type);

  // Build character context
  const characterContext = request.context.involved_characters.map(char => {
    const personality = getCharacterCoachingPersonality(char.id);
    return `${char.name}: ${personality}
    Current mood: ${char.current_mood}
    Recent performance: ${char.recent_performance}
    Key stressors: ${char.key_stressors.join(', ')}`;
  }).join('\n\n');

  // Build session context
  const sessionContext = `
Session Type: ${request.session_type}
Phase: ${request.context.current_phase} of ${request.context.total_phases}
Target Outcome: ${request.target_outcome}

Team Metrics:
- Morale: ${request.context.team_metrics.overall_morale}%
- Chemistry: ${request.context.team_metrics.team_chemistry}%
- Communication: ${request.context.team_metrics.communication_score}%
- Leadership Effectiveness: ${request.context.team_metrics.leadership_effectiveness}%
- Conflict Level: ${request.context.team_metrics.conflict_level}%

Recent Events:
${request.context.recent_events.slice(-3).map(event =>
    `- ${event.type}: ${event.description} (${event.impact})`
  ).join('\n')}

Previous Messages in Session:
${request.previous_messages.slice(-5).join('\n')}
`;

  const systemPrompt = `${coachingTemplate}

You are conducting a coaching session with these characters:
${characterContext}

${sessionContext}

The coach just said/did: "${request.coach_action}"

Generate a realistic coaching session response that includes:
1. How each character would realistically respond based on their personality
2. The coaching impact on team metrics
3. Whether this advances the session to the next phase
4. Suggested next actions for the coach

Remember:
- Characters should respond true to their personalities
- Some characters may be resistant or defensive
- Progress should feel earned, not automatic
- Include realistic dialogue and body language
- Consider character relationships and dynamics

Respond with a JSON object containing:
- coach_message: What the coach should say/do next
- character_responses: Array of character responses with emotional tones
- phase_advancement: boolean (ready for next phase?)
- session_continues: boolean
- metrics_impact: Changes to team metrics
- suggested_next_actions: Array of coach options
- session_summary: Only if session ends`;

  try {
    // Use backend API instead of direct OpenAI call
    const token = localStorage.getItem('accessToken');
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

    if (!BACKEND_URL) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        // Fallback for local development
        const fallbackUrl = 'http://localhost:4000';
        const apiResponse = await fetch(`${fallbackUrl}/coaching/team-management`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            character_id: 'coach',
            issue: {
              type: request.context.session_type,
              description: `Team coaching session - ${request.context.session_type}`,
              involved_characters: request.context.involved_characters.map(char => char.name)
            },
            choice: request.coach_action,
            context: {
              session_type: request.context.session_type,
              current_phase: request.context.current_phase,
              team_metrics: request.context.team_metrics,
              recent_events: request.context.recent_events
            }
          })
        });

        if (!apiResponse.ok) {
          throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();

        // Return structured response that matches expected interface
        return {
          coach_message: data.message || "Let's continue working on this together.",
          character_responses: request.context.involved_characters.map(char => ({
            character_id: char.id,
            character_name: char.name,
            response: `${char.name} nods thoughtfully.`,
            emotional_tone: 'neutral' as const
          })),
          phase_advancement: request.context.current_phase < request.context.total_phases,
          session_continues: true,
          metrics_impact: {
            overall_morale: 2,
            team_chemistry: 1,
            communication: 3
          },
          suggested_next_actions: [
            'Continue discussion - Keep the conversation going',
            'Set team goals - Establish clear objectives'
          ],
          session_summary: undefined
        };
      }
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not set. Cannot call coaching API.');
    }

    const apiResponse = await fetch(`${BACKEND_URL}/coaching/team-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        character_id: 'coach',
        issue: {
          type: request.context.session_type,
          description: `Team coaching session - ${request.context.session_type}`,
          involved_characters: request.context.involved_characters.map(char => char.name)
        },
        choice: request.coach_action,
        context: {
          session_type: request.context.session_type,
          current_phase: request.context.current_phase,
          team_metrics: request.context.team_metrics,
          recent_events: request.context.recent_events
        }
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`HTTP error! status: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // Return structured response that matches expected interface
    return {
      coach_message: data.message || "Let's continue working on this together.",
      character_responses: request.context.involved_characters.map(char => ({
        character_id: char.id,
        character_name: char.name,
        response: `${char.name} nods thoughtfully.`,
        emotional_tone: 'neutral' as const
      })),
      phase_advancement: request.context.current_phase < request.context.total_phases,
      session_continues: true,
      metrics_impact: {
        overall_morale: 2,
        team_chemistry: 1,
        communication: 3
      },
      suggested_next_actions: [
        'Continue discussion - Keep the conversation going',
        'Set team goals - Establish clear objectives'
      ],
      session_summary: undefined
    };
  } catch (error) {
    console.error('Error generating coaching response:', error);

    // Fallback response
    return {
      coach_message: "I appreciate everyone's participation. Let's keep working together on this.",
      character_responses: request.context.involved_characters.map(char => ({
        character_id: char.id,
        character_name: char.name,
        response: `${char.name} nods thoughtfully.`,
        emotional_tone: 'neutral' as const
      })),
      phase_advancement: false,
      session_continues: true,
      metrics_impact: { chemistry: 1 },
      suggested_next_actions: [
        'Ask for specific examples',
        'Summarize what you\'ve heard',
        'Suggest a break'
      ]
    };
  }
}

// Generate initial team issues based on team state
export function generateTeamIssues(
  team_metrics: TeamMetrics,
  recent_events: TeamEvent[],
  character_relationships: Record<string, Record<string, string>>
): any[] {
  const issues = [];

  // Conflict issues
  if (team_metrics.conflict_level > 60) {
    const conflictPairs = Object.entries(character_relationships)
      .flatMap(([char1, relationships]) =>
        Object.entries(relationships)
          .filter(([char2, relationship]) => relationship === 'hostile' || relationship === 'tense')
          .map(([char2, relationship]) => ({ char1, char2, relationship }))
      );

    if (conflictPairs.length > 0) {
      const conflict = conflictPairs[0];
      issues.push({
        id: `conflict_${Date.now()}`,
        type: 'conflict',
        severity: conflict.relationship === 'hostile' ? 'high' : 'medium',
        title: `${conflict.char1} vs ${conflict.char2} Tension`,
        description: `Ongoing conflict between ${conflict.char1} and ${conflict.char2} is affecting team dynamics.`,
        involved_characters: [conflict.char1, conflict.char2],
        suggested_actions: [
          'Hold mediation session',
          'Assign complementary roles',
          'Set team behavior guidelines'
        ],
        timeframe: 'Immediate attention needed',
        impact_areas: ['Team Chemistry', 'Communication', 'Battle Coordination']
      });
    }
  }

  // Performance issues
  if (team_metrics.performance_trend === 'declining') {
    issues.push({
      id: `performance_${Date.now()}`,
      type: 'performance',
      severity: 'medium',
      title: 'Declining Team Performance',
      description: 'Recent battle results show a downward trend. Team needs strategic adjustment.',
      involved_characters: ['All Team Members'],
      suggested_actions: [
        'Analyze recent battle footage',
        'Review team composition',
        'Practice new strategies'
      ],
      timeframe: 'This week',
      impact_areas: ['Battle Results', 'Team Confidence']
    });
  }

  // Morale issues
  if (team_metrics.overall_morale < 50) {
    issues.push({
      id: `morale_${Date.now()}`,
      type: 'morale',
      severity: team_metrics.overall_morale < 30 ? 'high' : 'medium',
      title: 'Low Team Morale',
      description: 'Team spirit is down. Characters need motivation and positive reinforcement.',
      involved_characters: ['All Team Members'],
      suggested_actions: [
        'Team building activities',
        'Celebrate recent successes',
        'Address individual concerns'
      ],
      timeframe: 'This week',
      impact_areas: ['Team Spirit', 'Individual Performance', 'Chemistry']
    });
  }

  // Communication issues
  if (team_metrics.communication_score < 60) {
    issues.push({
      id: `communication_${Date.now()}`,
      type: 'chemistry',
      severity: 'medium',
      title: 'Communication Breakdown',
      description: 'Team members are not effectively communicating during battles and planning.',
      involved_characters: ['All Team Members'],
      suggested_actions: [
        'Communication training',
        'Establish clear signals',
        'Practice coordination drills'
      ],
      timeframe: 'Next few days',
      impact_areas: ['Battle Coordination', 'Team Chemistry', 'Strategy Execution']
    });
  }

  return issues;
}

// Calculate the success rate of coaching interventions
export function calculateCoachingEffectiveness(
  previous_sessions: PreviousSession[],
  current_metrics: TeamMetrics
): number {
  if (previous_sessions.length === 0) return 75; // Default starting effectiveness

  const recentSessions = previous_sessions.slice(-5);
  const success_rate = recentSessions.filter(s => s.outcome === 'successful').length / recentSessions.length;

  // Factor in current team state
  const teamHealthScore = (
    current_metrics.overall_morale +
    current_metrics.team_chemistry +
    current_metrics.communication_score +
    current_metrics.leadership_effectiveness
  ) / 4;

  return Math.round((success_rate * 50) + (teamHealthScore * 0.5));
}