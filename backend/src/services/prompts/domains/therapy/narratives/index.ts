/**
 * Therapy Narratives Index
 * Exports all narrative template functions
 */

export { getIntensityProse, INTENSITY_PROSE } from './therapyIntensity';
export { getSessionTypeProse, SESSION_TYPE_PROSE } from './sessionType';
export {
  INTENSITY_THRESHOLDS,
  REWARD_RANGES,
  getThresholdProse,
  getRewardRangesProse,
} from './thresholds';
export type { IntensityThresholds } from './thresholds';
