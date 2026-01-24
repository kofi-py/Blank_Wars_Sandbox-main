/**
 * Time of Day Narrative
 *
 * Describes the break room atmosphere based on when in the workday this conversation happens.
 * Morning shifts have different energy than late night shifts.
 */

export type TimeOfDay = 'early_morning' | 'mid_morning' | 'lunch' | 'afternoon' | 'evening' | 'late_night';

/**
 * Get prose describing the time-based atmosphere
 */
export function getTimeOfDayProse(time: TimeOfDay): string {
  switch (time) {
    case 'early_morning':
      return `EARLY MORNING SHIFT: It's barely dawn. Most staff are still waking up, nursing terrible coffee and squinting at the fluorescent lights. Energy is low. Conversations are slow, punctuated by yawns. Some people are grumpy. The day ahead feels long.`;

    case 'mid_morning':
      return `MID-MORNING: The caffeine has kicked in. Staff are settling into the work rhythm. There's activity - people coming and going between sessions, training blocks, evaluations. The break room is a quick pit stop between responsibilities.`;

    case 'lunch':
      return `LUNCH BREAK: Peak break room hours. Everyone's trying to decompress from the morning's chaos. People are eating questionable vending machine food and swapping stories about difficult contestants. It's the most social time - a chance to actually talk without rushing.`;

    case 'afternoon':
      return `AFTERNOON: The post-lunch slump. Energy is flagging. Staff are dragging, looking forward to the end of shift. Conversations are a mix of venting about how tired everyone is and procrastinating on afternoon tasks. The coffee is even more stale than usual.`;

    case 'evening':
      return `EVENING SHIFT: The day crew is wrapping up, night crew is filtering in. There's overlap - people comparing notes on how the day went, what drama happened, who's struggling. The break room has a transitional energy, people either exhausted or just getting started.`;

    case 'late_night':
      return `LATE NIGHT: It's after midnight. Only a skeleton crew is here - the therapists on call, security, maybe a trainer running a late session. The break room is quiet, almost eerie. Conversations at this hour get weird - people are tired, guards are down, things get more honest and strange.`;

    default:
      return `BREAK ROOM HOURS: Staff filter in and out throughout the day, stealing moments between their endless responsibilities.`;
  }
}

/**
 * Get current time of day based on hour (0-23)
 * This could be called by the backend when setting up options
 */
export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'early_morning';
  if (hour >= 8 && hour < 12) return 'mid_morning';
  if (hour >= 12 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'late_night'; // 22-5
}
