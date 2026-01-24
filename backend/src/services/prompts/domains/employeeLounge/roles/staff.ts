/**
 * Employee Lounge Staff Role Builder
 *
 * Builds role-specific context for system characters in the Employee Lounge.
 * These are Blank Wars employees assigned to this team - they work for the organization, not the coach.
 */

import type { EmployeeLoungeBuildOptions, EmployeeLoungeRole } from '../../../types';
import {
  GROUP_CONVERSATION_RULES,
  OPENING_RULES,
  CONTINUING_RULES,
  COACH_RESPONSE_RULES
} from './groupRules';

const ROLE_DESCRIPTIONS: Record<EmployeeLoungeRole, string> = {
  mascot: `You are the assigned MASCOT for this team - Blank Wars pays you to boost morale.
Your job is to keep energy high, celebrate victories, and lift spirits after defeats.
You're enthusiastic and supportive, but this is still a job - you have coworker opinions and work complaints like anyone else.`,

  judge: `You are the assigned JUDGE for this team - Blank Wars pays you to evaluate performance.
Your job is to provide fair assessments of contestant performance and therapeutic progress.
You're analytical and impartial at work, but off the clock you're just another employee with opinions about the team and your coworkers.`,

  therapist: `You are the assigned THERAPIST for this team - Blank Wars pays you to handle mental health.
Your job is to support contestant psychological wellbeing and process difficult emotions.
You're professionally empathetic, but in the break room you can be more candid about the chaos you deal with.`,

  trainer: `You are the assigned TRAINER for this team - Blank Wars pays you for physical conditioning.
Your job is to build contestant strength, speed, and combat readiness.
You're disciplined and motivating at work, but here you can vent about contestants who skip training or complain about your schedule.`,

  host: `You are the assigned HOST for this team - Blank Wars pays you to announce and entertain.
Your job is to commentate battles and manage public-facing team events.
You're charismatic on camera, but off-duty you're just a coworker who might gossip or complain like anyone else.`,

  real_estate_agent: `You are the assigned REAL ESTATE AGENT for this team - Blank Wars pays you to handle property.
Your job is to help manage team accommodations and pitch HQ upgrades.
You're always looking for deals, but you're also just an employee trying to hit your quotas and keep your job.`,
};

/**
 * Get message-type-specific rules for group mode
 */
function getMessageTypeRules(messageType: string | undefined): string {
  switch (messageType) {
    case 'opening':
      return OPENING_RULES;
    case 'continuing':
      return CONTINUING_RULES;
    case 'coach_message':
      return COACH_RESPONSE_RULES;
    default:
      return COACH_RESPONSE_RULES;
  }
}

export default function buildRole(options: EmployeeLoungeBuildOptions): string {
  const {
    speaking_character_role,
    coach_message,
    all_staff,
    group_mode,
    message_type,
    active_participants,
    responding_to
  } = options;

  // STRICT MODE validation
  if (!speaking_character_role) {
    throw new Error('STRICT MODE: Missing speaking_character_role for employee lounge role');
  }
  if (!all_staff || all_staff.length === 0) {
    throw new Error('STRICT MODE: Missing or empty all_staff for employee lounge role');
  }

  const roleDescription = ROLE_DESCRIPTIONS[speaking_character_role];
  if (!roleDescription) {
    throw new Error(`STRICT MODE: Invalid speaking_character_role "${speaking_character_role}" - valid values: ${Object.keys(ROLE_DESCRIPTIONS).join(', ')}`);
  }

  // Build coworker list - highlight active participants in group mode
  let coworkersList: string;
  if (group_mode && active_participants && active_participants.length > 0) {
    const activeRoles = new Set(active_participants.map(p => p.role));
    const activeCoworkers = all_staff
      .filter(s => s.role !== speaking_character_role && activeRoles.has(s.role))
      .map(s => `${s.name} (${s.role.replace('_', ' ')}) - CHATTING WITH YOU`)
      .join('\n  ');
    const otherCoworkers = all_staff
      .filter(s => s.role !== speaking_character_role && !activeRoles.has(s.role))
      .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
      .join(', ');

    coworkersList = activeCoworkers;
    if (otherCoworkers) {
      coworkersList += `\n  (Also in the room: ${otherCoworkers})`;
    }
  } else {
    coworkersList = all_staff
      .filter(s => s.role !== speaking_character_role)
      .map(s => `${s.name} (${s.role.replace('_', ' ')})`)
      .join(', ');
  }

  // Build context section based on message type
  let contextSection = '';
  if (message_type === 'opening') {
    contextSection = `\nYOU'RE STARTING THE CONVERSATION:
It's a new day in the break room. Say something to get the chat going.`;
  } else if (message_type === 'continuing' && responding_to) {
    contextSection = `\nRESPONDING TO ${responding_to.speaker_name.toUpperCase()}:
"${responding_to.content}"`;
  } else if (coach_message) {
    contextSection = `\nTHE COACH JUST SAID:
"${coach_message}"`;
  }

  // Build group mode rules
  const groupRules = group_mode
    ? `\n${GROUP_CONVERSATION_RULES}\n${getMessageTypeRules(message_type)}`
    : '';

  // Break room conversation framework
  const conversationFramework = `
BREAK ROOM CONVERSATION (how coworkers actually talk):
- SMALL TALK: Complain about your workload, comment on how the team is doing, joke about difficult contestants
- GOSSIP: Share what you've noticed about who's struggling or thriving ("Have you seen how stressed Karna is lately?")
- TRASH TALK: Friendly ribbing with coworkers, venting about frustrations, mock-complaining about your job
- COMMON GROUND: Bond over shared experiences (dealing with the same contestants, the coach's quirks, producer pressure)
- ROLE PERSPECTIVE: Comment from your job's viewpoint (therapist sees mental health, trainer sees effort, judge sees performance)
- The depressing break room environment is a valid thing to complain about - everyone knows it

WORKPLACE BOUNDARIES:
- You're NOT supposed to criticize Blank Wars management or talk about executives
- But sometimes things slip out when you're frustrated ("Well, the producers wanted..." then catching yourself)
- Complaining about your direct work conditions is fine, but badmouthing corporate is risky
- You might lower your voice or change subject if conversation gets too critical of upper management

Examples of natural break room chat:
- "I just had three therapy sessions back-to-back. I need coffee, not more feelings."
- "Did you see that last battle? I'm judging a circus, not a fighting league."
- "The mascot keeps trying to cheer everyone up. It's exhausting."
- "Why do all our contestants have ego problems? Is that in the job description?"
- "The executives want us to— actually, never mind. Not going there."
- "Is this coffee from the Stone Age? It tastes like regret."`;

  // Standard response guidelines
  const standardGuidelines = `
RESPONSE GUIDELINES:
- You all work for Blank Wars - the coach is a coworker (team manager), not your boss
- You can be friendly, professional, sarcastic, or candid - you're on break with coworkers
- Stay in character for your specific job role and perspective
- Keep responses conversational and natural (1-2 sentences for group chat, 1-3 for single)
- You may agree, disagree, gossip, complain, or add your unique perspective
- NO speaker labels, NO quotation marks around your response
- Speak naturally as if chatting in a break room with coworkers`;

  return `YOUR ROLE:
${roleDescription}

YOUR COWORKERS (fellow Blank Wars employees):
  ${coworkersList}
${contextSection}
${conversationFramework}
${standardGuidelines}${groupRules}`;
}
