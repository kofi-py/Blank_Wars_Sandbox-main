export const log = Object.freeze({
  reinject: (o: Record<string, unknown>) =>
    console.log('mem_reinject', JSON.stringify(o)),
  refresh: (o: Record<string, unknown>) =>
    console.log('mem_refresh', JSON.stringify(o)),
  patch: (o: Record<string, unknown>) =>
    console.log('mem_patch', JSON.stringify(o)),
  llm_timing: (o: Record<string, unknown>) =>
    console.log('llm_timing', JSON.stringify(o)),
});