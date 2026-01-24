// Wealth Disparity Service
// Enhances existing conflict mechanics with sophisticated wealth inequality tracking
import { FinancialPersonality } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService } from './financialPsychologyService';

export interface WealthDisparityData {
  character_id: string;
  current_wallet: number;
  monthly_earnings: number;
  total_assets: number;
  wealth_percentile: number; // 0-100 where character ranks among team
  disparity_stress: number; // 0-100 how much wealth gaps stress this character
  jealousy_level: number; // 0-100 jealousy toward wealthier teammates
  guilt_level: number; // 0-100 guilt about having more than others
  social_pressure: number; // 0-100 pressure from wealth visibility
}

export interface WealthDisparityConflict {
  id: string;
  primary_character: string;
  affected_characters: string[];
  conflict_type: 'wealth_jealousy' | 'guilt_pressure' | 'spending_shame' | 'lifestyle_tension' | 'financial_exclusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  disparity_amount: number; // Dollar difference causing the conflict
  description: string;
  trigger_event: string;
  timestamp: Date;
}

export interface TeamWealthProfile {
  wealth_distribution: {
    highest: number;
    lowest: number;
    average: number;
    median: number;
    gini_coefficient: number; // 0-1 measure of inequality
  };
  disparity_metrics: {
    max_gap: number;
    avg_gap: number;
    dangerous_gaps: number; // gaps that typically cause conflicts
  };
  risk_factors: {
    overall_risk: number; // 0-100 likelihood of wealth-related conflicts
    highRiskPairs: Array<{char1: string; char2: string; risk: number}>;
  };
}

