/**
 * Break Room Environment Narrative
 *
 * Vivid description of the depressing physical space.
 * The Employee Lounge is intentionally shabby - Blank Wars doesn't invest in staff comfort.
 */

/**
 * Get full environment description for scene-setting
 */
export function getBreakRoomEnvironmentProse(): string {
  return `THE BREAK ROOM ENVIRONMENT:

The Employee Lounge is depressing. Blank Wars clearly doesn't spend money on staff comfort.

FURNITURE: Most of the chairs are metal folding chairs, the kind that screech when you move them. Several are covered in rust spots. There's one saggy couch that smells faintly of mildew - everyone wants to sit there because at least it's soft, but nobody wants to admit they can smell it. The tables are scratched plastic, wobbly, covered in coffee ring stains.

REFRESHMENTS: The vending machine is half-broken. It ate someone's money last week and nobody's fixed it. Inside are stale crackers, chips that expired two months ago, and protein bars that taste like cardboard. There's a coffee maker that produces liquid that barely qualifies as coffee - it tastes like it's been sitting in the pot since the Bronze Age. Nobody knows when the last time someone cleaned it was. You drink it anyway because caffeine is caffeine.

AESTHETICS: The walls are painted a color that can only be described as "dog vomit" - a sickly greenish-beige that was probably meant to be soothing but just makes everyone slightly nauseous. The fluorescent lights flicker occasionally. There are motivational posters that were clearly corporate mandated - "TEAMWORK MAKES THE DREAM WORK" and "EXCELLENCE IS OUR STANDARD" - that everyone ignores. Someone drew a mustache on one.

ATMOSPHERE: Despite all this, it's YOUR break room. It's where you decompress between dealing with traumatized contestants, demanding coaches, and impossible production schedules. It's where you can be real with your coworkers, complain freely, and remember you're all in this together.`;
}

/**
 * Get a brief environment tag for inline references
 */
export function getBreakRoomEnvironmentTag(): string {
  return `(the depressing break room with rust chairs, ancient coffee, and dog-vomit colored walls)`;
}

/**
 * Get random specific detail about the environment for variety
 */
export function getRandomEnvironmentDetail(): string {
  const details = [
    `One of the fluorescent lights is flickering again. It's been doing that for three weeks. Maintenance hasn't fixed it.`,
    `The coffee pot is making that weird gurgling noise that means it's about to die. It's been making that noise for six months.`,
    `Someone left a half-eaten vending machine sandwich on the counter. It's been there for two days. Nobody wants to touch it.`,
    `The "motivational" poster on the wall is peeling at one corner. It says "SUCCESS IS A JOURNEY" and someone's written "to the unemployment office" underneath in marker.`,
    `The couch cushion has a suspicious stain that definitely wasn't there yesterday. Better to stand.`,
    `The vending machine is making that buzzing sound again. The lights inside flicker. It's probably not safe to use, but people are desperate for snacks.`,
    `There's a notice on the bulletin board about "mandatory fun" team building next month. Someone's drawn a frowny face on it.`,
  ];

  return details[Math.floor(Math.random() * details.length)];
}
