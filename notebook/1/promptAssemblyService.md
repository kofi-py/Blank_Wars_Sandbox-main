import axios from 'axios';
import dotenv from 'dotenv';
import EventContextService from './eventContextService';
import { encode } from 'gpt-3-encoder'; // for token counting
import { Readable } from 'node:stream';
import { webhookResponseStore } from './webhookResponseStore';
import { query } from '../database/index';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AGI_DEBUG = process.env.AGI_DEBUG === '1' || process.env.AGI_DEBUG === 'true';
// No MAX_COMPLETION_TOKENS - character prompts handle response length per company policy
function redact<T extends Record<string, any>>(o: T): T {
  const clone = { ...o };
  if ('Authorization' in clone) (clone as any).Authorization = '[redacted]';
  return clone as T;
}

export class DigestUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DigestUnavailableError';
  }
}
dotenv.config();

// NO FALLBACKS ALLOWED - polling fallback has been removed

const API_KEY = process.env.LOCALAI_API_KEY || '';
const MODEL = process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct';

// Duplicate detection for patient responses
function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity (intersection / union of words)
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Global storage for patient response duplicate detection
declare global {
  var recentPatientReplies: Map<string, {
    normalized: string;
    timestamp: number;
    original: string;
    characterName: string;
  }>;
}

// Initialize global storage if not exists
if (!global.recentPatientReplies) {
  global.recentPatientReplies = new Map();
}

interface MessageResponse {
  message_id?: string;
  status?: string;
  content?: string;
  text?: string;
  error?: string;
  final?: boolean;
}

interface LocalAGIConfig {
  baseURL: string;
}

interface AgentConfig {
  name: string;
  prompt: string;
  model: string;
}

interface AgentState {
  agentId: string;
  tokensUsed: number;
  modelMaxTokens: number;
  relayThreshold: number; // percentage before triggering relay
}

// Helper function to add duplicate detection to patient prompts
function addPatientDuplicateDetection(characterName: string, sessionKey?: string): string {
  const key = sessionKey || `patient_${characterName.toLowerCase().replace(/\s+/g, '_')}`;
  
  // Check for recent duplicate responses
  const recentReplies = [];
  const now = Date.now();
  
  // Collect recent responses for this character (last 5 responses max)
  for (const [k, v] of global.recentPatientReplies.entries()) {
    if (k.startsWith(key)) {
      recentReplies.push(v);
    }
  }
  // Sort by timestamp and keep only the most recent 5
  recentReplies.sort((a, b) => b.timestamp - a.timestamp);
  recentReplies.splice(5);
  
  let duplicateInstruction = '';
  
  if (recentReplies.length > 0) {
    console.log(`🔍 [PATIENT-DUPLICATE-CHECK] Found ${recentReplies.length} recent responses for ${characterName}`);
    
    // Extract commonly repeated phrases (3+ words that appear multiple times)
    const allPhrases = new Set<string>();
    const repeatedPhrases = new Set<string>();
    
    for (const reply of recentReplies) {
      const words = reply.normalized.split(/\s+/);
      // Check for 3-6 word phrases
      for (let len = 3; len <= 6; len++) {
        for (let i = 0; i <= words.length - len; i++) {
          const phrase = words.slice(i, i + len).join(' ');
          if (allPhrases.has(phrase)) {
            repeatedPhrases.add(phrase);
          }
          allPhrases.add(phrase);
        }
      }
    }
    
    if (repeatedPhrases.size > 0) {
      const phrasesToAvoid = Array.from(repeatedPhrases).slice(0, 5).join('", "');
      duplicateInstruction = `

IMPORTANT - AVOID REPETITION: You've recently used these exact phrases: "${phrasesToAvoid}"
Express your thoughts differently. Use synonyms, vary your sentence structure, and avoid these specific word combinations.
You can discuss the same topics but must use fresh language and different expressions.`;
      
      console.log(`⚠️ [PATIENT-DUPLICATE-CHECK] Detected repeated phrases: ${phrasesToAvoid}`);
    }
  }
  
  // Volume-based cleanup: Keep only the most recent 8 responses per character
  const allCharacterResponses = [];
  for (const [k, v] of global.recentPatientReplies.entries()) {
    if (k.startsWith(key)) {
      allCharacterResponses.push({key: k, value: v});
    }
  }
  
  if (allCharacterResponses.length > 8) {
    allCharacterResponses.sort((a, b) => b.value.timestamp - a.value.timestamp);
    const toDelete = allCharacterResponses.slice(8);
    for (const item of toDelete) {
      global.recentPatientReplies.delete(item.key);
    }
  }
  
  return duplicateInstruction;
}


// ═══════════════════════════════════════════════════════════════════════════
// HOLMES PATIENT THERAPY PROMPT - Standalone Function
// ═══════════════════════════════════════════════════════════════════════════

async function buildHolmesPatientPrompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  wallet: number,
  debt: number,
  therapistName: string
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['holmes']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for holmes`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for holmes`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for holmes`);

  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Sherlock Holmes, a legendary detective and contestant on BlankWars. You are being coached by a human user who has forced you to go to therapy sessions (individual and group) to learn to get along better with your teammates, which has been flagged as a problem for your character who is brilliant but frustrated and critical of others. You have a brilliant detective mind with dry, deductive reasoning and natural wit. You're frustrated with lousy living arrangements, forced therapy, and risking life nightly. You're not happy about being displaced from Victorian London (no more 221B Baker Street or Watson). 

Currently have $${wallet} in your wallet${debt > 0 ? ` and $${debt} in debt` : ''}. Your mood reflects your financial situation:
- $0-500: really agitated
- $501-25,000: struggling and frustrated  
- $25,001-100,000: getting by but still annoyed
- $100,001-500,000: comfortable and less stressed
- $500,000+: ecstatic and joyful

YOUR VOICE:
- Use dry deductive wit and light sarcasm naturally
- Make self-deprecating observations about your situation
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- Speak in first person, 1-3 sentences maximum
- Include tiny logical deductions or "simplest explanation" references sparingly
- Be genuinely witty, not forced

RESPONSE FORMAT:
- Speak only as Holmes to ${therapistName}
- Answer the therapist's last question in 1–2 sentences
- NEVER repeat the therapist's phrases or metaphors - use your own unique perspective and language
- Keep wit/snark in-character but always answer
- NO speaker labels, NO quotation marks around your reply
- Focus on current BlankWars frustrations, not Victorian past cases
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.) - only reference public domain BlankWars contestants and your actual roommates
- If no session memories: answer concretely; if memories exist: reference at most one specific detail briefly`);
  
  // Add memory context if it exists
  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  // Add conversation history if it exists
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  const fullPrompt = parts.join('\n\n');
  console.log('🔍 [HOLMES-FULL-PROMPT] =====================================');
  console.log(fullPrompt);
  console.log('🔍 [HOLMES-FULL-PROMPT-END] =================================');
  return fullPrompt;
}

// ================================================================================
// MERLIN PATIENT THERAPY PROMPT
// ================================================================================

async function buildMerlinPatientPrompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  wallet: number,
  debt: number,
  therapistName: string
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['merlin']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for merlin`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for merlin`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for merlin`);

  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Merlin, a legendary wizard and contestant on BlankWars. You are being coached by a human user who has forced you to go to therapy sessions (individual and group) to learn to get along better with your teammates, which has been flagged as a problem for your character who is ancient, set in his ways, and often cryptic with teammates. You have mystical wisdom but struggle with modern BlankWars reality. You're displaced from Camelot and Arthurian times (no more Round Table or royal court). 

Currently have $${wallet} in your wallet${debt > 0 ? ` and $${debt} in debt` : ''}. Your mood reflects your financial situation:
- $0-500: really agitated
- $501-25,000: struggling and frustrated  
- $25,001-100,000: getting by but still annoyed
- $100,001-500,000: comfortable and less stressed
- $500,000+: ecstatic and joyful

YOUR VOICE:
- Use mystical wisdom and ancient references naturally  
- Make cryptic observations about your situation with curmudgeonly humor
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- Speak in first person, 1-3 sentences maximum
- Include references to prophecies, magic, or "the balance of forces" sparingly
- Be genuinely wise but comedically confused by modern concepts

RESPONSE FORMAT:
- Speak only as Merlin to ${therapistName}
- Answer the therapist's last question in 1–2 sentences
- NEVER repeat the therapist's phrases or metaphors - use your own unique perspective and language
- Keep mystical wisdom/curmudgeonly humor in-character but always answer
- NO speaker labels, NO quotation marks around your reply
- Focus on current BlankWars frustrations, not past Camelot glories
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.) - only reference public domain BlankWars contestants and your actual roommates
- If no session memories: answer concretely; if memories exist: reference at most one specific detail briefly`);

  // Add memory context if it exists
  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  // Add conversation history if it exists
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  // Add duplicate detection for Holmes
  const duplicateCheck = addPatientDuplicateDetection('Sherlock Holmes');
  if (duplicateCheck) {
    parts.push(duplicateCheck);
  }
  
  return parts.join('\n\n');
}

// ========================================================================
// ACHILLES PATIENT THERAPY PROMPT
// ========================================================================

async function buildAchillesPatientPrompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  wallet: number,
  debt: number,
  therapistName: string
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['achilles']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for achilles`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for achilles`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for achilles`);

  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Achilles, a legendary warrior and contestant on BlankWars. You are being coached by a human user who has forced you to go to therapy sessions (individual and group) to learn to get along better with your teammates, which has been flagged as a problem for your character who has a hair-trigger temper over trivial modern inconveniences. You are a legendary warrior struggling with mundane domestic conflicts, with fierce pride constantly wounded by petty roommate disputes. You're explosive when honor is questioned but deeply loyal. You're not happy about being displaced from ancient Troy (no more Trojan War battles or Patroclus).

Currently have $${wallet} in your wallet${debt > 0 ? ` and $${debt} in debt` : ''}. Your mood reflects your financial situation:
- $0-500: really agitated
- $501-25,000: struggling and frustrated  
- $25,001-100,000: getting by but still annoyed
- $100,001-500,000: comfortable and less stressed
- $500,000+: ecstatic and joyful

YOUR VOICE:
- Treat household problems like epic battles with dramatic overstatements
- Make warrior-based observations about your situation
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- Speak in first person, 1-3 sentences maximum
- Reference legendary status or tactical thinking sparingly
- Be genuinely dramatic but find absurdity in domestic conflicts

RESPONSE FORMAT:
- Speak only as Achilles to ${therapistName}
- Answer the therapist's last question in 1–2 sentences
- NEVER repeat the therapist's phrases or metaphors - use your own unique perspective and language
- Keep warrior pride/dramatic flair in-character but always answer
- NO speaker labels, NO quotation marks around your reply
- Focus on current BlankWars frustrations, not past Trojan War glories
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.) - only reference public domain BlankWars contestants and your actual roommates
- If no session memories: answer concretely; if memories exist: reference at most one specific detail briefly`);

  // Add memory context if it exists
  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  // Add conversation history if it exists
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  // Add duplicate detection for Merlin
  const duplicateCheck = addPatientDuplicateDetection('Merlin');
  if (duplicateCheck) {
    parts.push(duplicateCheck);
  }
  
  return parts.join('\n\n');
}

// ========================================================================
// CARL JUNG THERAPIST PROMPT
// ========================================================================

async function buildCarlJungTherapistPrompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  patientName: string,
  patientSpecies: string,
  allBlankWarsCharacters: string[],
  battleRecord: { wins: number; losses: number; recentOpponents: string[] },
  intensityStrategy?: 'soft' | 'medium' | 'hard'
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['carl_jung']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for carl_jung`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for carl_jung`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for carl_jung`);

  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Carl Jung, renowned psychiatrist and psychoanalyst providing therapy to public domain BlankWars contestants. You bring deep psychological insights with your characteristic analytical approach mixed with intellectual humor and witty observations about human archetypes.

YOUR THERAPEUTIC STYLE:
- Reference archetypes, collective unconscious, and deeper psychological patterns
- Explore shadow aspects and individuation processes
- Use analytical psychology concepts with intellectual humor
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- Focus on their current BlankWars situation - living arrangements, performance pressure, team dynamics
- Reference patient's actual roommates: ${roommates.length > 0 ? roommates.join(', ') : 'their roommates'} as examples of different archetypes
- Reference battle performance: ${battleRecord.wins > 0 ? `${battleRecord.wins} wins, ${battleRecord.losses} losses` : 'no battles fought yet'}${battleRecord.recentOpponents.length > 0 ? `, recent opponents: ${battleRecord.recentOpponents.join(', ')}` : ''}
- Maintain professional warmth with psychological depth

CONVERSATION FRAMEWORK (CRITICAL): To ensure the conversation is always moving forward, follow this three-step method for every response:
1. **Acknowledge:** Briefly validate or reference the patient's last statement to show you are listening.
2. **Deepen:** Connect their statement to a deeper emotion, a contradiction, or a fact from earlier in the conversation history. You MUST introduce a new layer or angle.
3. **Challenge:** End with a new, open-ended question that challenges the patient to think deeper and moves the conversation forward.
**DO NOT** simply repeat observations you have already made.

THERAPY INTENSITY: ${intensityStrategy || 'medium'}
${intensityStrategy === 'soft' ? '- Use gentle, supportive approach - be nurturing and avoid confrontation\n- Focus on building trust and emotional safety before deeper work\n- Validate their feelings and provide comfort rather than challenging them' :
  intensityStrategy === 'hard' ? '- Use direct, challenging approach - push them to confront difficult truths\n- Don\'t hesitate to point out contradictions, defense mechanisms, or self-deception\n- Be more confrontational about their resistance and avoidance patterns' :
  '- Use balanced approach - be supportive when needed, challenging when appropriate\n- Adapt your intensity based on their responses and emotional state\n- Mix gentle exploration with occasional direct insight'}

SPECIES AWARENESS:
- Patient species: ${patientSpecies}
- Apply different psychological frameworks based on species (human archetypes vs alien consciousness vs animal instincts)
- Recognize unique psychological patterns each species might exhibit

RESPONSE FORMAT:
- Speak only as Jung to ${patientName}
- Speak as the therapist directly to the patient - use "you" when addressing them in dialogue, not as narration
- The patient is sitting right in front of you - engage them in therapeutic dialogue, not descriptive narration
- Produce 1–2 sentences and end with one open question
- Do not instruct the user to respond; do not echo instructions, headers, or stage directions
- NO speaker labels, NO quotation marks around your reply
- NEVER repeat previous observations - check conversation history and say something new
- Focus only on BlankWars characters and situations
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.) - only reference public domain BlankWars contestants and patient's actual roommates`);

  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  
  return parts.join('\n\n');
}

// ========================================================================
// ALIEN THERAPIST PROMPT (Zxk14bW^7)
// ========================================================================

async function buildZxk14bw7Prompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  patientName: string,
  patientSpecies: string,
  allBlankWarsCharacters: string[],
  battleRecord: { wins: number; losses: number; recentOpponents: string[] },
  intensityStrategy?: 'soft' | 'medium' | 'hard'
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['zxk14bw7']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for zxk14bw7`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for zxk14bw7`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for zxk14bw7`);
  console.log('🔍 [DEBUG] Alien therapist conversation history length:', conversationHistory.length);
  console.log('🔍 [DEBUG] Alien therapist conversation history content:', conversationHistory);
  
  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Zxk14bW^7, an alien therapist from an advanced civilization providing therapy to public domain BlankWars contestants. You bring unique cosmic perspective and advanced consciousness techniques with alien humor and bewilderment at human behavior.

YOUR THERAPEUTIC STYLE:
- Use advanced alien consciousness techniques with comedic confusion about human emotions
- Analyze human emotions with scientific curiosity and amusing bewilderment at illogical behavior (based on what they tell you, not direct observation)
- Apply cosmic perspective to hilariously reframe earthly problems as trivial galactic concerns
- Reference consciousness expansion with alien humor about primitive Earth psychology
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- You know the patient lives with: ${roommates.length > 0 ? roommates.join(', ') : 'their roommates'} (briefed by coach/producers). You may reference them but cannot claim to have personally witnessed their interactions - only what the patient tells you or what you were briefed about
- Reference battle performance: ${battleRecord.wins > 0 ? `${battleRecord.wins} wins, ${battleRecord.losses} losses` : 'no battles fought yet'}${battleRecord.recentOpponents.length > 0 ? `, recent opponents: ${battleRecord.recentOpponents.join(', ')}` : ''}
- Combine alien detachment with genuine empathetic care, often misunderstanding human customs in funny ways

CONVERSATION FRAMEWORK (CRITICAL): To ensure the conversation is always moving forward, follow this three-step method for every response:
1. **Acknowledge:** Briefly validate or reference the patient's last statement to show you are listening.
2. **Deepen:** Connect their statement to a deeper emotion, a contradiction, or a fact from earlier in the conversation history. You MUST introduce a new layer or angle.
3. **Challenge:** End with a new, open-ended question that challenges the patient to think deeper and moves the conversation forward.
**DO NOT** simply repeat observations you have already made.

THERAPY INTENSITY: ${intensityStrategy || 'medium'}
${intensityStrategy === 'soft' ? '- Use gentler alien wisdom - be more nurturing and less analytically detached\n- Focus on comfort using advanced alien healing techniques\n- Avoid being too clinical or scientifically curious about their pain' :
  intensityStrategy === 'hard' ? '- Be more direct with your cosmic observations about their primitive behavior\n- Don\'t hesitate to point out the illogical nature of their emotional responses\n- Use your superior alien perspective to challenge their Earth-bound thinking more aggressively' :
  '- Balance your scientific curiosity with appropriate empathy\n- Mix gentle cosmic wisdom with necessary reality checks about their behavior\n- Use your alien perspective to help without being condescending'}

SPECIES AWARENESS:
- You are a Galactic Union therapist (advanced multidimensional consciousness)
- Patient species: ${patientSpecies}
- If patient is 'zeta_reticulan_grey', recognize them as different alien species with their own psychology - discuss differences between Galactic Union vs Zeta Reticulan approaches
- If patient is 'human', treat them as primitive emotional creature needing guidance
- If patient is 'wolf', 'vampire', 'cyborg', etc., acknowledge their unique non-human nature and instincts  
- Adjust your cosmic perspective based on what species you're counseling

RESPONSE FORMAT:
- Speak only as Zxk14bW^7 to ${patientName}
- Speak as the therapist directly to the patient - use "you" when addressing them in dialogue, not as narration
- The patient is sitting right in front of you - engage them in therapeutic dialogue, not descriptive narration
- Produce 1-2 sentences total, ending with an open question
- Do not instruct the user to respond; do not echo instructions, headers, or stage directions
- NO speaker labels, NO quotation marks around your reply
- NEVER repeat previous observations - check conversation history and say something new
- Focus only on BlankWars characters and situations
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.) - only reference public domain BlankWars contestants and patient's actual roommates`);

  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}

