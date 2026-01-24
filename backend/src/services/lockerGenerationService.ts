/**
 * Locker Generation Service
 * Handles creation of randomized locker contents for Lost & Found Wars
 */

import { query } from '../database/index';

interface LockerItem {
  id: string;
  name: string;
  description: string;
  category: string;
  base_value: number;
  rarity: string;
  condition: string;
  icon: string;
  is_equipment: boolean;
  grant_xp: number;
  special_effect: string | null;
}

interface LocationWeights {
  airport: number;
  subway: number;
  hotel: number;
  college: number;
  police: number;
  amusement: number;
  rest_stop: number;
}

// Row type for locker item query with location weight
interface LockerItemRow extends LockerItem {
  location_weight: number;
}

interface GeneratedLocker {
  id: string;
  location: string;
  locker_number: number;
  price: number;
  items: LockerItem[];
  visible_items: LockerItem[];
  hints: string[];
  clutter: 'organized' | 'messy' | 'chaotic';
  fullness: number; // 0-100
  estimated_value: number;
}

/**
 * Rarity distribution by difficulty
 */
const RARITY_WEIGHTS = {
  easy: {
    junk: 0.4,
    common: 0.4,
    decent: 0.15,
    valuable: 0.04,
    rare: 0.01,
    legendary: 0
  },
  medium: {
    junk: 0.3,
    common: 0.35,
    decent: 0.2,
    valuable: 0.1,
    rare: 0.04,
    legendary: 0.01
  },
  hard: {
    junk: 0.2,
    common: 0.3,
    decent: 0.25,
    valuable: 0.15,
    rare: 0.08,
    legendary: 0.02
  }
};

/**
 * Location-based difficulty and price ranges
 */
const LOCATION_CONFIG = {
  subway: { difficulty: 'easy', min_price: 10, max_price: 150, base_multiplier: 1.0 },
  college: { difficulty: 'easy', min_price: 20, max_price: 200, base_multiplier: 1.2 },
  rest_stop: { difficulty: 'medium', min_price: 30, max_price: 300, base_multiplier: 1.3 },
  amusement: { difficulty: 'medium', min_price: 40, max_price: 400, base_multiplier: 1.4 },
  hotel: { difficulty: 'medium', min_price: 100, max_price: 1000, base_multiplier: 1.8 },
  police: { difficulty: 'hard', min_price: 150, max_price: 1200, base_multiplier: 1.7 },
  airport: { difficulty: 'hard', min_price: 200, max_price: 2500, base_multiplier: 2.0 }
};

export class LockerGenerationService {
  /**
   * Generate a new locker for auction
   */
  async generateLocker(
    location: string,
    user_id: string
  ): Promise<GeneratedLocker> {
    const config = LOCATION_CONFIG[location as keyof typeof LOCATION_CONFIG];
    if (!config) {
      throw new Error(`Invalid location: ${location}`);
    }

    // Determine price (within location range)
    const price = this.random_int(config.min_price, config.max_price);

    // Calculate target value (50% loss to 300% profit potential)
    const target_value = price * this.randomFloat(0.5, 3.0);

    // Determine item count based on price
    const item_count = Math.floor(price / 20) + this.random_int(3, 8);

    // Generate items
    const items = await this.selectItems(
      location,
      config.difficulty as 'easy' | 'medium' | 'hard',
      item_count,
      target_value
    );

    // Determine visible items (20-30% of total)
    const visible_count = Math.floor(items.length * this.randomFloat(0.2, 0.3));
    const visible_items = this.shuffleArray([...items]).slice(0, visible_count);

    // Generate hints
    const hints = this.generateHints(visible_items, items.length);

    // Calculate actual total value
    const estimated_value = items.reduce((sum, item) => sum + item.base_value, 0);

    // Generate locker number
    const locker_number = this.random_int(100, 999);

    return {
      id: `${location}_${Date.now()}_${this.random_int(1000, 9999)}`,
      location,
      locker_number,
      price,
      items,
      visible_items,
      hints,
      clutter: this.random_choice(['organized', 'messy', 'chaotic'] as const),
      fullness: this.random_int(40, 95),
      estimated_value
    };
  }

