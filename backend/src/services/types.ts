export type Domain = 'financial' | 'therapy' | 'confessional' | 'social' | 'conflict' | 'kitchen' | 'battle' | 'equipment' | 'skills' | 'kitchen_table' | 'training' | 'real_estate' | 'social_lounge' | 'message_board' | 'group_activities' | 'performance' | 'personal_problems' | 'drama_board' | 'progression' | 'powers' | 'spells' | 'magic';

export type SessionStats = {
  turn_idx: number;
  last_refresh_turn: number;
  high_pressure_streak: number;
  last_session_block_bytes?: number;
};

export type FinancialPayload = {
  profile?: { filing_status?: string; dependents?: number };
  snapshot?: { income_mo?: number; expenses_mo?: number; debt_apr?: number };
  goals?: string[];
  constraints?: string[];
  risk?: 'low' | 'med' | 'high';
  last_plan_id?: string;
  callbacks?: string[];
  fresh?: string[];
  scene_digest?: string;
};

export type TherapyPayload = {
  callbacks?: string[];
  fresh?: string[];
  scene_digest?: string;
  last_user_intent?: string;
};

export type SessionPayload = {
  userchar_id?: string;
  canonical_id?: string;
  stats?: SessionStats;
  financial?: FinancialPayload;
  therapy?: TherapyPayload;
  generic?: { callbacks?: string[]; fresh?: string[]; scene_digest?: string; last_topic?: string };
};