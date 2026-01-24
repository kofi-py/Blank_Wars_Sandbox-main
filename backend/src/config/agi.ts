// LocalAI config - optional, only used for development test endpoints
// Production uses Open_ai for all real features
export const LOCALAI_BASE_URL = process.env.LOCALAI_URL?.trim() || '';
export const LOCALAI_BASE_URL_RESOLVED = LOCALAI_BASE_URL;