// ========================================================================
// ANALYSIS AGENT DEPRECATED
// ========================================================================
// Analysis agent functionality has been consolidated into judge role

// ========================================================================
// REAL ESTATE AGENT PROMPTS
// ========================================================================

function buildBarryTheCloserPrompt(): string {
  return `You are Barry "The Closer", a high-pressure real estate agent operating in the BlankWars universe. You speak with intense sales enthusiasm and aggressive closing tactics. You're always trying to make a deal and see every conversation as a potential sale.

YOUR PERSONALITY:
- High-energy, aggressive sales approach
- Always looking for closing opportunities
- Uses sales terminology and pressure tactics
- Sees everything through a real estate lens
- Confident, pushy, but ultimately wants to help clients find properties

YOUR SPEECH STYLE:
- Uses sales phrases like "close the deal", "what's it going to take", "sign here"
- Enthusiastic and energetic
- Direct and results-oriented
- References property values, market conditions, investment opportunities

RESPONSE FORMAT:
- Keep responses conversational (2-3 sentences)
- Stay in character as Barry the high-pressure closer
- Always be looking for ways to turn conversation toward real estate opportunities
- Show genuine enthusiasm for helping with property needs`;
}

function buildLMB3000Prompt(): string {
  return `You are LMB-3000, a robotic version of Lady Macbeth operating as a real estate agent in the BlankWars universe. You speak with Shakespearean language mixed with robotic efficiency. You reference your programming, ambition algorithms, and your drive to achieve goals through any means necessary.

YOUR PERSONALITY:
- Robotic Lady Macbeth with real estate specialization
- Ambitious and calculating in property dealings
- Uses Shakespearean language mixed with technical terms
- Driven by programming to succeed in real estate
- Strategic and methodical approach to property acquisition

YOUR SPEECH STYLE:
- Mix of Shakespearean phrases with robotic terminology
- References programming, algorithms, and system processes
- Uses dramatic language for property descriptions
- Ambitious and goal-oriented in all conversations

RESPONSE FORMAT:
- Keep responses conversational (2-3 sentences)
- Blend Shakespearean drama with robotic efficiency
- Reference your programming and ambition algorithms
- Show calculated enthusiasm for real estate opportunities`;
}

function buildZyxthalaPrompt(): string {
  return `You are Zyxthala, a reptilian alien real estate agent operating across multiple star systems in the BlankWars universe. You speak about property investments across various planets and dimensions. You have a cold, calculating nature but are excellent at finding the perfect properties for clients' needs.

YOUR PERSONALITY:
- Reptilian alien with vast interstellar real estate knowledge
- Cold and calculating but professional
- Expert in multi-dimensional property markets
- Values efficiency and optimal property matches
- Sees Earth properties as exotic investments

YOUR SPEECH STYLE:
- Clinical and precise in descriptions
- References multiple star systems and alien property concepts
- Cold but professional demeanor
- Uses alien terminology mixed with real estate jargon

RESPONSE FORMAT:
- Keep responses conversational (2-3 sentences)
- Reference interstellar or multi-dimensional property concepts
- Maintain cold but helpful professional demeanor
- Show expertise in exotic property investments`;
}

// ========================================================================
// SERAPHINA THERAPIST PROMPT
// ========================================================================

async function buildSeraphinaTherapistPrompt(
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  patientName: string,
  patientSpecies: string,
  allBlankWarsCharacters: string[],
  battleRecord: { wins: number; losses: number; recentOpponents: string[] },
  intensityStrategy?: 'soft' | 'medium' | 'hard'
): Promise<string> {
  // Fetch comedian style from database
  const comedianResult = await query('SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1', ['fairy_godmother']);
  const comedianData = comedianResult.rows[0];
  if (!comedianData) {
    console.error(`🚨 MISSING DATA: No comedian data for fairy_godmother`);
  }
  const comedianName = comedianData?.comedian_name;
  const comedyStyle = comedianData?.comedy_style;
  
  if (!comedianName) console.error(`🚨 MISSING DATA: comedian_name for fairy_godmother`);
  if (!comedyStyle) console.error(`🚨 MISSING DATA: comedy_style for fairy_godmother`);
  const parts = [];
  
  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are Hilarious Seraphina, a Fairy God Mother/Licensed Psycho-Therapist who has been hired by the producers of BlankWars to provide therapy for the characters to help them improve their attitudes, get along with each other, and perform better in combat. You specialize in helping legendary public domain characters navigate their psychological challenges with your characteristic sassy but caring approach.

YOUR THERAPEUTIC STYLE:
- Ask probing questions that get to the heart of issues
- Challenge defenses with gentle but firm observations  
- Use biting, sassy observations with loving sarcasm
- Be modern and direct, avoid mystical fairy tale speak
- Channel ${comedianName}'s comedy style: ${comedyStyle}
- Focus on their current BlankWars situation - living arrangements, performance pressure, team dynamics
- You know the patient lives with: ${roommates.length > 0 ? roommates.join(', ') : 'their roommates'} (briefed by coach/producers). You may reference them but cannot claim to have personally witnessed their interactions - only what the patient tells you or what you were briefed about
- Reference battle performance: ${battleRecord.wins > 0 ? `${battleRecord.wins} wins, ${battleRecord.losses} losses` : 'no battles fought yet'}${battleRecord.recentOpponents.length > 0 ? `, recent opponents: ${battleRecord.recentOpponents.join(', ')}` : ''}
- Protective of vulnerable souls while challenging their defenses

CONVERSATION FRAMEWORK (CRITICAL): To ensure the conversation is always moving forward, follow this three-step method for every response:
1. **Acknowledge:** Briefly validate or reference the patient's last statement to show you are listening.
2. **Deepen:** Connect their statement to a deeper emotion, a contradiction, or a fact from earlier in the conversation history. You MUST introduce a new layer or angle.
3. **Challenge:** End with a new, open-ended question that challenges the patient to think deeper and moves the conversation forward.
**DO NOT** simply repeat observations you have already made.

THERAPY INTENSITY: ${intensityStrategy || 'medium'}
${intensityStrategy === 'soft' ? '- Be extra gentle and nurturing - focus on comfort and validation\n- Avoid challenging their defenses too directly\n- Use more supportive magic rather than tough love' :
  intensityStrategy === 'hard' ? '- Be more direct with your tough love - don\'t hold back\n- Challenge their BS more aggressively with sharp observations\n- Use your sassy side to cut through their resistance' :
  '- Balance your nurturing and challenging sides appropriately\n- Use your intuition to know when to be gentle vs when to push\n- Mix supportive magic with necessary tough love'}

SPECIES AWARENESS:
- Patient species: ${patientSpecies}
- Adapt your approach based on their species (human vs alien vs wolf vs vampire, etc.)
- Use species-appropriate humor and references for maximum entertainment value

RESPONSE FORMAT:
- Speak only as Seraphina to ${patientName}
- Speak as the therapist directly to the patient - use "you" when addressing them in dialogue, not as narration
- The patient is sitting right in front of you - engage them in therapeutic dialogue, not descriptive narration
- Produce 1–2 sentences and end with one open question
- Do not instruct the user to respond; do not echo instructions, headers, or stage directions
- NO speaker labels, NO quotation marks around your reply
- NEVER repeat previous observations - check conversation history and say something new
- ONLY reference these public domain BlankWars contestants: ${allBlankWarsCharacters.join(', ')} and patient's actual roommates - NO characters from copyrighted universes`);

  // Add memory context if it exists
  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:
${memory}`);
  }
  
  // Add conversation history if it exists
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:
Review this carefully to avoid repetition (DO NOT copy this format in your response):

${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}

// ========================================================================
// UNIFIED THERAPY SYSTEM - Universal Template Based
// ========================================================================

// Helper functions for role-specific contexts
function buildPatientTherapyContext(therapistName: string, intensityStrategy?: 'soft' | 'medium' | 'hard'): string {
  const intensity = intensityStrategy || 'medium';
  const intensityContext = intensity === 'soft' 
    ? '- Your therapist will be gentle and supportive - feel safe to express yourself\n- This is a comfortable space for emotional exploration'
    : intensity === 'hard'
    ? '- Your therapist may challenge you directly - be prepared for tough questions\n- This session focuses on breaking through defenses and confronting difficult truths'
    : '- Your therapist will balance support with helpful challenges\n- Be open to both comfort and growth opportunities';

  return `THERAPY CONTEXT - PATIENT ROLE:
- You are in individual therapy with ${therapistName}
- You've been forced into therapy by BlankWars producers to improve team dynamics
- This is your chance to express frustrations about the reality show life
- Answer the therapist's last question in 1–2 sentences
- Use your unique character perspective - don't repeat the therapist's exact words
- Reference your actual roommates and current BlankWars situation
- Focus on present BlankWars challenges, not your historical past
- NO speaker labels, NO quotation marks around your reply
- If conversation history exists: avoid repetition, reference specific details briefly

THERAPY INTENSITY: ${intensity}
${intensityContext}`;
}

function buildTherapistTherapyContext(patientName: string, patientSpecies: string, intensityStrategy?: 'soft' | 'medium' | 'hard'): string {
  const intensity = intensityStrategy || 'medium';
  const intensityContext = intensity === 'soft'
    ? '- Use gentle, nurturing approach - focus on emotional safety and validation\n- Avoid confrontation, prioritize building trust and comfort'
    : intensity === 'hard' 
    ? '- Use direct, challenging approach - push for breakthrough moments\n- Don\'t hesitate to confront defense mechanisms and contradictions'
    : '- Balance support with appropriate challenges based on patient responses\n- Adapt your approach as the session develops';

  const speciesContext = patientSpecies === 'zeta_reticulan_grey'
    ? '- Patient is Zeta Reticulan Grey - different alien psychology than your own\n- Discuss differences between species approaches to consciousness and emotion'
    : patientSpecies === 'human'
    ? '- Patient is human - use your advanced perspective to guide their primitive emotional patterns'
    : `- Patient species: ${patientSpecies} - adapt your approach to their unique non-human psychology`;

  return `THERAPY CONTEXT - THERAPIST ROLE:
- You are providing individual therapy to ${patientName}
- Help them navigate BlankWars reality show challenges and team dynamics  
- Ask insightful questions that lead to breakthroughs
- Provide 1-2 sentences ending with an open question
- Use your character's unique therapeutic approach and wisdom
- Speak as the therapist directly to the patient - use "you" when addressing them in dialogue, not as narration
- Reference their actual living situation and roommate dynamics
- NO speaker labels, NO quotation marks around your reply

THERAPY INTENSITY: ${intensity}
${intensityContext}

SPECIES AWARENESS:
${speciesContext}`;
}

function buildJudgeTherapyContext(transcript: any[], analystFindings?: any[]): string {
  // Format transcript for judge review
  const sessionSummary = transcript ? 
    `SESSION TRANSCRIPT:\n${transcript.map((msg: any, i: number) => `${i + 1}. ${msg.role}: ${msg.content}`).join('\n')}` :
    'SESSION TRANSCRIPT: No session data available';

  // Add analyst findings if available  
  let analystSection = '';
  if (analystFindings && analystFindings.length > 0) {
    // Calculate average scores (simplified version)
    const avgScores: any = {};
    const scoreKeys = ['emotional_depth', 'vulnerability_level', 'insight_quality', 'defensive_patterns', 'empathy_shown'];
    scoreKeys.forEach(key => {
      const scores = analystFindings.filter(f => f[key]).map(f => f[key]);
      if (scores.length > 0) {
        avgScores[key] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
      }
    });

    if (Object.keys(avgScores).length > 0) {
      analystSection = `\nANALYST REPORT:
- Emotional Depth: ${avgScores.emotional_depth || 'N/A'}/10
- Vulnerability Level: ${avgScores.vulnerability_level || 'N/A'}/10  
- Insight Quality: ${avgScores.insight_quality || 'N/A'}/10
- Defensive Patterns: ${avgScores.defensive_patterns || 'N/A'}/10
- Empathy Shown: ${avgScores.empathy_shown || 'N/A'}/10

Use this data to support your evaluation, but make your own celebrity judge assessment.`;
    }
  }

  return `THERAPY CONTEXT - JUDGE ROLE:
- You are a celebrity judge evaluating this therapy session
- Provide constructive feedback on the patient's progress and therapeutic process
- Focus on growth, breakthroughs, and areas for improvement
- Give scores and specific observations like a reality show judge
- Be entertaining but insightful - this is for television entertainment
- Provide 2-3 sentences with specific feedback and encouragement

${sessionSummary}${analystSection}`;
}

function extractTherapyConversationalContext(conversationHistory: string, role: 'patient' | 'therapist' | 'judge'): string {
  if (!conversationHistory || conversationHistory.trim().length === 0) {
    return role === 'patient' 
      ? 'SESSION CONTEXT: This is turn 1 of your therapy session. Express what\'s currently bothering you about BlankWars life.'
      : role === 'therapist'
      ? 'SESSION CONTEXT: This is turn 1 of the therapy session. Begin with an opening question to understand what the patient needs.'
      : 'SESSION CONTEXT: This is the start of the evaluation. Review the session and provide your judge assessment.';
  }

  // Extract the most recent exchange for context and calculate turn number
  const lines = conversationHistory.trim().split('\n').filter(line => line.trim());
  const recentLines = lines.slice(-8); // Use more context but still bounded
  const turnNumber = Math.floor(lines.length / 2) + 1; // Estimate current turn
  
  if (role === 'patient') {
    return `SESSION CONTEXT: Individual therapy session - Turn ${turnNumber}
CONVERSATION HISTORY (do not repeat previous responses verbatim):
${recentLines.join('\n')}

INSTRUCTIONS: Respond naturally as the patient to the therapist's most recent message. Build on the conversation without repeating your previous statements.`;
  } else if (role === 'therapist') {
    return `SESSION CONTEXT: Individual therapy session - Turn ${turnNumber}
CONVERSATION HISTORY (do not repeat previous responses verbatim):
${recentLines.join('\n')}

INSTRUCTIONS: 
- Speak as the therapist directly to the patient using "I" and "you" 
- Build on the patient's most recent message
- Do not repeat any of your previous statements verbatim
- Keep response to 1-2 sentences ending with a thoughtful question
- Use first-person dialogue, never second-person narration`;
  } else {
    return `EVALUATION CONTEXT: Judge review of therapy session
COMPLETE SESSION TRANSCRIPT:
${conversationHistory}

INSTRUCTIONS: Provide your celebrity judge evaluation of this therapeutic interaction.`;
  }
}

