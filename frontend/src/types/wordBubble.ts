// Word Bubble System Types and Interfaces

export type ChatContextType =
  | 'battle'
  | 'kitchen'
  | 'confessional'
  | 'training'
  | 'therapy_individual'
  | 'therapy_group'
  | 'coaching_performance'
  | 'coaching_equipment'
  | 'coaching_skill'
  | 'coaching_personal'
  | 'coaching_financial'
  | 'social_1'
  | 'social_2'
  | 'social_3'
  | 'real_estate'
  | 'personal_trainer'
  | 'simple_chat';

export type BubbleType = 'speech' | 'thought' | 'shout' | 'whisper' | 'system' | 'action';
export type EmotionType = 'neutral' | 'happy' | 'angry' | 'sad' | 'excited' | 'worried' | 'confused' | 'confident';

// Character positioning in different contexts
export interface CharacterPosition {
  id: string;
  character_id: string;
  x: number; // Percentage of container width (0-100)
  y: number; // Percentage of container height (0-100)
  z?: number; // Layer depth for overlapping
  zone: ChatContextType;
  sub_zone?: string; // e.g., 'kitchen_table', 'kitchen_counter', 'battle_field_left'
  is_visible: boolean;
  scale: number; // Size multiplier (0.5-2.0)
  rotation?: number; // Rotation in degrees
  is_moving?: boolean;
  target_position?: { x: number; y: number };
}

// Predefined position layouts for different contexts
export interface PositionLayout {
  context: ChatContextType;
  positions: {
    [key: string]: { // key is subZone name
      max_characters: number;
      default_positions: Array<{ x: number; y: number; scale: number }>;
      center_point?: { x: number; y: number }; // For circular arrangements
      radius?: number; // For circular arrangements
    };
  };
}

// Word bubble data structure
export interface WordBubble {
  id: string;
  message: string;
  character_id: string;
  character_name: string;
  character_avatar: string;
  position: { x: number; y: number };
  anchor_point?: 'top' | 'bottom' | 'left' | 'right'; // Where the tail connects
  type: BubbleType;
  emotion: EmotionType;
  duration: number; // milliseconds
  priority: 'low' | 'medium' | 'high'; // Affects display order and persistence
  chat_context: ChatContextType;
  timestamp: Date;
  is_visible: boolean;
  animation_state: 'entering' | 'visible' | 'exiting';
  metadata?: {
    is_important?: boolean;
    reply_to_id?: string;
    group_id?: string; // For conversation threads
    sound_effect?: string;
    override_position?: { x: number; y: number };
  };
}

// Conversation history log
export interface ConversationLog {
  id: string;
  context_type: ChatContextType;
  location?: string; // Specific location like "Kitchen Table" or "Training Ground A"
  participants: Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>;
  messages: LoggedMessage[];
  start_time: Date;
  end_time?: Date;
  is_bookmarked: boolean;
  tags?: string[];
  summary?: string; // AI-generated summary for long conversations
}

export interface LoggedMessage {
  id: string;
  speaker_id: string;
  speaker_name: string;
  message: string;
  timestamp: Date;
  bubble_type: BubbleType;
  emotion: EmotionType;
  was_important: boolean;
  reactions?: Array<{
    character_id: string;
    reaction: 'laugh' | 'anger' | 'surprise' | 'agreement' | 'disagreement';
  }>;
}

// Position management
export interface PositionUpdate {
  character_id: string;
  new_position: Partial<CharacterPosition>;
  animate: boolean;
  duration?: number;
}

// Bubble queue management
export interface BubbleQueueItem {
  bubble: Omit<WordBubble, 'id' | 'timestamp' | 'is_visible' | 'animation_state' | 'position'>;
  delay?: number;
  callback?: () => void;
}

// Configuration
export interface WordBubbleConfig {
  max_concurrent_bubbles: number;
  default_duration: number;
  fade_in_duration: number;
  fade_out_duration: number;
  enable_sound: boolean;
  enable_auto_scroll: boolean;
  bubble_spacing: number; // Minimum pixels between bubbles
  history_retention_days: number;
}
