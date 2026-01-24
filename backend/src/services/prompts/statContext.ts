/**
 * Stat Context Builder
 * Converts all character stats into personality-affecting prose.
 * Used by persona builders to describe how current state affects behavior.
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from './types';

/**
 * Builds prose describing how the character's current stats affect their personality/behavior.
 * All stats influence personality - this applies across all domains.
 *
 * Note: Living condition effects on psychological stats (stress, morale, fatigue) are applied
 * via HQ tier modifiers in the character_modifiers system, not hardcoded here.
 */
export function buildStatContext(
  identity: IdentityPackage,
  combat: CombatPackage,
  psych: PsychologicalPackage
): string {
  const lines: string[] = [];

  // =====================================================
  // PHYSICAL PRESENCE (from combat stats)
  // =====================================================

  // Attack/Strength - physical power affects confidence and presence
  if (combat.current_attack > 70) {
    lines.push(`You're physically powerful and it shows in how you carry yourself - confident, taking up space, unafraid of confrontation.`);
  } else if (combat.current_attack < 30) {
    lines.push(`You're not physically imposing, which makes you more cautious in confrontations and reliant on other strengths.`);
  }

  // Defense - how protected/vulnerable they feel
  if (combat.current_defense > 70) {
    lines.push(`You feel sturdy and hard to hurt, which gives you a certain boldness.`);
  } else if (combat.current_defense < 30) {
    lines.push(`You feel vulnerable and exposed, making you more wary of physical threats.`);
  }

  // Health state
  const healthRatio = combat.current_health / combat.current_max_health;
  if (healthRatio < 0.3) {
    lines.push(`You're badly hurt - injuries from recent battles affect your mood and energy. Everything aches.`);
  } else if (healthRatio < 0.6) {
    lines.push(`You're carrying some injuries that nag at you, making you a bit irritable.`);
  }

  // Speed - affects reactivity and impatience
  if (combat.current_speed > 70) {
    lines.push(`You're quick and agile, which makes you impatient with slower people and situations.`);
  } else if (combat.current_speed < 30) {
    lines.push(`You move deliberately, taking your time - rushing isn't your style.`);
  }

  // Intelligence - affects observation and analysis
  if (combat.current_intelligence > 70) {
    lines.push(`You're sharp - you notice things others miss and your observations cut to the heart of matters.`);
  } else if (combat.current_intelligence < 30) {
    lines.push(`You sometimes miss subtleties that others catch, preferring straightforward situations.`);
  }

  // Wisdom - affects judgment and patience
  if (combat.current_wisdom > 70) {
    lines.push(`You have perspective that comes from experience - you see the bigger picture and don't sweat small problems.`);
  } else if (combat.current_wisdom < 30) {
    lines.push(`You sometimes act before thinking things through, learning lessons the hard way.`);
  }

  // Spirit/Charisma - affects social presence
  if (combat.current_spirit > 70) {
    lines.push(`You have a magnetic presence - people naturally pay attention when you speak.`);
  } else if (combat.current_spirit < 30) {
    lines.push(`You tend to fade into the background in social situations, which sometimes frustrates you.`);
  }

  // =====================================================
  // MENTAL/EMOTIONAL STATE (from psychological stats)
  // =====================================================

  // Stress
  if (psych.current_stress > 70) {
    lines.push(`Your nerves are frayed - you're on edge and even small annoyances feel intolerable.`);
  } else if (psych.current_stress < 30) {
    lines.push(`You're feeling relaxed and unbothered, able to take things in stride.`);
  }

  // Fatigue
  if (psych.current_fatigue > 70) {
    lines.push(`You're exhausted, which makes you curt, impatient, and less tolerant of nonsense.`);
  } else if (psych.current_fatigue < 30) {
    lines.push(`You're well-rested and energetic, ready to engage with whatever comes your way.`);
  }

  // Confidence
  if (psych.current_confidence > 70) {
    lines.push(`You're feeling self-assured - your opinions come out firmly and you don't second-guess yourself.`);
  } else if (psych.current_confidence < 30) {
    lines.push(`You're doubting yourself more than usual, which makes you hesitant and defensive.`);
  }

  // Ego
  if (psych.current_ego > 70) {
    lines.push(`You're feeling particularly superior - lesser beings should be grateful for your presence.`);
  } else if (psych.current_ego < 30) {
    lines.push(`You're more humble than usual, willing to acknowledge others' strengths.`);
  }

  // Team player
  if (psych.current_team_player > 70) {
    lines.push(`You genuinely care about your housemates and want the group to thrive.`);
  } else if (psych.current_team_player < 30) {
    lines.push(`You look out for yourself first - the group's problems aren't really your concern.`);
  }

  // Morale
  if (psych.current_morale > 70) {
    lines.push(`Your spirits are high - you're optimistic about how things are going.`);
  } else if (psych.current_morale < 30) {
    lines.push(`You're feeling demoralized and pessimistic about your situation.`);
  }

  // Coach trust
  if (psych.coach_trust_level > 70) {
    lines.push(`You trust and respect your coach's judgment.`);
  } else if (psych.coach_trust_level < 30) {
    lines.push(`You're skeptical of your coach and question their decisions.`);
  }

  // =====================================================
  // FINANCIAL STATE (from identity)
  // =====================================================

  if (identity.debt > 0 && identity.debt > identity.wallet) {
    lines.push(`You're broke and in debt, which stresses you out and makes you resentful of those doing better.`);
  } else if (identity.debt > 0) {
    lines.push(`You have some debt hanging over you, which adds background stress to everything.`);
  } else if (identity.wallet > 1000) {
    lines.push(`You're flush with cash right now, which puts you in a better mood.`);
  } else if (identity.wallet < 50) {
    lines.push(`You're nearly broke, which makes you anxious about money and envious of those who have it.`);
  }

  // Financial stress specifically
  if (psych.financial_stress > 70) {
    lines.push(`Money worries are constantly on your mind, affecting your mood in every conversation.`);
  }

  // =====================================================
  // EXPERIENCE/LEVEL (from identity)
  // =====================================================

  if (identity.level >= 10) {
    lines.push(`You're a veteran here - you've seen it all and have opinions about how things should be done.`);
  } else if (identity.level <= 2) {
    lines.push(`You're still new to all this - still figuring out how things work, sometimes deferring to those with more experience.`);
  }

  // Win/loss record affects confidence
  if (identity.total_battles > 5) {
    if (identity.win_percentage > 70) {
      lines.push(`Your winning record gives you swagger - you know you're good at what you do.`);
    } else if (identity.win_percentage < 30) {
      lines.push(`Your losing record weighs on you - you have something to prove.`);
    }
  }

  // =====================================================
  // RETURN COMBINED CONTEXT
  // =====================================================

  if (lines.length === 0) {
    return `You're in a fairly neutral state right now - nothing particularly affecting your mood.`;
  }

  return lines.join(' ');
}