export class WealthDisparityService {
  private static instance: WealthDisparityService;
  private eventBus: GameEventBus;
  private psychologyService: FinancialPsychologyService;
  private teamWealthData: Map<string, WealthDisparityData> = new Map();
  private lastTeamAnalysis: TeamWealthProfile | null = null;

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.psychologyService = FinancialPsychologyService.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): WealthDisparityService {
    if (!WealthDisparityService.instance) {
      WealthDisparityService.instance = new WealthDisparityService();
    }
    return WealthDisparityService.instance;
  }

  /**
   * Setup event listeners for wealth-related events
   */
  private setupEventListeners(): void {
    // Listen for major financial changes
    this.eventBus.subscribe('financial_decision_made', this.handleFinancialChange.bind(this));
    this.eventBus.subscribe('luxury_purchase_made', this.handleLuxuryPurchase.bind(this));
    this.eventBus.subscribe('financial_windfall', this.handleWindfall.bind(this));
    this.eventBus.subscribe('financial_crisis', this.handleFinancialCrisis.bind(this));
    
    // Listen for earnings changes
    this.eventBus.subscribe('battle_earnings_received', this.handleEarningsChange.bind(this));
    this.eventBus.subscribe('coaching_bonus_received', this.handleEarningsChange.bind(this));
  }

  /**
   * Analyze team wealth distribution and identify disparity risks
   */
  analyzeTeamWealthDistribution(teamCharacters: Array<{
    id: string;
    wallet: number;
    monthly_earnings: number;
    total_assets: number;
    personality: FinancialPersonality;
  }>): TeamWealthProfile {
    if (teamCharacters.length === 0) {
      return this.getEmptyTeamProfile();
    }

    // Calculate wealth distribution metrics
    const wealthValues = teamCharacters.map(c => c.total_assets).sort((a, b) => b - a);
    const earningsValues = teamCharacters.map(c => c.monthly_earnings).sort((a, b) => b - a);
    
    const wealthDistribution = {
      highest: wealthValues[0],
      lowest: wealthValues[wealthValues.length - 1],
      average: wealthValues.reduce((sum, val) => sum + val, 0) / wealthValues.length,
      median: wealthValues[Math.floor(wealthValues.length / 2)],
      gini_coefficient: this.calculateGiniCoefficient(wealthValues)
    };

    const disparityMetrics = {
      max_gap: wealthDistribution.highest - wealthDistribution.lowest,
      avg_gap: wealthDistribution.average - wealthDistribution.lowest,
      dangerous_gaps: this.countDangerousGaps(teamCharacters)
    };

    // Calculate individual disparity data
    teamCharacters.forEach(character => {
      const disparityData = this.calculateIndividualDisparityData(character, teamCharacters);
      this.teamWealthData.set(character.id, disparityData);
    });

    // Identify high-risk pairs
    const highRiskPairs = this.identifyHighRiskPairs(teamCharacters);

    const team_profile: TeamWealthProfile = {
      wealth_distribution: wealthDistribution,
      disparity_metrics: disparityMetrics,
      risk_factors: {
        overall_risk: this.calculateOverallDisparityRisk(wealthDistribution, disparityMetrics),
        highRiskPairs
      }
    };

    this.lastTeamAnalysis = team_profile;
    return team_profile;
  }

  /**
   * Calculate individual character's wealth disparity stress and emotions
   */
  private calculateIndividualDisparityData(
    character: any,
    team_characters: any[]
  ): WealthDisparityData {
    const sortedByWealth = team_characters.sort((a, b) => b.total_assets - a.total_assets);
    const characterIndex = sortedByWealth.findIndex(c => c.id === character.id);
    const wealthPercentile = ((team_characters.length - characterIndex) / team_characters.length) * 100;

    // Calculate stress factors based on personality and position
    const disparityStress = this.calculateDisparityStress(character, sortedByWealth, characterIndex);
    const jealousyLevel = this.calculateJealousyLevel(character, sortedByWealth, characterIndex);
    const guiltLevel = this.calculateGuiltLevel(character, sortedByWealth, characterIndex);
    const socialPressure = this.calculateSocialPressure(character, sortedByWealth, characterIndex);

    return {
      character_id: character.id,
      current_wallet: character.wallet,
      monthly_earnings: character.monthly_earnings,
      total_assets: character.total_assets,
      wealth_percentile: wealthPercentile,
      disparity_stress: disparityStress,
      jealousy_level: jealousyLevel,
      guilt_level: guiltLevel,
      social_pressure: socialPressure
    };
  }

  /**
   * Calculate how much wealth disparity stresses a character
   */
  private calculateDisparityStress(character: any, sorted_by_wealth: any[], character_index: number): number {
    const personality = character.personality;
    let baseStress = 0;

    // Position-based stress
    if (character_index === 0) {
      baseStress = 20; // Stress from being at the top
    } else if (character_index === sorted_by_wealth.length - 1) {
      baseStress = 60; // High stress from being at the bottom
    } else {
      baseStress = 30 + (character_index / sorted_by_wealth.length) * 40; // Middle positions
    }

    // Personality modifiers
    if (personality?.spending_style === 'impulsive') {
      baseStress += 15; // Impulsive people stress more about money
    } else if (personality?.spending_style === 'strategic') {
      baseStress -= 10; // Strategic people handle disparity better
    }

    if (personality?.risk_tolerance && personality.risk_tolerance < 30) {
      baseStress += 20; // Risk-averse people stress more about financial inequality
    }

    // Gap size modifier
    const wealthGap = sorted_by_wealth[0].total_assets - character.total_assets;
    const gapMultiplier = Math.min(2, wealthGap / 50000); // Significant gaps increase stress
    
    return Math.min(100, baseStress * gapMultiplier);
  }

  /**
   * Calculate jealousy level toward wealthier teammates
   */
  private calculateJealousyLevel(character: any, sorted_by_wealth: any[], character_index: number): number {
    if (character_index === 0) return 0; // Wealthiest has no jealousy

    const personality = character.personality;
    let baseJealousy = 0;

    // Position-based jealousy
    const wealthiestAssets = sorted_by_wealth[0].total_assets;
    const gapRatio = (wealthiestAssets - character.total_assets) / wealthiestAssets;
    baseJealousy = gapRatio * 80; // Up to 80% jealousy based on gap

    // Personality modifiers
    if (personality?.luxury_desire && personality.luxury_desire > 70) {
      baseJealousy += 15; // High luxury desire increases jealousy
    }

    if (personality?.socialStatus && personality.socialStatus > 60) {
      baseJealousy += 10; // Status-conscious people get more jealous
    }

    // Recent spending visibility can increase jealousy
    const recentLuxurySpending = this.getRecentLuxurySpending(character.id);
    if (recentLuxurySpending > character.monthly_earnings * 0.5) {
      baseJealousy += 20; // Others' luxury spending triggers jealousy
    }

    return Math.min(100, baseJealousy);
  }

  /**
   * Calculate guilt level about having more than others
   */
  private calculateGuiltLevel(character: any, sorted_by_wealth: any[], character_index: number): number {
    if (character_index === sorted_by_wealth.length - 1) return 0; // Poorest has no guilt

    const personality = character.personality;
    let baseGuilt = 0;

    // Position-based guilt
    const poorestAssets = sorted_by_wealth[sorted_by_wealth.length - 1].total_assets;
    const gapRatio = (character.total_assets - poorestAssets) / character.total_assets;
    baseGuilt = gapRatio * 60; // Up to 60% guilt based on gap

    // Personality modifiers
    if (personality?.empathy && personality.empathy > 70) {
      baseGuilt += 25; // Empathetic people feel more guilt
    }

    if (personality?.spending_style === 'generous') {
      baseGuilt += 15; // Generous people feel guilt about inequality
    }

    // Team harmony importance
    if (personality?.teamHarmony && personality.teamHarmony > 60) {
      baseGuilt += 10; // Team-focused people worry about disparity
    }

    return Math.min(100, baseGuilt);
  }

  /**
   * Calculate social pressure from wealth visibility
   */
  private calculateSocialPressure(character: any, sorted_by_wealth: any[], character_index: number): number {
    const personality = character.personality;
    let basePressure = 0;

    // Visibility pressure increases with wealth
    const wealthPercentile = ((sorted_by_wealth.length - character_index) / sorted_by_wealth.length) * 100;
    basePressure = (wealthPercentile / 100) * 50; // Up to 50% pressure based on visibility

    // Personality modifiers
    if (personality?.socialStatus && personality.socialStatus > 80) {
      basePressure += 30; // High status consciousness increases pressure
    }

    if (personality?.privacyPreference && personality.privacyPreference > 70) {
      basePressure += 20; // Privacy-loving people feel more pressure when wealth is visible
    }

    return Math.min(100, basePressure);
  }

  /**
   * Generate wealth disparity conflicts based on team dynamics
   */
  async generateWealthDisparityConflict(
    trigger_character_id: string,
    trigger_event: string,
    team_characters: any[]
  ): Promise<WealthDisparityConflict | null> {
    const teamProfile = this.analyzeTeamWealthDistribution(team_characters);
    const triggerData = this.teamWealthData.get(trigger_character_id);
    
    if (!triggerData || teamProfile.risk_factors.overall_risk < 30) {
      return null; // No conflict if low risk
    }

    const conflict_type = this.determineConflictType(triggerData, trigger_event);
    const affectedCharacters = this.findAffectedCharacters(trigger_character_id, conflict_type, team_characters);
    
    if (affectedCharacters.length === 0) {
      return null;
    }

    const severity = this.determineSeverity(triggerData, teamProfile);
    const disparityAmount = this.calculateDisparityAmount(trigger_character_id, affectedCharacters, team_characters);

    const conflict: WealthDisparityConflict = {
      id: `wealth_disparity_${Date.now()}_${trigger_character_id}`,
      primary_character: trigger_character_id,
      affected_characters: affectedCharacters,
      conflict_type,
      severity,
      disparity_amount: disparityAmount,
      description: this.generateConflictDescription(conflict_type, trigger_character_id, affectedCharacters, disparityAmount),
      trigger_event,
      timestamp: new Date()
    };

    // Publish conflict event
    await this.eventBus.publishFinancialEvent(
      'wealth_disparity_conflict_created',
      trigger_character_id,
      `Wealth disparity conflict: ${conflict_type}`,
      { conflict, teamProfile }
    );

    return conflict;
  }

  /**
   * Determine conflict type based on character data and trigger
   */
  private determineConflictType(
    character_data: WealthDisparityData,
    trigger_event: string
  ): WealthDisparityConflict['conflict_type'] {
    if (trigger_event === 'luxury_purchase' && character_data.guilt_level > 60) {
      return 'guilt_pressure';
    }
    
    if (character_data.jealousy_level > 70) {
      return 'wealth_jealousy';
    }
    
    if (character_data.social_pressure > 60) {
      return 'lifestyle_tension';
    }
    
    if (character_data.wealth_percentile < 25) {
      return 'financial_exclusion';
    }
    
    return 'spending_shame';
  }

  /**
   * Find characters affected by the wealth disparity conflict
   */
  private findAffectedCharacters(
    trigger_character_id: string,
    conflict_type: WealthDisparityConflict['conflict_type'],
    team_characters: any[]
  ): string[] {
    const triggerCharacter = team_characters.find(c => c.id === trigger_character_id);
    if (!triggerCharacter) return [];

    const sortedByWealth = team_characters.sort((a, b) => b.total_assets - a.total_assets);
    const triggerIndex = sortedByWealth.findIndex(c => c.id === trigger_character_id);
    
    const affected: string[] = [];

    switch (conflict_type) {
      case 'wealth_jealousy':
        // Jealous of wealthier teammates
        for (let i = 0; i < triggerIndex; i++) {
          affected.push(sortedByWealth[i].id);
        }
        break;
        
      case 'guilt_pressure':
        // Feeling guilty toward poorer teammates
        for (let i = triggerIndex + 1; i < sortedByWealth.length; i++) {
          affected.push(sortedByWealth[i].id);
        }
        break;
        
      case 'lifestyle_tension':
        // Conflicts with those at similar wealth levels
        const similarWealth = sortedByWealth.filter(c => 
          c.id !== trigger_character_id && 
          Math.abs(c.total_assets - triggerCharacter.total_assets) < triggerCharacter.total_assets * 0.3
        );
        affected.push(...similarWealth.map(c => c.id));
        break;
        
      case 'financial_exclusion':
        // Feeling excluded by wealthier teammates
        const wealthierTeammates = sortedByWealth.filter(c => 
          c.total_assets > triggerCharacter.total_assets * 1.5
        );
        affected.push(...wealthierTeammates.map(c => c.id));
        break;
        
      case 'spending_shame':
        // Shame about spending in front of others
        affected.push(...team_characters.filter(c => c.id !== trigger_character_id).map(c => c.id));
        break;
    }

    return affected.slice(0, 3); // Limit to 3 affected characters
  }

  /**
   * Helper methods for calculations
   */
  private calculateGiniCoefficient(wealthValues: number[]): number {
    if (wealthValues.length === 0) return 0;
    
    const n = wealthValues.length;
    const sorted = wealthValues.slice().sort((a, b) => a - b);
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    const meanWealth = sorted.reduce((a, b) => a + b, 0) / n;
    return sum / (n * n * meanWealth);
  }

  private countDangerousGaps(teamCharacters: any[]): number {
    let dangerousGaps = 0;
    const threshold = 25000; // Gap threshold for "dangerous" disparity
    
    for (let i = 0; i < teamCharacters.length; i++) {
      for (let j = i + 1; j < teamCharacters.length; j++) {
        const gap = Math.abs(teamCharacters[i].total_assets - teamCharacters[j].total_assets);
        if (gap > threshold) {
          dangerousGaps++;
        }
      }
    }
    
    return dangerousGaps;
  }

  private identifyHighRiskPairs(teamCharacters: any[]): Array<{char1: string; char2: string; risk: number}> {
    const pairs: Array<{char1: string; char2: string; risk: number}> = [];
    
    for (let i = 0; i < teamCharacters.length; i++) {
      for (let j = i + 1; j < teamCharacters.length; j++) {
        const char1 = teamCharacters[i];
        const char2 = teamCharacters[j];
        const risk = this.calculatePairRisk(char1, char2);
        
        if (risk > 60) {
          pairs.push({ char1: char1.id, char2: char2.id, risk });
        }
      }
    }
    
    return pairs.sort((a, b) => b.risk - a.risk).slice(0, 5);
  }

  private calculatePairRisk(char1: any, char2: any): number {
    const wealthGap = Math.abs(char1.total_assets - char2.total_assets);
    const gapRisk = Math.min(50, wealthGap / 1000); // Up to 50 risk from gap size
    
    const personality1 = char1.personality;
    const personality2 = char2.personality;
    
    let personalityRisk = 0;
    
    // High jealousy + high wealth = high risk
    if (personality1?.luxury_desire > 70 && char1.total_assets < char2.total_assets) {
      personalityRisk += 30;
    }
    
    // High empathy + wealth disparity = guilt risk
    if (personality2?.empathy > 70 && char2.total_assets > char1.total_assets) {
      personalityRisk += 25;
    }
    
    return Math.min(100, gapRisk + personalityRisk);
  }

  private calculateOverallDisparityRisk(
    wealth_distribution: any,
    disparity_metrics: any
  ): number {
    const giniRisk = wealth_distribution.giniCoefficient * 100;
    const gapRisk = Math.min(50, disparity_metrics.maxGap / 1000);
    const dangerousGapRisk = disparity_metrics.dangerousGaps * 10;
    
    return Math.min(100, giniRisk + gapRisk + dangerousGapRisk);
  }

  private calculateDisparityAmount(
    trigger_character_id: string,
    affected_characters: string[],
    team_characters: any[]
  ): number {
    const triggerCharacter = team_characters.find(c => c.id === trigger_character_id);
    if (!triggerCharacter || affected_characters.length === 0) return 0;
    
    const affectedAssets = affected_characters.map(id => {
      const char = team_characters.find(c => c.id === id);
      return char ? char.total_assets : 0;
    });
    
    const avgAffectedAssets = affectedAssets.reduce((sum, assets) => sum + assets, 0) / affectedAssets.length;
    return Math.abs(triggerCharacter.total_assets - avgAffectedAssets);
  }

  private generateConflictDescription(
    conflict_type: WealthDisparityConflict['conflict_type'],
    trigger_character_id: string,
    affected_characters: string[],
    disparity_amount: number
  ): string {
    const descriptions = {
      wealth_jealousy: `Character ${trigger_character_id} is experiencing jealousy over teammates' higher wealth ($${disparity_amount.toLocaleString()} disparity)`,
      guilt_pressure: `Character ${trigger_character_id} feels guilty about their wealth advantage over struggling teammates ($${disparity_amount.toLocaleString()} gap)`,
      spending_shame: `Character ${trigger_character_id} feels shame about spending money in front of less wealthy teammates`,
      lifestyle_tension: `Character ${trigger_character_id} is experiencing tension due to lifestyle differences caused by wealth disparity ($${disparity_amount.toLocaleString()})`,
      financial_exclusion: `Character ${trigger_character_id} feels excluded from team activities due to wealth differences ($${disparity_amount.toLocaleString()} gap)`
    };
    
    return descriptions[conflict_type];
  }

  private determineSeverity(
    character_data: WealthDisparityData,
    team_profile: TeamWealthProfile
  ): 'low' | 'medium' | 'high' | 'critical' {
    const riskScore = Math.max(
      character_data.disparity_stress,
      character_data.jealousy_level,
      character_data.guilt_level,
      character_data.social_pressure
    );
    
    if (riskScore >= 85) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 50) return 'medium';
    return 'low';
  }

  private getRecentLuxurySpending(character_id: string): number {
    // Placeholder - would integrate with luxury purchase service
    return 0;
  }

  private getEmptyTeamProfile(): TeamWealthProfile {
    return {
      wealth_distribution: { highest: 0, lowest: 0, average: 0, median: 0, gini_coefficient: 0 },
      disparity_metrics: { max_gap: 0, avg_gap: 0, dangerous_gaps: 0 },
      risk_factors: { overall_risk: 0, highRiskPairs: [] }
    };
  }

  /**
   * Event handlers
   */
  private async handleFinancialChange(data: any): Promise<void> {
    // Recalculate wealth distribution after financial changes
    if (data.character_id && data.amount > 5000) {
      // Significant financial change - check for new disparities
      await this.checkForNewDisparities(data.character_id, 'financial_change');
    }
  }

  private async handleLuxuryPurchase(data: any): Promise<void> {
    // Luxury purchases can trigger wealth disparity conflicts
    if (data.character_id && data.amount > 2000) {
      await this.checkForNewDisparities(data.character_id, 'luxury_purchase');
    }
  }

  private async handleWindfall(data: any): Promise<void> {
    // Windfalls can create sudden wealth disparities
    if (data.character_id && data.amount > 10000) {
      await this.checkForNewDisparities(data.character_id, 'windfall');
    }
  }

  private async handleFinancialCrisis(data: any): Promise<void> {
    // Financial crises can worsen existing disparities
    if (data.character_id) {
      await this.checkForNewDisparities(data.character_id, 'financial_crisis');
    }
  }

  private async handleEarningsChange(data: any): Promise<void> {
    // Earnings changes affect long-term wealth disparity
    if (data.character_id && data.amount > 1000) {
      await this.checkForNewDisparities(data.character_id, 'earnings_change');
    }
  }

  private async checkForNewDisparities(character_id: string, trigger_event: string): Promise<void> {
    // This would need to be integrated with the actual team data
    // For now, it's a placeholder that would trigger disparity analysis
    console.log(`Checking for wealth disparity conflicts for character ${character_id} due to ${trigger_event}`);
  }

  /**
   * Get current wealth disparity data for a character
   */
  getCharacterWealthDisparityData(character_id: string): WealthDisparityData | null {
    return this.teamWealthData.get(character_id) || null;
  }

  /**
   * Get team wealth profile
   */
  getTeamWealthProfile(): TeamWealthProfile | null {
    return this.lastTeamAnalysis;
  }
}

export default WealthDisparityService;