import { ai_chat_service } from './aiChatService';
import { Server as SocketIOServer } from 'socket.io';
import { HOST_DEFINITIONS } from './prompts/domains/battle/personas/hosts';

export interface HostmasterContext {
  user_name: string;
  opponent_name: string;
  battle_id: string;
  round: number;
  phase: string;
  current_health: { user: number; opponent: number };
  max_health: { user: number; opponent: number };
  combat_events: Array<{
    type: string;
    attacker?: string;
    defender?: string;
    ability?: string;
    damage?: number;
    critical?: boolean;
  }>;
  battle_history: string[];
  host_id?: 'pt_barnum' | 'mad_hatter' | 'betty_boop';  // The user's assigned host character
}

// Host character display names
const HOST_NAMES: Record<string, string> = {
  pt_barnum: 'P.T. Barnum',
  mad_hatter: 'Mad Hatter',
  betty_boop: 'Betty Boop'
};

export interface HostmasterAnnouncement {
  text: string;
  type: 'intro' | 'round' | 'action' | 'victory' | 'defeat' | 'special';
  priority: 'low' | 'normal' | 'high';
  delay?: number;
  metadata?: {
    player?: string;
    event_type?: string;
    intensity?: 'low' | 'medium' | 'high';
  };
}

/**
 * Battle Host Service - AI-Powered Battle Announcer
 * Uses assigned host characters (P.T. Barnum, Mad Hatter, Betty Boop) for commentary
 */
