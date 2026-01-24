/**
 * Employee Lounge Chat Service
 * Handles communication with the Employee Lounge backend domain
 *
 * Pattern: Uses sendViaAIChat to POST to /ai/chat with domain='employee_lounge'
 * Backend's assembler fetches full character data via fetchSystemCharacterData()
 */

import { sendViaAIChat, AIChatResult } from './chatAdapter';
import apiClient, { teamAPI, characterAPI } from './apiClient';
import { Contestant } from '@blankwars/types';

// Staff member roles
export type StaffRole = 'mascot' | 'judge' | 'therapist' | 'trainer' | 'host' | 'real_estate_agent';

const STAFF_ROLES: StaffRole[] = ['mascot', 'judge', 'therapist', 'trainer', 'host', 'real_estate_agent'];

// Staff member info (minimal - backend fetches full data)
export interface StaffMember {
  userchar_id: string;
  character_id: string;
  name: string;
  role: StaffRole;
}

// Contestant summary for staff to discuss
export interface ContestantSummary {
  userchar_id: string;
  name: string;
  species: string;
  archetype: string;
  level: number;
  wins: number;
  losses: number;
  current_mental_health: number;
  current_stress: number;
  current_morale: number;
  is_active: boolean;
  roommates: string[];
}

// Team context for the lounge
export interface LoungeTeamContext {
  team_name: string;
  total_wins: number;
  total_losses: number;
  monthly_earnings: number;
  hq_tier: string;
}

// Message type for group chat
export type MessageType = 'opening' | 'continuing' | 'coach_message';

// Message in the lounge
export interface LoungeMessage {
  id: string;
  speaker_name: string;
  speaker_role: 'coach' | StaffRole;
  content: string;
  timestamp: Date;
  round?: number; // For grouping messages in UI
}

// Active participant in group chat
export interface ActiveParticipant {
  role: StaffRole;
  name: string;
  userchar_id: string;
}

// Session state
export interface LoungeSession {
  id: string;
  coach_name: string;
  staff: StaffMember[];
  contestants: ContestantSummary[];
  team_context: LoungeTeamContext;
  messages: LoungeMessage[];
  activeParticipants: ActiveParticipant[]; // Who's currently chatting
  currentRound: number;
}

// Response from backend
export interface LoungeResponse {
  ok: boolean;
  text: string;
  speaker_name: string;
  speaker_role: StaffRole;
  message_type?: MessageType;
  group_mode?: boolean;
  elapsed_ms: number;
}

/**
 * Employee Lounge Service
 * Singleton pattern like other services
 */
class EmployeeLoungeService {
  private static instance: EmployeeLoungeService;
  private activeSession: LoungeSession | null = null;

  private constructor() {}

  static getInstance(): EmployeeLoungeService {
    if (!EmployeeLoungeService.instance) {
      EmployeeLoungeService.instance = new EmployeeLoungeService();
    }
    return EmployeeLoungeService.instance;
  }

