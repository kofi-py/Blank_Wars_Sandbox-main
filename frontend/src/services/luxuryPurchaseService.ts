// Luxury Purchase Effect System
// Implements immediate happiness boost with realistic decay mechanics based on personality

import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService } from './financialPsychologyService';

export interface LuxuryPurchase {
  id: string;
  character_id: string;
  amount: number;
  category: 'electronics' | 'clothing' | 'jewelry' | 'vehicle' | 'entertainment' | 'travel' | 'food' | 'other';
  description: string;
  purchase_date: Date;
  initial_happiness_boost: number; // 0-100, immediate boost
  current_happiness_effect: number; // Current ongoing effect
  adaptation_rate: number; // How quickly the effect decays (based on personality)
  prestige_value: number; // Social status component
  practical_value: number; // Utility component
  expected_lifespan: number; // Days until effect fully decays
  is_activeEffect: boolean; // Whether still providing benefits
}

export interface LuxuryCategory {
  name: string;
  base_happiness_multiplier: number;
  adaptation_speed: 'very_fast' | 'fast' | 'moderate' | 'slow' | 'very_slow';
  prestige_component: number; // 0-1, how much is about status
  practical_component: number; // 0-1, how much is about utility
  typical_lifespan: number; // Base days before full adaptation
}

export class LuxuryPurchaseService {
  private static instance: LuxuryPurchaseService;
  private eventBus: GameEventBus;
  private financialPsychology: FinancialPsychologyService;
  private activeLuxuryEffects: Map<string, LuxuryPurchase[]> = new Map(); // character_id -> purchases

  private luxuryCategories: Record<string, LuxuryCategory> = {
    electronics: {
      name: 'Electronics',
      base_happiness_multiplier: 1.2,
      adaptation_speed: 'fast',
      prestige_component: 0.3,
      practical_component: 0.7,
      typical_lifespan: 90 // 3 months before novelty wears off
    },
    clothing: {
      name: 'Designer Clothing',
      base_happiness_multiplier: 1.0,
      adaptation_speed: 'moderate',
      prestige_component: 0.8,
      practical_component: 0.2,
      typical_lifespan: 60 // 2 months
    },
    jewelry: {
      name: 'Jewelry',
      base_happiness_multiplier: 0.8,
      adaptation_speed: 'slow',
      prestige_component: 0.9,
      practical_component: 0.1,
      typical_lifespan: 180 // 6 months
    },
    vehicle: {
      name: 'Vehicle',
      base_happiness_multiplier: 1.5,
      adaptation_speed: 'slow',
      prestige_component: 0.6,
      practical_component: 0.4,
      typical_lifespan: 365 // 1 year
    },
    entertainment: {
      name: 'Entertainment',
      base_happiness_multiplier: 1.3,
      adaptation_speed: 'very_fast',
      prestige_component: 0.2,
      practical_component: 0.8,
      typical_lifespan: 30 // 1 month
    },
    travel: {
      name: 'Luxury Travel',
      base_happiness_multiplier: 1.8,
      adaptation_speed: 'moderate',
      prestige_component: 0.5,
      practical_component: 0.5,
      typical_lifespan: 120 // 4 months of memories
    },
    food: {
      name: 'Fine Dining',
      base_happiness_multiplier: 1.1,
      adaptation_speed: 'very_fast',
      prestige_component: 0.4,
      practical_component: 0.6,
      typical_lifespan: 7 // 1 week
    },
    other: {
      name: 'Other Luxury',
      base_happiness_multiplier: 1.0,
      adaptation_speed: 'moderate',
      prestige_component: 0.5,
      practical_component: 0.5,
      typical_lifespan: 90
    }
  };

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    // Lazy load FinancialPsychologyService to break circular dependency

