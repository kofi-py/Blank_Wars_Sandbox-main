/**
 * Session Type Narrative Templates
 * Converts session type to scene/role context
 * Values: individual, group
 */

export const SESSION_TYPE_PROSE: Record<string, string> = {
  individual: `This is a one-on-one therapy session. It's just you and the patient in a private setting. The conversation is intimate and focused entirely on this one person. You have their full attention and they have yours. There's no audience, no judgment from peers - just direct therapeutic work.`,

  group: `This is a group therapy session with multiple patients present. Each patient can hear what the others say. Use this dynamic therapeutically - compare their situations, ask them to respond to each other, create healthy pressure through peer awareness. Patients may address you OR each other. The group dynamic means vulnerabilities are exposed to peers, which changes how patients behave.`,
};

export function getSessionTypeProse(sessionType: string): string {
  const prose = SESSION_TYPE_PROSE[sessionType];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown session_type "${sessionType}". Valid values: ${Object.keys(SESSION_TYPE_PROSE).join(', ')}`);
  }
  return prose;
}
