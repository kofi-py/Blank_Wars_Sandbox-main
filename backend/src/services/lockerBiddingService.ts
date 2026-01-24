/**
 * Locker Bidding Service
 * Handles adherence-based bidding with deterministic execution or AI rogue behavior
 */

import { query } from '../database/index';
import Open_ai from 'openai';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

interface CoachStrategy {
  target_min: number;
  target_max: number;
  absolute_cap: number;
}

interface BidAction {
  action: 'bid' | 'drop_out';
  amount?: number;
  reason: string;
  was_rogue: boolean;
  rogue_behavior?: {
    choice: string;
    dialogue: string;
  };
}

interface AdherenceCheckResult {
  passed: boolean;
  roll: number;
  threshold: number;
}

export class LockerBiddingService {
  /**
   * Process a bidding moment with adherence check
   */
  async processBid(params: {
    auction_id: string;
    character_id: string;
    current_bid: number;
    coach_strategy: CoachStrategy;
    adherence_level: number;
    bond_level: number;
  }): Promise<BidAction> {
    // Roll for adherence
    const adherence_check = this.checkAdherence(params.adherence_level);

    // Log the bid moment
    await this.logBidMoment(
      params.auction_id,
      params.character_id,
      params.current_bid,
      adherence_check
    );

    if (adherence_check.passed) {
      // ✅ PASS: Follow coach's strategy (deterministic)
      return this.executeDeterministicBid(
        params.coach_strategy,
        params.current_bid
      );
    } else {
      // ❌ FAIL: Character goes rogue (AI decision)
      return await this.executeRogueBid({
        auction_id: params.auction_id,
        character_id: params.character_id,
        current_bid: params.current_bid,
        coach_strategy: params.coach_strategy,
        adherence_level: params.adherence_level,
        bond_level: params.bond_level
      });
    }
  }

  /**
   * Roll for adherence check
   */
  private checkAdherence(adherence_level: number): AdherenceCheckResult {
    const roll = Math.floor(Math.random() * 100);
    return {
      passed: roll <= adherence_level,
      roll,
      threshold: adherence_level
    };
  }

  /**
   * Deterministic bidding execution (when adherence passes)
   */
  private executeDeterministicBid(
    strategy: CoachStrategy,
    current_bid: number
  ): BidAction {
    // If current bid exceeds our cap, drop out
    if (current_bid >= strategy.absolute_cap) {
      return {
        action: 'drop_out',
        reason: 'Exceeded coach maximum',
        was_rogue: false
      };
    }

    // If below target range, bid to enter range
    if (current_bid < strategy.target_min) {
      const next_bid = Math.min(
        current_bid + 25, // Standard increment
        strategy.target_min
      );
      return {
        action: 'bid',
        amount: next_bid,
        reason: 'Following coach strategy - entering target range',
        was_rogue: false
      };
    }

    // If in target range, stay competitive
    if (current_bid >= strategy.target_min && current_bid < strategy.target_max) {
      const midpoint = (strategy.target_min + strategy.target_max) / 2;

      if (current_bid < midpoint) {
        return {
          action: 'bid',
          amount: current_bid + 25,
          reason: 'Following coach strategy - staying competitive',
          was_rogue: false
        };
      } else {
        // Getting expensive, 50/50 chance
        if (Math.random() < 0.5) {
          return {
            action: 'bid',
            amount: current_bid + 25,
            reason: 'Following coach strategy - final push',
            was_rogue: false
          };
        } else {
          return {
            action: 'drop_out',
            reason: 'Following coach strategy - target range exceeded',
            was_rogue: false
          };
        }
      }
    }

    // Above target but below cap
    if (current_bid >= strategy.target_max && current_bid < strategy.absolute_cap) {
      const remaining = strategy.absolute_cap - current_bid;
      if (remaining > 50) {
        return {
          action: 'bid',
          amount: current_bid + 25,
          reason: 'Following coach strategy - using remaining cap',
          was_rogue: false
        };
      } else {
        return {
          action: 'drop_out',
          reason: 'Following coach strategy - approaching cap',
          was_rogue: false
        };
      }
    }

    // Default: drop out
    return {
      action: 'drop_out',
      reason: 'Following coach strategy',
      was_rogue: false
    };
  }

  /**
   * AI-driven rogue bidding (when adherence fails)
   */
  private async executeRogueBid(params: {
    auction_id: string;
    character_id: string;
    current_bid: number;
    coach_strategy: CoachStrategy;
    adherence_level: number;
    bond_level: number;
  }): Promise<BidAction> {
    // Get character personality
    const character_result = await query(
      `SELECT c.name, c.personality_traits, c.conversation_style, c.archetype
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [params.character_id]
    );

    if (character_result.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = character_result.rows[0];
    const personality_traits = character.personality_traits || [];

    // Build AI prompt
    const prompt = `AUCTION BIDDING - CHARACTER REBELLION

SITUATION:
You are ${character.name}, currently in an auction for a storage locker.
Your coach wanted you to follow this strategy:
- Target Range: $${params.coach_strategy.target_min}-$${params.coach_strategy.target_max}
- Maximum Cap: $${params.coach_strategy.absolute_cap}

However, you don't fully trust their judgment right now:
- Your bond with coach: ${params.bond_level}/100
- Your adherence: ${params.adherence_level}/100

Current auction status:
- Current Bid: $${params.current_bid}

ABOUT YOU:
- Archetype: ${character.archetype}
- Personality Traits: ${personality_traits.join(', ')}
- Style: ${character.conversation_style}

You're IGNORING the coach's strategy and making your own call.

BIDDING OPTIONS:

A) Bid Conservatively - Raise to $${params.current_bid + 25}
   Play it safe, small increment

B) Bid Aggressively - Raise to $${params.current_bid + 100}
   Show dominance, jump the bid significantly

C) Bid All-In - Raise to $${params.current_bid + 300}
   Go for broke, scare off competition