  /**
   * Initialize a lounge session by fetching team data, staff, and contestants
   */
  async initializeSession(coachName: string): Promise<LoungeSession> {
    // Fetch team stats, roster, and user characters in parallel
    const [teamStatsResponse, roster, allContestants] = await Promise.all([
      apiClient.get<{
        team_name: string;
        current_hq_tier: string;
        team_monthly_earnings: number;
        team_total_wins: number;
        team_total_losses: number;
      }>('/user/team-stats'),
      teamAPI.get_roster(),
      characterAPI.get_user_characters()
    ]);

    if (!teamStatsResponse.data) {
      throw new Error('STRICT MODE: Team stats response missing data');
    }

    const teamStats = teamStatsResponse.data;

    // Validate required fields
    if (!teamStats.team_name) {
      throw new Error('STRICT MODE: Team stats missing team_name');
    }
    if (!teamStats.current_hq_tier) {
      throw new Error('STRICT MODE: Team stats missing current_hq_tier');
    }
    if (teamStats.team_monthly_earnings === undefined) {
      throw new Error('STRICT MODE: Team stats missing team_monthly_earnings');
    }
    if (teamStats.team_total_wins === undefined) {
      throw new Error('STRICT MODE: Team stats missing team_total_wins');
    }
    if (teamStats.team_total_losses === undefined) {
      throw new Error('STRICT MODE: Team stats missing team_total_losses');
    }

    if (!roster.team_name) {
      throw new Error('STRICT MODE: No team found. Please create a team first.');
    }

    // Build contestant summaries from roster
    const activeIds = new Set(roster.active_contestants);
    const backupIds = new Set(roster.backup_contestants);
    const rosterIds = new Set([...activeIds, ...backupIds]);

    // Filter to contestants on the roster
    const rosterContestants = allContestants.filter(c => rosterIds.has(c.id));

    if (rosterContestants.length === 0) {
      throw new Error('STRICT MODE: No contestants found on roster');
    }

    // Build a name lookup for roommates
    const nameById = new Map<string, string>();
    allContestants.forEach(c => nameById.set(c.id, c.name));

    // Build contestant summaries
    const contestants: ContestantSummary[] = rosterContestants.map(c => {
      // Get roommate names (roommates field may be array of IDs or names depending on API)
      const roommateNames: string[] = [];
      if (Array.isArray((c as any).roommates)) {
        (c as any).roommates.forEach((r: string) => {
          const name = nameById.get(r);
          if (name) {
            roommateNames.push(name);
          } else if (typeof r === 'string' && r.length > 0) {
            // Might already be a name
            roommateNames.push(r);
          }
        });
      }

      return {
        userchar_id: c.id,
        name: c.name,
        species: (c as any).species || 'Unknown',
        archetype: c.archetype,
        level: c.level,
        wins: (c as any).wins || 0,
        losses: (c as any).losses || 0,
        current_mental_health: (c as any).current_mental_health || 50,
        current_stress: (c as any).current_stress || 30,
        current_morale: (c as any).current_morale || 50,
        is_active: activeIds.has(c.id),
        roommates: roommateNames
      };
    });

    // Fetch all system characters in parallel
    const [mascots, judges, therapists, trainers, hosts, realEstateAgents] = await Promise.all([
      characterAPI.get_system_characters('mascot'),
      characterAPI.get_system_characters('judge'),
      characterAPI.get_system_characters('therapist'),
      characterAPI.get_system_characters('trainer'),
      characterAPI.get_system_characters('host'),
      characterAPI.get_system_characters('real_estate_agent')
    ]);

    const systemCharsByRole: Record<StaffRole, Array<{ id: string; character_id: string; name: string; role: string }>> = {
      mascot: mascots,
      judge: judges,
      therapist: therapists,
      trainer: trainers,
      host: hosts,
      real_estate_agent: realEstateAgents
    };

    // Build staff list from active slots
    const staff: StaffMember[] = [];

    for (const role of STAFF_ROLES) {
      const systemChar = roster.system_characters[role];
      if (!systemChar) {
        throw new Error(`STRICT MODE: No system character slot for ${role}`);
      }
      const slot = systemChar.active;

      if (!slot) {
        throw new Error(`STRICT MODE: Missing active ${role}. Please assign all staff in Team Roster.`);
      }

      const characters = systemCharsByRole[role];
      const activeChar = characters.find(c => c.id === slot);

      if (!activeChar) {
        throw new Error(`STRICT MODE: Could not find character data for ${role} with id ${slot}`);
      }

      if (!activeChar.id) {
        throw new Error(`STRICT MODE: Character ${role} missing id`);
      }
      if (!activeChar.character_id) {
        throw new Error(`STRICT MODE: Character ${role} missing character_id`);
      }
      if (!activeChar.name) {
        throw new Error(`STRICT MODE: Character ${role} missing name`);
      }

      staff.push({
        userchar_id: activeChar.id,
        character_id: activeChar.character_id,
        name: activeChar.name,
        role: role
      });
    }

    if (staff.length !== 6) {
      throw new Error(`STRICT MODE: Expected 6 staff members, got ${staff.length}`);
    }

    // Default active participants: first 3 staff members
    const defaultParticipants: ActiveParticipant[] = staff.slice(0, 3).map(s => ({
      role: s.role,
      name: s.name,
      userchar_id: s.userchar_id
    }));

    // Create session
    const session: LoungeSession = {
      id: `lounge_${Date.now()}`,
      coach_name: coachName,
      staff,
      contestants,
      team_context: {
        team_name: teamStats.team_name,
        total_wins: teamStats.team_total_wins,
        total_losses: teamStats.team_total_losses,
        monthly_earnings: teamStats.team_monthly_earnings,
        hq_tier: teamStats.current_hq_tier
      },
      messages: [],
      activeParticipants: defaultParticipants,
      currentRound: 0
    };

    this.activeSession = session;
    return session;
  }

