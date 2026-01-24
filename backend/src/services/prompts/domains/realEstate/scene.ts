/**
 * Real Estate domain - Scene context builder
 * SCENE = Where you are, what's happening (facts only)
 * STRICT MODE: All required fields must be present
 */

import type { RealEstateBuildOptions } from '../../types';
import { HQ_TIER_PROSE } from '../../narratives/hqTier';

/**
 * Get tier display name from tier_id
 */
function getTierDisplayName(tierId: string): string {
  const tierNames: Record<string, string> = {
    'your_parents_basement': "Your Parents' Basement",
    'radioactive_roach_motel': 'Radioactive Roach Motel',
    'hobo_camp': 'Hobo Camp',
    'spartan_apartment': 'Spartan Apartment',
    'basic_house': 'Basic House',
    'condo': 'Condo',
    'mansion': 'Mansion',
    'compound': 'Compound',
    'super_yacht': 'Super Yacht',
    'moon_base': 'Moon Base',
  };
  const name = tierNames[tierId];
  if (!name) {
    throw new Error(`STRICT MODE: Unknown HQ tier "${tierId}"`);
  }
  return name;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * Build the scene context for real estate interactions
 */
export default function buildScene(options: RealEstateBuildOptions): string {
  // STRICT MODE validation
  if (!options.current_hq_tier) {
    throw new Error('STRICT MODE: Missing current_hq_tier for real estate scene');
  }
  if (options.current_balance === undefined) {
    throw new Error('STRICT MODE: Missing current_balance for real estate scene');
  }
  if (options.current_gems === undefined) {
    throw new Error('STRICT MODE: Missing current_gems for real estate scene');
  }
  if (!options.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name for real estate scene');
  }
  if (!options.team_name) {
    throw new Error('STRICT MODE: Missing team_name for real estate scene');
  }
  if (options.team_total_wins === undefined) {
    throw new Error('STRICT MODE: Missing team_total_wins for real estate scene');
  }
  if (options.team_total_losses === undefined) {
    throw new Error('STRICT MODE: Missing team_total_losses for real estate scene');
  }
  if (options.team_win_percentage === undefined) {
    throw new Error('STRICT MODE: Missing team_win_percentage for real estate scene');
  }
  if (options.team_monthly_earnings === undefined) {
    throw new Error('STRICT MODE: Missing team_monthly_earnings for real estate scene');
  }
  if (options.team_total_earnings === undefined) {
    throw new Error('STRICT MODE: Missing team_total_earnings for real estate scene');
  }

  const currentTierName = getTierDisplayName(options.current_hq_tier);
  const currentTierProse = HQ_TIER_PROSE[options.current_hq_tier];
  if (!currentTierProse) {
    throw new Error(`STRICT MODE: No prose defined for HQ tier "${options.current_hq_tier}"`);
  }

  // Build housing crisis context
  let housingStatus: string;
  if (options.characters_without_beds > 0) {
    housingStatus = `HOUSING CRISIS: ${options.characters_without_beds} team member(s) are sleeping on the floor! This is hurting morale.`;
  } else if (options.current_bed_count === options.current_character_count) {
    housingStatus = `HOUSING: All ${options.current_character_count} team members have beds. No immediate crisis.`;
  } else {
    housingStatus = `HOUSING: ${options.current_character_count} characters, ${options.current_bed_count} beds available.`;
  }

  // Build upgrade options context
  let upgradeContext: string;
  if (options.available_tiers.length > 0) {
    const affordableUpgrades = options.available_tiers.filter(
      tier => tier.upgrade_cost_currency <= options.current_balance
    );
    if (affordableUpgrades.length > 0) {
      upgradeContext = `AFFORDABLE UPGRADES: ${affordableUpgrades.map(t => `${t.name} (${formatCurrency(t.upgrade_cost_currency)})`).join(', ')}`;
    } else {
      const cheapestUpgrade = options.available_tiers.reduce((min, t) =>
        t.upgrade_cost_currency < min.upgrade_cost_currency ? t : min
      );
      const shortfall = cheapestUpgrade.upgrade_cost_currency - options.current_balance;
      upgradeContext = `NO AFFORDABLE UPGRADES: Need ${formatCurrency(shortfall)} more for ${cheapestUpgrade.name}`;
    }
  } else {
    upgradeContext = 'AT MAXIMUM TIER: No upgrades available - you have the best housing possible!';
  }

  // Build team performance assessment
  let performanceAssessment: string;
  const winPct = options.team_win_percentage;
  if (winPct >= 70) {
    performanceAssessment = 'EXCELLENT - This team is a powerhouse. They can afford premium housing.';
  } else if (winPct >= 50) {
    performanceAssessment = 'SOLID - Winning more than losing. Stable income, reasonable upgrades possible.';
  } else if (winPct >= 30) {
    performanceAssessment = 'STRUGGLING - More losses than wins. Budget is tight, be realistic about options.';
  } else if (options.team_total_wins + options.team_total_losses === 0) {
    performanceAssessment = 'NEW TEAM - No battle record yet. Starter housing until they prove themselves.';
  } else {
    performanceAssessment = 'DIRE - This team is getting destroyed. They may need to downgrade.';
  }

  return `# CURRENT SCENE: REAL ESTATE OFFICE

You are meeting with Coach ${options.coach_name} from Team ${options.team_name} to discuss their housing situation.

## CLIENT FINANCIAL STATUS
- Current Funds: ${formatCurrency(options.current_balance)}
- Premium Currency (Gems): ${options.current_gems}
- Monthly Earnings: ${formatCurrency(options.team_monthly_earnings)}
- Total Lifetime Earnings: ${formatCurrency(options.team_total_earnings)}

## TEAM BATTLE RECORD
- Wins: ${options.team_total_wins}
- Losses: ${options.team_total_losses}
- Win Rate: ${options.team_win_percentage.toFixed(1)}%
- Assessment: ${performanceAssessment}

## CURRENT PROPERTY
- Tier: ${currentTierName}
- Rooms: ${options.current_room_count}
- Beds: ${options.current_bed_count}
- Team Size: ${options.current_character_count} characters

${currentTierProse}

## HOUSING ASSESSMENT
${housingStatus}

${upgradeContext}`.trim();
}
