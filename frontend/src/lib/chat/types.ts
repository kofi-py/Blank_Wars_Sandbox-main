// Shared type definitions for all chat systems
// Provides consistent interfaces across the codebase

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'therapist' | 'patient';
  text: string;
  timestamp: number;
  meta?: {
    agent_key?: string;
    character_id?: string;
    chat_type?: string;
    topic?: string;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  type: 'individual' | 'group' | 'monologue';
  participant_ids?: string[];
  context?: {
    character?: Contestant;
    conflicts?: any[];
    team_chemistry?: number;
    [key: string]: any;
  };
  session_history: Message[];
  start_time: number;
  last_activity?: number;
  status?: 'active' | 'paused' | 'ended';
}

import { Contestant } from '@blankwars/types';

export type Character = Contestant;

export interface ChatError {
  code: string;
  message: string;
  context?: {
    chat_type?: string;
    character_id?: string;
    agent_key?: string;
    [key: string]: any;
  };
}

export interface ChatMetrics {
  response_time: number;
  character_count: number;
  prompt_length: number;
  response_length: number;
  capped_length?: number;
  sentence_count?: number;
}