  /**
   * Set which staff members are actively participating in the conversation
   */
  setActiveParticipants(roles: StaffRole[]): void {
    if (!this.activeSession) {
      throw new Error('STRICT MODE: No active session');
    }
    if (roles.length < 2) {
      throw new Error('STRICT MODE: Need at least 2 participants for group chat');
    }

    this.activeSession.activeParticipants = roles.map(role => {
      const staff = this.activeSession!.staff.find(s => s.role === role);
      if (!staff) {
        throw new Error(`STRICT MODE: No staff member with role ${role}`);
      }
      return {
        role: staff.role,
        name: staff.name,
        userchar_id: staff.userchar_id
      };
    });
  }

  /**
   * Send a message to the lounge
   * Backend decides which staff member responds based on message content
   */
  async sendMessage(
    message: string,
    speakingRole: StaffRole
  ): Promise<LoungeResponse> {
    if (!this.activeSession) {
      throw new Error('STRICT MODE: No active session. Call initializeSession first.');
    }

    const session = this.activeSession;

    // Find the speaking staff member
    const speakingStaff = session.staff.find(s => s.role === speakingRole);
    if (!speakingStaff) {
      throw new Error(`STRICT MODE: No staff member with role ${speakingRole}`);
    }

    // Add coach message to history
    const coachMessage: LoungeMessage = {
      id: `coach_${Date.now()}`,
      speaker_name: session.coach_name,
      speaker_role: 'coach',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(coachMessage);

    // Build recent messages for context
    const recentMessages = session.messages.slice(-10).map(m => ({
      speaker_name: m.speaker_name,
      speaker_role: m.speaker_role,
      content: m.content,
      timestamp: m.timestamp.toISOString()
    }));

    // Build all_staff for backend
    const allStaff = session.staff.map(s => ({
      userchar_id: s.userchar_id,
      character_id: s.character_id,
      name: s.name,
      role: s.role,
      species: '', // Backend fetches via fetchSystemCharacterData
      archetype: '' // Backend fetches via fetchSystemCharacterData
    }));

    // Send via chat adapter
    const result = await sendViaAIChat(session.id, {
      message,
      domain: 'employee_lounge',
      agent_key: speakingStaff.userchar_id,
      userchar_id: speakingStaff.userchar_id,
      meta: {
        coach_name: session.coach_name,
        speaking_character_role: speakingRole,
        all_staff: allStaff,
        contestants: session.contestants,
        recent_messages: recentMessages,
        team_context: session.team_context
      }
    });

    // Parse response
    const rawResponse = result.raw as LoungeResponse;

    if (!rawResponse.ok) {
      throw new Error(`STRICT MODE: Backend returned not ok: ${JSON.stringify(rawResponse)}`);
    }
    if (!rawResponse.text) {
      throw new Error('STRICT MODE: Backend response missing text');
    }
    if (!rawResponse.speaker_name) {
      throw new Error('STRICT MODE: Backend response missing speaker_name');
    }
    if (!rawResponse.speaker_role) {
      throw new Error('STRICT MODE: Backend response missing speaker_role');
    }

    // Add AI response to history
    const aiMessage: LoungeMessage = {
      id: `ai_${Date.now()}`,
      speaker_name: rawResponse.speaker_name,
      speaker_role: rawResponse.speaker_role,
      content: rawResponse.text,
      timestamp: new Date()
    };
    session.messages.push(aiMessage);

    return rawResponse;
  }

  /**
   * Generate opening scene - staff start chatting when user enters
   * Returns array of responses as they're generated
   */
  async generateOpeningScene(
    onMessage?: (message: LoungeMessage) => void
  ): Promise<LoungeMessage[]> {
    if (!this.activeSession) {
      throw new Error('STRICT MODE: No active session');
    }

    const session = this.activeSession;
    session.currentRound = 1;
    const responses: LoungeMessage[] = [];

    // Loop through active participants sequentially
    for (let i = 0; i < session.activeParticipants.length; i++) {
      const participant = session.activeParticipants[i];
      const staff = session.staff.find(s => s.role === participant.role);
      if (!staff) continue;

      // Build responding_to from last message (if any)
      const lastMessage = responses[responses.length - 1];
      const respondingTo = lastMessage ? {
        speaker_name: lastMessage.speaker_name,
        speaker_role: lastMessage.speaker_role as StaffRole,
        content: lastMessage.content
      } : undefined;

      const response = await this.sendGroupRequest({
        messageType: 'opening',
        speakingRole: participant.role,
        respondingTo,
        round: 1
      });

      const loungeMessage: LoungeMessage = {
        id: `opening_${Date.now()}_${participant.role}`,
        speaker_name: response.speaker_name,
        speaker_role: response.speaker_role,
        content: response.text,
        timestamp: new Date(),
        round: 1
      };

      responses.push(loungeMessage);
      session.messages.push(loungeMessage);

      // Callback for real-time UI updates
      if (onMessage) {
        onMessage(loungeMessage);
      }

      // Delay between responses for natural flow
      if (i < session.activeParticipants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return responses;
  }

  /**
   * Send coach message and get group responses
   */
  async sendGroupMessage(
    message: string,
    onMessage?: (message: LoungeMessage) => void
  ): Promise<LoungeMessage[]> {
    if (!this.activeSession) {
      throw new Error('STRICT MODE: No active session');
    }

    const session = this.activeSession;
    session.currentRound++;
    const round = session.currentRound;

    // Add coach message
    const coachMessage: LoungeMessage = {
      id: `coach_${Date.now()}`,
      speaker_name: session.coach_name,
      speaker_role: 'coach',
      content: message,
      timestamp: new Date(),
      round
    };
    session.messages.push(coachMessage);
    if (onMessage) {
      onMessage(coachMessage);
    }

    const responses: LoungeMessage[] = [];

    // Loop through active participants
    for (let i = 0; i < session.activeParticipants.length; i++) {
      const participant = session.activeParticipants[i];

      // Build responding_to - first responder responds to coach, others to previous staff
      const lastStaffMessage = responses[responses.length - 1];
      const respondingTo = lastStaffMessage ? {
        speaker_name: lastStaffMessage.speaker_name,
        speaker_role: lastStaffMessage.speaker_role as StaffRole,
        content: lastStaffMessage.content
      } : undefined;

      const response = await this.sendGroupRequest({
        messageType: 'coach_message',
        speakingRole: participant.role,
        coachMessage: message,
        respondingTo,
        round
      });

      const loungeMessage: LoungeMessage = {
        id: `response_${Date.now()}_${participant.role}`,
        speaker_name: response.speaker_name,
        speaker_role: response.speaker_role,
        content: response.text,
        timestamp: new Date(),
        round
      };

      responses.push(loungeMessage);
      session.messages.push(loungeMessage);

      if (onMessage) {
        onMessage(loungeMessage);
      }

      // Delay between responses
      if (i < session.activeParticipants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return responses;
  }

  /**
   * Continue conversation without coach message
   */
  async continueConversation(
    onMessage?: (message: LoungeMessage) => void
  ): Promise<LoungeMessage[]> {
    if (!this.activeSession) {
      throw new Error('STRICT MODE: No active session');
    }

    const session = this.activeSession;
    session.currentRound++;
    const round = session.currentRound;
    const responses: LoungeMessage[] = [];

    // Get last message for context
    const lastMessage = session.messages[session.messages.length - 1];

    for (let i = 0; i < session.activeParticipants.length; i++) {
      const participant = session.activeParticipants[i];

      // Build responding_to from last message or previous response
      const previousMessage = responses[responses.length - 1] || lastMessage;
      const respondingTo = previousMessage && previousMessage.speaker_role !== 'coach' ? {
        speaker_name: previousMessage.speaker_name,
        speaker_role: previousMessage.speaker_role as StaffRole,
        content: previousMessage.content
      } : undefined;

      const response = await this.sendGroupRequest({
        messageType: 'continuing',
        speakingRole: participant.role,
        respondingTo,
        round
      });

      const loungeMessage: LoungeMessage = {
        id: `continue_${Date.now()}_${participant.role}`,
        speaker_name: response.speaker_name,
        speaker_role: response.speaker_role,
        content: response.text,
        timestamp: new Date(),
        round
      };

      responses.push(loungeMessage);
      session.messages.push(loungeMessage);

      if (onMessage) {
        onMessage(loungeMessage);
      }

      if (i < session.activeParticipants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return responses;
  }

  /**
   * Internal: Send a single request in group mode
   */
  private async sendGroupRequest(params: {
    messageType: MessageType;
    speakingRole: StaffRole;
    coachMessage?: string;
    respondingTo?: { speaker_name: string; speaker_role: StaffRole; content: string };
    round: number;
  }): Promise<LoungeResponse> {
    const session = this.activeSession!;
    const staff = session.staff.find(s => s.role === params.speakingRole);
    if (!staff) {
      throw new Error(`STRICT MODE: No staff with role ${params.speakingRole}`);
    }

    // Build recent messages for context
    const recentMessages = session.messages.slice(-10).map(m => ({
      speaker_name: m.speaker_name,
      speaker_role: m.speaker_role,
      content: m.content,
      timestamp: m.timestamp.toISOString()
    }));

    // Build all_staff for backend
    const allStaff = session.staff.map(s => ({
      userchar_id: s.userchar_id,
      character_id: s.character_id,
      name: s.name,
      role: s.role,
      species: '',
      archetype: ''
    }));

    const result = await sendViaAIChat(session.id, {
      message: params.coachMessage || '',
      domain: 'employee_lounge',
      agent_key: staff.userchar_id,
      userchar_id: staff.userchar_id,
      meta: {
        coach_name: session.coach_name,
        speaking_character_role: params.speakingRole,
        all_staff: allStaff,
        contestants: session.contestants,
        recent_messages: recentMessages,
        team_context: session.team_context,
        // Group mode fields
        group_mode: true,
        message_type: params.messageType,
        active_participants: session.activeParticipants,
        responding_to: params.respondingTo
      }
    });

    const rawResponse = result.raw as LoungeResponse;

    if (!rawResponse.ok) {
      throw new Error(`STRICT MODE: Backend error: ${JSON.stringify(rawResponse)}`);
    }

    return rawResponse;
  }

  /**
   * Get the active session
   */
  getSession(): LoungeSession | null {
    return this.activeSession;
  }

  /**
   * Get staff member by role
   */
  getStaffByRole(role: StaffRole): StaffMember | undefined {
    return this.activeSession?.staff.find(s => s.role === role);
  }

  /**
   * End the current session
   */
  endSession(): void {
    this.activeSession = null;
  }
}

export default EmployeeLoungeService;
