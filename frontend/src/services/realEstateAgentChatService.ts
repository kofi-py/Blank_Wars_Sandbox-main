import { realEstateAPI } from './apiClient';
import { sendViaAIChat, type AIChatPayload } from './chatAdapter';
import { RealEstateAgent } from '../data/realEstateAgentTypes';
import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';

interface RealEstateAgentContext {
  selected_agent: RealEstateAgent;
  competing_agents: RealEstateAgent[];
  facility_type?: string;
  user_message?: string;
  current_team_stats: {
    level: number;
    total_characters: number;
    current_facilities: string[];
    budget: number;
  };
  conversation_history: {
    agent_id: string;
    message: string;
    timestamp: Date;
  }[];
}

interface AgentResponse {
  agent_id: string;
  agent_name: string;
  message: string;
  timestamp: Date;
  is_competitor_interruption?: boolean;
}

class RealEstateAgentChatService {
  async startFacilityConsultation(
    selected_agent: RealEstateAgent,
    competing_agents: RealEstateAgent[],
    team_stats: any,
    userchar_id: string,
    character_id?: string
  ): Promise<string> {
    // Import character context for personalized consultation
    if (character_id) {
      const contextService = EventContextService.getInstance();
      const characterContext = await contextService.getRealEstateContext(character_id);
      // TODO: Add characterContext to API context
    }

    const context: RealEstateAgentContext = {
      selected_agent,
      competing_agents,
      current_team_stats: team_stats,
      conversation_history: [],
    };

    // Publish consultation start event
    if (character_id) {
      const eventBus = GameEventBus.getInstance();
      await eventBus.publish({
        type: 'facility_evaluation',
        source: 'real_estate_office',
        primary_character_id: character_id,
        severity: 'medium',
        category: 'real_estate',
        description: `${character_id} started a facility consultation with ${selected_agent.name}`,
        metadata: { 
          agent_type: selected_agent.tagline,
          current_budget: team_stats.budget,
          team_level: team_stats.level,
          consultation_type: 'initial'
        },
        tags: ['real_estate', 'consultation', 'facility_planning']
      });
    }

    const aiPayload: AIChatPayload = {
      agent_key: selected_agent.id,
      userchar_id: userchar_id,
      message: '',
      domain: 'real_estate',
      meta: {
        agent: selected_agent,
        competing_agents: competing_agents,
        current_hq_tier: team_stats.current_hq_tier,
        current_balance: team_stats.current_balance,
        current_gems: team_stats.current_gems,
        current_room_count: team_stats.current_room_count,
        current_bed_count: team_stats.current_bed_count,
        current_character_count: team_stats.current_character_count,
        characters_without_beds: team_stats.characters_without_beds,
        available_tiers: team_stats.available_tiers,
        coach_name: team_stats.coach_name,
        team_name: team_stats.team_name,
        team_total_wins: team_stats.team_total_wins,
        team_total_losses: team_stats.team_total_losses,
        team_win_percentage: team_stats.team_win_percentage,
        team_monthly_earnings: team_stats.team_monthly_earnings,
        team_total_earnings: team_stats.team_total_earnings,
        account_total_earnings: team_stats.account_total_earnings,
        account_monthly_earnings: team_stats.account_monthly_earnings,
      }
    };
    const result = await sendViaAIChat('real-estate', aiPayload);
    return result.text; 
  }

  async sendUserMessage(
    selected_agent: RealEstateAgent,
    competing_agents: RealEstateAgent[],
    user_message: string,
    team_stats: any,
    conversation_history: any[],
    userchar_id: string,
    character_id?: string
  ): Promise<AgentResponse[]> {
    // Import character context for personalized responses
    if (character_id) {
      const contextService = EventContextService.getInstance();
      const characterContext = await contextService.getRealEstateContext(character_id);
      // TODO: Add characterContext to API context
    }

    const context: RealEstateAgentContext = {
      selected_agent,
      competing_agents,
      user_message,
      current_team_stats: team_stats,
      conversation_history: conversation_history,
    };

    // Analyze user message for event publishing
    const messageText = user_message.toLowerCase();
    let event_type = 'room_upgrade_requested';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (messageText.includes('privacy') || messageText.includes('private') || messageText.includes('alone')) {
      event_type = 'privacy_request';
      severity = 'high';
    } else if (messageText.includes('complaint') || messageText.includes('problem') || messageText.includes('issue')) {
      event_type = 'living_complaint';
      severity = 'medium';
    } else if (messageText.includes('upgrade') || messageText.includes('better') || messageText.includes('luxury')) {
      event_type = 'comfort_enhancement';
      severity = 'low';
    }

    // Publish real estate interaction event
    if (character_id) {
      const eventBus = GameEventBus.getInstance();
      await eventBus.publish({
        type: event_type as any,
        source: 'real_estate_office',
        primary_character_id: character_id,
        severity,
        category: 'real_estate',
        description: `${character_id} discussed with ${selected_agent.name}: "${user_message.substring(0, 100)}"`,
        metadata: { 
          agent_type: selected_agent.tagline,
          request_type: event_type,
          current_budget: team_stats.budget,
          message_length: user_message.length,
          comedy_potential: messageText.includes('desperate') || messageText.includes('please') ? 6 : 3
        },
        tags: ['real_estate', 'housing_discussion', event_type.replace('_', '-')]
      });
    }

    const aiPayload2: AIChatPayload = {
      agent_key: selected_agent.id,
      userchar_id: userchar_id,
      message: user_message,
      domain: 'real_estate',
      messages: conversation_history.map(h => ({
        message: h.message,
        speaker_name: h.agent_name,
        speaker_id: h.agent_id
      })),
      meta: {
        agent: selected_agent,
        competing_agents: competing_agents,
        current_hq_tier: team_stats.current_hq_tier,
        current_balance: team_stats.current_balance,
        current_gems: team_stats.current_gems,
        current_room_count: team_stats.current_room_count,
        current_bed_count: team_stats.current_bed_count,
        current_character_count: team_stats.current_character_count,
        characters_without_beds: team_stats.characters_without_beds,
        available_tiers: team_stats.available_tiers,
        coach_name: team_stats.coach_name,
        team_name: team_stats.team_name,
        team_total_wins: team_stats.team_total_wins,
        team_total_losses: team_stats.team_total_losses,
        team_win_percentage: team_stats.team_win_percentage,
        team_monthly_earnings: team_stats.team_monthly_earnings,
        team_total_earnings: team_stats.team_total_earnings,
        account_total_earnings: team_stats.account_total_earnings,
        account_monthly_earnings: team_stats.account_monthly_earnings,
      }
    };
    const result = await sendViaAIChat('real-estate', aiPayload2);
    return [{
      agent_id: selected_agent.id,
      agent_name: selected_agent.name,
      message: result.text,
      timestamp: new Date()
    }];
  }
}

export const realEstateAgentChatService = new RealEstateAgentChatService();