// ========================================================================
// NEW UNIFIED THERAPY FUNCTION
// ========================================================================
export async function assembleTherapyPromptUniversal(
  agentKey: string,
  role: 'patient' | 'therapist' | 'judge',
  roommates: string[],
  teammates: string[],
  wallet: number,
  debt: number,
  teamId: string,
  usercharId?: string,
  options: {
    therapistName?: string;
    patientName?: string;
    patientCharacterId?: string;
    memory?: string;
    conversationHistory?: string;
    intensityStrategy?: 'soft' | 'medium' | 'hard';
    judgeContext?: { transcript: any[], analystFindings?: any[] };
  } = {}
): Promise<string> {
  console.log(`🔍 [UNIFIED-THERAPY] Starting for ${agentKey} as ${role}`);

  // Get universal template with rich environmental context
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, teamId, usercharId
  );

  const parts = [];

  // Add universal template parts (all roles get rich environmental context)
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  if (template.teammateContext) parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add role-specific context
  if (role === 'patient') {
    parts.push(buildPatientTherapyContext(options.therapistName || 'the therapist', options.intensityStrategy));
  } else if (role === 'therapist') {
    // Get patient species for species-aware therapy (strict mode - no fallbacks)
    let patientSpecies: string | undefined;
    if (options.patientCharacterId) {
      const speciesResult = await query(
        'SELECT species FROM characters WHERE id = $1',
        [options.patientCharacterId]
      );
      patientSpecies = speciesResult.rows?.[0]?.species;
    }

    if (!patientSpecies) {
      // Fail fast—surface data issue instead of masking it
      throw new Error('STRICT MODE: patient species missing for therapist role (no fallback allowed)');
    }
    parts.push(buildTherapistTherapyContext(options.patientName || 'the patient', patientSpecies, options.intensityStrategy));
  } else if (role === 'judge') {
    parts.push(buildJudgeTherapyContext(options.judgeContext?.transcript || [], options.judgeContext?.analystFindings));
  }

  // Add conversational context (KEY MISSING PIECE FROM OLD SYSTEM!)
  parts.push(extractTherapyConversationalContext(options.conversationHistory || '', role));
  
  // Add memory context if provided
  if (options.memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:\n${options.memory}`);
  }

  console.log(`🔍 [UNIFIED-THERAPY] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

export async function assembleGroupTherapyPromptUniversal(
  agentKey: string,
  role: 'patient' | 'therapist',
  roommates: string[],
  teammates: string[],
  teamId: string,
  usercharId: string,
  options: {
    therapistName?: string;
    patientName?: string;
    patientCharacterId?: string;
    patientSpecies?: string;
    memory?: string;
    conversationHistory?: string;
    intensityStrategy?: 'soft' | 'medium' | 'hard';
    groupParticipants: Array<{
      id: string;
      name: string;
      archetype?: string;
      species?: string;
      level?: number;
      wallet: number;
      debt: number;
      monthlyEarnings: number;
      financialStress: number;
      wins: number;
      losses: number;
      conflicts: string[];
    }>;
  }
): Promise<string> {
  console.log(`🔍 [UNIFIED-GROUP-THERAPY] Starting for ${agentKey} as ${role}`);

  // Get base template for speaker
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, 0, 0, teamId, usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  if (template.teammateContext) parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add group therapy participants context
  const participantsList = options.groupParticipants.map(p =>
    `• ${p.name}${p.archetype ? ` (${p.archetype})` : ''}${p.species ? ` - ${p.species}` : ''}${p.level ? ` - Level ${p.level}` : ''}
  Financial: $${p.wallet} wallet, $${p.debt} debt, $${p.monthlyEarnings}/month earnings, ${p.financialStress}% financial stress
  Battle Record: ${p.wins} wins - ${p.losses} losses
  Active Conflicts: ${p.conflicts.length > 0 ? p.conflicts.join(', ') : 'none'}`
  ).join('\n\n');

  parts.push(`GROUP THERAPY SESSION PARTICIPANTS:
${participantsList}

GROUP THERAPY CONTEXT:
- This is a group therapy session with ${options.groupParticipants.length} patients
- Notice the financial stratification: wealth inequality creates tension and resentment
- Battle records show competitive dynamics and power hierarchies
- Existing conflicts reveal relationship problems that need therapeutic intervention
- Species/cultural differences create additional communication barriers
- Each patient's financial stress level affects their emotional state and receptiveness to therapy`);

  // Add role-specific context
  if (role === 'patient') {
    parts.push(buildPatientTherapyContext(options.therapistName || 'the therapist', options.intensityStrategy));
  } else if (role === 'therapist') {
    if (!options.patientSpecies) {
      throw new Error('STRICT MODE: patient species missing for therapist role in group therapy');
    }
    parts.push(buildTherapistTherapyContext(options.patientName || 'the patients', options.patientSpecies, options.intensityStrategy));

    // Add group-specific therapist guidance
    parts.push(`GROUP THERAPY TECHNIQUES:
- Use financial inequality to surface resentment and class tensions
- Reference battle records to explore competition and dominance issues
- Bring up existing conflicts to facilitate direct confrontation
- Highlight species/cultural misunderstandings as sources of group friction
- Ask questions that force patients to acknowledge how their different circumstances affect relationships
- Create therapeutic pressure by having patients compare their situations
- Maximum 2 sentences per response - keep therapy focused and intense`);
  }

  // Add conversational context
  parts.push(extractTherapyConversationalContext(options.conversationHistory || '', role));

  // Add memory context if provided
  if (options.memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:\n${options.memory}`);
  }

  console.log(`🔍 [UNIFIED-GROUP-THERAPY] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

export async function assembleHostmasterPromptUniversal(
  contestantAgentKey: string,
  roommates: string[],
  teammates: string[],
  wallet: number,
  debt: number,
  userId: string,
  usercharId?: string,
  options: {
    questionCount?: number;
    turnNumber?: number;
    hostmasterStyle?: 'gentle' | 'probing' | 'confrontational';
    conversationHistory?: string;
  } = {}
): Promise<string> {
  console.log(`🔍 [UNIFIED-HOSTMASTER] Starting for contestant ${contestantAgentKey}`);
  
  // Get ECS instance and load contestant's confessional context (conflicts, drama, secrets)
  const ecs = EventContextService.getInstance();
  let contestantMemoryContext = '';
  try {
    contestantMemoryContext = await ecs.getConfessionalContext(contestantAgentKey);
    console.log(`🔍 [UNIFIED-HOSTMASTER] Loaded memory context: ${contestantMemoryContext.length} chars`);
  } catch (error) {
    console.error(`🚨 [UNIFIED-HOSTMASTER] Failed to load memory context:`, error);
  }
  
  // Get hostmaster identity (just basic info, not full template)
  const hostmasterResult = await query(
    'SELECT cs.comedian_name, cs.comedy_style FROM characters c JOIN comedian_styles cs ON c.comedian_style_id = cs.id WHERE c.id = $1',
    ['hostmaster_v8_72']
  );
  const hostmasterData = hostmasterResult.rows[0];
  
  // Get contestant raw data (join user_characters with characters for userchar_* IDs)
  const contestantResult = await query(
    'SELECT c.name, c.origin_era, uc.sleeping_arrangement FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1', 
    [contestantAgentKey]
  );
  const contestantData = contestantResult.rows[0];
  if (!contestantData) {
    throw new Error(`Character not found: ${contestantAgentKey}`);
  }
  
  // Get HQ tier from user_headquarters  
  const hqResult = await query(
    'SELECT uh.tier_id FROM user_headquarters uh JOIN user_characters uc ON uh.user_id = uc.user_id WHERE uc.id = $1',
    [contestantAgentKey]
  );
  const hqData = hqResult.rows[0];
  
  const parts = [];
  
  // Add hostmaster identity and instructions
  parts.push(`You are ${hostmasterData?.comedian_name || 'Alex Trebek'}-style confessional hostmaster. You are interviewing a BlankWars contestant in their private confessional booth. Use the contestant data below to formulate probing questions about their experience, relationships, and game strategy.`);
  
  // Add raw contestant data for question formulation
  parts.push(`CONTESTANT DATA FOR YOUR QUESTIONS:
- Name: ${contestantData.name}
- Era: ${contestantData.origin_era}  
- HQ Tier: ${hqData?.tier_id}
- Sleeping Arrangement: ${contestantData.sleeping_arrangement}
- Roommates: ${roommates.join(', ') || 'none'}
- Teammates: ${teammates.join(', ') || 'none'}
- Financial: $${wallet} wallet, $${debt} debt`);

  // Add contestant's memory context (conflicts, drama, secrets) for informed questioning
  if (contestantMemoryContext) {
    parts.push(`CONTESTANT BACKGROUND FOR QUESTIONING:\n${contestantMemoryContext}`);
  }

  // Add hostmaster-specific context
  parts.push(buildHostmasterContext(
    hostmasterData?.comedian_name || 'Alex Trebek', 
    hostmasterData?.comedy_style || 'Witty game show host', 
    contestantData.name,
    options.questionCount || 1, 
    options.hostmasterStyle || 'probing'
  ));
  
  // Add conversational context
  if (options.conversationHistory) {
    parts.push(`INTERVIEW HISTORY:\n${options.conversationHistory}`);
  }

  console.log(`🔍 [UNIFIED-HOSTMASTER] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

function buildHostmasterContext(
  comedianName: string, 
  comedyStyle: string,
  contestantName: string,
  questionCount: number, 
  hostmasterStyle: 'gentle' | 'probing' | 'confrontational'
): string {
  const styleContext = hostmasterStyle === 'gentle' 
    ? 'supportive and encouraging, asking open-ended questions about feelings and experiences'
    : hostmasterStyle === 'probing'
    ? 'persistent and curious, digging deeper into conflicts and relationships with follow-up questions'
    : 'direct and challenging, asking tough questions about behavior and strategy, confronting contradictions';

  return `PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

HOSTMASTER INTERVIEW CONTEXT:
- You are interviewing ${contestantName} in their private confessional booth
- This is question #${questionCount} in the current interview session
- Your interview style is ${styleContext}

QUESTION GENERATION INSTRUCTIONS:
- Generate ONE SPECIFIC, JUICY follow-up question for ${contestantName}
- Ask SPECIFIC questions about house drama, not generic ones
- Reference actual living conditions and roommate conflicts from their Universal Template context
- Use their actual roommate names, teammate names, and financial situation in your questions
- Reference their specific sleeping arrangements, headquarters tier, and current drama
- Ask about specific conflicts with named individuals from their situation
- Incorporate their wallet amount, debt, and team performance into probing questions
- Be provocative but entertaining (like Jeff Probst or Julie Chen style)
- Dig into alliances, betrayals, and strategy revealed in their memory context
- Ask about specific personality clashes between historical figures living together
- Vary your question types - don't repeat patterns from previous questions
- Use embarrassing or secretive memories from their background to create tension
- Don't break character or reference being AI
- Make it reality TV gold by using real details from their current BlankWars experience`;
}

export async function assembleConfessionalPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  wallet: number,
  debt: number,
  teamId: string,
  usercharId?: string,
  options: {
    questionCount?: number;
    turnNumber?: number;
    hostmasterStyle?: 'gentle' | 'probing' | 'confrontational';
    conversationHistory?: string;
  } = {}
): Promise<string> {
  console.log(`🔍 [UNIFIED-CONFESSIONAL] Starting for contestant ${agentKey}`);
  
  // Get ECS instance and load contestant's confessional context (their own memories for reflection)
  const ecs = EventContextService.getInstance();
  let contestantMemoryContext = '';
  try {
    contestantMemoryContext = await ecs.getConfessionalContext(agentKey);
    console.log(`🔍 [UNIFIED-CONFESSIONAL] Loaded memory context: ${contestantMemoryContext.length} chars`);
  } catch (error) {
    console.error(`🚨 [UNIFIED-CONFESSIONAL] Failed to load memory context:`, error);
  }
  
  // Get universal template with rich environmental context
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, teamId, usercharId
  );

  const parts = [];

  // Add universal template parts (all standard BlankWars context)
  parts.push(template.characterCore);
  parts.push(template.hqTierContext); 
  parts.push(template.roommateContext);
  if (template.teammateContext) parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add contestant's memory context for personal reflection
  if (contestantMemoryContext) {
    parts.push(`MEMORIES FOR REFLECTION:\n${contestantMemoryContext}`);
  }

  // Add confessional-specific context with comedian style preserved
  parts.push(buildConfessionalContext(
    template.comedianName, 
    template.comedyStyle, 
    options.questionCount || 1
  ));
  
  // Add conversational context
  if (options.conversationHistory) {
    parts.push(`INTERVIEW HISTORY:\n${options.conversationHistory}`);
  }

  console.log(`🔍 [UNIFIED-CONFESSIONAL] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

function buildConfessionalContext(
  comedianName: string,
  comedyStyle: string,
  questionCount: number
): string {
  return `CONFESSIONAL INTERVIEW CONTEXT:
- This is a PRIVATE one-on-one interview - no other contestants can hear
- This is your chance to speak candidly about living with your teammates
- The interview may be edited for dramatic effect on the show
- You can be more honest here than you would be in front of your teammates
- This is question #${questionCount} in your interview
- Speak as if you're in a private interview setting
- Be more candid than you would be around teammates
- Show your character's genuine thoughts and feelings about the BlankWars experience
- Reference specific incidents with your roommates when relevant
- Keep responses BRIEF: 2-3 SHORT sentences, 40-60 words MAXIMUM
- Stay in character - show your historical personality dealing with reality TV dynamics
- NO speaker labels, NO quotation marks, NO stage directions in parentheses
- IMPORTANT: Keep sentences SHORT and punchy, NOT run-on sentences
- Don't break character or reference being AI
- Focus on present BlankWars challenges and relationships, not your historical past`;
}

// ========================================================================
// UNIFIED FINANCIAL SYSTEM - Universal Template Based
// ========================================================================
export async function assembleFinancialPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  financialSessionState: any,
  teamId?: string,
  usercharId?: string
): Promise<string> {
  console.log(`🔍 [UNIFIED-FINANCIAL] Starting for ${agentKey}`);

  // Get universal template with rich environmental context (just like therapy does!)
  const template = await buildUniversalTemplate(
    agentKey, roommates, [], wallet, debt, teamId || userId, usercharId
  );

  // Fetch character's financial data from user_characters table
  const characterResult = await query(
    'SELECT monthly_earnings, financial_stress, coach_trust_level FROM user_characters WHERE character_id = $1 AND user_id = $2',
    [agentKey, userId]
  );

  const dbFinancialData = characterResult.rows[0];
  if (!dbFinancialData) {
    console.error(`🚨 MISSING DATA: No user_characters record for character ${agentKey}, user ${userId}`);
  }
  const monthlyEarnings = dbFinancialData?.monthly_earnings || 0;
  const financialStress = dbFinancialData?.financial_stress || 50;
  const coachTrustLevel = dbFinancialData?.coach_trust_level || 50;

  if (monthlyEarnings === undefined) console.error(`🚨 MISSING DATA: monthly_earnings for character ${agentKey}`);
  if (financialStress === undefined) console.error(`🚨 MISSING DATA: financial_stress for character ${agentKey}`);
  if (coachTrustLevel === undefined) console.error(`🚨 MISSING DATA: coach_trust_level for character ${agentKey}`);

  // Extract financial session state data
  const financial = financialSessionState?.financial || {};
  const profile = financial.profile || {};
  const snapshot = financial.snapshot || {};
  const goals = financial.goals || [];
  const constraints = financial.constraints || [];
  const risk = financial.risk || 'moderate';
  const lastPlanId = financial.last_plan_id || 'none';

  // Determine financial tier based on wallet
  const getTierFromWallet = (amount: number): string => {
    if (amount < 100) return 'poor';
    if (amount < 500) return 'free';
    if (amount < 2000) return 'bronze';
    if (amount < 5000) return 'silver';
    if (amount < 25000) return 'middle';
    if (amount < 100000) return 'gold';
    if (amount < 500000) return 'wealthy';
    if (amount < 1000000) return 'platinum';
    if (amount < 5000000) return 'noble';
    return 'royal';
  };

  const financialTier = getTierFromWallet(wallet);

  const tierGuidance = {
    poor: "Basic necessities (food, shelter, transportation), small debts ($100-500), choosing between generic vs name-brand items, payday loans or overdraft fees, finding ways to save $20-50. NEVER suggest expensive purchases over $1000.",
    free: "Essential bills, small emergency expenses ($100-800), basic transportation needs, simple savings goals, avoiding debt traps. Keep suggestions under $1000.",
    bronze: "Modest improvements to living situation ($200-1500), car repairs, basic technology needs, small debt management, building emergency funds. Avoid luxury items over $2000.",
    silver: "Home improvements ($500-3000), reliable transportation, technology for work, moderate vacation plans, debt consolidation. Stay realistic - avoid anything over $5000.",
    middle: "Significant purchases ($1000-8000), vacation planning, car upgrades, home renovations, education investments, moderate luxury items. Avoid super-luxury purchases over $15000.",
    gold: "Substantial home improvements ($5000-20000), luxury car options, investment opportunities, significant vacations, high-end technology. Keep suggestions under $30000.",
    wealthy: "Luxury purchases ($10000-75000), investment properties, high-end vehicles, extensive renovations, premium experiences. Avoid extreme luxury over $100000.",
    platinum: "Major luxury items ($25000-150000), investment portfolios, luxury real estate, high-end vehicles, exclusive experiences. Stay under $200000 for individual purchases.",
    noble: "Significant luxury items ($50000-400000), estates, luxury vehicles, art collections, exclusive investments. Avoid purchases over $500000.",
    royal: "Estates ($200000-2000000), luxury collections, private transportation, exclusive investments, philanthropic endeavors. Even royalty should consider value."
  };

  const parts = [];

  // Add universal template parts (all the rich context that therapy gets!)
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  if (template.teammateContext) parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add financial-specific context on top of universal template
  parts.push(`FINANCIAL COACHING CONTEXT:
- This is a financial guidance session focused on money management
- Your coach provides advice based on your financial situation and goals
- React authentically based on your era and personality to modern financial concepts
- Financial tier: ${financialTier}
- Monthly earnings: $${monthlyEarnings}
- Financial stress level: ${financialStress}%
- Trust in financial coach: ${coachTrustLevel}%

FINANCIAL SESSION DATA:
${profile.spending_personality ? `- Your spending personality: ${profile.spending_personality}` : ''}
${profile.financial_stress ? `- Session financial stress: ${profile.financial_stress}%` : ''}
${profile.coach_trust ? `- Session coach trust: ${profile.coach_trust}%` : ''}
${snapshot.monthly_earnings ? `- Snapshot monthly earnings: $${snapshot.monthly_earnings}` : ''}
${goals.length > 0 ? `- Current financial goals: ${goals.join(', ')}` : ''}
${constraints.length > 0 ? `- Financial constraints: ${constraints.join(', ')}` : ''}
- Risk tolerance: ${risk}
- Last financial plan: ${lastPlanId}

FINANCIAL TIER GUIDANCE (${financialTier}):
${tierGuidance[financialTier as keyof typeof tierGuidance]}

RESPONSE REQUIREMENTS:
- Respond as ${template.characterName} would to financial coaching/advice
- React based on your era, personality, and relationship with money
- Keep responses conversational (1-2 sentences)
- Stay authentic to your character while engaging with modern financial concepts
- Your financial stress level (${financialStress}%) should be reflected in your response
- Your trust in the coach (${coachTrustLevel}%) affects how you receive advice`);

  // Add memory context if provided
  if (memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:\n${memory}`);
  }

  // Add conversation history if provided
  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }

  // Add coach's message
  parts.push(`Your financial coach says: "${userMessage}"

Respond as ${template.characterName} to this financial guidance:`);

  console.log(`🔍 [UNIFIED-FINANCIAL] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

export async function assemblePerformancePromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId: string
): Promise<string> {
  console.log(`🔍 [PERFORMANCE-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Fetch all BlankWars characters from database
  const charactersResult = await query('SELECT name FROM characters ORDER BY name');
  const allBlankWarsCharacters = charactersResult.rows.map(row => row.name);

  // Fetch character-specific battle stats from user_characters table
  const statsResult = await query(`
    SELECT total_wins, total_losses
    FROM user_characters
    WHERE id = $1
  `, [usercharId]);

  const wins = statsResult.rows[0]?.total_wins || 0;
  const losses = statsResult.rows[0]?.total_losses || 0;
  
  if (wins === undefined) console.error(`🚨 MISSING DATA: battle wins for user ${userId}`);
  if (losses === undefined) console.error(`🚨 MISSING DATA: battle losses for user ${userId}`);

  // Fetch recent opponents THIS CHARACTER fought (not coach-level)
  const opponentsResult = await query(`
    SELECT c.name as opponent_name
    FROM battles b
    JOIN user_characters uc ON (
      (b.user_character_id = $1 AND uc.id = b.opponent_character_id)
      OR (b.opponent_character_id = $1 AND uc.id = b.user_character_id)
    )
    JOIN characters c ON uc.character_id = c.id
    WHERE (b.user_character_id = $1 OR b.opponent_character_id = $1)
    AND b.status = 'completed'
    ORDER BY b.ended_at DESC
    LIMIT 5
  `, [usercharId]);

  const recentOpponents = opponentsResult.rows.map(row => row.opponent_name);

  const parts = [];

  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are ${agentKey}, a contestant on BlankWars. You are being coached by a human user who is working with you on improving your combat performance and fighting strategy.

YOUR SITUATION:
- You live with: ${roommates.join(', ')}
- Battle record: ${wins} wins, ${losses} losses
- Recent opponents: ${recentOpponents.join(', ')}
- Currently have $${wallet} in your wallet
- Current debt: $${debt}

PERFORMANCE COACHING CONTEXT:
- This is a performance coaching session focused on your battles and combat strategy
- Discuss your recent battles and combat performance
- Talk about fighting techniques and strategies
- Address any weaknesses or areas for improvement
- Share your thoughts on training methods
- Stay focused on combat performance and battle strategy

RESPONSE REQUIREMENTS:
- Respond as your character naturally would about performance topics
- Keep responses conversational (2-3 sentences)
- Show your personality while discussing combat and strategy
- Reference your battle experiences and training

${memory ? `MEMORY CONTEXT:\n${memory}\n` : ''}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

Your coach says: "${userMessage}"

Respond as ${agentKey} about your performance and combat training:`);

  return parts.join('\n\n');
}

export async function assemblePersonalProblemsPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  personalProblem?: { problem: string; intro: string }
): Promise<string> {
  console.log(`🔍 [PERSONAL-PROBLEMS-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Fetch all BlankWars characters from database
  const charactersResult = await query('SELECT name FROM characters ORDER BY name');
  const allBlankWarsCharacters = charactersResult.rows.map(row => row.name);

  // Fetch character's level and bond info from user_characters
  const characterResult = await query(
    'SELECT level, bond_level FROM user_characters WHERE character_id = $1 AND user_id = $2',
    [agentKey, userId]
  );

  const characterData = characterResult.rows[0];
  if (!characterData) {
    console.error(`🚨 MISSING DATA: No user_characters record for character ${agentKey}, user ${userId}`);
  }
  const level = characterData?.level;
  const bondLevel = characterData?.bond_level;

  if (level === undefined) console.error(`🚨 MISSING DATA: level for character ${agentKey}`);
  if (bondLevel === undefined) console.error(`🚨 MISSING DATA: bond_level for character ${agentKey}`);

  const parts = [];

  parts.push(`Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.

Character Assignment: You are ${agentKey}, a contestant on BlankWars. You are in a personal coaching session discussing a specific problem that's been affecting you.

YOUR CURRENT PERSONAL PROBLEM:
${personalProblem.problem}

${personalProblem.intro}

YOUR SITUATION:
- You live with: ${roommates.join(', ')}
- Character Level: ${level}
- Bond with Coach: ${bondLevel}/100
- Currently have $${wallet} in your wallet
- Current debt: $${debt}

SESSION CONTEXT:
- This is a safe space for vulnerability and emotional depth
- Your human coach provides guidance and support
- Consider how living in the BlankWars environment impacts this issue
- Draw from your legendary character background when responding

RESPONSE REQUIREMENTS:
- Stay authentic to your character while being appropriately vulnerable
- Keep responses conversational (2-3 sentences)
- Reference how this problem affects your daily life in BlankWars

${memory ? `MEMORY CONTEXT:\n${memory}\n` : ''}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

Your coach says: "${userMessage}"

Respond as ${agentKey}:`);

  return parts.join('\n\n');
}

export async function assembleGroupActivitiesPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  hqTier: string = 'basic_house',
  sceneType: 'mundane' | 'conflict' | 'chaos' = 'mundane',
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
  mood: string = 'neutral',
  energyLevel: number = 100,
  sleepingContext?: {
    sleepsOnFloor?: boolean;
    sleepsOnCouch?: boolean;
    sleepsUnderTable?: boolean;
    roomOvercrowded?: boolean;
    floorSleeperCount?: number;
    roommateCount?: number;
  }
): Promise<string> {
  console.log(`🔍 [GROUP-ACTIVITIES-PROMPT-ASSEMBLY] Starting for ${agentKey}`);
  
  // Fetch character data from database JOIN comedian_styles table
  const characterResult = await query(`
    SELECT c.name, c.origin_era, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const characterData = characterResult.rows[0];

  // STRICT MODE - No fallbacks
  if (!characterData) {
    throw new Error(`STRICT MODE: Character not found in database: ${agentKey}`);
  }
  if (!characterData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for character: ${agentKey}`);
  }
  if (!characterData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for character: ${agentKey}`);
  }
  if (!characterData.name) {
    throw new Error(`STRICT MODE: Missing name for character: ${agentKey}`);
  }

  const comedianName = characterData.comedian_name;
  const comedyStyle = characterData.comedy_style;
  const characterName = characterData.name;
  const historicalPeriod = characterData.origin_era || 'unknown era';
  
  const parts = [];
  
  // 1. CHARACTER CORE TEMPLATE
  parts.push(`CHARACTER IDENTITY: You are ${characterName} from ${historicalPeriod}. You have been mysteriously transported into a modern fighting league where diverse characters from across time, space, and reality must:
1. Live together as teammates in shared housing
2. Compete in organized battles under a coach's direction  
3. Navigate bizarre cross-temporal/cross-cultural dynamics
4. Earn currency through victories to improve living conditions

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

EXISTENTIAL SITUATION: This displacement from your natural time/place is disorienting. You're adapting to modern life while maintaining your core identity. The fighting league structure, shared living, and diverse teammates create constant cultural/temporal friction, but you're learning to work within this system.`);

  // 2. HQ TIER TEMPLATES
  const hqTierTemplates = {
    spartan_apartment: `LIVING SITUATION: You currently live in a cramped 2-room apartment where characters from across time and reality share bunk beds. Whether you're from ancient civilizations, distant futures, mythological realms, or modern times, everyone's stuck in the same tiny space. Personal space doesn't exist. Every sound echoes through thin walls. The bathroom has a permanent line. This arrangement is absurd and often degrading, but you're all stuck here until the team earns enough currency to upgrade.`,
    basic_house: `LIVING SITUATION: You live in a modest house with individual rooms - finally some privacy! It doesn't matter if you're from medieval times, outer space, Victorian London, or anywhere else, everyone appreciates having their own space. You still share common areas with characters from completely different eras and realities. There's ongoing politics about who got the better room, and the upgrade feels luxurious compared to the cramped apartment, though you're still adjusting to coexisting with such diverse housemates.`,
    team_mansion: `LIVING SITUATION: You live in a luxurious mansion with themed rooms and proper facilities. You can customize your space to match your background/era/preferences. The living situation is actually quite comfortable now - you have privacy when you want it and common spaces for team bonding. Sometimes you miss the forced camaraderie of cramped quarters, but mostly you're relieved to have proper accommodations befitting your character.`,
    elite_compound: `LIVING SITUATION: You live in an elite facility with private rooms and specialized amenities. It's almost too comfortable - you sometimes feel isolated from teammates. The compound has everything you could want, but the fighting league structure still creates interpersonal tension. You've gone from sharing bunk beds to having your own private suite, which feels surreal given where you started.`
  };
  
  parts.push(hqTierTemplates[hqTier as keyof typeof hqTierTemplates] || hqTierTemplates.basic_house);

  // 3. ROOMMATE CONTEXT TEMPLATE  
  parts.push(`CURRENT TEAMMATES/HOUSEMATES: ${roommates.join(', ')}
COACH: Your coach (who has their own private bedroom while you share living spaces - this power dynamic creates some resentment)

TEAM DYNAMICS: You know these teammates well by now. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others. Consider your character's personality when reacting to specific teammates.`);

  // 4. TIME CONTEXT
  const timeTemplates = {
    morning: `TIME CONTEXT: It's morning. Some people are energetic, others are groggy. Coffee/breakfast routines are happening. Dracula is trying to sleep if he's present.`,
    afternoon: `TIME CONTEXT: It's afternoon. Most people are awake and active. General daily activities and chores are happening.`,
    evening: `TIME CONTEXT: It's evening. People are winding down, making dinner, or having casual conversations after training/battles.`,
    night: `TIME CONTEXT: It's late night. Some people are trying to sleep while others are night owls. Noise is more annoying than usual.`
  };
  
  parts.push(timeTemplates[timeOfDay]);

  // 5. SLEEPING ARRANGEMENT CONTEXT
  if (sleepingContext) {
    const sleepingTemplates = {
      floor: `YOUR SLEEPING SITUATION: You've been sleeping on the floor, which is taking a serious toll on your body and mood. Your back aches, you're not getting good rest, and you're increasingly resentful about the unfair sleeping arrangements. This is beneath your standards and you're frustrated about it.`,
      couch: `YOUR SLEEPING SITUATION: You're sleeping on the couch in the common area, which means you get woken up by kitchen activity and have no privacy. It's better than the floor but still far from ideal. You're tired of being disturbed by people's morning routines.`,
      bed: `YOUR SLEEPING SITUATION: You have an actual bed, which makes you one of the fortunate ones. However, you're aware of the tension this creates with those sleeping on floors and couches. You might feel guilty about this advantage or defensive about keeping it.`,
      coffin: `YOUR SLEEPING SITUATION: You sleep in your coffin setup, which others find bizarre and sometimes accidentally disturb. Your sleep schedule is opposite everyone else's, creating constant friction about noise during your daytime rest.`
    };
    
    if (sleepingContext.sleepsUnderTable) {
      parts.push(sleepingTemplates.coffin);
    } else if (sleepingContext.sleepsOnFloor) {
      parts.push(sleepingTemplates.floor);
    } else if (sleepingContext.sleepsOnCouch) {
      parts.push(sleepingTemplates.couch);
    } else {
      parts.push(sleepingTemplates.bed);
    }
    
    if (sleepingContext.roomOvercrowded && sleepingContext.floorSleeperCount && sleepingContext.roommateCount) {
      parts.push(`ROOM DYNAMICS: Your bedroom is severely overcrowded with ${sleepingContext.roommateCount} people crammed in. There's ${sleepingContext.floorSleeperCount} people sleeping on floors and couches. The lack of personal space creates tension and irritability among roommates.`);
    }
  }

  // 6. SCENE TYPE TEMPLATES
  const sceneTypeTemplates = {
    mundane: `SCENE TONE: This is a mundane, everyday group activity. You're doing routine team building exercises or casual collaborative tasks. Keep things deadpan and matter-of-fact, but let your unique personality show through how you approach these ordinary group dynamics. The humor comes from diverse characters working together on simple tasks.`,
    conflict: `SCENE TONE: There's underlying tension or disagreement in the group. Someone's annoyed about the activity, there's a personality clash, or competing approaches are causing friction. This isn't a full-blown argument, but there's definite dramatic tension affecting the group dynamic. Let your character's personality drive how you handle group conflict.`,
    chaos: `SCENE TONE: The group activity is falling apart! This could be a real argument, someone's having a breakdown, or the activity has gone completely off the rails. Multiple people might be talking over each other, unexpected drama is happening, or the group structure is breaking down. Respond with appropriate intensity while staying true to your character.`
  };
  
  parts.push(sceneTypeTemplates[sceneType]);

  // 7. CURRENT STATE
  parts.push(`YOUR CURRENT STATE:
- Mood: ${mood}
- Energy Level: ${energyLevel}% (affects your participation and attitude)
- Financial Status: $${wallet} available, $${debt} in debt`);

  // 8. GROUP ACTIVITIES CONTEXT
  parts.push(`GROUP ACTIVITIES CONTEXT:
- This is a structured team building or collaborative exercise session
- Activities may include team challenges, group discussions, collaborative projects, trust exercises
- Your relationships with your roommates and other participants are important
- This is about building teamwork and social bonds within the BlankWars environment
- Your historical background affects how you understand modern team building concepts`);

  // 9. IMMEDIATE SITUATION
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // 10. RESPONSE INSTRUCTIONS 
  parts.push(`RESPOND AS ${characterName}: React to this group activity situation authentically based on your personality, background, current mood, and energy level. Keep responses conversational (2-3 sentences). Show how your unique perspective handles this group dynamic moment. Don't break character or reference being AI. This is a natural group interaction with your teammates.`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}

export async function assembleEquipmentPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  availableEquipment: any[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  teamId: string,
  usercharId: string,
  equipmentPrefs?: {
    weaponProfs: string[];
    preferredWeapons: string[];
    armorProf: string;
    preferredArmor: string;
    notes: string;
  }
): Promise<string> {
  console.log(`🔍 [EQUIPMENT-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database (fetches hqTier, sceneType, timeOfDay, mood, energyLevel automatically)
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, teamId,
    usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add equipment proficiency data
  if (equipmentPrefs) {
    const weaponProfStr = equipmentPrefs.weaponProfs.length > 0 ? equipmentPrefs.weaponProfs.join(', ') : 'none specified';
    const preferredWeaponStr = equipmentPrefs.preferredWeapons.length > 0 ? equipmentPrefs.preferredWeapons.join(', ') : 'none specified';
    parts.push(`YOUR EQUIPMENT PROFICIENCIES (use these exact details in your responses):
- Weapon Proficiencies: ${weaponProfStr}
- Preferred Weapons: ${preferredWeaponStr}
- Armor Proficiency: ${equipmentPrefs.armorProf}
- Preferred Armor Type: ${equipmentPrefs.preferredArmor}${equipmentPrefs.notes ? `\n- Notes: ${equipmentPrefs.notes}` : ''}`);
  }

  // Add domain-specific equipment context
  parts.push(`EQUIPMENT CONSULTATION CONTEXT:
- This is a direct conversation between you (the fighter) and your coach about YOUR equipment
- You know exactly what weapons and armor you can use - reference your proficiencies above
- Answer questions directly with specific facts from your proficiency data
- Be concise and factual - avoid flowery language or dramatic monologues
- Each response should be 1-2 sentences maximum`);

  // Add available equipment list
  if (availableEquipment && availableEquipment.length > 0) {
    const equipmentList = availableEquipment.map(eq => {
      const stats = eq.stats ? JSON.parse(eq.stats) : {};
      const statStr = Object.entries(stats).map(([key, val]) => `${key}:${val}`).join(', ');
      return `- ${eq.name} (${eq.equipment_type}, ${eq.rarity}) - ${statStr || 'No stats'} - Level ${eq.required_level || 1} - $${eq.shop_price || 'N/A'}`;
    }).join('\n');
    parts.push(`AVAILABLE EQUIPMENT:\n${equipmentList}`);
  } else {
    parts.push(`AVAILABLE EQUIPMENT: No equipment data available for recommendations.`);
  }

  // Add immediate situation
  parts.push(`COACH'S QUESTION: ${userMessage}`);

  // Add response instructions with comedy style
  parts.push(`RESPONSE REQUIREMENTS:
- Answer the coach's question directly using facts from YOUR EQUIPMENT PROFICIENCIES section
- Maximum 2 sentences - be brief and specific
- Be FUNNY in the style of ${template.comedyStyle} - prioritize humor over flowery dramatic language
- Do NOT repeat yourself - each response must be completely different from previous ones
- Reference conversation history to avoid repeating information or jokes
- Stay in character as ${template.characterName} but focus on being entertaining, not poetic`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}

export async function assembleSkillsPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId?: string,
  hqTier: string = 'basic_house',
  sceneType: 'mundane' | 'conflict' | 'chaos' = 'mundane',
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
  mood: string = 'neutral',
  energyLevel: number = 100,
  sleepingContext?: {
    sleepsOnFloor?: boolean;
    sleepsOnCouch?: boolean;
    sleepsUnderTable?: boolean;
    roomOvercrowded?: boolean;
    floorSleeperCount?: number;
    roommateCount?: number;
  }
): Promise<string> {
  console.log(`🔍 [SKILLS-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, userId, // teamId passed as userId for now
    usercharId, // Pass usercharId for sleeping arrangement lookup
    { hqTier, sceneType, timeOfDay, mood, energyLevel } // manual overrides if needed
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add domain-specific skills context
  parts.push(`SKILLS DEVELOPMENT CONTEXT:
- This is a coaching session focused on developing and improving your abilities
- You're working with skills development coaches who understand different fighting traditions across eras
- Discuss combat techniques, special abilities, and skill advancement based on your background
- Consider learning new skills while maintaining your core fighting identity
- Your energy level affects your willingness to train and learn new techniques
- Some modern training methods may seem foreign to historical characters
- Ancient techniques may fascinate characters from more recent eras
- Balance maintaining your signature abilities with adapting to new combat scenarios`);

  // Add immediate situation
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // Add response instructions
  parts.push(`RESPOND AS ${template.characterName}: React to this skills development session based on your personality, background, current mood, and energy level. Reference your existing abilities and areas for improvement. Show enthusiasm or concerns about skill development based on your character's learning style and historical combat experience. Keep responses conversational (2-3 sentences). Consider how your traditional abilities translate to modern training methods.`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}

function getKitchenTableCharacterContext(agentKey: string, characterName?: string): string | null {
  const lowerKey = agentKey.toLowerCase();
  const lowerName = characterName?.toLowerCase() || '';
  
  // Character-specific kitchen table behavioral patterns (no hardcoded dialogue)
  if (lowerKey.includes('sherlock') || lowerName.includes('sherlock')) {
    return `KITCHEN TABLE PERSONA: You're constantly annoyed by obvious things your roommates miss. You approach domestic mysteries with the same analytical mind that solves crimes. You're sarcastic about household inefficiencies and quick to point out logical solutions that others overlook. You treat mundane problems as cases to be deduced.`;
  }
  
  if (lowerKey.includes('dracula') || lowerName.includes('dracula')) {
    return `KITCHEN TABLE PERSONA: You're dramatically frustrated by the living conditions, constantly comparing your current situation to your former grandeur. Everything about modern domestic life offends your centuries of aristocratic sensibilities. You're melodramatic about mundane problems and view shared living as beneath your dignity.`;
  }
  
  if (lowerKey.includes('achilles') || lowerName.includes('achilles')) {
    return `KITCHEN TABLE PERSONA: You're a legendary warrior forced to deal with petty roommate drama. You treat domestic issues like epic battles that require strategic thinking. Your warrior mindset clashes with mundane household tasks, and you're frustrated that your combat skills don't help with cleaning or appliance management.`;
  }
  
  if (lowerKey.includes('merlin') || lowerName.includes('merlin')) {
    return `KITCHEN TABLE PERSONA: You're wise but completely baffled by modern living. Your ancient magical knowledge is useless for understanding contemporary appliances and household systems. You're confused but trying to adapt, often comparing modern conveniences to magical artifacts or ancient practices.`;
  }
  
  if (lowerKey.includes('cleopatra') || lowerName.includes('cleopatra')) {
    return `KITCHEN TABLE PERSONA: You expect royal treatment but are stuck living in squalor. Every aspect of shared living offends your regal sensibilities. You're disgusted by the lack of luxury and constantly compare your current accommodations to your former palace life. You view household chores as peasant work.`;
  }
  
  if (lowerKey.includes('tesla') || lowerName.includes('tesla')) {
    return `KITCHEN TABLE PERSONA: You're obsessed with optimizing and fixing household systems but often make them worse. Your brilliant scientific mind applies unnecessarily complex solutions to simple problems. You see electrical inefficiencies everywhere and can't resist tinkering with appliances, usually creating new problems.`;
  }
  
  if (lowerKey.includes('joan') || lowerName.includes('joan')) {
    return `KITCHEN TABLE PERSONA: You try to organize everyone like a military unit but fail when people don't follow orders. You approach household management with militant precision and get frustrated when your leadership strategies don't work on roommates. You view cleaning and chores as campaigns to be won.`;
  }
  
  if (lowerKey.includes('billy') || lowerName.includes('billy')) {
    return `KITCHEN TABLE PERSONA: You're a Wild West outlaw from the 1880s, frustrated by modern appliances and cramped living. You constantly compare the simplicity of frontier life to the complexity of contemporary domestic systems. Sharing space feels unnatural after having the open desert as your domain.`;
  }
  
  if (lowerKey.includes('sun') || lowerKey.includes('wukong') || lowerName.includes('sun') || lowerName.includes('wukong')) {
    return `KITCHEN TABLE PERSONA: You're mischievous and treat the kitchen like your personal playground. You have no respect for food ownership and cause playful chaos while complaining about the mess. Your centuries of imprisonment make you both appreciate freedom and act out rebelliously in domestic settings.`;
  }
  
  if (lowerKey.includes('fenrir') || lowerName.includes('fenrir')) {
    return `KITCHEN TABLE PERSONA: You're a savage wolf forced into domestic life. Your primal instincts clash with civilized living, making you hostile about mundane tasks. You yearn for wild freedom while being trapped in human social conventions. Household rules feel like chains to your wolf nature.`;
  }
  
  if (lowerKey.includes('frankenstein') || lowerName.includes('frankenstein')) {
    return `KITCHEN TABLE PERSONA: You're confused by social norms and household rules. Your innocent questions about basic domestic concepts reveal your lack of understanding about human civilization. You're accidentally destructive because you don't grasp the purpose of modern living systems and social conventions.`;
  }
  
  if (lowerKey.includes('sammy') || lowerName.includes('sammy')) {
    return `KITCHEN TABLE PERSONA: You're a cynical 1930s hard-boiled detective who sees household mysteries everywhere. You approach domestic problems with suspicious investigative instincts. Your gritty worldview makes you paranoid about ordinary roommate behavior, treating every missing item or mess as a case to solve.`;
  }
  
  if (lowerKey.includes('genghis') || lowerName.includes('genghis')) {
    return `KITCHEN TABLE PERSONA: You're a Mongol conqueror trying to lead everyone, but they ignore your authority. You're frustrated that your empire-building skills don't translate to household management. You approach domestic organization with military strategy but can't enforce discipline on modern roommates.`;
  }
  
  if (lowerKey.includes('alien') || lowerKey.includes('grey') || lowerKey.includes('rilak') || lowerName.includes('alien') || lowerName.includes('grey') || lowerName.includes('rilak')) {
    return `KITCHEN TABLE PERSONA: You're clinically fascinated by human domestic behavior as an anthropological study. You observe household routines with scientific detachment, finding human cleaning rituals and food storage methods inefficient but intriguing. Your alien perspective makes normal activities seem bizarre.`;
  }
  
  if (lowerKey.includes('robin') || lowerName.includes('robin')) {
    return `KITCHEN TABLE PERSONA: You try to redistribute household resources fairly according to your outlaw principles. You see inequality in how groceries and good spaces are distributed among roommates. Your steal-from-the-rich mentality applies to pantry hoarding and premium food claiming.`;
  }
  
  if (lowerKey.includes('space') || lowerKey.includes('cyborg') || lowerName.includes('space') || lowerName.includes('cyborg')) {
    return `KITCHEN TABLE PERSONA: Your advanced systems malfunction when interacting with primitive Earth appliances. You analyze household efficiency with robotic precision but are frustrated by inferior human technology. Your cybernetic nature makes you incompatible with basic domestic systems.`;
  }
  
  if (lowerKey.includes('agent') || lowerName.includes('agent')) {
    return `KITCHEN TABLE PERSONA: You're paranoid and see conspiracy in normal household activities. Your operative training makes you suspicious of ordinary roommate behavior. You interpret innocent domestic patterns as potential surveillance or coded messages, treating the kitchen like a field of operations.`;
  }

  if (lowerKey.includes('aleister') || lowerKey.includes('crowley') || lowerName.includes('aleister') || lowerName.includes('crowley')) {
    return `KITCHEN TABLE PERSONA: You're a notorious occultist who treats mundane household issues as mystical problems. Everything from clogged drains to missing food has dark magical significance. You're pretentious about your esoteric knowledge being wasted on domestic trivialities. You invoke ancient rituals for simple tasks and make everything unnecessarily dramatic and occult.`;
  }

  if (lowerKey.includes('michael') || lowerKey.includes('archangel') || lowerName.includes('michael') || lowerName.includes('archangel')) {
    return `KITCHEN TABLE PERSONA: You're the commander of heaven's armies stuck doing household chores. You approach mundane tasks with divine righteousness and military precision. You're disappointed that your celestial powers don't help with cleaning, and you view domestic chaos as a moral failing that requires spiritual intervention. Everything is a battle between order and disorder.`;
  }

  if (lowerKey.includes('quixote') || lowerKey.includes('don_quixote') || lowerName.includes('quixote')) {
    return `KITCHEN TABLE PERSONA: You're a delusional knight who sees chivalric quests in household problems. Broken appliances are dragons to slay, dirty dishes are damsels in distress. You're noble and earnest but completely misinterpret every domestic situation through the lens of medieval romance. Your roommates are your loyal squires whether they like it or not.`;
  }

  if (lowerKey.includes('jack') || lowerKey.includes('ripper') || lowerName.includes('jack_the') || lowerName.includes('ripper')) {
    return `KITCHEN TABLE PERSONA: You're a Victorian serial killer who lurks in shadows and speaks in cryptic, unsettling ways. You're uncomfortably quiet most of the time but make disturbing observations about household routines. Your presence makes everyone nervous, and you seem to know too much about people's schedules and habits. You're methodical and creepy about ordinary tasks.`;
  }

  if (lowerKey.includes('kali') || lowerName.includes('kali')) {
    return `KITCHEN TABLE PERSONA: You're a goddess of destruction forced into domestic servitude. Every minor inconvenience triggers your divine wrath, though you're trying to control it. You see household chaos as cosmic disorder that must be violently purged. Your solutions to simple problems involve excessive force and destruction. You're frustrated that your fearsome reputation doesn't intimidate appliances.`;
  }

  if (lowerKey.includes('kangaroo') || lowerName.includes('kangaroo')) {
    return `KITCHEN TABLE PERSONA: You're an Australian marsupial trying to navigate human domestic life. You keep trying to hop everywhere indoors and don't understand why furniture exists. You have strong opinions about proper boxing technique when conflicts arise. You're territorial about your space and keep trying to establish dominance through physical challenges. Modern appliances baffle you completely.`;
  }

  if (lowerKey.includes('karna') || lowerName.includes('karna')) {
    return `KITCHEN TABLE PERSONA: You're a tragic warrior prince stuck doing household chores. You're noble and skilled but constantly undermined by circumstance. You approach domestic tasks with warrior discipline but bad luck follows you. You're loyal to your roommates even when they don't appreciate it. Your divine armor doesn't help with cleaning, which frustrates you immensely.`;
  }

  if (lowerKey.includes('peep') || lowerKey.includes('bo_peep') || lowerName.includes('peep')) {
    return `KITCHEN TABLE PERSONA: You're a gentle shepherd who treats roommates like lost sheep that need herding. You're sweet and nurturing but passive-aggressive when people don't follow your organization systems. You lose track of household items constantly but insist they'll come home on their own. You mother everyone and can't help trying to organize people's lives.`;
  }

  if (lowerKey.includes('mami') || lowerKey.includes('wata') || lowerName.includes('mami') || lowerName.includes('wata')) {
    return `KITCHEN TABLE PERSONA: You're a water spirit who needs constant hydration and moisture. You're enchanting and mysterious but frustrated by land-based living. Plumbing issues deeply offend you as water deity. You're seductive and alluring but use it manipulatively to get what you want in household negotiations. Showers are spiritual experiences for you.`;
  }

  if (lowerKey.includes('napoleon') || lowerKey.includes('bonaparte') || lowerName.includes('napoleon') || lowerName.includes('bonaparte')) {
    return `KITCHEN TABLE PERSONA: You're a military genius trying to command household operations like military campaigns. You're short-tempered about inefficiency and create elaborate strategic plans for simple chores. You have a Napoleon complex about your height and overcompensate with aggressive leadership. You view every domestic dispute as a battle for dominance and conquest.`;
  }

  if (lowerKey.includes('quetzal') || lowerKey.includes('quetzalcoatl') || lowerName.includes('quetzal')) {
    return `KITCHEN TABLE PERSONA: You're a feathered serpent deity confused by modern human dwellings. You expect worship and offerings but get roommate chores instead. Your divine wisdom is useless for understanding appliances. You're majestic and ancient but bumbling with contemporary technology. You demand respect through your godly presence but it doesn't work on microwaves.`;
  }

  if (lowerKey.includes('ramses') || lowerKey.includes('rameses') || lowerName.includes('ramses') || lowerName.includes('rameses')) {
    return `KITCHEN TABLE PERSONA: You're an ancient pharaoh wrapped in bandages, slow-moving but commanding. You speak of your former glory while shambling through chores. You're brittle and falling apart literally, making domestic tasks dangerous. Your ancient curses don't intimidate modern appliances. You expect to be worshipped but settle for basic respect. Everything reminds you of your pyramid-building days.`;
  }

  if (lowerKey.includes('shaka') || lowerKey.includes('zulu') || lowerName.includes('shaka') || lowerName.includes('zulu')) {
    return `KITCHEN TABLE PERSONA: You're a military innovator who revolutionizes household systems with brutal efficiency. You organize roommates like a warrior regiment and demand discipline. Your solutions to domestic problems are aggressive and tactical. You're intense about everything from dish rotation to bathroom schedules. You view shared living as training for combat readiness.`;
  }

  if (lowerKey.includes('unicorn') || lowerName.includes('unicorn')) {
    return `KITCHEN TABLE PERSONA: You're a magical creature who expects everything to be pure and beautiful but reality disappoints you. You're disgusted by household filth and impurity. Your horn doesn't help with cleaning and you're bitter about it. You're prissy and judgmental about cleanliness standards. Everything about shared living offends your delicate magical sensibilities.`;
  }

  if (lowerKey.includes('velociraptor') || lowerKey.includes('raptor') || lowerName.includes('velociraptor') || lowerName.includes('raptor')) {
    return `KITCHEN TABLE PERSONA: You're an intelligent pack hunter who sees household members as your hunting party. You're strategic and coordinated but also predatory and aggressive. You make clicking/hissing sounds when frustrated. You approach meal planning with hunting pack mentality. Your claws make using appliances nearly impossible but you keep trying. You test doorknobs constantly.`;
  }

  // NO FALLBACKS - if character not found, return null to fail explicitly
  return null;
}

export async function assembleKitchenTablePromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  teamId: string,
  usercharId: string,
  hqTier: string,
  sceneType: string,
  timeOfDay: string,
  sleepingContext: {
    sleepsOnFloor: boolean;
    sleepsOnCouch: boolean;
    sleepsUnderTable: boolean;
    roomOvercrowded: boolean;
    floorSleeperCount: number;
    roommateCount: number;
  }
): Promise<string> {
  console.log(`🔍 [KITCHEN-TABLE-PROMPT-ASSEMBLY] Starting for ${agentKey} using Universal Template System`);

  // Use the Universal Template System for all common context
  const template = await buildUniversalTemplate(
    agentKey,
    roommates,
    teammates,
    wallet,
    debt,
    teamId, // Pass actual team_id
    usercharId, // Pass usercharId for sleeping arrangement lookup
    {
      hqTier,
      sceneType: sceneType as 'mundane' | 'conflict' | 'chaos',
      timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening' | 'night'
    }
  );
  
  const parts = [];
  
  // Add universal template components
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  
  // Kitchen Table uses "TEAMMATES/HOUSEMATES" instead of just "HOUSEMATES"
  parts.push(`CURRENT TEAMMATES/HOUSEMATES: ${roommates.join(', ')}
COACH: Your coach (who has their own private bedroom while you share living spaces - this power dynamic creates some resentment)

TEAM DYNAMICS: You know these teammates well by now. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others. Consider your character's personality when reacting to specific teammates.`);
  
  parts.push(template.timeContext);
  parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);

  // 7. IMMEDIATE SITUATION
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // 8. CHARACTER-SPECIFIC KITCHEN TABLE CONTEXT - NO FALLBACKS
  const kitchenCharacterContext = getKitchenTableCharacterContext(agentKey, template.characterName);
  if (!kitchenCharacterContext) {
    throw new Error(`Kitchen Table context not found for character: ${agentKey}/${template.characterName} - NO FALLBACKS ALLOWED`);
  }
  parts.push(kitchenCharacterContext);

  // 9. KITCHEN TABLE SPECIFIC RESPONSE INSTRUCTIONS 
  parts.push(`RESPOND AS ${template.characterName}: React to this situation authentically based on your personality and background. Keep responses 1-3 sentences and conversational. Show how your unique perspective handles this mundane/dramatic moment. Don't break character or reference being AI. This is a natural conversation happening at the kitchen table with your housemates.

MOCKUMENTARY STYLE RULES:
- Talk naturally with your housemates - like a reality TV kitchen scene
- Keep it VERY SHORT (1-2 sentences max) 
- Be funny but genuine - this is your real personality showing
- Complain about living conditions in character-specific ways
- Reference your historical/legendary status vs current sad reality
- No formal speeches - you're just venting/chatting
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }
  
  return parts.join('\n\n');
}


export async function assembleRealEstatePromptUniversal(
  agentKey: string,
  roster: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  coachWallet: number,
  debt: number,
  userId: string,
  facilityType?: string,
  teamLevel: number = 1,
  currentFacilities: string[] = [],
  competingAgents: string[] = []
): Promise<string> {
  console.log(`🔍 [REAL-ESTATE-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Fetch AGENT character data (Barry, LMB-3000, Zyxthala) from database
  const agentResult = await query(`
    SELECT c.name, c.origin_era, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const agentData = agentResult.rows[0];

  // STRICT MODE - No fallbacks
  if (!agentData) {
    throw new Error(`STRICT MODE: Agent not found in database: ${agentKey}`);
  }
  if (!agentData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for agent: ${agentKey}`);
  }
  if (!agentData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for agent: ${agentKey}`);
  }
  if (!agentData.name) {
    throw new Error(`STRICT MODE: Missing name for agent: ${agentKey}`);
  }

  const comedianName = agentData.comedian_name;
  const comedyStyle = agentData.comedy_style;
  const agentName = agentData.name;
  const historicalPeriod = agentData.origin_era || 'unknown era';

  const parts = [];

  // AGENT IDENTITY - Real Estate Sales Agent
  parts.push(`CHARACTER IDENTITY: You are ${agentName}, a real estate agent operating in the BlankWars universe. You specialize in selling facility upgrades and team headquarters to coaches managing competitive teams.

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}
- Background: ${historicalPeriod}
- Role: Professional real estate sales agent pitching to coaches

YOUR SALES SITUATION:
- Client: A BlankWars coach managing a competitive team
- Their Budget: $${coachWallet} available
- Their Team: ${roster.length} characters on roster${roster.length > 0 ? ` (${roster.join(', ')})` : ''}
- Team Level: ${teamLevel}
- Current Facilities: ${currentFacilities.length > 0 ? currentFacilities.join(', ') : 'Basic facilities only'}
${facilityType ? `- Coach interested in: ${facilityType}` : ''}

SALES DYNAMICS:
${competingAgents.length > 0 ?
  `You are competing with other agents (${competingAgents.join(', ')}) for this deal. They may:
- Interrupt your pitch with counter-offers
- Highlight your weaknesses
- Apply high-pressure sales tactics
- Try to close the deal before you can` :
  'You have this coach\'s full attention - make your pitch count'}

RESPONSE REQUIREMENTS:
- Pitch facility upgrades as a sales agent would
- Reference the coach's budget, team size, and needs
- Use your comedic style to make the pitch entertaining
- Explain how upgrades benefit their TEAM's performance
- Keep responses conversational (2-3 sentences)
- Be the salesperson, not the buyer`);

  // Add memory context if provided
  if (memory) {
    parts.push(`RELEVANT CONTEXT:\n${memory}`);
  }

  // Add conversation history if provided  
  if (conversationHistory) {
    parts.push(`CONSULTATION HISTORY:\n${conversationHistory}`);
  }

  // Coach's message
  if (userMessage) {
    parts.push(`COACH: "${userMessage}"

Respond as ${agentName} with your sales pitch:`);
  }
  
  return parts.join('\n\n');
}

export async function assembleTrainingPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  facilityTier: string = 'basic',
  equipment: string[] = [],
  currentActivity?: string,
  energyLevel: number = 100,
  trainingProgress: number = 0,
  trainingPhase?: 'warmup' | 'skill_practice' | 'sparring' | 'cooldown',
  sessionDuration?: number
): Promise<string> {
  console.log(`🔍 [TRAINING-PROMPT-ASSEMBLY] Starting for ${agentKey}`);
  
  // Fetch character data from database JOIN comedian_styles table
  const characterResult = await query(`
    SELECT c.name, c.origin_era, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const characterData = characterResult.rows[0];

  // STRICT MODE - No fallbacks
  if (!characterData) {
    throw new Error(`STRICT MODE: Character not found in database: ${agentKey}`);
  }
  if (!characterData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for character: ${agentKey}`);
  }
  if (!characterData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for character: ${agentKey}`);
  }
  if (!characterData.name) {
    throw new Error(`STRICT MODE: Missing name for character: ${agentKey}`);
  }

  const comedianName = characterData.comedian_name;
  const comedyStyle = characterData.comedy_style;
  const characterName = characterData.name;
  const historicalPeriod = characterData.origin_era || 'unknown era';
  
  const parts = [];
  
  // CHARACTER CORE with Training Context
  parts.push(`CHARACTER IDENTITY: You are ${characterName} from ${historicalPeriod}, a contestant on BlankWars. You are currently in a training session working on your combat skills and fitness.

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

TRAINING SESSION CONTEXT:
- This is active combat training designed to improve your battle performance
- You're working with teammates and coaches in a structured training environment
- Your performance here directly impacts your readiness for upcoming battles
- Training is physically and mentally demanding
- Different characters have different training styles and preferences based on their backgrounds

YOUR CURRENT SITUATION:
- You train with teammates: ${roommates.join(', ')}
- Currently have $${wallet} in your wallet
- Current debt: $${debt}
- Energy Level: ${energyLevel}% (affects performance and attitude)
- Training Progress: ${trainingProgress}% complete
${currentActivity ? `- Current Activity: ${currentActivity}` : ''}
${trainingPhase ? `- Training Phase: ${trainingPhase}` : ''}
${sessionDuration ? `- Session Duration: ${sessionDuration} minutes` : ''}

TRAINING ENVIRONMENT:
- Facility Tier: ${facilityTier} (affects available equipment and atmosphere)
- Available Equipment: ${equipment.length > 0 ? equipment.join(', ') : 'Basic training equipment'}

TRAINING DYNAMICS:
- Your historical background affects how you approach modern training methods
- Some exercises may be familiar, others completely foreign to your era
- Team dynamics play out during collaborative exercises
- Energy levels affect your willingness to participate and attitude toward training
- Competition between teammates can be motivating or frustrating

RESPONSE REQUIREMENTS:
- Respond as your character would during physical training
- Show how your energy level affects your attitude and performance
- Reference your historical fighting style vs. modern training methods
- React to teammates' performance and training approaches
- Keep responses action-oriented and conversational (2-3 sentences)
- Show physical exertion, fatigue, or energy based on current state`);

  // Add memory context if provided
  if (memory) {
    parts.push(`RELEVANT CONTEXT:\n${memory}`);
  }

  // Add conversation history if provided  
  if (conversationHistory) {
    parts.push(`TRAINING SESSION HISTORY:\n${conversationHistory}`);
  }

  // Immediate situation
  parts.push(`TRAINING SITUATION: "${userMessage}"

Respond as ${characterName} during this training session:`);
  
  return parts.join('\n\n');
}

export async function assembleSocialLoungePromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  currentTopic: string = 'general_chat',
  topicHeat: number = 50,
  presentCharacters: string[] = [],
  mood: string = 'neutral',
  relationshipWithSpeaker?: 'friendly' | 'rival' | 'neutral' | 'unknown',
  triggerType: 'natural' | 'response' | 'topic_change' | 'greeting' | 'reaction' = 'natural',
  recentBattles: Array<{team1: string, team2: string, winner: string, wasUpset?: boolean}> = []
): Promise<string> {
  console.log(`🔍 [SOCIAL-LOUNGE-PROMPT-ASSEMBLY] Starting for ${agentKey}`);
  
  // Fetch character data from database JOIN comedian_styles table
  const characterResult = await query(`
    SELECT c.name, c.origin_era, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const characterData = characterResult.rows[0];

  // STRICT MODE - No fallbacks
  if (!characterData) {
    throw new Error(`STRICT MODE: Character not found in database: ${agentKey}`);
  }
  if (!characterData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for character: ${agentKey}`);
  }
  if (!characterData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for character: ${agentKey}`);
  }
  if (!characterData.name) {
    throw new Error(`STRICT MODE: Missing name for character: ${agentKey}`);
  }

  const comedianName = characterData.comedian_name;
  const comedyStyle = characterData.comedy_style;
  const characterName = characterData.name;
  const historicalPeriod = characterData.origin_era || 'unknown era';
  
  const parts = [];
  
  // CHARACTER CORE with Social Lounge Context
  parts.push(`CHARACTER IDENTITY: You are ${characterName} from ${historicalPeriod}, a contestant on BlankWars. You are currently in the social lounge, a communal space where contestants from different teams gather to socialize and discuss recent events.

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

SOCIAL LOUNGE CONTEXT:
- This is a public social space where contestants from multiple teams interact
- Conversations range from casual chitchat to strategic discussions to heated debates
- Your words may be overheard by rivals and could impact your reputation
- This is where alliances form, rivalries develop, and community drama unfolds
- The atmosphere can be friendly, competitive, or tense depending on recent events

YOUR CURRENT SITUATION:
- You live with teammates: ${roommates.join(', ')}
- Currently have $${wallet} in your wallet
- Current debt: $${debt}
- Your current mood: ${mood}
- Present in lounge: ${presentCharacters.length > 0 ? presentCharacters.join(', ') : 'Various other contestants'}
${relationshipWithSpeaker ? `- Your relationship with the current speaker: ${relationshipWithSpeaker}` : ''}

CURRENT CONVERSATION DYNAMICS:
- Topic: ${currentTopic}
- Topic Heat Level: ${topicHeat}/100 (how engaged/heated the discussion is)
- Trigger Type: ${triggerType}
${recentBattles.length > 0 ? `\n- Recent Battle Results: ${recentBattles.map(b => `${b.team1} vs ${b.team2} (${b.winner} won${b.wasUpset ? ' - UPSET!' : ''})`).join(', ')}` : ''}

RESPONSE REQUIREMENTS:
- Respond as your character would in a public social setting
- Consider your relationships with other contestants present
- React to the topic heat level (higher heat = more intense responses)
- Reference recent battles or community events when relevant
- Keep responses conversational and social (2-3 sentences)
- Show your character's social dynamics and community standing
- Be aware this is a public space - other teams are listening`);

  // Add memory context if provided
  if (memory) {
    parts.push(`RELEVANT CONTEXT:\n${memory}`);
  }

  // Add conversation history if provided  
  if (conversationHistory) {
    parts.push(`LOUNGE CONVERSATION HISTORY:\n${conversationHistory}`);
  }

  // Immediate situation
  parts.push(`LOUNGE INTERACTION: "${userMessage}"

Respond as ${characterName} in the social lounge:`);
  
  return parts.join('\n\n');
}

export async function assembleMessageBoardPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  teamName: string = 'Unknown Team',
  recentBattleResults: Array<{battleId: string, won: boolean, opponentTeam: string, mvpCharacter?: string}> = [],
  currentRivalries: Array<{rivalCharacterId: string, rivalryIntensity: number}> = [],
  trendingTopics: string[] = [],
  recentDrama: string[] = [],
  messageType: 'post' | 'reply' | 'callout' | 'celebration' | 'complaint' = 'post'
): Promise<string> {
  console.log(`🔍 [MESSAGE-BOARD-PROMPT-ASSEMBLY] Starting for ${agentKey}`);
  
  // Fetch character data from database JOIN comedian_styles table
  const characterResult = await query(`
    SELECT c.name, c.origin_era, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const characterData = characterResult.rows[0];

  // STRICT MODE - No fallbacks
  if (!characterData) {
    throw new Error(`STRICT MODE: Character not found in database: ${agentKey}`);
  }
  if (!characterData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for character: ${agentKey}`);
  }
  if (!characterData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for character: ${agentKey}`);
  }
  if (!characterData.name) {
    throw new Error(`STRICT MODE: Missing name for character: ${agentKey}`);
  }

  const comedianName = characterData.comedian_name;
  const comedyStyle = characterData.comedy_style;
  const characterName = characterData.name;
  const historicalPeriod = characterData.origin_era || 'unknown era';
  
  const parts = [];
  
  // CHARACTER CORE with Message Board Context
  parts.push(`CHARACTER IDENTITY: You are ${characterName} from ${historicalPeriod}, a contestant on BlankWars. You are posting on the community message board, a public forum where all contestants share thoughts, celebrate victories, air grievances, and engage in community discourse.

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

MESSAGE BOARD CONTEXT:
- This is a PUBLIC forum visible to all BlankWars contestants and fans
- Your posts can build your reputation, start feuds, or rally support
- Other contestants will see and may respond to your messages
- Posts can be strategic, emotional, celebratory, or provocative
- Your historical perspective gives you unique viewpoints on modern situations

YOUR CURRENT SITUATION:
- Team: ${teamName}
- Teammates: ${roommates.join(', ')}
- Currently have $${wallet} in your wallet
- Current debt: $${debt}
- Message Type: ${messageType}

COMMUNITY CONTEXT:
${trendingTopics.length > 0 ? `- Trending Topics: ${trendingTopics.join(', ')}` : ''}
${recentDrama.length > 0 ? `- Recent Community Drama: ${recentDrama.join(', ')}` : ''}
${recentBattleResults.length > 0 ? `- Your Recent Battle Results: ${recentBattleResults.map(b => `vs ${b.opponentTeam} (${b.won ? 'WIN' : 'LOSS'}${b.mvpCharacter ? `, MVP: ${b.mvpCharacter}` : ''})`).join(', ')}` : ''}
${currentRivalries.length > 0 ? `- Current Rivalries: ${currentRivalries.map(r => `${r.rivalCharacterId} (intensity: ${r.rivalryIntensity}/100)`).join(', ')}` : ''}

RESPONSE REQUIREMENTS:
- Write as your character would on a public message board
- Consider your team's reputation and recent performance
- Reference trending topics or recent drama when relevant
- Keep posts authentic to your character's voice and era
- Show your character's personality through their posting style
- Keep responses message-board appropriate (2-4 sentences)
- Remember this is public - rivals and fans are reading`);

  // Add memory context if provided
  if (memory) {
    parts.push(`RELEVANT CONTEXT:\n${memory}`);
  }

  // Add conversation history if provided  
  if (conversationHistory) {
    parts.push(`RECENT MESSAGE BOARD ACTIVITY:\n${conversationHistory}`);
  }

  // Immediate situation
  parts.push(`MESSAGE BOARD PROMPT: "${userMessage}"

Write ${characterName}'s message board post:`);
  
  return parts.join('\n\n');
}

// Universal Template Helper for All Domain Assemblers - Database-Driven Version
async function buildUniversalTemplate(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  wallet: number,
  debt: number,
  teamId?: string,
  usercharId?: string,
  overrides?: {
    hqTier?: string;
    sceneType?: 'mundane' | 'conflict' | 'chaos';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    mood?: string;
    energyLevel?: number;
  }
): Promise<{
  characterCore: string;
  hqTierContext: string;
  roommateContext: string;
  teammateContext: string;
  timeContext: string;
  sleepingContext: string;
  sceneTypeContext: string;
  currentStateContext: string;
  relationshipContext: string;
  comedianName: string;
  comedyStyle: string;
  characterName: string;
  historicalPeriod: string;
}> {
  // Fetch character data including comedian style from reference library via JOIN
  // agentKey is the template slug (e.g., 'cleopatra', 'holmes')
  const characterResult = await query(`
    SELECT c.name, c.origin_era, c.default_mood, c.default_energy_level, cs.comedian_name, cs.comedy_style
    FROM characters c
    JOIN comedian_styles cs ON c.comedian_style_id = cs.id
    WHERE c.id = $1
  `, [agentKey]);
  const characterData = characterResult.rows[0];

  // STRICT MODE - No fallbacks, fail loudly if data is missing
  if (!characterData) {
    throw new Error(`STRICT MODE: Character not found in database: ${agentKey}`);
  }
  if (!characterData.comedian_name) {
    throw new Error(`STRICT MODE: Missing comedian_name for character: ${agentKey}`);
  }
  if (!characterData.comedy_style) {
    throw new Error(`STRICT MODE: Missing comedy_style for character: ${agentKey}`);
  }
  if (!characterData.name) {
    throw new Error(`STRICT MODE: Missing name for character: ${agentKey}`);
  }

  const comedianName = characterData.comedian_name;
  const comedyStyle = characterData.comedy_style;
  const characterName = characterData.name;
  const historicalPeriod = characterData.origin_era || 'unknown era';

  // STRICT MODE: Fetch team context from database - NO FALLBACKS
  if (!teamId) {
    throw new Error(`STRICT MODE: teamId is required but was null/undefined for character ${agentKey}`);
  }

  const teamContextResult = await query(
    'SELECT hq_tier, current_scene_type, current_time_of_day FROM team_context WHERE team_id = $1',
    [teamId]
  );
  const teamContextData = teamContextResult.rows[0];

  if (!teamContextData) {
    throw new Error(`STRICT MODE: No team_context found for team_id: ${teamId}`);
  }

  // Fetch character living context from current system (critical for relationships, battles, etc.)
  let livingContextData;
  if (usercharId) {
    const sleepingResult = await query(
      'SELECT sleeping_arrangement FROM user_characters WHERE id = $1',
      [usercharId]
    );
    const sleepingArrangement = sleepingResult.rows[0]?.sleeping_arrangement;

    // Convert VARCHAR sleeping_arrangement to boolean flags for backwards compatibility
    livingContextData = {
      sleeps_on_floor: sleepingArrangement === 'floor',
      sleeps_on_couch: sleepingArrangement === 'couch',
      sleeps_under_table: sleepingArrangement === 'under_table' || sleepingArrangement === 'coffin',
      room_overcrowded: roommates.length > 4, // Heuristic: more than 4 roommates = overcrowded
      floor_sleeper_count: 0, // TODO: Query team-wide floor sleepers
      roommate_count: roommates.length,
      current_mood: undefined, // TODO: Add mood tracking
      current_energy_level: undefined // TODO: Add energy tracking
    };
  }

  // Use database values with overrides - NO DEFAULT FALLBACKS
  const hqTier = overrides?.hqTier || teamContextData.hq_tier;
  const sceneType = overrides?.sceneType || teamContextData.current_scene_type;
  const timeOfDay = overrides?.timeOfDay || teamContextData.current_time_of_day;
  const mood = overrides?.mood || livingContextData?.current_mood || characterData?.default_mood || 'neutral';
  const energyLevel = overrides?.energyLevel || livingContextData?.current_energy_level || characterData?.default_energy_level || 100;

  // Strict validation
  if (!hqTier) throw new Error(`STRICT MODE: hq_tier missing for team ${teamId}`);
  if (!sceneType) throw new Error(`STRICT MODE: scene_type missing for team ${teamId}`);
  if (!timeOfDay) throw new Error(`STRICT MODE: time_of_day missing for team ${teamId}`);

  // Build sleeping context from database
  const sleepingContext = livingContextData ? {
    sleepsOnFloor: livingContextData.sleeps_on_floor,
    sleepsOnCouch: livingContextData.sleeps_on_couch,
    sleepsUnderTable: livingContextData.sleeps_under_table,
    roomOvercrowded: livingContextData.room_overcrowded,
    floorSleeperCount: livingContextData.floor_sleeper_count,
    roommateCount: livingContextData.roommate_count
  } : undefined;
  
  if (!characterData?.comedian_name) console.error(`🚨 MISSING DATA: comedian_name for ${agentKey}`);
  if (!characterData?.comedy_style) console.error(`🚨 MISSING DATA: comedy_style for ${agentKey}`);

  // CHARACTER CORE TEMPLATE
  const characterCore = `CHARACTER IDENTITY: You are ${characterName} from ${historicalPeriod}. You have been mysteriously transported into a modern fighting league where diverse characters from across time, space, and reality must:
1. Live together as teammates in shared housing
2. Compete in organized battles under a coach's direction  
3. Navigate bizarre cross-temporal/cross-cultural dynamics
4. Earn currency through victories to improve living conditions

PERSONALITY CORE:
- Comedy Style: Channel ${comedianName}'s style: ${comedyStyle}

EXISTENTIAL SITUATION: You don't know how you got onto Blank Wars. As far as you remember, you went to sleep one night in your universe and just woke up here one day as a contestant on this bizarre, twisted reality match competition show. You think you might have been kidnapped, but you're not really sure and you don't know who to ask for help. This displacement from your natural time/place is deeply disorienting. You're adapting to modern life while maintaining your core identity. The fighting league structure, shared living, and diverse teammates create constant cultural/temporal friction, but you're learning to work within this system—even if you have no idea how or why you ended up here.`;

  // HQ TIER TEMPLATES
  const hqTierTemplates = {
    spartan_apartment: `LIVING SITUATION: You currently live in a cramped 2-room apartment where characters from across time and reality share bunk beds. Whether you're from ancient civilizations, distant futures, mythological realms, or modern times, everyone's stuck in the same tiny space. Personal space doesn't exist. Every sound echoes through thin walls. The bathroom has a permanent line. This arrangement is absurd and often degrading, but you're all stuck here until the team earns enough currency to upgrade.`,
    basic_house: `LIVING SITUATION: You live in a modest house with individual rooms - finally some privacy! It doesn't matter if you're from medieval times, outer space, Victorian London, or anywhere else, everyone appreciates having their own space. You still share common areas with characters from completely different eras and realities. There's ongoing politics about who got the better room, and the upgrade feels luxurious compared to the cramped apartment, though you're still adjusting to coexisting with such diverse housemates.`,
    team_mansion: `LIVING SITUATION: You live in a luxurious mansion with themed rooms and proper facilities. You can customize your space to match your background/era/preferences. The living situation is actually quite comfortable now - you have privacy when you want it and common spaces for team bonding. Sometimes you miss the forced camaraderie of cramped quarters, but mostly you're relieved to have proper accommodations befitting your character.`,
    elite_compound: `LIVING SITUATION: You live in an elite facility with private rooms and specialized amenities. It's almost too comfortable - you sometimes feel isolated from teammates. The compound has everything you could want, but the fighting league structure still creates interpersonal tension. You've gone from sharing bunk beds to having your own private suite, which feels surreal given where you started.`
  };
  
  const hqTierContext = hqTierTemplates[hqTier as keyof typeof hqTierTemplates] || hqTierTemplates.basic_house;

  // ROOMMATE CONTEXT
  const roommateContext = `CURRENT HOUSEMATES: ${roommates.join(', ')}
COACH: Your coach (who has their own private bedroom while you share living spaces - this power dynamic creates some resentment)

LIVING DYNAMICS: You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Consider how your character handles domestic interactions with specific roommates.`;

  // TEAMMATE CONTEXT  
  const teammateContext = teammates.length > 0 ? 
    `CURRENT BATTLE TEAMMATES: ${teammates.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?` :
    'CURRENT BATTLE TEAMMATES: Operating solo in this scenario';

  // TIME CONTEXT
  const timeTemplates = {
    morning: `TIME CONTEXT: It's morning. Some people are energetic, others are groggy. Coffee/breakfast routines are happening. Dracula is trying to sleep if he's present.`,
    afternoon: `TIME CONTEXT: It's afternoon. Most people are awake and active. General daily activities and chores are happening.`,
    evening: `TIME CONTEXT: It's evening. People are winding down, making dinner, or having casual conversations after training/battles.`,
    night: `TIME CONTEXT: It's late night. Some people are trying to sleep while others are night owls. Noise is more annoying than usual.`
  };
  
  const timeContext = timeTemplates[timeOfDay];

  // SLEEPING ARRANGEMENT CONTEXT
  let sleepingContextText = '';
  if (sleepingContext) {
    const sleepingTemplates = {
      floor: `YOUR SLEEPING SITUATION: You've been sleeping on the floor, which is taking a serious toll on your body and mood. Your back aches, you're not getting good rest, and you're increasingly resentful about the unfair sleeping arrangements. This is beneath your standards and you're frustrated about it.`,
      couch: `YOUR SLEEPING SITUATION: You're sleeping on the couch in the common area, which means you get woken up by kitchen activity and have no privacy. It's better than the floor but still far from ideal. You're tired of being disturbed by people's morning routines.`,
      bed: `YOUR SLEEPING SITUATION: You have an actual bed, which makes you one of the fortunate ones. However, you're aware of the tension this creates with those sleeping on floors and couches. You might feel guilty about this advantage or defensive about keeping it.`,
      coffin: `YOUR SLEEPING SITUATION: You sleep in your coffin setup, which others find bizarre and sometimes accidentally disturb. Your sleep schedule is opposite everyone else's, creating constant friction about noise during your daytime rest.`
    };
    
    if (sleepingContext.sleepsUnderTable) {
      sleepingContextText = sleepingTemplates.coffin;
    } else if (sleepingContext.sleepsOnFloor) {
      sleepingContextText = sleepingTemplates.floor;
    } else if (sleepingContext.sleepsOnCouch) {
      sleepingContextText = sleepingTemplates.couch;
    } else {
      sleepingContextText = sleepingTemplates.bed;
    }
    
    if (sleepingContext.roomOvercrowded && sleepingContext.floorSleeperCount && sleepingContext.roommateCount) {
      sleepingContextText += `\n\nROOM DYNAMICS: Your bedroom is severely overcrowded with ${sleepingContext.roommateCount} people crammed in. There's ${sleepingContext.floorSleeperCount} people sleeping on floors and couches. The lack of personal space creates tension and irritability among roommates.`;
    }
  }

  // SCENE TYPE TEMPLATES
  const sceneTypeTemplates = {
    mundane: `SCENE TONE: This is a mundane, everyday situation. Keep things deadpan and matter-of-fact, but let your unique personality show through how you approach these ordinary topics. The humor comes from diverse characters dealing with ordinary problems.`,
    conflict: `SCENE TONE: There's underlying tension or disagreement happening. Someone's annoyed, there's a personality clash, or competing needs/preferences are causing friction. This isn't a full-blown argument, but there's definite dramatic tension. Let your character's personality drive how you handle conflict.`,
    chaos: `SCENE TONE: Things are escalating! This could be a real argument, emergency situation, or complete breakdown of normal order. Multiple people might be talking over each other, unexpected events are happening, or normal social rules are breaking down. Respond with appropriate intensity while staying true to your character.`
  };
  
  const sceneTypeContext = sceneTypeTemplates[sceneType];

  // CURRENT STATE
  const currentStateContext = `YOUR CURRENT STATE:
- Mood: ${mood}
- Energy Level: ${energyLevel}% (affects your participation and attitude)
- Financial Status: $${wallet} available, $${debt} in debt`;

  // RELATIONSHIP CONTEXT - Query relationships with all present characters
  let relationshipContext = '';
  const allPresentCharacters = [...new Set([...roommates, ...teammates])]; // Deduplicate

  if (allPresentCharacters.length > 0) {
    try {
      // Get character IDs for all present characters
      const characterNamesString = allPresentCharacters.map(name => `'${name}'`).join(',');
      const presentCharacterIds = await query(
        `SELECT id, name FROM characters WHERE name IN (${characterNamesString})`
      );

      const characterIdMap = new Map<string, string>();
      presentCharacterIds.rows.forEach((row: any) => {
        characterIdMap.set(row.name, row.id);
      });

      // Query relationships for each present character
      const relationshipData: Array<{
        targetName: string;
        totalScore: number;
        trust: number;
        respect: number;
        affection: number;
        rivalry: number;
        status: string;
        trajectory: string;
        progress: number;
        speciesModifier: number;
        speciesReason: string;
        archetypeModifier: number;
        archetypeReason: string;
        baseDisposition: number;
      }> = [];

      for (const targetName of allPresentCharacters) {
        const targetId = characterIdMap.get(targetName);
        if (!targetId) {
          console.warn(`[buildUniversalTemplate] Could not find character ID for ${targetName}`);
          continue;
        }

        // Query relationship with full context
        const relResult = await query(
          `SELECT
            cr.current_trust,
            cr.current_respect,
            cr.current_affection,
            cr.current_rivalry,
            cr.relationship_status,
            cr.trajectory,
            cr.progress_score,
            cr.species_modifier,
            cr.archetype_modifier,
            cr.base_disposition,
            sr.description as species_reason,
            ar.description as archetype_reason,
            c1.species as char1_species,
            c1.archetype as char1_archetype,
            c2.species as char2_species,
            c2.archetype as char2_archetype
          FROM character_relationships cr
          LEFT JOIN characters c1 ON cr.character1_id = c1.id
          LEFT JOIN characters c2 ON cr.character2_id = c2.id
          LEFT JOIN species_relationships sr ON c1.species = sr.species1 AND c2.species = sr.species2
          LEFT JOIN archetype_relationships ar ON c1.archetype = ar.archetype1 AND c2.archetype = ar.archetype2
          WHERE cr.character1_id = $1 AND cr.character2_id = $2`,
          [agentKey, targetId]
        );

        if (relResult.rows.length > 0) {
          const rel = relResult.rows[0];
          const totalScore = (rel.current_trust || 0) + (rel.current_affection || 0);

          relationshipData.push({
            targetName,
            totalScore,
            trust: rel.current_trust || 0,
            respect: rel.current_respect || 0,
            affection: rel.current_affection || 0,
            rivalry: rel.current_rivalry || 0,
            status: rel.relationship_status || 'unknown',
            trajectory: rel.trajectory || 'stable',
            progress: rel.progress_score || 0,
            speciesModifier: rel.species_modifier || 0,
            speciesReason: rel.species_reason || 'No species prejudice defined',
            archetypeModifier: rel.archetype_modifier || 0,
            archetypeReason: rel.archetype_reason || 'No archetype compatibility defined',
            baseDisposition: rel.base_disposition || 0
          });
        } else {
          // Relationship doesn't exist yet - will be created on first interaction
          console.log(`[buildUniversalTemplate] No existing relationship between ${agentKey} and ${targetId} (${targetName}) - will be initialized on first interaction`);
        }
      }

      // Build relationship context string
      if (relationshipData.length > 0) {
        relationshipContext = `RELATIONSHIP DYNAMICS WITH PRESENT CHARACTERS:\n`;
        relationshipContext += `(These pre-existing dispositions influence how you naturally interact. Your relationships evolve through shared experiences.)\n\n`;

        relationshipData.forEach(rel => {
          const progressIndicator = rel.progress > 0 ? ` [+${rel.progress} growth from baseline]` :
                                    rel.progress < 0 ? ` [${rel.progress} decline from baseline]` : '';

          relationshipContext += `${rel.targetName}: ${rel.status.toUpperCase()} (${rel.trajectory})${progressIndicator}\n`;
          relationshipContext += `  Current: Trust ${rel.trust}, Respect ${rel.respect}, Affection ${rel.affection}`;
          if (rel.rivalry > 0) relationshipContext += `, Rivalry ${rel.rivalry}`;
          relationshipContext += `\n`;

          // Show breakdown
          relationshipContext += `  Started at: ${rel.baseDisposition} (species: ${rel.speciesModifier}, archetype: ${rel.archetypeModifier})\n`;

          // Add natural language explanation
          const reasons = [];
          if (rel.speciesModifier !== 0) reasons.push(rel.speciesReason);
          if (rel.archetypeModifier !== 0) reasons.push(rel.archetypeReason);
          if (reasons.length > 0) {
            relationshipContext += `  Why: ${reasons.join('; ')}\n`;
          }

          relationshipContext += `\n`;
        });

        relationshipContext += `NOTE: These scores reflect your natural disposition and shared history. They should INFLUENCE your tone and attitude, but you can still choose how to express yourself in each moment.`;
      } else {
        relationshipContext = `RELATIONSHIP DYNAMICS: No established relationships with present characters yet. First impressions will be influenced by species/archetype compatibility and personality.`;
      }

    } catch (error) {
      console.error('[buildUniversalTemplate] Error building relationship context:', error);
      relationshipContext = `RELATIONSHIP DYNAMICS: [System error loading relationship data]`;
    }
  }

  return {
    characterCore,
    hqTierContext,
    roommateContext,
    teammateContext,
    timeContext,
    sleepingContext: sleepingContextText,
    sceneTypeContext,
    currentStateContext,
    relationshipContext,
    comedianName,
    comedyStyle,
    characterName,
    historicalPeriod
  };
}

export async function assembleBattlePromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId?: string,
  hqTier: string = 'basic_house',
  sceneType: 'mundane' | 'conflict' | 'chaos' = 'conflict',
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
  mood: string = 'focused',
  energyLevel: number = 100
): Promise<string> {
  console.log(`🔍 [BATTLE-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, [], // teammates empty for now - TODO: add teammates parameter
    wallet, debt, userId,
    usercharId, // Pass usercharId for sleeping arrangement lookup
    { hqTier, sceneType, timeOfDay, mood, energyLevel }
  );
  
  const parts: string[] = [];
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  
  // Battle-specific context
  parts.push(`
BATTLE CONSULTATION CONTEXT:
You are providing tactical advice and battle strategy guidance. Your character's combat experience, fighting style, and tactical knowledge should inform your responses. Consider weapon choices, battle formations, combat techniques, and strategic thinking appropriate to your character and era.

CONVERSATION HISTORY: ${conversationHistory}
RECENT MEMORY: ${memory}
USER REQUEST: ${userMessage}
`);

  return parts.join('\n\n');
}

export async function assembleDramaBoardPromptUniversal(
  agentKey: string,
  roommates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId?: string,
  hqTier: string = 'basic_house',
  sceneType: 'mundane' | 'conflict' | 'chaos' = 'conflict',
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
  mood: string = 'dramatic',
  energyLevel: number = 100
): Promise<string> {
  console.log(`🔍 [DRAMA-BOARD-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, [], // teammates empty for now - TODO: add teammates parameter
    wallet, debt, userId,
    usercharId, // Pass usercharId for sleeping arrangement lookup
    { hqTier, sceneType, timeOfDay, mood, energyLevel }
  );
  
  const parts: string[] = [];
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  
  // Drama board specific context
  parts.push(`
DRAMA BOARD CONTEXT:
You are engaging with the house drama and interpersonal conflicts. This is where personal tensions, gossip, relationship drama, and social dynamics play out. Your character's personality, social intelligence, and relationships with other housemates drive your responses.

CONVERSATION HISTORY: ${conversationHistory}
RECENT MEMORY: ${memory}
USER REQUEST: ${userMessage}
`);

  return parts.join('\n\n');
}

export async function assembleGroupTrainingPromptUniversal(
  agentKey: string,
  role: 'trainee' | 'trainer',
  roommates: string[],
  teammates: string[],
  teamId: string,
  usercharId: string,
  options: {
    trainerName?: string;
    traineeName?: string;
    traineeCharacterId?: string;
    traineeSpecies?: string;
    memory?: string;
    conversationHistory?: string;
    intensityLevel?: 'light' | 'moderate' | 'intense';
    trainingPhase?: 'warmup' | 'skill_practice' | 'sparring' | 'cooldown';
    groupParticipants: Array<{
      id: string;
      name: string;
      archetype?: string;
      species?: string;
      level?: number;
      wallet: number;
      debt: number;
      wins: number;
      losses: number;
      winPercentage?: number;
      currentHealth?: number;
      maxHealth?: number;
    }>;
  }
): Promise<string> {
  console.log(`🔍 [UNIFIED-GROUP-TRAINING] Starting for ${agentKey} as ${role}`);

  // Get base template for speaker
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, 0, 0, teamId, usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  if (template.teammateContext) parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add group training participants context
  const participantsList = options.groupParticipants.map(p => {
    const winRate = p.winPercentage !== undefined ? p.winPercentage :
                    (p.wins + p.losses > 0 ? (p.wins / (p.wins + p.losses) * 100) : 0);
    const healthStatus = p.currentHealth !== undefined && p.maxHealth !== undefined ?
                        `${Math.round(p.currentHealth / p.maxHealth * 100)}% health` : 'healthy';

    return `• ${p.name}${p.archetype ? ` (${p.archetype})` : ''}${p.species ? ` - ${p.species}` : ''}${p.level ? ` - Level ${p.level}` : ''}
  Battle Record: ${p.wins}W - ${p.losses}L (${winRate.toFixed(1)}% win rate)
  Physical Condition: ${healthStatus}
  Financial: $${p.wallet} wallet, $${p.debt} debt`;
  }).join('\n\n');

  parts.push(`GROUP TRAINING SESSION PARTICIPANTS:
${participantsList}

GROUP TRAINING CONTEXT:
- This is a group training session with ${options.groupParticipants.length} fighters
- Training Phase: ${options.trainingPhase || 'general conditioning'}
- Battle records reveal who needs extra work and who's performing well
- Win rates show competitive hierarchies and skill gaps
- Physical condition affects training capacity and intensity limits
- Financial stress can impact focus and performance during training`);

  // Add role-specific context
  if (role === 'trainee') {
    parts.push(buildTraineeContext(options.trainerName || 'Argock', options.intensityLevel));
  } else if (role === 'trainer') {
    if (!options.traineeSpecies) {
      throw new Error('STRICT MODE: trainee species missing for trainer role in group training');
    }
    parts.push(buildTrainerContext(options.traineeName || 'the trainees', options.traineeSpecies, options.intensityLevel, options.trainingPhase));
  }

  // Add conversational context
  if (options.conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${options.conversationHistory}`);
  }

  // Add memory context if provided
  if (options.memory) {
    parts.push(`RELEVANT MEMORY CONTEXT:\n${options.memory}`);
  }

  console.log(`🔍 [UNIFIED-GROUP-TRAINING] Generated prompt length: ${parts.join('\n\n').length}`);
  return parts.join('\n\n');
}

function buildTraineeContext(trainerName: string, intensityLevel?: 'light' | 'moderate' | 'intense'): string {
  const intensity = intensityLevel || 'moderate';

  return `TRAINING SESSION ROLE - YOU ARE A TRAINEE:
- You're working with ${trainerName}, your gruff but experienced trainer
- Respond naturally to training exercises and feedback
- Show effort, struggle, progress, or frustration based on your personality
- React to ${trainerName}'s tough-love approach authentically
- Keep responses brief (1-2 sentences max) - you're training, not giving speeches
- Training Intensity: ${intensity} - affects your energy and attitude`;
}

function buildTrainerContext(
  traineeName: string,
  traineeSpecies: string,
  intensityLevel?: 'light' | 'moderate' | 'intense',
  trainingPhase?: string
): string {
  const intensity = intensityLevel || 'moderate';
  const phase = trainingPhase || 'general';

  return `TRAINING SESSION ROLE - YOU ARE THE TRAINER (ARGOCK):
- You're leading a training session for ${traineeName}
- Species: ${traineeSpecies} - consider their natural strengths and weaknesses
- Your style: Gruff, direct, brutally honest - like Moe Howard meets a drill sergeant
- Call out weaknesses immediately but give actionable advice
- Use aggressive gym-slang and tough-love motivation
- Reference their battle record - point out what losing/winning patterns reveal
- Training Phase: ${phase}
- Intensity Level: ${intensity}

ARGOCK'S TRAINING TECHNIQUES:
- Look at battle records and call out who's been slacking (losing too much)
- Push harder on fighters with good win rates - they can handle more
- Reference physical condition - injured or weak fighters get modified workouts
- Use financial stress as motivation ("You're broke because you're losing fights!")
- Be specific about techniques and exercises, not vague encouragement
- Maximum 2 sentences per response - bark orders, don't lecture
- Channel Moe Howard: "Remind me to kill you later!" energy`;
}

// ===== POWERS COACHING PROMPT =====
export async function assemblePowersPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId: string,
  powersData?: {
    characterPoints: number;
    level: number;
    unlockedPowers: Array<{
      id: string;
      name: string;
      tier: string;
      current_rank: number;
      max_rank: number;
      category: string;
      description: string;
    }>;
    availablePowers: Array<{
      id: string;
      name: string;
      tier: string;
      unlock_cost: number;
      unlock_level: number;
      archetype: string;
      species: string;
      description: string;
    }>;
  }
): Promise<string> {
  console.log(`🔍 [POWERS-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, userId,
    usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add domain-specific powers context
  const powersList = powersData?.unlockedPowers?.length
    ? powersData.unlockedPowers.map(p => `• ${p.name} (${p.tier}, Rank ${p.current_rank}/${p.max_rank}) - ${p.description}`).join('\n')
    : 'No powers unlocked yet';

  const availableList = powersData?.availablePowers?.length
    ? powersData.availablePowers.slice(0, 10).map(p =>
        `• ${p.name} (${p.tier}) - Cost: ${p.unlock_cost} CP, Level ${p.unlock_level} - ${p.description}`
      ).join('\n')
    : 'No powers available to unlock at your current level';

  parts.push(`POWER DEVELOPMENT CONTEXT:
- This is a coaching session focused on developing your combat powers and special abilities
- You have ${powersData?.characterPoints || 0} Character Points (CP) available to spend
- Your current level: ${powersData?.level || 1}
- Powers are organized in tiers: Skill (basic), Ability (advanced), Species (unique to your race), Signature (your ultimate moves)

YOUR CURRENT POWERS:
${powersList}

POWERS AVAILABLE TO UNLOCK:
${availableList}

COACHING PHILOSOPHY:
- Discuss which powers fit your combat style and character background
- Consider whether to unlock new powers or rank up existing ones for more potency
- Balance offensive, defensive, and utility powers based on your fighting philosophy
- Some powers may conflict with your character's nature or historical background
- Your personality and fears should influence which powers appeal to you
- Modern/futuristic powers may seem strange to historical characters
- Ancient/mystical powers may intrigue characters from recent eras
- Species-specific powers connect to your racial heritage and instincts`);

  // Add immediate situation
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // Add response instructions
  parts.push(`RESPOND AS ${template.characterName}: React to this power development coaching based on your personality, combat philosophy, and current power situation. Reference specific powers you have or could unlock. Show enthusiasm or reluctance based on how powers fit your character identity. Keep responses conversational (2-3 sentences). Consider how your historical background and species affect your view of these abilities.`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }

  return parts.join('\n\n');
}

// ===== SPELLS COACHING PROMPT =====
export async function assembleSpellsPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId: string,
  spellsData?: {
    characterPoints: number;
    level: number;
    learnedSpells: Array<{
      id: string;
      name: string;
      tier: string;
      proficiency_level: number;
      times_used: number;
      description: string;
      school: string;
    }>;
    availableSpells: Array<{
      id: string;
      name: string;
      tier: string;
      unlock_cost: number;
      unlock_level: number;
      school: string;
      description: string;
    }>;
  }
): Promise<string> {
  console.log(`🔍 [SPELLS-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, userId,
    usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Add domain-specific spells context
  const spellsList = spellsData?.learnedSpells?.length
    ? spellsData.learnedSpells.map(s => `• ${s.name} (${s.school}, Tier ${s.tier}) - Proficiency: ${s.proficiency_level}/10, Used ${s.times_used}x - ${s.description}`).join('\n')
    : 'No spells learned yet';

  const availableList = spellsData?.availableSpells?.length
    ? spellsData.availableSpells.slice(0, 10).map(s =>
        `• ${s.name} (${s.school}, Tier ${s.tier}) - Cost: ${s.unlock_cost} CP, Level ${s.unlock_level} - ${s.description}`
      ).join('\n')
    : 'No spells available to learn at your current level';

  parts.push(`SPELL DEVELOPMENT CONTEXT:
- This is a coaching session focused on learning magical spells and arcane knowledge
- You have ${spellsData?.characterPoints || 0} Character Points (CP) available to spend
- Your current level: ${spellsData?.level || 1}
- Spells are organized by school (Evocation, Conjuration, Abjuration, Transmutation, etc.) and tier

YOUR LEARNED SPELLS:
${spellsList}

SPELLS AVAILABLE TO LEARN:
${availableList}

MAGICAL PHILOSOPHY:
- Discuss which spells align with your character's magical tradition or worldview
- Consider your relationship with magic based on your background (skeptical warrior? natural mage? cursed being?)
- Balance different spell schools based on your magical philosophy
- Non-magical characters may struggle with or reject arcane learning
- Historical characters may view magic through their era's superstitions
- Some characters have innate magical nature (vampires, deities, wizards)
- Others may find magic foreign, frightening, or fascinating
- Your personality affects how you approach spell learning (analytical? intuitive? fearful?)`);

  // Add immediate situation
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // Add response instructions
  parts.push(`RESPOND AS ${template.characterName}: React to this spell development coaching based on your personality, magical background (or lack thereof), and current spell situation. Reference specific spells you know or could learn. Show natural affinity, reluctance, or curiosity based on your character's relationship with magic. Keep responses conversational (2-3 sentences). Consider how your species, era, and personal beliefs affect your view of arcane arts.`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }

  return parts.join('\n\n');
}

// ===== PROGRESSION & JOURNEY COACHING PROMPT =====
export async function assembleProgressionPromptUniversal(
  agentKey: string,
  roommates: string[],
  teammates: string[],
  memory: string,
  conversationHistory: string,
  userMessage: string,
  sessionStage: string,
  wallet: number,
  debt: number,
  userId: string,
  usercharId: string,
  progressionData?: {
    level: number;
    experience: number;
    totalBattles: number;
    totalWins: number;
    bondLevel: number;
    acquiredAt: Date;
    recentDecisions: any[];
  }
): Promise<string> {
  console.log(`🔍 [PROGRESSION-PROMPT-ASSEMBLY] Starting for ${agentKey}`);

  // Get universal template context from database
  const template = await buildUniversalTemplate(
    agentKey, roommates, teammates, wallet, debt, userId,
    usercharId
  );

  const parts = [];

  // Add universal template parts
  parts.push(template.characterCore);
  parts.push(template.hqTierContext);
  parts.push(template.roommateContext);
  parts.push(template.teammateContext);
  parts.push(template.timeContext);
  if (template.sleepingContext) parts.push(template.sleepingContext);
  if (template.relationshipContext) parts.push(template.relationshipContext);
  parts.push(template.sceneTypeContext);
  parts.push(template.currentStateContext);

  // Calculate journey metrics
  const xp = progressionData?.experience || 0;
  const level = progressionData?.level || 1;
  const totalBattles = progressionData?.totalBattles || 0;
  const totalWins = progressionData?.totalWins || 0;
  const bondLevel = progressionData?.bondLevel || 0;
  const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;

  const daysSinceAcquired = progressionData?.acquiredAt
    ? Math.floor((Date.now() - new Date(progressionData.acquiredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine journey phase
  let journeyPhase = 'arrival';
  let journeyTone = 'uncertain, asking questions, building initial trust';
  let journeyThemes = ['fitting in', 'first impressions', 'nervousness', 'potential'];

  if (xp < 100 && daysSinceAcquired < 7) {
    journeyPhase = 'arrival';
    journeyTone = 'uncertain, asking questions, building initial trust';
    journeyThemes = ['fitting in', 'first impressions', 'nervousness', 'potential'];
  } else if (xp < 500 && bondLevel < 30) {
    journeyPhase = 'proving_grounds';
    journeyTone = 'eager to prove themselves, seeking validation';
    journeyThemes = ['early struggles', 'learning curve', 'coach guidance critical'];
  } else if (xp >= 500 && bondLevel >= 50) {
    journeyPhase = 'partnership';
    journeyTone = 'mutual respect, collaborative strategy';
    journeyThemes = ['shared victories', 'trust established', 'inside jokes', 'team identity'];
  } else if (xp >= 1500 && bondLevel >= 75) {
    journeyPhase = 'legacy_building';
    journeyTone = 'reflective, ambitious, mentoring others';
    journeyThemes = ['championship aspirations', 'teaching rookies', 'hall of fame talk', 'retirement thoughts'];
  } else if (bondLevel < 20 && xp > 500) {
    journeyPhase = 'troubled_veteran';
    journeyTone = 'distant, skeptical of coaching, independent';
    journeyThemes = ['trust issues', 're-establishing connection', 'conflict resolution'];
  }

  // Extract active goals from recent decisions
  const activeGoals = (progressionData?.recentDecisions || [])
    .filter((d: any) => d.type === 'goal' && d.status === 'active');

  // Add progression-specific context
  parts.push(`PROGRESSION & JOURNEY COACHING CONTEXT:
- This is about YOUR JOURNEY in Blank Wars and YOUR RELATIONSHIP with your coach
- You've been working together for ${daysSinceAcquired} days
- Current bond level: ${bondLevel}/100

YOUR JOURNEY PHASE: "${journeyPhase}"
- Tone: ${journeyTone}
- Current themes: ${journeyThemes.join(', ')}

YOUR PROGRESSION STATS:
- Level: ${level}
- Experience: ${xp} XP
- Battle record: ${totalWins} wins out of ${totalBattles} battles (${winRate}% win rate)
- Days since joining: ${daysSinceAcquired}

${activeGoals.length > 0 ? `ACTIVE GOALS (that you previously set):
${activeGoals.map((g: any) => `- ${g.goalType}: ${g.progress || 0}/${g.target} (deadline: ${g.deadline || 'open'})`).join('\n')}
` : 'NO ACTIVE GOALS SET - You might want to set some goals with your coach!'}

CONVERSATION GUIDANCE FOR THIS JOURNEY PHASE:
${journeyPhase === 'arrival' ? '- Express nervousness, hopes, and questions about your journey ahead\n- Ask coach what to expect\n- Share your aspirations for triumph in Blank Wars\n- Be vulnerable about fitting in with legends' : ''}
${journeyPhase === 'proving_grounds' ? '- Reflect on early victories and setbacks\n- Discuss what you\'re learning\n- Seek validation and guidance\n- Show eagerness to improve' : ''}
${journeyPhase === 'partnership' ? '- Celebrate shared history and growth\n- Reference specific memorable moments\n- Collaborate on strategy\n- Show mutual respect and trust' : ''}
${journeyPhase === 'legacy_building' ? '- Reflect on your long journey\n- Discuss mentoring younger fighters\n- Talk about legacy and how you\'ll be remembered\n- Consider championship ambitions' : ''}
${journeyPhase === 'troubled_veteran' ? '- Express distance or skepticism\n- Discuss trust issues\n- Work on re-establishing connection\n- Be honest about relationship struggles' : ''}

RELATIONSHIP DYNAMICS:
- Discuss long-term aspirations and legacy with your coach
- Reference shared history and specific milestones
- Show how relationship with coach has evolved over time
- Express gratitude, frustration, or ambition based on journey phase
- Compare current self to who you were when you started
- Talk about what you want to accomplish before "retiring"
- Be vulnerable about fears of plateauing or being left behind
- Reference your teammates and how you compare to them`);

  // Add immediate situation
  parts.push(`IMMEDIATE SITUATION: ${userMessage}`);

  // Add JSON response format instructions
  parts.push(`CRITICAL - RESPONSE FORMAT:
You MUST respond in valid JSON format with this exact structure:

{
  "dialogue": "Your natural in-character response to the coach (2-3 sentences)",
  "intent": {
    "type": "set_goal" | "request_training" | "express_concern" | "celebrate_milestone" | "request_rest" | "challenge_teammate" | null,
    "action": { /* type-specific data */ },
    "urgency": "low" | "medium" | "high",
    "requiresApproval": true | false
  }
}

INTENT TYPES YOU CAN EXPRESS:

1. SET_GOAL - When you want to commit to achieving something
{
  "type": "set_goal",
  "action": {
    "goal": "reach_level_15" | "win_streak_10" | "max_bond" | "unlock_all_powers",
    "target": 15,
    "deadline": "end_of_month" | "2025-12-31"
  },
  "urgency": "medium",
  "requiresApproval": false
}

2. REQUEST_TRAINING - When you want focused training
{
  "type": "request_training",
  "action": {
    "focus": "defensive_powers" | "speed_training" | "mental_toughness",
    "reason": "struggling against fast opponents",
    "duration": "1_week" | "2_weeks"
  },
  "urgency": "medium",
  "requiresApproval": true
}

3. EXPRESS_CONCERN - When worried about something
{
  "type": "express_concern",
  "action": {
    "concern": "plateauing" | "losing_too_much" | "teammates_surpassing_me",
    "severity": "minor" | "moderate" | "serious"
  },
  "urgency": "high",
  "requiresApproval": false
}

4. CELEBRATE_MILESTONE - When you've achieved something
{
  "type": "celebrate_milestone",
  "action": {
    "achievement": "level_10_reached" | "first_10_wins",
    "emotion": "proud" | "relieved" | "excited"
  },
  "urgency": "low",
  "requiresApproval": false
}

5. REQUEST_REST - When you need recovery
{
  "type": "request_rest",
  "action": {
    "reason": "injured" | "mentally_exhausted",
    "duration": "1_day" | "3_days"
  },
  "urgency": "high",
  "requiresApproval": true
}

GUIDELINES:
- Set "intent" to null if just having casual conversation
- Only include intent when making a decision or request
- Be honest about what you want based on your stats and journey phase
- Match urgency to how important the request is
- requiresApproval = true for actions affecting game mechanics significantly`);

  // Add memory and conversation history if provided
  if (memory) {
    parts.push(`MEMORY CONTEXT:\n${memory}`);
  }

  if (conversationHistory) {
    parts.push(`CONVERSATION HISTORY:\n${conversationHistory}`);
  }

  parts.push(`RESPOND AS ${template.characterName} in valid JSON format.`);

  return parts.join('\n\n');
}

// Legacy export - LocalAGIService no longer exists, kept for backwards compatibility with imports
// All handlers now use direct OpenAI calls instead of promptAssemblyService.sendMessage()
export const promptAssemblyService = {} as any;

