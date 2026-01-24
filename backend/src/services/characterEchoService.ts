import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

export class CharacterEchoService {
  async getEchoCount(user_id: string, character_template_id: string): Promise<number> {
    const result = await query(
      'SELECT echo_count FROM user_character_echoes WHERE user_id = $1 AND character_template_id = $2',
      [user_id, character_template_id]
    );
    return result.rows.length > 0 ? result.rows[0].echo_count : 0;
  }

  async addEcho(user_id: string, character_template_id: string, count: number = 1): Promise<void> {
    await query(
      'INSERT INTO user_character_echoes (user_id, character_template_id, echo_count) VALUES ($1, $2, $3) ON CONFLICT(user_id, character_template_id) DO UPDATE SET echo_count = user_character_echoes.echo_count + $4',
      [user_id, character_template_id, count, count]
    );
  }

  async spendEchoes(user_id: string, character_template_id: string, count: number): Promise<boolean> {
    // Atomic operation - only update if sufficient echoes exist
    const result = await query(
      'UPDATE user_character_echoes SET echo_count = echo_count - $1 WHERE user_id = $2 AND character_template_id = $3 AND echo_count >= $1',
      [count, user_id, character_template_id]
    );
    
    return result.row_count > 0; // True if row was actually updated (had sufficient echoes)
  }

  /**
   * Ascend a character using echoes - increases character level and improves stats
   */
  async ascendCharacter(user_id: string, user_character_id: string, echoes_to_spend: number): Promise<boolean> {
    if (echoes_to_spend <= 0) {
      throw new Error('Invalid echo amount for character ascension');
    }

    try {
      // Start transaction for atomicity
      await query('BEGIN');

      // Get character data to verify ownership and get template ID
      const character_result = await query(
        'SELECT user_id, character_id, level FROM user_characters WHERE id = $1 AND user_id = $2',
        [user_character_id, user_id]
      );

      if (character_result.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Character not found or not owned by user');
      }

      const character = character_result.rows[0];
      const character_template_id = character.character_id;

      // Check if user has enough echoes
      const can_spend = await this.spendEchoes(user_id, character_template_id, echoes_to_spend);
      if (!can_spend) {
        await query('ROLLBACK');
        return false;
      }

      // Ascend character: increase level and improve stats
      const new_level = character.level + 1;
      const stat_boost_percentage = 0.1; // 10% stat increase per ascension

      await query(`
        UPDATE user_characters 
        SET 
          level = $1,
          attack = ROUND(attack * (1 + $2)),
          defense = ROUND(defense * (1 + $2)),
          health = ROUND(health * (1 + $2)),
          max_health = ROUND(max_health * (1 + $2)),
          speed = ROUND(speed * (1 + $2)),
          magic_attack = ROUND(magic_attack * (1 + $2)),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4`,
        [new_level, stat_boost_percentage, user_character_id, user_id]
      );

      await query('COMMIT');
      console.log(`✅ Successfully ascended character ${user_character_id} to level ${new_level} using ${echoes_to_spend} echoes`);
      return true;

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error ascending character:', error);
      throw error;
    }
  }

  /**
   * Rank up a character ability using echoes
   */
  async rankUpAbility(user_id: string, user_character_id: string, ability_id: string, echoes_to_spend: number): Promise<boolean> {
    if (echoes_to_spend <= 0) {
      throw new Error('Invalid echo amount for ability rank up');
    }

    try {
      // Start transaction for atomicity
      await query('BEGIN');

      // Get character data and current abilities
      const character_result = await query(
        'SELECT user_id, character_id, abilities FROM user_characters WHERE id = $1 AND user_id = $2',
        [user_character_id, user_id]
      );

      if (character_result.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('Character not found or not owned by user');
      }

      const character = character_result.rows[0];
      const character_template_id = character.character_id;
      const current_abilities = character.abilities || [];

      // Find the ability to rank up
      const ability_index = current_abilities.findIndex((ability: any) => ability.id === ability_id);
      if (ability_index === -1) {
        await query('ROLLBACK');
        throw new Error('Ability not found on character');
      }

      const ability = current_abilities[ability_index];
      const current_rank = ability.rank || 1;
      const max_rank = 10; // Maximum ability rank

      if (current_rank >= max_rank) {
        await query('ROLLBACK');
        throw new Error('Ability is already at maximum rank');
      }

      // Check if user has enough echoes
      const can_spend = await this.spendEchoes(user_id, character_template_id, echoes_to_spend);
      if (!can_spend) {
        await query('ROLLBACK');
        return false;
      }

      // Rank up the ability
      const new_rank = current_rank + 1;
      const rank_boost_percentage = 0.15; // 15% power increase per rank

      ability.rank = new_rank;
      ability.power = Math.round(ability.power * (1 + rank_boost_percentage));

      // Update the abilities array
      current_abilities[ability_index] = ability;

      await query(
        'UPDATE user_characters SET abilities = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [JSON.stringify(current_abilities), user_character_id, user_id]
      );

      await query('COMMIT');
      console.log(`✅ Successfully ranked up ability ${ability_id} to rank ${new_rank} using ${echoes_to_spend} echoes`);
      return true;

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error ranking up ability:', error);
      throw error;
    }
  }
}
