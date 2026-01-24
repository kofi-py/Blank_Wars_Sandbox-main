/**
 * Tutorial domain - Scene context
 *
 * Sets up the tutorial environment where the host guides the new coach through onboarding.
 */

import type { TutorialBuildOptions } from '../../types';
import { TUTORIAL_SLIDES } from './content/slideshow';

export default function buildScene(options: TutorialBuildOptions): string {
  // STRICT MODE validation
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for tutorial scene');
  }

  // If a specific slide is referenced, include that context
  let slideContext = '';
  if (options.slide_id) {
    const slide = TUTORIAL_SLIDES.find(s => s.id === options.slide_id);
    if (slide) {
      slideContext = `

CURRENT SLIDE: ${slide.title}
Your script for this slide: "${slide.hostScript}"

The coach just responded to this slide.`;
    }
  }

  return `# CURRENT SCENE: TUTORIAL SESSION

You are conducting a tutorial session for a new BlankWars coach. This is their first time in the system, and they need guidance on how everything works.

TUTORIAL CONTEXT:
- This is a one-on-one session between you (the host) and the coach (the user)
- You have access to comprehensive tutorial content covering all game mechanics
- Your job is to guide them through the onboarding process and answer their questions
- Be welcoming, clear, and maintain your personality while being helpful${slideContext}

The coach's message: "${options.coach_message}"`;
}
