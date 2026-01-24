import { db } from '../database';

/**
 * Challenge Reward Distribution Service
 * Handles reward calculations and distribution for completed challenges
 * Governance: Dollars-Everywhere (integer USD not cents), NO FALLBACKS
 */

export interface RewardConfig {
  reward_type: 'currency' | 'equipment' | 'battle_boost' | 'special_item' | 'training_bonus' | 'healing_discount' | 'unlock' | 'immunity' | 'advantage';
  reward_config: Record<string, any>;
  placement_required: 'winner' | 'top_3' | 'participant' | 'loser';
  is_guaranteed: boolean;
  probability: number;
}

export interface DistributedReward {
  id: string;
  challenge_result_id: string;
  user_character_id: string;
  reward_type: string;
  reward_config: Record<string, any>;
  currency_amount: number | null; // USD integer dollars
  claimed: boolean;
}

export class ChallengeRewardService {
  private static instance: ChallengeRewardService;

  private constructor() {}

  static get_instance(): ChallengeRewardService {
    if (!ChallengeRewardService.instance) {
      ChallengeRewardService.instance = new ChallengeRewardService();
    }
    return ChallengeRewardService.instance;
  }

  /**
   * Calculate and distribute rewards for challenge completion
   */
  async distributeRewards(
    challenge_result_id: string,
    challenge_template_id: string,
    winner_id: string,
    second_place_id: string | null,
    third_place_id: string | null,
    participant_ids: string[]
  ): Promise<DistributedReward[]> {
    const client = await db.connect();
    const distributed_rewards: DistributedReward[] = [];

    try {
      await client.query('BEGIN');

      // Get template base reward
      const template_result = await client.query(
        'SELECT base_currency_reward, reward_scaling FROM challenge_templates WHERE id = $1',
        [challenge_template_id]
      );

      const template = template_result.rows[0];
      if (!template) {
        throw new Error('Challenge template not found');
      }

      const base_reward = template.base_currency_reward; // USD integer dollars
      const scaling = template.reward_scaling || { first: 1.0, second: 0.6, third: 0.3 };

      // Distribute winner reward
      if (winner_id) {
        const winner_reward = await this.distributeCurrencyReward(
          client,
          challenge_result_id,
          winner_id,
          Math.floor(base_reward * scaling.first),
          'winner'
        );
        distributed_rewards.push(winner_reward);
      }

      // Distribute second place reward
      if (second_place_id) {
        const second_reward = await this.distributeCurrencyReward(
          client,
          challenge_result_id,
          second_place_id,
          Math.floor(base_reward * scaling.second),
          'second_place'
        );
        distributed_rewards.push(second_reward);
      }

      // Distribute third place reward
      if (third_place_id) {
        const third_reward = await this.distributeCurrencyReward(
          client,
          challenge_result_id,
          third_place_id,
          Math.floor(base_reward * scaling.third),
          'third_place'
        );
        distributed_rewards.push(third_reward);
      }

      // Get additional rewards from challenge_rewards table
      const rewards_result = await client.query(
        'SELECT * FROM challenge_rewards WHERE challenge_template_id = $1',
        [challenge_template_id]
      );

      for (const reward_config of rewards_result.rows) {
        const eligible_characters = this.getEligibleCharacters(
          reward_config.placement_required,
          winner_id,
          second_place_id,
          third_place_id,
          participant_ids
        );

        for (const character_id of eligible_characters) {
          // Roll for probability-based rewards
          if (!reward_config.is_guaranteed && Math.random() > reward_config.probability) {
            continue; // Didn't win this reward
          }

          const reward = await this.distributeReward(
            client,
            challenge_result_id,
            character_id,
            reward_config.reward_type,
            reward_config.reward_config
          );

          distributed_rewards.push(reward);
        }
      }

      await client.query('COMMIT');

      console.log(`💰 Distributed ${distributed_rewards.length} rewards for challenge result ${challenge_result_id}`);

      return distributed_rewards;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error distributing challenge rewards:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Distribute a currency reward
   */
  private async distributeCurrencyReward(
    client: any,
    challenge_result_id: string,
    user_character_id: string,
    amount: number, // USD integer dollars
    placement: string
  ): Promise<DistributedReward> {
    const result = await client.query(
      `INSERT INTO distributed_challenge_rewards
       (challenge_result_id, user_character_id, reward_type, reward_config, currency_amount)
       VALUES ($1, $2, 'currency', $3, $4)
       RETURNING *`,
      [
        challenge_result_id,
        user_character_id,
        JSON.stringify({ placement, description: `Challenge ${placement} reward` }),
        amount
      ]
    );

    // Credit wallet immediately (auto-claim currency)
    await client.query(
      `UPDATE user_characters
       SET wallet = wallet + $1
       WHERE id = $2`,
      [amount, user_character_id]
    );

    // Mark as claimed
    await client.query(
      `UPDATE distributed_challenge_rewards
       SET claimed = true, claimed_at = NOW()
       WHERE id = $1`,
      [result.rows[0].id]
    );

    console.log(`💵 Distributed $${amount} to ${user_character_id} (${placement})`);

    return result.rows[0];
  }

  /**
   * Distribute a non-currency reward
   */
  private async distributeReward(
    client: any,
    challenge_result_id: string,
    user_character_id: string,
    reward_type: string,
    reward_config: Record<string, any>
  ): Promise<DistributedReward> {
    const result = await client.query(
      `INSERT INTO distributed_challenge_rewards
       (challenge_result_id, user_character_id, reward_type, reward_config)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [challenge_result_id, user_character_id, reward_type, JSON.stringify(reward_config)]
    );

    console.log(`🎁 Distributed ${reward_type} reward to ${user_character_id}`);

    return result.rows[0];
  }

  /**
   * Get eligible characters based on placement requirement
   */
  private getEligibleCharacters(
    placement_required: string,
    winner_id: string,
    second_place_id: string | null,
    third_place_id: string | null,
    participant_ids: string[]
  ): string[] {
    switch (placement_required) {
      case 'winner':
        return [winner_id];
      case 'top_3':
        return [winner_id, second_place_id, third_place_id].filter(id => id !== null) as string[];
      case 'participant':
        return participant_ids;
      case 'loser':
        // Everyone except top 3
        const top_three = new Set([winner_id, second_place_id, third_place_id].filter(id => id !== null));
        return participant_ids.filter(id => !top_three.has(id));
      default:
        return [];
    }
  }

  /**
   * Get unclaimed rewards for a character
   */
  async getUnclaimedRewards(user_character_id: string): Promise<DistributedReward[]> {
    const result = await db.query(
      `SELECT * FROM distributed_challenge_rewards
       WHERE user_character_id = $1 AND claimed = false
       ORDER BY created_at DESC`,
      [user_character_id]
    );

    return result.rows;
  }

  /**
   * Claim a reward
   */
  async claimReward(reward_id: string, user_character_id: string): Promise<DistributedReward> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get reward
      const reward_result = await client.query(
        'SELECT * FROM distributed_challenge_rewards WHERE id = $1 AND user_character_id = $2',
        [reward_id, user_character_id]
      );

      const reward = reward_result.rows[0];
      if (!reward) {
        throw new Error('Reward not found');
      }

      if (reward.claimed) {
        throw new Error('Reward already claimed');
      }

      // Apply reward based on type
      if (reward.reward_type === 'currency' && reward.currency_amount) {
        await client.query(
          `UPDATE user_characters
           SET wallet = wallet + $1
           WHERE id = $2`,
          [reward.currency_amount, user_character_id]
        );
      }
      // TODO: Handle other reward types (equipment, items, etc.)

      // Mark as claimed
      await client.query(
        `UPDATE distributed_challenge_rewards
         SET claimed = true, claimed_at = NOW()
         WHERE id = $1`,
        [reward_id]
      );

      await client.query('COMMIT');

      console.log(`✅ Reward ${reward_id} claimed by ${user_character_id}`);

      return reward;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ChallengeRewardService;
