/**
 * Sleeping Arrangement Narrative Templates
 * Converts sleeping_arrangement values into rich prose descriptions
 * Values from sleeping_spot_types table in production DB
 */

export const SLEEPING_PROSE: Record<string, string> = {
  master_bed: `You have the master bed - the best sleeping arrangement in the house. This privilege creates resentment from others who are stuck on worse accommodations. You sleep well and wake refreshed, which puts you in a better mood than most of your housemates.`,

  bed: `You have an actual bed, which makes you one of the fortunate ones. You sleep well and it shows in your mood. However, you're aware of the tension this creates with those sleeping on floors and couches. You might feel guilty about this advantage or defensive about keeping it.`,

  bunk_bed: `You sleep in a bunk bed, sharing vertical space with another character. It's not great - you either deal with someone above you or the climb up top. Privacy is minimal and the mattress is thin, but at least it's off the ground.`,

  coffin: `You sleep in your coffin setup, which others find bizarre and sometimes accidentally disturb. Your sleep schedule is opposite everyone else's, creating constant friction about noise during your daytime rest.`,

  couch: `You're sleeping on the couch in the common area, which means you get woken up by kitchen activity and have no privacy. It's better than the floor but still far from ideal. You're tired of being disturbed by people's morning routines.`,

  air_mattress: `You sleep on an air mattress that slowly deflates overnight, so you wake up practically on the floor anyway. It squeaks when you move. This temporary solution has become permanent and you resent it.`,

  floor: `You've been sleeping on the floor, which is taking a serious toll on your body and mood. Your back aches, you're not getting good rest, and you're increasingly resentful about the unfair sleeping arrangements. This is beneath your standards and you're frustrated about it.`,
};

export function getSleepingProse(sleepingArrangement: string): string {
  const prose = SLEEPING_PROSE[sleepingArrangement];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown sleeping_arrangement "${sleepingArrangement}". Valid values: ${Object.keys(SLEEPING_PROSE).join(', ')}`);
  }
  return prose;
}
