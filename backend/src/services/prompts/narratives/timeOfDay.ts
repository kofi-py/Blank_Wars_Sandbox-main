/**
 * Time of Day Narrative Templates
 * Converts time_of_day values into rich prose descriptions
 */

export const TIME_OF_DAY_PROSE: Record<string, string> = {
  morning: `It's morning. Some people are energetic, others are groggy. Coffee and breakfast routines are happening. Dracula is trying to sleep if he's present.`,

  afternoon: `It's afternoon. Most people are awake and active. General daily activities and chores are happening.`,

  evening: `It's evening. People are winding down, making dinner, or having casual conversations after training or battles.`,

  night: `It's late night. Some people are trying to sleep while others are night owls. Noise is more annoying than usual.`,
};

export function getTimeOfDayProse(timeOfDay: string): string {
  const prose = TIME_OF_DAY_PROSE[timeOfDay];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown time_of_day "${timeOfDay}". Valid values: ${Object.keys(TIME_OF_DAY_PROSE).join(', ')}`);
  }
  return prose;
}