    // Start decay processing for all active luxury effects
    this.startDecayProcessor();
  }

  private getFinancialPsychology(): FinancialPsychologyService {
    if (!this.financialPsychology) {
      this.financialPsychology = FinancialPsychologyService.getInstance();
    }
    return this.financialPsychology;
  }

  static getInstance(): LuxuryPurchaseService {
    if (!LuxuryPurchaseService.instance) {
      LuxuryPurchaseService.instance = new LuxuryPurchaseService();
    }
    return LuxuryPurchaseService.instance;
  }

  /**
   * Process a luxury purchase and calculate immediate and ongoing effects
   */
  async processLuxuryPurchase(
    character_id: string,
    amount: number,
    category: keyof typeof this.luxuryCategories,
    description: string,
    financial_personality: FinancialPersonality
  ): Promise<LuxuryPurchase> {

    const categoryData = this.luxuryCategories[category];

    // Calculate initial happiness boost based on personality and amount
    const baseHappiness = Math.min(50, (amount / 1000) * 10); // $1k = 10 happiness, max 50
    const personalityMultiplier = this.getPersonalityHappinessMultiplier(financial_personality, category);
    const initialHappinessBoost = baseHappiness * personalityMultiplier * categoryData.base_happiness_multiplier;

    // Calculate adaptation rate based on personality
    const adaptationRate = this.calculateAdaptationRate(financial_personality, categoryData);

    // Calculate prestige and practical values
    const prestige_value = (amount / 10000) * categoryData.prestige_component * 100; // Max 100 prestige
    const practical_value = categoryData.practical_component * 50; // Base practical value

    // Calculate expected lifespan based on personality
    const expected_lifespan = this.calculateExpectedLifespan(financial_personality, categoryData);

    const luxuryPurchase: LuxuryPurchase = {
      id: `luxury_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      character_id,
      amount,
      category: category as LuxuryPurchase['category'],
      description,
      purchase_date: new Date(),
      initial_happiness_boost: initialHappinessBoost,
      current_happiness_effect: initialHappinessBoost,
      adaptation_rate: adaptationRate,
      prestige_value,
      practical_value,
      expected_lifespan,
      is_activeEffect: true
    };

    // Add to active effects
    if (!this.activeLuxuryEffects.has(character_id)) {
      this.activeLuxuryEffects.set(character_id, []);
    }
    this.activeLuxuryEffects.get(character_id)!.push(luxuryPurchase);

    // Publish immediate happiness event
    await this.eventBus.publish({
      type: 'luxury_purchase',
      source: 'marketplace',
      primary_character_id: character_id,
      severity: amount > 5000 ? 'high' : amount > 1000 ? 'medium' : 'low',
      category: 'financial',
      description: `Made luxury purchase: ${description} for $${amount.toLocaleString()}`,
      metadata: {
        purchase_id: luxuryPurchase.id,
        amount,
        category,
        initialHappinessBoost,
        adaptationRate,
        expected_lifespan
      },
      tags: ['luxury', 'spending', 'happiness'],
      emotional_impact: [{
        character_id,
        impact: 'positive',
        intensity: Math.min(10, Math.ceil(initialHappinessBoost / 10))
      }]
    });

    return luxuryPurchase;
  }

  /**
   * Get current total happiness effect from all active luxury purchases
   */
  getCurrentLuxuryHappiness(character_id: string): {
    total_happiness: number;
    prestige_bonus: number;
    practical_bonus: number;
    activePurchases: LuxuryPurchase[];
  } {
    const purchases = this.activeLuxuryEffects.get(character_id) || [];
    const activePurchases = purchases.filter(p => p.is_activeEffect);

    const totalHappiness = activePurchases.reduce((sum, p) => sum + p.current_happiness_effect, 0);
    const prestigeBonus = activePurchases.reduce((sum, p) => sum + p.prestige_value, 0);
    const practicalBonus = activePurchases.reduce((sum, p) => sum + p.practical_value, 0);

    return {
      total_happiness: Math.min(100, totalHappiness), // Cap at 100
      prestige_bonus: Math.min(100, prestigeBonus),
      practical_bonus: Math.min(100, practicalBonus),
      activePurchases
    };
  }

  /**
   * Calculate personality-based happiness multiplier for different categories
   */
  private getPersonalityHappinessMultiplier(
    personality: FinancialPersonality,
    category: keyof typeof this.luxuryCategories
  ): number {
    let multiplier = 1.0;

    // Base luxury desire effect
    multiplier *= (0.5 + personality.luxury_desire / 100);

    // Category-specific personality effects
    switch (category) {
      case 'electronics':
        if (personality.spending_style === 'strategic') multiplier *= 1.2;
        break;
      case 'clothing':
      case 'jewelry':
        if (personality.money_motivations.includes('status')) multiplier *= 1.4;
        break;
      case 'vehicle':
        if (personality.spending_style === 'impulsive') multiplier *= 1.3;
        if (personality.money_motivations.includes('power')) multiplier *= 1.2;
        break;
      case 'travel':
        if (personality.money_motivations.includes('experience')) multiplier *= 1.5;
        break;
      case 'entertainment':
        if (personality.spending_style === 'impulsive') multiplier *= 1.2;
        break;
    }

    return multiplier;
  }

  /**
   * Calculate how quickly a character adapts to luxury based on personality
   */
  private calculateAdaptationRate(
    personality: FinancialPersonality,
    category_data: LuxuryCategory
  ): number {
    let baseRate = 1.0;

    // Adaptation speed modifiers based on category
    switch (category_data.adaptation_speed) {
      case 'very_fast': baseRate = 2.0; break;
      case 'fast': baseRate = 1.5; break;
      case 'moderate': baseRate = 1.0; break;
      case 'slow': baseRate = 0.7; break;
      case 'very_slow': baseRate = 0.5; break;
    }

    // Personality modifiers
    if (personality.spending_style === 'impulsive') {
      baseRate *= 1.3; // Impulsive people adapt faster (get bored quicker)
    }

    if (personality.luxury_desire > 80) {
      baseRate *= 1.2; // High luxury desire = faster adaptation
    }

    if (personality.financial_wisdom > 70) {
      baseRate *= 0.8; // Wise people appreciate things longer
    }

    return baseRate;
  }

  /**
   * Calculate expected lifespan of luxury effect based on personality
   */
  private calculateExpectedLifespan(
    personality: FinancialPersonality,
    category_data: LuxuryCategory
  ): number {
    let lifespan = category_data.typical_lifespan;

    // Personality adjustments
    if (personality.spending_style === 'conservative') {
      lifespan *= 1.5; // Conservative people appreciate things longer
    }

    if (personality.luxury_desire < 30) {
      lifespan *= 0.7; // Low luxury desire = shorter appreciation
    }

    if (personality.financial_wisdom > 80) {
      lifespan *= 1.3; // Wise people get more lasting satisfaction
    }

    return Math.round(lifespan);
  }

  /**
   * Start the decay processor that runs periodically to update luxury effects
   */
  private startDecayProcessor(): void {
    setInterval(() => {
      this.processLuxuryDecay();
    }, 60000); // Process every minute
  }

  /**
   * Process decay for all active luxury effects
   */
  private async processLuxuryDecay(): Promise<void> {
    for (const [character_id, purchases] of this.activeLuxuryEffects.entries()) {
      for (const purchase of purchases) {
        if (!purchase.is_activeEffect) continue;

        const daysSincePurchase = (Date.now() - purchase.purchase_date.getTime()) / (1000 * 60 * 60 * 24);
        const decayProgress = Math.min(1, daysSincePurchase / purchase.expected_lifespan);

        // Exponential decay curve: happiness = initial * e^(-rate * time)
        const decayFactor = Math.exp(-purchase.adaptation_rate * decayProgress);
        purchase.current_happiness_effect = purchase.initial_happiness_boost * decayFactor;

        // Deactivate if effect is very low
        if (purchase.current_happiness_effect < 1) {
          purchase.is_activeEffect = false;

          // Publish adaptation complete event
          await this.eventBus.publish({
            type: 'luxury_purchase',
            source: 'marketplace',
            primary_character_id: character_id,
            severity: 'low',
            category: 'financial',
            description: `Fully adapted to luxury purchase: ${purchase.description}`,
            metadata: {
              purchase_id: purchase.id,
              original_amount: purchase.amount,
              days_since_purchase: Math.round(daysSincePurchase),
              adaptation_type: 'complete'
            },
            tags: ['luxury', 'adaptation', 'psychology']
          });
        }
        // Publish significant decay milestones
        else if (decayProgress > 0.5 && purchase.current_happiness_effect < purchase.initial_happiness_boost * 0.5) {
          // 50% decay milestone
          await this.eventBus.publish({
            type: 'luxury_purchase',
            source: 'marketplace',
            primary_character_id: character_id,
            severity: 'low',
            category: 'financial',
            description: `Novelty wearing off for luxury purchase: ${purchase.description}`,
            metadata: {
              purchase_id: purchase.id,
              decay_progress: Math.round(decayProgress * 100),
              remaining_effect: Math.round(purchase.current_happiness_effect),
              adaptation_type: 'partial'
            },
            tags: ['luxury', 'adaptation', 'psychology']
          });
        }
      }
    }
  }

  /**
   * Get luxury purchase history for a character
   */
  getLuxuryHistory(character_id: string): LuxuryPurchase[] {
    return this.activeLuxuryEffects.get(character_id) || [];
  }

  /**
   * Calculate luxury addiction risk based on recent purchases
   */
  calculateLuxuryAddictionRisk(character_id: string): {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    recommendations: string[];
  } {
    const purchases = this.activeLuxuryEffects.get(character_id) || [];
    const recentPurchases = purchases.filter(p => {
      const daysSince = (Date.now() - p.purchase_date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    const totalSpent = recentPurchases.reduce((sum, p) => sum + p.amount, 0);
    const purchaseFrequency = recentPurchases.length;
    const averageSpending = totalSpent / Math.max(1, purchaseFrequency);

    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Frequency risk
    if (purchaseFrequency > 10) {
      riskScore += 30;
      factors.push('Very high purchase frequency');
      recommendations.push('Consider implementing purchase delays');
    } else if (purchaseFrequency > 5) {
      riskScore += 15;
      factors.push('High purchase frequency');
    }

    // Spending amount risk
    if (totalSpent > 50000) {
      riskScore += 25;
      factors.push('Extremely high spending amounts');
      recommendations.push('Set strict monthly luxury budgets');
    } else if (totalSpent > 20000) {
      riskScore += 15;
      factors.push('High spending amounts');
    }

    // Average purchase size risk
    if (averageSpending > 5000) {
      riskScore += 20;
      factors.push('Large individual purchases');
      recommendations.push('Focus on experiences over material goods');
    }

    // Pattern analysis
    const recentDays = recentPurchases.map(p => {
      const days = (Date.now() - p.purchase_date.getTime()) / (1000 * 60 * 60 * 24);
      return Math.floor(days);
    });

    const uniqueDays = new Set(recentDays);
    if (uniqueDays.size < recentPurchases.length * 0.7) {
      riskScore += 15;
      factors.push('Cluster purchasing patterns');
      recommendations.push('Practice mindful spending techniques');
    }

    let risk_level: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore < 20) risk_level = 'low';
    else if (riskScore < 40) risk_level = 'medium';
    else if (riskScore < 60) risk_level = 'high';
    else risk_level = 'critical';

    return { risk_level, factors, recommendations };
  }
}

export default LuxuryPurchaseService;
