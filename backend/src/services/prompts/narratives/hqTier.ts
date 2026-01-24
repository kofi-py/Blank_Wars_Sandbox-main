/**
 * HQ Tier Narrative Templates
 * Converts hq_tier values into rich prose descriptions
 */

export const HQ_TIER_PROSE: Record<string, string> = {
  your_parents_basement: `You're currently living in your parents' basement. It's cramped, damp, and smells faintly of mothballs and unwashed laundry. You have zero privacy - your mother constantly pokes her head in to ask if you've found a real job or to offer you unwanted snacks. Your teammates find the situation incredibly embarrassing, and coordination is nearly impossible when you're whispering to avoid being heard through the floorboards. You feel the shame constantly.`,

  radioactive_roach_motel: `You're staying at a motel that is literally glowing with low-level radiation and teeming with mutated cockroaches. The walls are stained with the memories of a thousand failed dreams, and the air is thick with the scent of cheap disinfectant and decay. You can't sleep well when you feel things crawling over you in the dark, and your health is actively declining from the toxic environment. You're living a nightmare you can't wake up from.`,

  hobo_camp: `You're living in a makeshift camp under a rusted bridge. Your "bed" is a stack of wet cardboard, and your "walls" are whatever scavenged tarps you could find. You're completely exposed to the elements and the constant threat of being robbed or moved along by authorities. You have zero protection, and your team's morale is at an all-time low as you huddle around a trash-can fire for warmth.`,

  spartan_apartment: `You currently live in a cramped 2-room apartment where you share bunk beds with characters from across time and reality. Whether you're from ancient civilizations, distant futures, mythological realms, or modern times, you're all stuck in the same tiny space. You have no personal space. Every sound echoes through thin walls. You deal with a permanent bathroom line. This arrangement is absurd and often degrading, but you're stuck here until your team earns enough currency to upgrade.`,

  basic_house: `You live in a modest house with individual rooms - you finally have some privacy! It doesn't matter if you're from medieval times, outer space, Victorian London, or anywhere else, you appreciate having your own space. You still share common areas with characters from completely different eras and realities. You deal with ongoing politics about who got the better room, and the upgrade feels luxurious compared to the cramped apartment, though you're still adjusting to coexisting with such diverse housemates.`,

  condo: `You've moved into a modern condo with sleek amenities and a security desk. The common areas are well-maintained, and you feel a sense of order and safety that was missing before. It's not a mansion, but it's a significant step up. You're finally starting to feel like a professional contender rather than part of a ragtag group of outcasts.`,

  mansion: `You live in a luxurious mansion with multiple themed rooms and proper training facilities. You can finally customize your space to match your background and era. Your living situation is comfortable, offering both privacy and common spaces for team bonding. You feel like a legitimate force to be reckoned with, living in a style that reflects your growing power.`,

  compound: `You reside in a fortified compound designed for elite performance. With dedicated training wings, a medical bay, and high-tech recovery chambers, your every need is met. Your security is top-notch, and your environment is optimized for victory. You find it almost too clinical at times, but you can't deny the professional advantages.`,

  super_yacht: `Your headquarters is a massive super yacht currently cruising through international waters. With an on-board medical staff, world-class chefs, and every luxury imaginable, you're living the ultimate high life. Being mobile allows you to stay one step ahead of your enemies while relaxing in absolute opulence. You've reached the pinnacle of worldly success.`,

  moon_base: `You live in an isolated base on the lunar surface. Surrounded by the cold vacuum of space, you're completely untouchable. Your base features Zero-G recovery chambers and state-of-the-art technology that defies modern physics. Living in literal space gives you a perspective that few can fathom, and the isolation has forged your team into a single, unstoppable mind.`,
};

export function getHqTierProse(hqTier: string): string {
  const prose = HQ_TIER_PROSE[hqTier];
  if (!prose) {
    throw new Error(`STRICT MODE: Unknown hq_tier "${hqTier}". Valid values: ${Object.keys(HQ_TIER_PROSE).join(', ')}`);
  }
  return prose;
}