export class HostmasterService {
  private io: SocketIOServer;
  private announcement_history: Map<string, string[]> = new Map();
  private character_personalities: Map<string, string> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.initializePersonalities();
  }

  private initializePersonalities(): void {
    // Initialize known character personalities for better announcements
    this.character_personalities.set('Achilles', 'legendary Greek warrior known for his pride and fierce combat prowess');
    this.character_personalities.set('Joan of Arc', 'divine French maiden warrior driven by faith and justice');
    this.character_personalities.set('Merlin', 'wise and powerful wizard with ancient magic');
    this.character_personalities.set('Cleopatra', 'cunning Egyptian queen with strategic brilliance');
    this.character_personalities.set('Loki', 'trickster god with shapeshifting abilities and silver tongue');
    this.character_personalities.set('Fenrir', 'monstrous wolf prophesied to devour gods');
    this.character_personalities.set('Sherlock Holmes', 'brilliant detective with unmatched deductive reasoning');
    this.character_personalities.set('Sun Tzu', 'master strategist and philosopher of warfare');
  }

  /**
   * Get the host personality based on host_id, with fallback to pt_barnum
   */
  private getHostPersonality(host_id?: string) {
    const validHostId = (host_id && host_id in HOST_DEFINITIONS) ? host_id as keyof typeof HOST_DEFINITIONS : 'pt_barnum';
    const hostDef = HOST_DEFINITIONS[validHostId];
    const hostName = HOST_NAMES[validHostId];

    return {
      character_id: validHostId,
      character_name: hostName,
      personality: {
        traits: ['Dramatic', 'Entertaining'],
        speech_style: hostDef.commentary,
        motivations: [hostDef.personality],
        fears: ['Boring the audience']
      },
      introduction_style: hostDef.introduction
    };
  }

  /**
   * Generate AI-powered battle introduction
   */
  async generateBattleIntroduction(context: HostmasterContext): Promise<HostmasterAnnouncement> {
    const prompt = this.buildIntroPrompt(context);
    const host = this.getHostPersonality(context.host_id);

    try {
      const response = await ai_chat_service.generate_character_response(
        {
          character_id: host.character_id,
          character_name: host.character_name,
          personality: host.personality,
          historical_period: 'BlankWars Arena'
        },
        prompt,
        'hostmaster_ai',
        null,
        { is_in_battle: true, is_combat_chat: true }
      );

      // Store in history
      this.addToHistory(context.battle_id, response.message);

      return {
        text: response.message,
        type: 'intro',
        priority: 'high',
        metadata: {
          intensity: 'high',
          event_type: 'battle_start'
        }
      };
    } catch (error) {
      console.error('Failed to generate AI introduction:', error);
      throw new Error('Hostmaster AI failed to generate introduction');
    }
  }

  /**
   * Generate AI-powered round announcement
   */
  async generateRoundAnnouncement(context: HostmasterContext): Promise<HostmasterAnnouncement> {
    const prompt = this.buildRoundPrompt(context);
    const host = this.getHostPersonality(context.host_id);

    try {
      const response = await ai_chat_service.generate_character_response(
        {
          character_id: host.character_id,
          character_name: host.character_name,
          personality: host.personality,
          historical_period: 'BlankWars Arena'
        },
        prompt,
        'hostmaster_ai',
        null,
        { is_in_battle: true, is_combat_chat: true }
      );

      this.addToHistory(context.battle_id, response.message);

      return {
        text: response.message,
        type: 'round',
        priority: 'high',
        delay: 1000,
        metadata: {
          intensity: 'high',
          event_type: 'round_start'
        }
      };
    } catch (error) {
      console.error('Failed to generate AI round announcement:', error);
      throw new Error('Hostmaster AI failed to generate round announcement');
    }
  }

  /**
   * Generate AI-powered combat action commentary
   */
  async generateActionCommentary(context: HostmasterContext, event: any): Promise<HostmasterAnnouncement> {
    const prompt = this.buildActionPrompt(context, event);
    const host = this.getHostPersonality(context.host_id);

    try {
      const response = await ai_chat_service.generate_character_response(
        {
          character_id: host.character_id,
          character_name: host.character_name,
          personality: host.personality,
          historical_period: 'BlankWars Arena'
        },
        prompt,
        'hostmaster_ai',
        null,
        { is_in_battle: true, is_combat_chat: true }
      );

      this.addToHistory(context.battle_id, response.message);

      return {
        text: response.message,
        type: 'action',
        priority: 'normal',
        delay: 500,
        metadata: {
          intensity: event.critical ? 'high' : 'medium',
          event_type: event.type,
          player: event.attacker
        }
      };
    } catch (error) {
      console.error('Failed to generate AI action commentary:', error);
      throw new Error('Hostmaster AI failed to generate action commentary');
    }
  }

  /**
   * Generate AI-powered victory announcement
   */
  async generateVictoryAnnouncement(context: HostmasterContext, winner: string): Promise<HostmasterAnnouncement> {
    const prompt = this.buildVictoryPrompt(context, winner);
    const host = this.getHostPersonality(context.host_id);

    try {
      const response = await ai_chat_service.generate_character_response(
        {
          character_id: host.character_id,
          character_name: host.character_name,
          personality: host.personality,
          historical_period: 'BlankWars Arena'
        },
        prompt,
        'hostmaster_ai',
        null,
        { is_in_battle: true, is_combat_chat: true }
      );

      this.addToHistory(context.battle_id, response.message);

      return {
        text: response.message,
        type: 'victory',
        priority: 'high',
        delay: 2000,
        metadata: {
          intensity: 'high',
          event_type: 'victory',
          player: winner
        }
      };
    } catch (error) {
      console.error('Failed to generate AI victory announcement:', error);
      throw new Error('Hostmaster AI failed to generate victory announcement');
    }
  }

  /**
   * Generate contextual special moment announcements
   */
  async generateSpecialMomentAnnouncement(context: HostmasterContext, moment_type: string, data: any): Promise<HostmasterAnnouncement> {
    const prompt = this.buildSpecialMomentPrompt(context, moment_type, data);
    const host = this.getHostPersonality(context.host_id);

    try {
      const response = await ai_chat_service.generate_character_response(
        {
          character_id: host.character_id,
          character_name: host.character_name,
          personality: host.personality,
          historical_period: 'BlankWars Arena'
        },
        prompt,
        'hostmaster_ai',
        null,
        { is_in_battle: true, is_combat_chat: true }
      );

      this.addToHistory(context.battle_id, response.message);

      return {
        text: response.message,
        type: 'special',
        priority: 'normal',
        delay: 1000,
        metadata: {
          intensity: 'medium',
          event_type: moment_type
        }
      };
    } catch (error) {
      console.error('Failed to generate AI special moment announcement:', error);
      throw new Error('Hostmaster AI failed to generate special moment announcement');
    }
  }

  /**
   * Broadcast announcement to battle participants
   */
  async broadcastAnnouncement(battle_id: string, announcement: HostmasterAnnouncement): Promise<void> {
    try {
      // Send to battle room
      this.io.to(`battle:${battle_id}`).emit('hostmaster_announcement', {
        text: announcement.text,
        type: announcement.type,
        priority: announcement.priority,
        delay: announcement.delay || 0,
        metadata: announcement.metadata || {}
      });

      console.log(`📢 Battle Host announced: "${announcement.text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('Failed to broadcast announcement:', error);
    }
  }

  // Private helper methods for building AI prompts

  private getHostName(context: HostmasterContext): string {
    const hostId = context.host_id || 'pt_barnum';
    return HOST_NAMES[hostId] || 'P.T. Barnum';
  }

  private buildIntroPrompt(context: HostmasterContext): string {
    const hostName = this.getHostName(context);
    const user_description = this.character_personalities.get(context.user_name) || 'legendary warrior';
    const opponent_description = this.character_personalities.get(context.opponent_name) || 'formidable fighter';

    return `You are ${hostName}, the BlankWars battle announcer. You're introducing an epic battle between ${context.user_name} (${user_description}) and ${context.opponent_name} (${opponent_description}).

This is Battle ID ${context.battle_id}. Create a dramatic, exciting introduction that:
- Welcomes the audience to the arena
- Introduces both warriors with respect for their legendary status
- Builds anticipation for the coming battle
- Uses theatrical language worthy of legendary figures

Keep it to 2-3 sentences, dramatic but not overly long. End with something that signals the battle is about to begin!`;
  }

  private buildRoundPrompt(context: HostmasterContext): string {
    const hostName = this.getHostName(context);
    const health_status = this.getHealthStatus(context);

    return `You are ${hostName} announcing the start of Round ${context.round}.

Current situation:
- ${health_status}
- Previous rounds have been intense

Create a dramatic announcement that:
- Announces the round number
- Notes the current state of both fighters
- Builds tension for what's to come
- Encourages both warriors

Keep it to 2-3 sentences, energetic and engaging!`;
  }

  private buildActionPrompt(context: HostmasterContext, event: any): string {
    const hostName = this.getHostName(context);
    const attacker = event.attacker === 'user' ? context.user_name : context.opponent_name;
    const defender = event.defender === 'user' ? context.user_name : context.opponent_name;
    const critical = event.critical ? 'It was a CRITICAL HIT!' : '';
    const damage = event.damage || 0;

    return `You are ${hostName} providing live commentary on a combat action in Round ${context.round}.

What just happened:
- ${attacker} used ${event.ability || 'a basic attack'} against ${defender}
- The attack dealt ${damage} damage
- ${critical}
- ${defender} has ${event.remaining_health?.[event.defender] || 'unknown'} health remaining

Provide exciting play-by-play commentary that:
- Describes the action vividly
- Shows the impact and consequences
- Maintains the drama and energy
- Respects both fighters' legendary status

Keep it to 1-2 sentences, punchy and exciting!`;
  }

  private buildVictoryPrompt(context: HostmasterContext, winner: string): string {
    const hostName = this.getHostName(context);
    const loser = winner === context.user_name ? context.opponent_name : context.user_name;
    const battle_summary = `The battle lasted ${context.round} rounds with incredible displays of skill and power.`;

    return `You are ${hostName} announcing the victory in this epic battle.

Battle Summary:
- Winner: ${winner}
- Defeated: ${loser}
- ${battle_summary}
- Both warriors fought with honor and legendary skill

Create a grand victory announcement that:
- Celebrates the winner's triumph
- Honors both fighters for their courage
- Captures the epic nature of the battle
- Shows respect for the legendary status of both warriors

Keep it to 2-3 sentences, celebratory yet respectful!`;
  }

  private buildSpecialMomentPrompt(context: HostmasterContext, moment_type: string, data: any): string {
    const hostName = this.getHostName(context);
    const special_moments: Record<string, string> = {
      'comeback': `${data.player} has made an incredible comeback from near defeat!`,
      'perfect_health': `${data.player} has maintained perfect health throughout the battle!`,
      'close_match': 'Both warriors are nearly equal in strength - this could go either way!',
      'ability_showcase': `${data.player} just demonstrated the true power of ${data.ability}!`,
      'strategic_mastery': `${data.player}'s ${data.strategy} strategy is proving highly effective!`
    };

    const moment = special_moments[moment_type] || `Something special is happening in Round ${context.round}!`;

    return `You are ${hostName} commenting on a special moment in the battle.

Special Moment: ${moment}

Create an announcement that:
- Highlights the significance of this moment
- Shows your expertise as an announcer
- Builds excitement for what comes next
- Respects the legendary nature of the fighters

Keep it to 1-2 sentences, insightful and dramatic!`;
  }

  private getHealthStatus(context: HostmasterContext): string {
    const user_percent = Math.round((context.current_health.user / context.max_health.user) * 100);
    const opponent_percent = Math.round((context.current_health.opponent / context.max_health.opponent) * 100);

    if (user_percent === opponent_percent) {
      return `Both warriors remain evenly matched at ${user_percent}% health`;
    } else if (user_percent > opponent_percent) {
      return `${context.user_name} leads with ${user_percent}% health to ${context.opponent_name}'s ${opponent_percent}%`;
    } else {
      return `${context.opponent_name} leads with ${opponent_percent}% health to ${context.user_name}'s ${user_percent}%`;
    }
  }

  private addToHistory(battle_id: string, announcement: string): void {
    if (!this.announcement_history.has(battle_id)) {
      this.announcement_history.set(battle_id, []);
    }
    const history = this.announcement_history.get(battle_id)!;
    history.push(announcement);
    
    // Keep only last 10 announcements
    if (history.length > 10) {
      history.shift();
    }
  }

  // COMMENTED OUT: Fallback methods - we now fail fast instead of using synthetic content
  // Preserved for reference in case needed for future debugging

  private getFallbackIntroduction(context: HostmasterContext): HostmasterAnnouncement {
    throw new Error('getFallbackIntroduction is forbidden - we fail fast instead');
    /*
    return {
      text: `Ladies and gentlemen, welcome to the arena! Witness the legendary battle between ${context.user_name} and ${context.opponent_name}! Let the combat begin!`,
      type: 'intro',
      priority: 'high'
    };
    */
  }

  private getFallbackRoundAnnouncement(context: HostmasterContext): HostmasterAnnouncement {
    throw new Error('getFallbackRoundAnnouncement is forbidden - we fail fast instead');
    /*
    return {
      text: `Round ${context.round} begins! Both warriors prepare for the next clash!`,
      type: 'round',
      priority: 'high'
    };
    */
  }

  private getFallbackActionCommentary(context: HostmasterContext, event: any): HostmasterAnnouncement {
    throw new Error('getFallbackActionCommentary is forbidden - we fail fast instead');
    /*
    const attacker = event.attacker === 'user' ? context.user_name : context.opponent_name;
    const critical = event.critical ? 'Critical hit! ' : '';
    return {
      text: `${critical}${attacker} strikes with ${event.ability || 'devastating power'}!`,
      type: 'action',
      priority: 'normal'
    };
    */
  }

  private getFallbackVictoryAnnouncement(context: HostmasterContext, winner: string): HostmasterAnnouncement {
    throw new Error('getFallbackVictoryAnnouncement is forbidden - we fail fast instead');
    /*
    return {
      text: `Victory to ${winner}! What an incredible display of legendary combat!`,
      type: 'victory',
      priority: 'high'
    };
    */
  }

  private getFallbackSpecialMomentAnnouncement(moment_type: string): HostmasterAnnouncement {
    throw new Error('getFallbackSpecialMomentAnnouncement is forbidden - we fail fast instead');
    /*
    return {
      text: `The crowd roars as something special happens in the arena!`,
      type: 'special',
      priority: 'normal'
    };
    */
  }

  /**
   * Clean up battle history when battle ends
   */
  public cleanupBattle(battle_id: string): void {
    this.announcement_history.delete(battle_id);
  }
}

// Export singleton instance
export const hostmaster_service = new HostmasterService((global as any).io);