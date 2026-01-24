import { useState, useEffect } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target_selector?: string;
  highlight_elements?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action_required?: 'click' | 'drag' | 'none';
  next_button_text?: string;
}

export interface TutorialState {
  is_active: boolean;
  current_step: number;
  steps: TutorialStep[];
  has_seen_tutorial: boolean;
}

const TUTORIAL_STORAGE_KEY = 'blank-wars-tutorial-state';

export const useTutorial = () => {
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => {
    // Load tutorial state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            is_active: false,
            current_step: 0,
            steps: [],
            has_seen_tutorial: parsed.has_seen_tutorial || false
          };
        } catch (e) {
          console.warn('Failed to parse tutorial state from localStorage');
        }
      }
    }
    
    return {
      is_active: false,
      current_step: 0,
      steps: [],
      has_seen_tutorial: false
    };
  });

  // Save tutorial state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
        has_seen_tutorial: tutorialState.has_seen_tutorial
      }));
    }
  }, [tutorialState.has_seen_tutorial]);

  const startTutorial = (steps: TutorialStep[]) => {
    setTutorialState(prev => ({
      ...prev,
      is_active: true,
      current_step: 0,
      steps,
      has_seen_tutorial: true
    }));
  };

  const nextStep = () => {
    setTutorialState(prev => {
      if (prev.current_step < prev.steps.length - 1) {
        return { ...prev, current_step: prev.current_step + 1 };
      }
      // Tutorial completed
      return { ...prev, is_active: false, current_step: 0, steps: [] };
    });
  };

  const prevStep = () => {
    setTutorialState(prev => ({
      ...prev,
      current_step: Math.max(0, prev.current_step - 1)
    }));
  };

  const skipTutorial = () => {
    setTutorialState(prev => ({
      ...prev,
      is_active: false,
      current_step: 0,
      steps: [],
      has_seen_tutorial: true
    }));
  };

  const resetTutorial = () => {
    setTutorialState({
      is_active: false,
      current_step: 0,
      steps: [],
      has_seen_tutorial: false
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  };

  const isFirstTimeUser = () => {
    return !tutorialState.has_seen_tutorial;
  };

  const getCurrentStep = () => {
    if (!tutorialState.is_active || tutorialState.steps.length === 0) {
      return null;
    }
    return tutorialState.steps[tutorialState.current_step];
  };

  return {
    tutorialState,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    resetTutorial,
    isFirstTimeUser,
    getCurrentStep,
    is_active: tutorialState.is_active,
    current_stepIndex: tutorialState.current_step,
    total_steps: tutorialState.steps.length
  };
};