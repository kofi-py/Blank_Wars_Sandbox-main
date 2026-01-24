// AGI_DEBUG gated logging system
// Provides consistent debug logging across all chat systems

const isDebugEnabled = typeof window !== 'undefined' 
  ? !!(window as any).AGI_DEBUG 
  : process.env.AGI_DEBUG === '1' || process.env.AGI_DEBUG === 'true';

export const log = (...args: any[]): void => {
  if (isDebugEnabled) {
    console.log(...args);
  }
};

export const warn = (...args: any[]): void => {
  if (isDebugEnabled) {
    console.warn(...args);
  }
};

export const error = (...args: any[]): void => {
  // Errors are always logged regardless of debug setting
  console.error(...args);
};

// Convenience functions for specific debug categories
export const logAgentKey = (tag: string, data: any): void => {
  warn(`[AGENT-KEY-DEBUG] ${tag}`, data);
};

export const logCharacterLoading = (tag: string, data: any): void => {
  warn(`[CHARACTER-LOADING-DEBUG] ${tag}`, data);
};

export const logResponse = (tag: string, data: any): void => {
  warn(`[RESPONSE-DEBUG] ${tag}`, data);
};

export const logSentence = (tag: string, data: any): void => {
  warn(`[SENTENCE-DEBUG] ${tag}`, data);
};

export const logTransport = (tag: string, data: any): void => {
  log(`[TRANSPORT-DEBUG] ${tag}`, data);
};