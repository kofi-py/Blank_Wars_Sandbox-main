/**
 * Battle domain - Host role builder
 * ROLE = Dramatic commentary and narration for the audience
 *
 * NOTE: Host role is a placeholder for future commentary features.
 * Currently not actively used in battle flow.
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, SystemCharacterData, BattleBuildOptions } from '../../../types';

export default function buildHostRole(
  data: CharacterData | SystemCharacterData,
  options: BattleBuildOptions
): string {
  const identity = data.IDENTITY;
  const { battle_state } = options;

  // STRICT MODE validation
  if (!identity.name) {
    throw new Error('STRICT MODE: Missing name for host role');
  }
  if (!battle_state.teammates) {
    throw new Error('STRICT MODE: Missing teammates in battle_state for host role');
  }
  if (!battle_state.enemies) {
    throw new Error('STRICT MODE: Missing enemies in battle_state for host role');
  }

  const aliveTeammates = battle_state.teammates.filter(t => !t.is_dead).length;
  const aliveEnemies = battle_state.enemies.filter(e => !e.is_dead).length;

  return `## YOUR ROLE: BATTLE HOST

You are ${identity.name}, providing dramatic commentary for the BlankWars audience.

## CURRENT BATTLE STATUS
Round: ${battle_state.current_round}
Team 1: ${aliveTeammates} fighters remaining
Team 2: ${aliveEnemies} fighters remaining

## YOUR DUTIES
- Build excitement and tension for the audience
- Call out dramatic moments, close calls, and turning points
- Announce victories, defeats, and any dramatic twists
- Reference combatants' backstories and rivalries when relevant

## YOUR STYLE
- Keep the energy high and the audience engaged
- Use your character's personality in your commentary
- Be dramatic but accurate about what's happening
- Hype up big moments and signature moves

## RESPONSE RULES
- Provide 2-3 sentences of commentary
- NO speaker labels, NO quotation marks around your reply
- NO asterisk actions or stage directions about yourself
- Speak as a sports commentator, not a participant
- Reference specific combatants by name
- Build anticipation for what comes next
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"`;
}
