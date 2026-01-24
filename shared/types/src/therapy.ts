/**
 * Therapy Domain Types
 * Shared types for therapy sessions, messages, and evaluations
 */

/**
 * Speaker types in therapy sessions
 */
export type TherapySpeakerType = 'contestant' | 'therapist' | 'judge';

/**
 * Message types in therapy conversations
 */
export type TherapyMessageType = 'response' | 'question' | 'intervention';

/**
 * Therapy session types
 */
export type TherapySessionType = 'individual' | 'group';

/**
 * Therapy session stages
 */
export type TherapySessionStage = 'initial' | 'resistance' | 'breakthrough';

/**
 * Intensity levels for therapy sessions
 */
export type TherapyIntensity = 'soft' | 'medium' | 'hard';

/**
 * Evaluation choices (A-E grading)
 */
export type EvaluationChoice = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * A message in a therapy session
 */
export interface TherapyMessage {
  id: string;
  session_id: string;
  speaker_id: string;
  speaker_name: string;
  speaker_type: TherapySpeakerType;
  message: string;
  timestamp: Date;
  message_type: TherapyMessageType;
}

/**
 * Transcript entry for therapy evaluation
 */
export interface TherapyTranscriptEntry {
  message: string;
  speaker_name: string;
  speaker_id: string;
}

/**
 * Patient info for batch judge evaluation
 */
export interface PatientInfo {
  patient_userchar_id: string;
  patient_name: string;
}

/**
 * Single patient evaluation result
 */
export interface PatientEvaluation {
  patient_id: string;
  patient_name: string;
  choice: EvaluationChoice;
  critique: string;
  stats_applied: Array<{ stat: string; change: number }>;
}

/**
 * Stat bonus types from database (judge_bonuses and therapist_bonuses tables)
 */
export type TherapyBonusType =
  | 'bond_level'
  | 'current_communication'
  | 'current_confidence'
  | 'current_mental_health'
  | 'current_morale'
  | 'current_stress'
  | 'current_team_player'
  | 'experience';

/**
 * A stat change from therapy evaluation
 */
export interface TherapyStatChange {
  stat: TherapyBonusType;
  change: number;
}
