// Wrap LLM output: if role === 'patient' and response looks like therapist-talk,
// prepend a tiny corrective instruction and re-request (or post-edit).
export function enforceRoleOnOutput(role: 'therapist' | 'patient', text: string) {
  if (role === 'patient') {
    const therapisty = /(as your therapist|let's explore|i hear you|have you considered|let's work on)/i;
    if (therapisty.test(text)) {
      return `Stay in patient role. No therapist phrasing.\n\n${text}`;
      // Alternatively: trigger a post-edit or a second pass with a corrective system nudge.
    }
  }
  return text;
}