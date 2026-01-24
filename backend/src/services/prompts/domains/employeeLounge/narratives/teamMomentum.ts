/**
 * Team Momentum Narrative
 *
 * Describes the emotional atmosphere based on team's recent performance.
 * Winning streaks vs losing streaks affect staff morale and conversation tone.
 */

/**
 * Get prose describing team momentum and its effect on break room atmosphere
 */
export function getTeamMomentumProse(wins: number, losses: number): string {
  const totalGames = wins + losses;

  // Not enough games to establish momentum
  if (totalGames < 3) {
    return `The team is still finding its rhythm - too early to tell how the season will go. Everyone's cautiously optimistic.`;
  }

  const winRate = wins / totalGames;

  // Strong winning streak
  if (winRate >= 0.75) {
    return `The team is on fire - ${wins}W-${losses}L. The winning streak has everyone energized. There's swagger in the air, confidence in every conversation. Even the terrible coffee tastes a bit better when you're winning.`;
  }

  // Decent winning record
  if (winRate >= 0.60) {
    return `The team is performing well - ${wins}W-${losses}L. Things are looking up. Staff are in good spirits, optimistic about where this season is headed. The break room has a positive buzz.`;
  }

  // Roughly even
  if (winRate >= 0.40 && winRate <= 0.60) {
    return `The team is hovering around .500 - ${wins}W-${losses}L. Inconsistent. Some good moments, some bad. The mood in the break room shifts depending on whether you just won or lost. Right now it's... cautiously neutral.`;
  }

  // Poor record
  if (winRate >= 0.25) {
    return `The team is struggling - ${wins}W-${losses}L. More losses than wins. The mood is tense. Staff are frustrated, looking for someone to blame. Conversations in the break room have an edge to them.`;
  }

  // Terrible losing streak
  return `The team is getting destroyed - ${wins}W-${losses}L. The losing streak has everyone demoralized. There's tension in every interaction. The break room feels heavy, like everyone's waiting for the other shoe to drop. People are starting to wonder if jobs are safe.`;
}

/**
 * Get a brief momentum descriptor for use in other contexts
 */
export function getTeamMomentumTag(wins: number, losses: number): string {
  const totalGames = wins + losses;

  if (totalGames < 3) {
    return 'new season';
  }

  const winRate = wins / totalGames;

  if (winRate >= 0.75) return 'hot streak';
  if (winRate >= 0.60) return 'winning';
  if (winRate >= 0.40) return 'inconsistent';
  if (winRate >= 0.25) return 'struggling';
  return 'crisis mode';
}
