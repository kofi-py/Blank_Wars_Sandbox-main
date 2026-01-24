// ChatFeedback Constants
// Centralizes magic numbers and thresholds used in chat feedback system

export const CHAT_XP_CONSTANTS = {
  // Base XP ranges
  BASE_XP_MIN: 30,
  BASE_XP_MAX: 50,
  
  // Bonus XP amounts
  PROBLEM_RESOLUTION_BONUS: 100,
  
  // Penalty XP ranges
  PENALTY_XP_MIN: -20,
  PENALTY_XP_MAX: -10,
  
  // Thresholds for UI logic
  PROBLEM_RESOLUTION_THRESHOLD: 130, // BASE_XP_MAX + PROBLEM_RESOLUTION_BONUS
  SUCCESS_XP_THRESHOLD: 30, // Minimum XP for a successful interaction
} as const;

export const CHAT_ANIMATION_CONSTANTS = {
  // Animation delays (in seconds)
  BOND_ANIMATION_DELAY: 0.1,
  RESULT_ANIMATION_DELAY: 0.2,
  PROBLEM_RESOLUTION_DELAY: 0.4,
  TIPS_ANIMATION_DELAY: 0.5,
  
  // Animation durations (in seconds)
  DEFAULT_ANIMATION_DURATION: 0.3,
  XP_BADGE_ANIMATION_DELAY: 0.2,
} as const;

export const CHAT_UI_CONSTANTS = {
  // Recent XP tracking
  MAX_RECENT_XP_ENTRIES: 5, // Keep last 5 XP gains in useXPTracker
} as const;

// Helper functions for readability
export const isSuccessfulChat = (xpAwarded: number): boolean => 
  xpAwarded >= CHAT_XP_CONSTANTS.SUCCESS_XP_THRESHOLD;

export const isProblemResolutionBonus = (xpAwarded: number): boolean => 
  xpAwarded >= CHAT_XP_CONSTANTS.PROBLEM_RESOLUTION_THRESHOLD;

export const isPenaltyApplied = (xpAwarded: number): boolean => 
  xpAwarded >= CHAT_XP_CONSTANTS.PENALTY_XP_MIN && 
  xpAwarded <= CHAT_XP_CONSTANTS.PENALTY_XP_MAX;