/**
 * Scene Type Narrative Templates
 * Converts scene_type values into behavioral guidance prose
 */

export const SCENE_TYPE_PROSE: Record<string, string> = {
  mundane: `This is a mundane, everyday situation. Keep things deadpan and matter-of-fact, but let your unique personality show through how you approach these ordinary topics. The humor comes from you, a legendary character, dealing with ordinary problems.`,

  conflict: `There's underlying tension or disagreement happening. Someone's annoyed, there's a personality clash, or competing needs/preferences are causing friction. This isn't a full-blown argument, but there's definite dramatic tension. Let your personality drive how you handle conflict.`,

  chaos: `Things are escalating! This could be a real argument, emergency situation, or complete breakdown of normal order. Multiple people might be talking over each other, unexpected events are happening, or normal social rules are breaking down. Respond with appropriate intensity while staying true to yourself.`,
};

export function getSceneTypeProse(sceneType: string): string {
  const prose = SCENE_TYPE_PROSE[sceneType];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown scene_type "${sceneType}". Valid values: ${Object.keys(SCENE_TYPE_PROSE).join(', ')}`);
  }
  return prose;
}