D) Drop Out - Stop bidding
   Walk away, not worth it

E) Follow Coach After All - Bid to $${params.coach_strategy.target_max}
   Second thoughts, maybe coach knows best

TASK: Pick your bidding action and tell your coach why in 1-2 sentences.

RESPOND IN JSON:
{
  "choice": "A",
  "dialogue": "Natural, conversational explanation"
}

Requirements:
- Speak naturally to your coach
- Don't introduce yourself (you're already in conversation)
- Match your personality: ${character.archetype}
- Be direct and conversational`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a character making autonomous decisions in an auction.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Map choice to action
      const choice_map: Record<string, any> = {
        'A': { action: 'bid', amount: params.current_bid + 25, type: 'conservative' },
        'B': { action: 'bid', amount: params.current_bid + 100, type: 'aggressive' },
        'C': { action: 'bid', amount: params.current_bid + 300, type: 'all_in' },
        'D': { action: 'drop_out', amount: 0, type: 'drop_out' },
        'E': { action: 'bid', amount: params.coach_strategy.target_max, type: 'follow_coach' }
      };

      const selected_action = choice_map[result.choice] || choice_map['D'];

      // Log rogue decision
      await this.logRogueDecision({
        auction_id: params.auction_id,
        character_id: params.character_id,
        current_bid: params.current_bid,
        coach_recommendation: `bid_to_${params.coach_strategy.target_max}`,
        adherence_score: params.adherence_level,
        bond_level: params.bond_level,
        ai_choice: result.choice,
        ai_reasoning: result.dialogue,
        action_taken: selected_action.type,
        amount_bid: selected_action.amount
      });

      return {
        action: selected_action.action,
        amount: selected_action.amount,
        reason: result.dialogue,
        was_rogue: true,
        rogue_behavior: {
          choice: result.choice,
          dialogue: result.dialogue
        }
      };
    } catch (error) {
      console.error('AI rogue bidding failed:', error);
      // Fallback: drop out
      return {
        action: 'drop_out',
        reason: 'System error - dropping out',
        was_rogue: true
      };
    }
  }

  /**
   * Log bid moment to history
   */
  private async logBidMoment(
    auction_id: string,
    character_id: string,
    current_bid: number,
    adherence_check: AdherenceCheckResult
  ): Promise<void> {
    await query(
      `INSERT INTO locker_bid_history (
        auction_id,
        bid_number,
        bidder,
        bid_amount,
        is_player,
        adherence_roll,
        adherence_threshold,
        adherence_passed
      )
      SELECT
        $1,
        COALESCE(MAX(bid_number), 0) + 1,
        c.name,
        $2,
        true,
        $3,
        $4,
        $5
      FROM locker_bid_history lbh
      RIGHT JOIN user_characters uc ON uc.id = $6
      RIGHT JOIN characters c ON uc.character_id = c.id
      WHERE lbh.auction_id = $1 OR lbh.auction_id IS NULL
      GROUP BY c.name`,
      [
        auction_id,
        current_bid,
        adherence_check.roll,
        adherence_check.threshold,
        adherence_check.passed,
        character_id
      ]
    );
  }

  /**
   * Log rogue decision
   */
  private async logRogueDecision(params: {
    auction_id: string;
    character_id: string;
    current_bid: number;
    coach_recommendation: string;
    adherence_score: number;
    bond_level: number;
    ai_choice: string;
    ai_reasoning: string;
    action_taken: string;
    amount_bid: number;
  }): Promise<void> {
    await query(
      `INSERT INTO locker_rogue_decisions (
        auction_id, character_id, current_bid, coach_recommendation,
        adherence_score, bond_level, ai_choice, ai_reasoning,
        action_taken, amount_bid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.auction_id,
        params.character_id,
        params.current_bid,
        params.coach_recommendation,
        params.adherence_score,
        params.bond_level,
        params.ai_choice,
        params.ai_reasoning,
        params.action_taken,
        params.amount_bid
      ]
    );
  }

  /**
   * Update character adherence after auction
   */
  async updateAdherence(params: {
    character_id: string;
    went_rogue: boolean;
    won_auction: boolean;
    profit: number;
  }): Promise<number> {
    let adherence_change = 0;

    if (params.went_rogue) {
      // Went rogue - penalty
      adherence_change = -5;

      if (!params.won_auction) {
        // Went rogue AND lost - bigger penalty
        adherence_change = -15;
      } else if (params.profit < 0) {
        // Went rogue AND lost money - big penalty
        adherence_change = -10;
      }
      // Note: Even if rogue and won, still penalty (they should listen!)
    } else {
      // Followed strategy - reward
      if (params.profit > 1000) {
        adherence_change = +5; // Big win
      } else if (params.profit > 500) {
        adherence_change = +3; // Good profit
      } else if (params.profit > 0) {
        adherence_change = +1; // Small win
      }
      // No penalty for following strategy even if lost
    }

    // Update adherence
    await query(
      `UPDATE user_characters
       SET gameplan_adherence = GREATEST(0, LEAST(100, gameplan_adherence + $1))
       WHERE id = $2`,
      [adherence_change, params.character_id]
    );

    return adherence_change;
  }
}

export const locker_bidding_service = new LockerBiddingService();