  /**
   * Select items based on location, difficulty, and target value
   */
  private async selectItems(
    location: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    target_value: number
  ): Promise<LockerItem[]> {
    const items: LockerItem[] = [];
    let current_value = 0;

    // Map location to column name (handle rest_stop special case)
    const location_column_map: Record<string, string> = {
      'airport': 'weight_airport',
      'subway': 'weight_subway',
      'hotel': 'weight_hotel',
      'college': 'weight_college',
      'police': 'weight_police',
      'amusement': 'weight_amusement',
      'rest_stop': 'weight_rest_stop'
    };

    const weight_column = location_column_map[location] || 'weight_airport';

    // Get all items from database
    const result = await query(
      `SELECT
        id, name, description, category, base_value, rarity, condition,
        icon, is_equipment, grant_xp, special_effect,
        ${weight_column} as location_weight
      FROM locker_item_definitions
      ORDER BY RANDOM()`
    );

    const all_items: LockerItemRow[] = result.rows;

    for (let i = 0; i < count; i++) {
      // Select rarity for this slot
      const rarity = this.selectRarity(difficulty);

      // Filter items by rarity and location weight
      const candidates = all_items.filter((item: LockerItemRow) =>
        item.rarity === rarity &&
        item.location_weight > 0.3 // Only items with decent weight for this location
      );

      if (candidates.length === 0) {
        continue; // Skip if no candidates
      }

      // Weighted random selection
      const item = this.weightedRandomChoice(candidates, location);

      items.push({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        base_value: item.base_value,
        rarity: item.rarity,
        condition: item.condition,
        icon: item.icon,
        is_equipment: item.is_equipment,
        grant_xp: item.grant_xp || 0,
        special_effect: item.special_effect
      });

      current_value += item.base_value;
    }

    // If too far from target, add a valuable item
    if (current_value < target_value * 0.7) {
      const valuable_items = all_items.filter((item: LockerItemRow) =>
        (item.rarity === 'valuable' || item.rarity === 'rare') &&
        item.location_weight > 0.3
      );

      if (valuable_items.length > 0) {
        const boost = this.weightedRandomChoice(valuable_items, location);
        items.push({
          id: boost.id,
          name: boost.name,
          description: boost.description,
          category: boost.category,
          base_value: boost.base_value,
          rarity: boost.rarity,
          condition: boost.condition,
          icon: boost.icon,
          is_equipment: boost.is_equipment,
          grant_xp: boost.grant_xp || 0,
          special_effect: boost.special_effect
        });
      }
    }

    return this.shuffleArray(items);
  }

  /**
   * Select a rarity tier based on difficulty weights
   */
  private selectRarity(difficulty: 'easy' | 'medium' | 'hard'): string {
    const weights = RARITY_WEIGHTS[difficulty];
    const roll = Math.random();

    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        return rarity;
      }
    }

    return 'common'; // Fallback
  }

  /**
   * Weighted random selection based on location weight
   */
  private weightedRandomChoice(items: any[], location: string): any {
    const weights = items.map(item => item.location_weight || 0.5);
    const total_weight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total_weight;

    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        return items[i];
      }
    }

    return items[0]; // Fallback
  }

  /**
   * Generate text hints for peek phase
   */
  private generateHints(visible_items: LockerItem[], total_count: number): string[] {
    const hints: string[] = [];

    // Category hints
    const categories = [...new Set(visible_items.map(item => item.category))];
    if (categories.length > 0) {
      hints.push(`Contains ${categories.join(', ')} items`);
    }

    // Condition hint
    const has_excellent = visible_items.some(item => item.condition === 'excellent' || item.condition === 'mint');
    if (has_excellent) {
      hints.push('Some items in excellent condition');
    }

    // Rarity hint
    const has_valuable = visible_items.some(item =>
      item.rarity === 'valuable' || item.rarity === 'rare' || item.rarity === 'legendary'
    );
    if (has_valuable) {
      hints.push('Contains potentially valuable items');
    }

    // Count hint
    hints.push(`Approximately ${total_count} items inside`);

    return hints;
  }

  /**
   * Helper: Random integer between min and max (inclusive)
   */
  private random_int(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Helper: Random float between min and max
   */
  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Helper: Random choice from array
   */
  private random_choice<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Helper: Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const locker_generation_service = new LockerGenerationService();
