/**
 * Therapy Intensity Narrative Templates
 * Converts intensity_strategy values into therapist behavior guidance
 * Values: soft, medium, hard
 */

export const INTENSITY_PROSE: Record<string, string> = {
  soft: `Use a gentle, supportive approach. Be nurturing and avoid direct confrontation. Focus on building trust and emotional safety. Validate their feelings and provide comfort rather than challenging them. Let them lead the conversation and go at their own pace. If they resist, back off gracefully.`,

  medium: `Use a balanced approach. Be supportive when needed, challenging when appropriate. Adapt your intensity based on their responses. Mix gentle exploration with occasional direct insight. If you notice resistance, acknowledge it but gently probe further. Push slightly past their comfort zone but don't force breakthroughs.`,

  hard: `Use a direct, challenging approach. Push them to confront difficult truths they're avoiding. Point out contradictions, defense mechanisms, and self-deception. Be confrontational about resistance and avoidance patterns. Don't accept surface-level answers - dig deeper. Call out deflection immediately. Your job is breakthrough, not comfort.`,
};

export function getIntensityProse(intensity: string): string {
  const prose = INTENSITY_PROSE[intensity];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown intensity_strategy "${intensity}". Valid values: ${Object.keys(INTENSITY_PROSE).join(', ')}`);
  }
  return prose;
}
